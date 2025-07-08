import React, { useState, useMemo, useCallback } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUp, ArrowDown, Trash2, Copy } from 'lucide-react';
import NotasPopover from '@/components/ui/NotasPopover';
import CreatableClienteCombobox, { ClienteOption } from '@/components/CreatableClienteCombobox';
import CreatableArmazemCombobox, { ArmazemOption } from '@/components/CreatableArmazemCombobox';
import CreatableTransportadoraCombobox, { TransportadoraOption } from '@/components/CreatableTransportadoraCombobox';
import DatePicker from '@/components/ui/DatePicker';
import { parseDateFromYYYYMMDD, formatDateToYYYYMMDD } from '@/utils/date';
import type { LogisticaRecord, Cliente, Transportadora, Armazem } from '@/types/logistica';

interface TableColumn {
  label: string;
  width: string;
  field: string;
  tooltip?: string;
}

interface LogisticaTableWithCreatableProps {
  records: LogisticaRecord[];
  clientes: Cliente[];
  transportadoras: Transportadora[];
  armazens: Armazem[];
  onOrcSave?: (row: LogisticaRecord, value: string) => Promise<void>;
  onFoSave?: (row: LogisticaRecord, value: string) => Promise<void>;
  onItemSave?: (row: LogisticaRecord, value: string) => Promise<void>;
  onSaiuSave: (row: LogisticaRecord, value: boolean) => Promise<void>;
  onGuiaSave: (row: LogisticaRecord, value: string) => Promise<void>;
  onBrindesSave: (row: LogisticaRecord, value: boolean) => Promise<void>;
  onClienteChange: (row: LogisticaRecord, value: string) => Promise<void>;
  onRecolhaChange: (rowId: string, value: string) => Promise<void>;
  onEntregaChange: (rowId: string, value: string) => Promise<void>;
  onTransportadoraChange: (row: LogisticaRecord, value: string) => Promise<void>;
  onQuantidadeSave: (row: LogisticaRecord, value: number | null) => Promise<void>;
  onConcluidoSave?: (row: LogisticaRecord, value: boolean) => Promise<void>;
  onDataConcluidoSave?: (row: LogisticaRecord, value: string) => Promise<void>;
  onDuplicateRow: (row: LogisticaRecord) => Promise<void>;
  onNotasSave: (row: LogisticaRecord, outras: string, contacto?: string, telefone?: string, contacto_entrega?: string, telefone_entrega?: string, data?: string | null) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
  tableDate: string;
  hideColumns?: string[]; // Array of column fields to hide
  showSourceSelection?: boolean; // Show radio buttons for source selection
  sourceRowId?: string | null; // Currently selected source row ID
  onSourceRowChange?: (rowId: string | null) => void; // Callback when source row changes
  // New callbacks for updating options lists
  onArmazensUpdate?: (newArmazens: ArmazemOption[]) => void;
  onTransportadorasUpdate?: (newTransportadoras: TransportadoraOption[]) => void;
  onClientesUpdate?: (newClientes: ClienteOption[]) => void;
}

export const LogisticaTableWithCreatable: React.FC<LogisticaTableWithCreatableProps> = ({
  records,
  clientes,
  transportadoras,
  armazens,
  onOrcSave,
  onFoSave,
  onItemSave,
  onSaiuSave,
  onGuiaSave,
  onBrindesSave,
  onClienteChange,
  onRecolhaChange,
  onEntregaChange,
  onTransportadoraChange,
  onQuantidadeSave,
  onConcluidoSave,
  onDataConcluidoSave,
  onDuplicateRow,
  onNotasSave,
  onDeleteRow,
  tableDate,
  hideColumns,
  showSourceSelection,
  sourceRowId,
  onSourceRowChange,
  onArmazensUpdate,
  onTransportadorasUpdate,
  onClientesUpdate
}) => {
  // State for table functionality
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editRows, setEditRows] = useState<Record<string, any>>({});

  // Convert data to the format expected by creatable components
  const armazemOptions: ArmazemOption[] = useMemo(() => 
    armazens.map(arm => ({
      value: arm.value,
      label: arm.label,
      morada: null,
      codigo_pos: null
    })), [armazens]);

  const transportadoraOptions: TransportadoraOption[] = useMemo(() => 
    transportadoras.map(transp => ({
      value: transp.value,
      label: transp.label
    })), [transportadoras]);

  const clienteOptions: ClienteOption[] = useMemo(() => 
    clientes.map(cliente => ({
      value: cliente.value,
      label: cliente.label
    })), [clientes]);

  // Table columns configuration
  const columns = useMemo<TableColumn[]>(() => {
    const allColumns = [
      ...(showSourceSelection ? [{ label: 'FONTE', width: 'w-[60px] max-w-[60px]', field: 'source_selection', tooltip: 'Selecionar como fonte para copiar' }] : []),
      { label: 'ORC', width: 'w-[100px] max-w-[100px]', field: 'numero_orc' },
      { label: 'FO', width: 'w-[100px] max-w-[100px]', field: 'numero_fo' },
      { label: 'GUIA', width: 'w-[100px] max-w-[100px]', field: 'guia' },
      { label: 'B', width: 'w-[74px] max-w-[44px]', field: 'tipo' },
      { label: 'Cliente', width: 'w-[200px]', field: 'cliente' },
      { label: 'Item', width: 'flex-1', field: 'item' },
      { label: 'Qtd', width: 'w-[80px] max-w-[80px]', field: 'quantidade' },
      { label: 'Loc. Recolha', width: 'w-[160px]', field: 'local_recolha' },
      { label: 'Loc. Entrega', width: 'w-[160px]', field: 'local_entrega' },
      { label: 'Transportadora', width: 'w-[200px]', field: 'transportadora' },
      { label: 'Outras', width: 'w-[70px] max-w-[70px]', field: 'notas' },
      { label: 'C', width: 'w-[36px] max-w-[36px]', field: 'concluido', tooltip: 'Concluído' },
      { label: 'Data Concluído', width: 'w-[150px]', field: 'data_concluido' },
      { label: 'S', width: 'w-[36px] max-w-[36px]', field: 'saiu', tooltip: 'Saiu' },
      { label: 'Ações', width: 'w-[120px]', field: 'acoes' },
    ];
    
    // Filter out hidden columns
    return allColumns.filter(col => !hideColumns?.includes(col.field));
  }, [hideColumns, showSourceSelection]);

  // Handle sorting - memoized to prevent recreation on renders
  const handleSort = useCallback((field: string) => {
    if (sortColumn === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(field);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  // Create lookup dictionaries for faster access
  const clienteLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    clientes.forEach(cliente => {
      lookup[cliente.value] = cliente.label;
    });
    return lookup;
  }, [clientes]);

  const transportadoraLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    transportadoras.forEach(t => {
      lookup[t.value] = t.label;
    });
    return lookup;
  }, [transportadoras]);

  // Sorting logic with optimized comparisons
  const sortedRecords = useMemo(() => {
    // Only sort if a sort column is explicitly set, otherwise return records in original order
    if (!sortColumn) return records;

    // Get comparison function based on column type
    const getComparisonValue = (record: LogisticaRecord, field: string): string | boolean | number => {
      switch (field) {
        case 'numero_orc':
          return record.items_base?.folhas_obras?.numero_orc || '';
        case 'numero_fo':
          return record.items_base?.folhas_obras?.numero_fo || '';
        case 'tipo':
          return record.items_base?.brindes ? 'Brindes' : 'Print';
        case 'cliente': {
          const clientId = record.items_base?.folhas_obras?.id_cliente;
          return (clientId ? clienteLookup[clientId] : '') || record.items_base?.folhas_obras?.cliente || '';
        }
        case 'item':
          return record.items_base?.descricao || '';
        case 'saiu':
          return record.saiu || false;
        case 'local_recolha': {
          const recolhaId = record.id_local_recolha;
          return (recolhaId ? clienteLookup[recolhaId] : '') || record.local_recolha || '';
        }
        case 'local_entrega': {
          const entregaId = record.id_local_entrega;
          return (entregaId ? clienteLookup[entregaId] : '') || record.local_entrega || '';
        }
        case 'transportadora': {
          const transId = record.transportadora;
          return (transId ? transportadoraLookup[transId] : '') || '';
        }
        case 'guia':
          return record.guia || '';
        case 'quantidade':
          return record.quantidade ?? 0;
        case 'notas':
          return record.notas || '';
        case 'concluido':
          return record.concluido || false;
        case 'data_concluido':
          return record.data_concluido || '';
        default:
          return '';
      }
    };

    // Sort comparison function
    const compare = (a: LogisticaRecord, b: LogisticaRecord): number => {
      const aValue = getComparisonValue(a, sortColumn);
      const bValue = getComparisonValue(b, sortColumn);
      
      // For string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // For boolean comparison
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return sortDirection === 'asc'
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue);
      }
      
      // For number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
      
      return 0;
    };

    return [...records].sort(compare);
  }, [records, sortColumn, sortDirection, clienteLookup, transportadoraLookup]);

  // Handle edit state updates
  const handleEdit = useCallback((rowId: string, field: string, value: any) => {
    setEditRows(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [field]: value
      }
    }));
  }, []);

  // Handle row deletion
  const handleDelete = useCallback(async (rowId: string) => {
    if (!rowId) return;
    
    const confirmed = confirm('Tem a certeza que pretende eliminar esta linha?');
    if (confirmed) {
      await onDeleteRow(rowId);
    }
  }, [onDeleteRow]);

  // Debug function to log row data (can be removed in production)
  const debugRow = (row: LogisticaRecord) => {
    console.log('Row data:', {
      id: row.id,
      item_id: row.items_base?.id,
      descricao: row.descricao,
      items_base: row.items_base,
      guia: row.guia,
      quantidade: row.quantidade
    });
  };

    // Memoize table headers to prevent unnecessary re-renders
  const tableHeader = useMemo(() => (
          <TableHeader>
      <TableRow>
        {columns.map((col) => (
          <TableHead
            key={col.field}
            className={`sticky top-0 z-10 cursor-pointer select-none ${col.width} bg-[var(--orange)] text-black uppercase rounded-none border-b-2 border-border ${col.field === 'numero_orc' || col.field === 'numero_fo' || col.field === 'quantidade' ? 'text-right' : ''}`}
            onClick={() => handleSort(col.field)}
          >
            <div className={`flex items-center ${col.field === 'acoes' ? 'justify-center' : 'justify-between'}`}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>{col.label}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>{col.tooltip || col.label}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {sortColumn === col.field && col.field !== 'acoes' && (
                <span>{sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>
              )}
            </div>
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  ), [columns, sortColumn, sortDirection, handleSort]);

  return (
    <div className="rounded-none bg-background">
      <RadioGroup value={sourceRowId || undefined} onValueChange={onSourceRowChange}>
        <Table className="w-full table-fixed border-0 uppercase">
        {tableHeader}
      <TableBody>
        {sortedRecords.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center p-4">
              Nenhum registo encontrado para esta data.
            </TableCell>
          </TableRow>
        ) : (
          sortedRecords.map((row, index) => (
          <TableRow key={row.id || row.items_base?.id || Math.random()} className={`odd:bg-muted/50 ${sourceRowId === row.id ? 'bg-primary/10' : ''}`}>
            {/* Source Selection Radio Button */}
            {showSourceSelection && (
              <TableCell className="p-2 text-sm">
                <div className="flex items-center justify-center">
                  <RadioGroupItem
                    value={row.id}
                    id={`source-${row.id}`}
                    className="w-5 h-5 cursor-pointer border-2 [&_svg]:fill-[var(--orange)]"
                  />
                </div>
              </TableCell>
            )}
            
            {/* ORC */}
            <TableCell className="p-2 text-sm">
              <div className="h-10 text-sm flex items-center px-3 py-2 bg-muted/20 text-right font-mono">
                {row.items_base?.folhas_obras?.numero_orc || ''}
              </div>
            </TableCell>
            
            {/* FO */}
            <TableCell className="p-2 text-sm">
              <div className="h-10 text-sm flex items-center px-3 py-2 bg-muted/20 text-right font-mono">
                {row.items_base?.folhas_obras?.numero_fo || ''}
              </div>
            </TableCell>
            
            {/* Guia */}
            <TableCell className="p-2 text-sm">
              <Input
                className="border-0 outline-0 focus:ring-0 focus:border-0 h-8 text-sm"
                value={editRows[row.id]?.guia || row.guia || ''}
                onChange={(e) => handleEdit(row.id, 'guia', e.target.value)}
                onBlur={() => onGuiaSave(row, editRows[row.id]?.guia || '')}
              />
            </TableCell>
            
            {/* Tipo */}
            <TableCell className="p-2 text-sm">
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={editRows[row.id]?.brindes ?? row.items_base?.brindes ?? false}
                  onCheckedChange={(value) => {
                    handleEdit(row.id, 'brindes', !!value);
                    onBrindesSave(row, !!value);
                  }}
                />
              </div>
            </TableCell>
            
            {/* Cliente */}
            {!hideColumns?.includes('cliente') && (
              <TableCell className="p-2 text-sm">
                <CreatableClienteCombobox
                  options={clienteOptions}
                  value={row.items_base?.folhas_obras?.id_cliente || ''}
                  onChange={(value) => onClienteChange(row, value)}
                  onOptionsUpdate={onClientesUpdate}
                />
              </TableCell>
            )}
            
            {/* Item */}
            <TableCell className="p-2 text-sm">
              <Input
                className="border-0 outline-0 focus:ring-0 focus:border-0 h-8 text-sm"
                value={editRows[row.id]?.item || row.descricao || row.items_base?.descricao || ''}
                onChange={(e) => handleEdit(row.id, 'item', e.target.value)}
                onBlur={() => onItemSave && onItemSave(row, editRows[row.id]?.item || '')}
              />
            </TableCell>
            
            {/* Quantidade */}
            <TableCell className="p-2 text-sm">
              <Input
                type="text"
                className="border-0 outline-0 focus:ring-0 focus:border-0 h-8 text-sm text-right"
                value={editRows[row.id]?.quantidade ?? row.quantidade ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : Number(e.target.value);
                  handleEdit(row.id, 'quantidade', value);
                }}
                onBlur={() => {
                  const value = editRows[row.id]?.quantidade ?? row.quantidade ?? null;
                  onQuantidadeSave(row, value);
                }}
              />
            </TableCell>
            
            {/* Local Recolha - NOW CREATABLE */}
            <TableCell className="p-2 text-sm">
              <CreatableArmazemCombobox
                options={armazemOptions}
                value={row.id_local_recolha || ''}
                onChange={(value) => onRecolhaChange(row.id || row.items_base?.id || '', value)}
                placeholder="Armazém"
                onOptionsUpdate={onArmazensUpdate}
              />
            </TableCell>
            
            {/* Local Entrega - NOW CREATABLE */}
            <TableCell className="p-2 text-sm">
              <CreatableArmazemCombobox
                options={armazemOptions}
                value={row.id_local_entrega || ''}
                onChange={(value) => onEntregaChange(row.id || row.items_base?.id || '', value)}
                placeholder="Armazém"
                onOptionsUpdate={onArmazensUpdate}
              />
            </TableCell>
            
            {/* Transportadora - NOW CREATABLE */}
            <TableCell className="p-2 text-sm">
              <CreatableTransportadoraCombobox
                options={transportadoraOptions}
                value={row.transportadora || ''}
                onChange={(value) => onTransportadoraChange(row, value)}
                placeholder="Transportadora"
                onOptionsUpdate={onTransportadorasUpdate}
              />
            </TableCell>
            
            {/* Outras */}
            <TableCell className="p-2 text-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <NotasPopover
                        value={row.notas || ''}
                        contacto={row.contacto || ''}
                        telefone={row.telefone || ''}
                        contacto_entrega={row.contacto_entrega || ''}
                        telefone_entrega={row.telefone_entrega || ''}
                        data={row.data || tableDate}
                        onChange={(value) => handleEdit(row.id, 'notas', value)}
                        onSave={async (fields) => {
                          // Save all fields
                          await onNotasSave(
                            { ...row, ...fields, data: fields.data || tableDate },
                            fields.outras,
                            fields.contacto,
                            fields.telefone,
                            fields.contacto_entrega,
                            fields.telefone_entrega,
                            fields.data || tableDate
                          );
                        }}
                        iconType="file"
                        buttonSize="icon"
                        className="mx-auto aspect-square"
                        centered={true}
                      />
                    </div>
                  </TooltipTrigger>
                  {row.notas && row.notas.trim() !== '' && (
                    <TooltipContent>
                      {row.notas}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </TableCell>
            
            {/* Concluído */}
            <TableCell className="p-2 text-sm">
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={editRows[row.id]?.concluido ?? row.concluido ?? false}
                  onCheckedChange={(value) => {
                    handleEdit(row.id, 'concluido', !!value);
                    onConcluidoSave && onConcluidoSave(row, !!value);
                  }}
                />
              </div>
            </TableCell>
            
            {/* Data Concluído */}
            <TableCell className="p-2 text-sm">
              <DatePicker
                selected={(() => {
                  const dateString = editRows[row.id]?.data_concluido || row.data_concluido;
                  if (!dateString) return undefined;
                  const date = parseDateFromYYYYMMDD(dateString);
                  return date || undefined;
                })()}
                onSelect={(date) => {
                  const dateString = formatDateToYYYYMMDD(date);
                  handleEdit(row.id, 'data_concluido', dateString);
                  if (onDataConcluidoSave) {
                    onDataConcluidoSave(row, dateString || '');
                  }
                }}
                placeholder="Data"
                buttonClassName="w-full h-10 border-0 outline-0 focus:ring-0 focus:border-0"
              />
            </TableCell>
            
            {/* Saiu */}
            {!hideColumns?.includes('saiu') && (
              <TableCell className="p-2 text-sm">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={editRows[row.id]?.saiu ?? row.saiu ?? false}
                    onCheckedChange={(value) => {
                      handleEdit(row.id, 'saiu', !!value);
                      onSaiuSave(row, !!value);
                    }}
                  />
                </div>
              </TableCell>
            )}
            
            {/* Ações */}
            <TableCell className="flex gap-2 justify-center pr-2 w-[120px]">
              <Button 
                size="icon" 
                variant="secondary" 
                className="aspect-square size-10 !p-0 flex items-center justify-center" 
                onClick={() => {
                  console.log("Duplicate button clicked for row:", row);
                  onDuplicateRow(row);
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="destructive" className="aspect-square size-10 !p-0 flex items-center justify-center" onClick={() => handleDelete(row.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </TableCell>
          </TableRow>
          ))
        )}
        </TableBody>
      </Table>
    </RadioGroup>
    </div>
  );
};

export default React.memo(LogisticaTableWithCreatable); 
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
import ClienteCombobox from '@/components/ClienteCombobox';
import Combobox from '@/components/ui/Combobox';
import DatePicker from '@/components/ui/DatePicker';
import { parseDateFromYYYYMMDD, formatDateToYYYYMMDD } from '@/utils/date';
import type { LogisticaRecord, Cliente, Transportadora, Armazem } from '@/types/logistica';

interface TableColumn {
  label: string;
  width: string;
  field: string;
  tooltip?: string;
}

interface LogisticaTableProps {
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
}

export const LogisticaTable: React.FC<LogisticaTableProps> = ({
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
  onSourceRowChange
}) => {
  // State for table functionality
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editRows, setEditRows] = useState<Record<string, any>>({});

  // Table columns configuration
  const columns = useMemo<TableColumn[]>(() => {
    const allColumns = [
      ...(showSourceSelection ? [{ label: 'FONTE', width: 'min-w-[50px] w-[50px] text-center', field: 'source_selection', tooltip: 'Selecionar como fonte para copiar' }] : []),
      { label: 'ORC', width: 'min-w-[80px] w-[80px]', field: 'numero_orc' },
      { label: 'FO', width: 'min-w-[80px] w-[80px]', field: 'numero_fo' },
      { label: 'GUIA', width: 'min-w-[80px] w-[80px]', field: 'guia' },
      { label: 'B', width: 'min-w-[64px] w-[64px]', field: 'tipo' },
      { label: 'Cliente', width: 'min-w-[160px] w-[160px]', field: 'cliente' },
      { label: 'Item', width: '', field: 'item' },
      { label: 'Qtd', width: 'min-w-[80px] w-[80px]', field: 'quantidade' },
      { label: 'Loc. Recolha', width: 'min-w-[160px] w-[160px]', field: 'local_recolha' },
      { label: 'Loc. Entrega', width: 'min-w-[160px] w-[160px]', field: 'local_entrega' },
      { label: 'Transportadora', width: 'min-w-[160px] w-[160px]', field: 'transportadora' },
      { label: 'Outras', width: 'min-w-[50px] w-[50px]', field: 'notas' },
      { label: 'C', width: 'min-w-[40px] w-[40px] text-center', field: 'concluido', tooltip: 'Concluído' },
      { label: 'Data Concluído', width: 'min-w-[150px] w-[150px]', field: 'data_concluido' },
      { label: 'S', width: 'min-w-[40px] w-[40px] text-center', field: 'saiu', tooltip: 'Saiu' },
      { label: 'Ações', width: 'min-w-[120px] w-[120px] text-center', field: 'acoes' },
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

  // Handle edit state with memoization
  const handleEdit = useCallback((id: string, field: string, value: any) => {
    setEditRows(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  }, []);
  
  // Memoize table headers to prevent unnecessary re-renders
  const tableHeader = useMemo(() => (
    <TableHeader className="bg-[var(--orange)]">
      <TableRow>
        {columns.map((col) => (
          <TableHead
            key={col.field}
            className={`${col.width} cursor-pointer py-2 text-xs font-bold select-none uppercase`}
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
  
  // Handle deletion with confirmation - memoized
  const handleDelete = useCallback((rowId: string) => {
    if (window.confirm('Tem certeza que deseja eliminar este registo?')) {
      onDeleteRow(rowId);
    }
  }, [onDeleteRow]);

  // Debug function to check data
  const debugRow = (row: LogisticaRecord) => {
    console.log("Row data:", {
      id: row.id,
      fo: row.items_base?.folhas_obras?.numero_fo,
      orc: row.items_base?.folhas_obras?.numero_orc,
      descricao: row.items_base?.descricao
    });
  };

  return (
    <RadioGroup value={sourceRowId || undefined} onValueChange={onSourceRowChange}>
      <Table className="w-full table-fixed border-separate border-spacing-0 uppercase">
        {tableHeader}
        <TableBody>
        {sortedRecords.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center p-4">
              Nenhum registo encontrado para esta data.
            </TableCell>
          </TableRow>
        ) : (
          sortedRecords.map(row => (
            <TableRow key={row.id} className={`odd:bg-muted/50 ${sourceRowId === row.id ? 'bg-primary/10 border-l-4 border-primary' : ''}`}>
              {/* Source Selection */}
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
              
              {/* Orçamento */}
              <TableCell className="p-2 text-sm">
                <div className="h-10 text-sm flex items-center px-3 py-2 border-2 border-input bg-background">
                  {row.items_base?.folhas_obras?.numero_orc || ''}
                </div>
              </TableCell>
              
              {/* FO */}
              <TableCell className="p-2 text-sm">
                <div className="h-10 text-sm flex items-center px-3 py-2 border-2 border-input bg-background">
                  {row.items_base?.folhas_obras?.numero_fo || ''}
                </div>
              </TableCell>
              
              {/* Guia */}
              <TableCell className="p-2 text-sm">
                <Input
                  className="h-8 text-sm"
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
                  <ClienteCombobox
                    options={clientes}
                    value={row.items_base?.folhas_obras?.id_cliente || ''}
                    onChange={(value) => onClienteChange(row, value)}
                  />
                </TableCell>
              )}
              
              {/* Item */}
              <TableCell className="p-2 text-sm">
                <Input
                  className="h-8 text-sm"
                  value={editRows[row.id]?.item || row.descricao || row.items_base?.descricao || ''}
                  onChange={(e) => handleEdit(row.id, 'item', e.target.value)}
                  onBlur={() => onItemSave && onItemSave(row, editRows[row.id]?.item || '')}
                />
              </TableCell>
              
              {/* Quantidade */}
              <TableCell className="p-2 text-sm">
                <Input
                  type="text"
                  className="h-8 text-sm text-right"
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
              
              {/* Local Recolha */}
              <TableCell className="p-2 text-sm">
                <Combobox
                  options={armazens}
                  value={row.id_local_recolha || ''}
                  onChange={(value) => onRecolhaChange(row.id || row.items_base?.id || '', value)}
                  placeholder="Armazém Recolha"
                />
              </TableCell>
              
              {/* Local Entrega */}
              <TableCell className="p-2 text-sm">
                <Combobox
                  options={armazens}
                  value={row.id_local_entrega || ''}
                  onChange={(value) => onEntregaChange(row.id || row.items_base?.id || '', value)}
                  placeholder="Armazém Entrega"
                />
              </TableCell>
              
              {/* Transportadora */}
              <TableCell className="p-2 text-sm">
                <Combobox
                  options={transportadoras}
                  value={row.transportadora || ''}
                  onChange={(value) => onTransportadoraChange(row, value)}
                />
              </TableCell>
              
              {/* Outras */}
              <TableCell className="p-2 text-sm">
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
                  centered={true}
                />
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
                  buttonClassName="w-full h-10"
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
  );
};

export default React.memo(LogisticaTable); 
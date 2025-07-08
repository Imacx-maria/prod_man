import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerDescription } from '@/components/ui/drawer';
import { Loader2, X, ArrowLeft, ArrowRight, FileSpreadsheet, FileText, Grid2x2Check, SquareChartGantt, Plus, Copy, RefreshCcw } from 'lucide-react';
import LogisticaTableWithCreatable from '@/components/LogisticaTableWithCreatable';
import { ArmazemOption } from '@/components/CreatableArmazemCombobox';
import { TransportadoraOption } from '@/components/CreatableTransportadoraCombobox';
import DatePicker from '@/components/ui/DatePicker';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { exportLogisticaToExcel } from '@/utils/exportLogisticaToExcel';

// Shared interfaces with other components
import type { FolhaObra, ItemBase, LogisticaRecord, Cliente, Transportadora, Armazem } from '@/types/logistica';

interface LogisticaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  loading: boolean;
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
  onDateChange?: (date: Date) => void;
  holidays?: { holiday_date: string }[];
  tableDate: string;
  // Additional handlers for the enhanced functionality
  onAddItem?: () => Promise<void>;
  onCopyQuantities?: () => Promise<void>;
  onCopyDelivery?: (sourceRowId: string | null) => Promise<void>;
  sourceRowId?: string | null;
  onSourceRowChange?: (rowId: string | null) => void;
  onRefresh?: () => Promise<void>;
  // New callbacks for creatable comboboxes
  onArmazensUpdate?: (newArmazens: ArmazemOption[]) => void;
  onTransportadorasUpdate?: (newTransportadoras: TransportadoraOption[]) => void;
  onClientesUpdate?: (newClientes: import('@/components/CreatableClienteCombobox').ClienteOption[]) => void;
}

export const LogisticaDrawer: React.FC<LogisticaDrawerProps> = ({
  open,
  onOpenChange,
  selectedDate,
  loading,
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
  onDateChange,
  holidays,
  tableDate,
  onAddItem,
  onCopyQuantities,
  onCopyDelivery,
  sourceRowId,
  onSourceRowChange,
  onRefresh,
  onArmazensUpdate,
  onTransportadorasUpdate,
  onClientesUpdate
}) => {
  // Debug: Log main props on render
  console.log('LogisticaDrawer props:', { open, selectedDate, loading, records, clientes, transportadoras });

  // Format date and day of week in Portuguese - memoized to avoid recalculations
  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    return format(selectedDate, `d 'de' MMMM 'de' yyyy`, { locale: pt });
  }, [selectedDate]);
  
  const dayOfWeek = useMemo(() => {
    if (!selectedDate) return '';
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[selectedDate.getDay()];
  }, [selectedDate]);

  // Memoize table props to prevent unnecessary re-renders
  const tableProps = useMemo(() => ({
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
    // Add source selection functionality
    showSourceSelection: !!onSourceRowChange,
    sourceRowId,
    onSourceRowChange,
    // Add creatable combobox callbacks
    onArmazensUpdate,
    onTransportadorasUpdate,
    onClientesUpdate,
  }), [
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
    sourceRowId,
    onSourceRowChange,
    onArmazensUpdate,
    onTransportadorasUpdate,
    onClientesUpdate
  ]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent className="overflow-hidden h-screen min-h-screen !top-0 !mt-0 max-w-[95vw] mx-auto bg-background p-0 border border-border shadow-md" aria-describedby="drawer-desc">
        <DrawerHeader className="">
          <DrawerTitle className="text-xl font-bold">Listagem Recolhas Entregas</DrawerTitle>
          <DrawerDescription id="drawer-desc">
            Listagem de recolhas e entregas para o dia selecionado.
          </DrawerDescription>
          <div className="flex items-center gap-2 mt-4 mb-2 w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Dia anterior"
                className="p-2"
                onClick={() => {
                  if (selectedDate && onDateChange) {
                    const prev = new Date(selectedDate);
                    prev.setDate(prev.getDate() - 1);
                    onDateChange(prev);
                  }
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <DatePicker
                selected={selectedDate ?? undefined}
                onSelect={date => date && onDateChange && onDateChange(date)}
                holidays={holidays}
                buttonClassName="w-auto"
              />
              <button
                type="button"
                aria-label="Dia seguinte"
                className="p-2"
                onClick={() => {
                  if (selectedDate && onDateChange) {
                    const next = new Date(selectedDate);
                    next.setDate(next.getDate() + 1);
                    onDateChange(next);
                  }
                }}
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 justify-end">
              {onAddItem && (
                <Button size="sm" onClick={onAddItem}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Item
                </Button>
              )}
              {onCopyQuantities && (
                <Button size="sm" variant="secondary" onClick={onCopyQuantities}>
                  <Copy className="w-4 h-4 mr-2" /> Copiar Quantidades
                </Button>
              )}
              {onCopyDelivery && (
                <Button 
                  size="sm" 
                  variant={sourceRowId ? "default" : "outline"}
                  disabled={!sourceRowId}
                  title={!sourceRowId ? 'Selecione uma linha como fonte primeiro' : `Copiar dados da linha selecionada para todas as outras`}
                  onClick={() => onCopyDelivery(sourceRowId || null)}
                >
                  <Copy className="w-4 h-4 mr-2" /> 
                  Copiar Entrega
                  {sourceRowId && (
                    <span className="ml-2 text-xs bg-primary/20 px-2 py-1 rounded">
                      Fonte: {records.find(r => r.id === sourceRowId)?.items_base?.descricao || 'Selecionada'}
                    </span>
                  )}
                </Button>
              )}
              {onRefresh && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onRefresh}
                  disabled={loading}
                  title="Refresh data from Supabase"
                >
                  <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      aria-label="Exportar para Excel"
                      className="flex items-center gap-2"
                      onClick={() => {
                        // Debug: Confirm export button is clicked
                        console.log('Export button clicked');
                        // Prepare the export data in the required format
                        const exportRows = records.map((row) => {
                          const clienteObj = clientes.find(c => c.value === (row.items_base?.folhas_obras?.id_cliente || ''));
                          const recolhaObj = clientes.find(c => c.value === (row.id_local_recolha || ''));
                          const entregaObj = clientes.find(c => c.value === (row.id_local_entrega || ''));
                          const transportadoraObj = transportadoras.find(t => t.value === (row.transportadora || ''));
                          return {
                            numero_orc: row.items_base?.folhas_obras?.numero_orc || '',
                            numero_fo: row.items_base?.folhas_obras?.numero_fo || '',
                            descricao: row.items_base?.descricao || '',
                            saiu: row.items_base?.folhas_obras?.saiu ?? row.saiu ?? false,
                            guia: row.guia || '',
                            brindes: row.items_base?.brindes ?? false,
                            id_cliente: clienteObj?.label || '',
                            id_local_recolha: row.id_local_recolha || '',
                            id_local_entrega: row.id_local_entrega || '',
                            transportadora: transportadoraObj?.label || '',
                            notas: row.notas || '',
                            contacto: row.contacto || '',
                            telefone: row.telefone || '',
                            contacto_entrega: row.contacto_entrega || '',
                            telefone_entrega: row.telefone_entrega || '',
                            quantidade: typeof row.quantidade === 'number' ? row.quantidade : undefined,
                            data: row.data || '',
                          };
                        });
                        // Debug: Log exportRows and selectedDate
                        console.log('Exporting rows:', exportRows, 'Selected date:', selectedDate, 'Clientes:', clientes, 'Transportadoras:', transportadoras);
                        exportLogisticaToExcel({
                          filteredRecords: exportRows,
                          selectedDate,
                          clientes,
                        });
                      }}
                    >
                      <Grid2x2Check className="w-5 h-5 text-black" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar Excel</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" aria-label="Exportar para PDF" className="flex items-center gap-2">
                      <SquareChartGantt className="w-5 h-5 text-black" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar PDF</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </DrawerHeader>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-none bg-background w-full border-2 border-border">
              <div className="max-h-[70vh] overflow-y-auto w-full">
                <div className="px-0">
                  <LogisticaTableWithCreatable {...tableProps} />
                </div>
              </div>
            </div>
          )}
        </div>
        <DrawerClose className="absolute top-4 right-4 rounded-none border-2 border-input p-2 text-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-border">
          <X className="h-5 w-5" />
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
};

export default React.memo(LogisticaDrawer); 
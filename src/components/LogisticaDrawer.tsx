import React, { useMemo } from 'react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerDescription,
} from '@/components/ui/drawer'
import {
  Loader2,
  X,
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  FileText,
  Grid2x2Check,
  Plus,
  Copy,
  RefreshCcw,
} from 'lucide-react'
import LogisticaTableWithCreatable from '@/components/LogisticaTableWithCreatable'
import { ArmazemOption } from '@/components/CreatableArmazemCombobox'
import { TransportadoraOption } from '@/components/CreatableTransportadoraCombobox'
import DatePicker from '@/components/ui/DatePicker'
import { Button } from '@/components/ui/button'
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { exportLogisticaToExcel } from '@/utils/exportLogisticaToExcel'

// Shared interfaces with other components
import type {
  FolhaObra,
  ItemBase,
  LogisticaRecord,
  Cliente,
  Transportadora,
  Armazem,
} from '@/types/logistica'

interface LogisticaDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date | null
  loading: boolean
  records: LogisticaRecord[]
  clientes: Cliente[]
  transportadoras: Transportadora[]
  armazens: Armazem[]
  onOrcSave?: (row: LogisticaRecord, value: string) => Promise<void>
  onFoSave?: (row: LogisticaRecord, value: string) => Promise<void>
  onItemSave?: (row: LogisticaRecord, value: string) => Promise<void>
  onSaiuSave: (row: LogisticaRecord, value: boolean) => Promise<void>
  onGuiaSave: (row: LogisticaRecord, value: string) => Promise<void>
  onBrindesSave: (row: LogisticaRecord, value: boolean) => Promise<void>
  onClienteChange: (row: LogisticaRecord, value: string) => Promise<void>
  onRecolhaChange: (rowId: string, value: string) => Promise<void>
  onEntregaChange: (rowId: string, value: string) => Promise<void>
  onTransportadoraChange: (row: LogisticaRecord, value: string) => Promise<void>
  onQuantidadeSave: (
    row: LogisticaRecord,
    value: number | null,
  ) => Promise<void>
  onConcluidoSave?: (row: LogisticaRecord, value: boolean) => Promise<void>
  onDataSaidaSave?: (row: LogisticaRecord, value: string) => Promise<void>
  onDuplicateRow: (row: LogisticaRecord) => Promise<void>
  onNotasSave: (
    row: LogisticaRecord,
    outras: string,
    contacto?: string,
    telefone?: string,
    contacto_entrega?: string,
    telefone_entrega?: string,
    data?: string | null,
  ) => Promise<void>
  onDeleteRow: (rowId: string) => Promise<void>
  onDateChange?: (date: Date) => void
  holidays?: { holiday_date: string }[]
  tableDate: string
  // Additional handlers for the enhanced functionality
  onAddItem?: () => Promise<void>
  onCopyQuantities?: () => Promise<void>
  onCopyDelivery?: (sourceRowId: string | null) => Promise<void>
  sourceRowId?: string | null
  onSourceRowChange?: (rowId: string | null) => void
  onRefresh?: () => Promise<void>
  // New callbacks for creatable comboboxes
  onArmazensUpdate?: (newArmazens: ArmazemOption[]) => void
  onTransportadorasUpdate?: (newTransportadoras: TransportadoraOption[]) => void
  onClientesUpdate?: (
    newClientes: import('@/components/CreatableClienteCombobox').ClienteOption[],
  ) => void
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
  onDataSaidaSave,
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
  onClientesUpdate,
}) => {
  // Debug: Log main props on render
  console.log('LogisticaDrawer props:', {
    open,
    selectedDate,
    loading,
    records,
    clientes,
    transportadoras,
  })

  // Format date and day of week in Portuguese - memoized to avoid recalculations
  const formattedDate = useMemo(() => {
    if (!selectedDate) return ''
    return format(selectedDate, `d 'de' MMMM 'de' yyyy`, { locale: pt })
  }, [selectedDate])

  const dayOfWeek = useMemo(() => {
    if (!selectedDate) return ''
    const days = [
      'Domingo',
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado',
    ]
    return days[selectedDate.getDay()]
  }, [selectedDate])

  // Memoize table props to prevent unnecessary re-renders
  const tableProps = useMemo(
    () => ({
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
      onDataSaidaSave,
      onDuplicateRow,
      onNotasSave,
      onDeleteRow,
      tableDate,
      // Remove source selection functionality for drawer
      showSourceSelection: false,
      hideColumns: ['source_selection'], // Hide the FONTE column
      // Add creatable combobox callbacks
      onArmazensUpdate,
      onTransportadorasUpdate,
      onClientesUpdate,
    }),
    [
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
      onDataSaidaSave,
      onDuplicateRow,
      onNotasSave,
      onDeleteRow,
      tableDate,
      onArmazensUpdate,
      onTransportadorasUpdate,
      onClientesUpdate,
    ],
  )

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent
        className="bg-background border-border !top-0 mx-auto !mt-0 h-screen min-h-screen max-w-[95vw] overflow-hidden border p-0 shadow-md"
        aria-describedby="drawer-desc"
      >
        <DrawerHeader className="">
          <DrawerTitle className="text-xl font-bold">
            Listagem Recolhas Entregas
          </DrawerTitle>
          <DrawerDescription id="drawer-desc">
            Listagem de recolhas e entregas para o dia selecionado.
          </DrawerDescription>
          <div className="mt-4 mb-2 flex w-full items-center gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Dia anterior"
                onClick={() => {
                  if (selectedDate && onDateChange) {
                    const prev = new Date(selectedDate)
                    prev.setDate(prev.getDate() - 1)
                    onDateChange(prev)
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DatePicker
                selected={selectedDate ?? undefined}
                onSelect={(date) => date && onDateChange && onDateChange(date)}
                holidays={holidays}
                buttonClassName="w-auto h-10"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Dia seguinte"
                onClick={() => {
                  if (selectedDate && onDateChange) {
                    const next = new Date(selectedDate)
                    next.setDate(next.getDate() + 1)
                    onDateChange(next)
                  }
                }}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1" />
            <div className="flex items-center justify-end gap-2">
              {onAddItem && (
                <Button onClick={onAddItem}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Item
                </Button>
              )}

              {onRefresh && (
                <Button
                  variant="outline"
                  onClick={onRefresh}
                  disabled={loading}
                  title="Refresh data from Supabase"
                >
                  <RefreshCcw
                    className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      aria-label="Exportar para Excel"
                      onClick={() => {
                        // Debug: Confirm export button is clicked
                        console.log('Export button clicked')
                        // Prepare the export data in the required format
                        const exportRows = records.map((row) => {
                          const clienteObj = clientes.find(
                            (c) =>
                              c.value ===
                              (row.items_base?.folhas_obras?.id_cliente || ''),
                          )
                          const recolhaObj = armazens.find(
                            (a) => a.value === (row.id_local_recolha || ''),
                          )
                          const entregaObj = armazens.find(
                            (a) => a.value === (row.id_local_entrega || ''),
                          )
                          const transportadoraObj = transportadoras.find(
                            (t) => t.value === (row.transportadora || ''),
                          )
                          return {
                            numero_orc:
                              row.items_base?.folhas_obras?.numero_orc || '',
                            numero_fo:
                              row.items_base?.folhas_obras?.numero_fo || '',
                            descricao: row.items_base?.descricao || '',
                            saiu:
                              row.items_base?.folhas_obras?.saiu ??
                              row.saiu ??
                              false,
                            guia: row.guia || '',
                            brindes: row.items_base?.brindes ?? false,
                            id_cliente: clienteObj?.label || '',
                            local_recolha:
                              recolhaObj?.label || row.local_recolha || '',
                            local_entrega:
                              entregaObj?.label || row.local_entrega || '',
                            id_local_recolha: row.id_local_recolha || '',
                            id_local_entrega: row.id_local_entrega || '',
                            transportadora: transportadoraObj?.label || '',
                            notas: row.notas || '',
                            contacto: row.contacto || '',
                            telefone: row.telefone || '',
                            contacto_entrega: row.contacto_entrega || '',
                            telefone_entrega: row.telefone_entrega || '',
                            quantidade:
                              typeof row.quantidade === 'number'
                                ? row.quantidade
                                : undefined,
                            data: row.data || '',
                          }
                        })
                        // Debug: Log exportRows and selectedDate
                        console.log(
                          'Exporting rows:',
                          exportRows,
                          'Selected date:',
                          selectedDate,
                          'Clientes:',
                          clientes,
                          'Transportadoras:',
                          transportadoras,
                        )
                        console.log('Sample cliente with address:', clientes[0])
                        console.log(
                          'Sample export row local recolha/entrega:',
                          exportRows[0]?.local_recolha,
                          exportRows[0]?.local_entrega,
                        )
                        exportLogisticaToExcel({
                          filteredRecords: exportRows,
                          selectedDate,
                          clientes,
                          armazens,
                        })
                      }}
                    >
                      <Grid2x2Check className="h-5 w-5 text-black" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar Excel</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </DrawerHeader>
        <div className="p-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="bg-background border-border w-full rounded-none border-2">
              <div className="max-h-[70vh] w-full overflow-y-auto">
                <div className="px-0">
                  <LogisticaTableWithCreatable {...tableProps} />
                </div>
              </div>
            </div>
          )}
        </div>
        <DrawerClose asChild>
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  )
}

export default React.memo(LogisticaDrawer)

import React, { useState, useCallback } from 'react'
import { Trash2, ArrowUp, ArrowDown, Copy } from 'lucide-react'
import DatePicker from '@/components/ui/DatePicker'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
// Removed unused Textarea import
import SimpleNotasPopover from '@/components/ui/SimpleNotasPopover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ProductionOperationWithRelations } from '@/types/producao'
import { useTableData } from '../hooks/useTableData'
import { useMaterialsCascading } from '../hooks/useMaterialsCascading'
// Removed unused MaterialData type import
import { debugLog } from '@/utils/devLogger'

interface OperationsTableProps {
  operations: ProductionOperationWithRelations[]
  loading: boolean
  onEdit: (operation: ProductionOperationWithRelations) => void
  onComplete: (operationId: string) => void
  onDelete: (operationId: string) => void
  sortColumn: string
  sortDirection: 'asc' | 'desc'
  onSort: (column: string) => void
  onFieldChange?: (operationId: string, field: string, value: unknown) => void
}

// Interface for tracking material selections per operation
interface MaterialSelections {
  [operationId: string]: {
    material?: string
    carateristica?: string
    cor?: string
  }
}

export const OperationsTable: React.FC<OperationsTableProps> = ({
  operations,
  loading,
  onEdit,
  onComplete,
  onDelete,
  sortColumn,
  sortDirection,
  onSort,
  onFieldChange,
}) => {
  // Hook to fetch operators and machines data
  const {
    operators,
    machines,
    loading: dataLoading,
    error: dataError,
  } = useTableData()

  // Hook to fetch materials with cascading functionality
  const {
    materialOptions,
    getCaracteristicaOptions,
    getCorOptions,
    getMaterialId,
    loading: materialsLoading,
    materialsData, // Add this to access the raw materials data
  } = useMaterialsCascading()

  // State to track material selections per operation row
  const [materialSelections, setMaterialSelections] =
    useState<MaterialSelections>({})

  // State to track input field values per operation row
  const [fieldValues, setFieldValues] = useState<{
    [operationId: string]: { [field: string]: unknown }
  }>({})

  // Initialize material selections with existing data when operations change
  React.useEffect(() => {
    const newSelections: MaterialSelections = {}

    operations.forEach((operation) => {
      const materialId = operation.material_id
      if (materialId) {
        // Find the material data based on the stored material_id
        const foundMaterial = materialsData.find(
          (m: any) => m.id === materialId,
        )
        if (foundMaterial) {
          newSelections[operation.id] = {
            material: foundMaterial.material,
            carateristica: foundMaterial.carateristica,
            cor: foundMaterial.cor,
          }
        }
      }
    })

    setMaterialSelections(newSelections)

    // Initialize field values with existing data
    const newFieldValues: {
      [operationId: string]: { [field: string]: unknown }
    } = {}
    operations.forEach((operation) => {
      newFieldValues[operation.id] = {
        num_placas_print: operation.num_placas_print ?? 0,
        num_placas_corte: operation.num_placas_corte ?? 0,
        observacoes: operation.observacoes ?? '',
        no_interno: operation.no_interno ?? '',
      }
    })
    setFieldValues(newFieldValues)
  }, [operations, materialsData])

  // Handler for material selection changes
  const handleMaterialChange = useCallback(
    (
      operationId: string,
      field: 'material' | 'carateristica' | 'cor',
      value: string,
    ) => {
      setMaterialSelections((prev) => {
        const currentSelection = prev[operationId] || {}

        // When material changes, reset características and cor
        if (field === 'material') {
          const newSelection = { material: value }

          // Also send the material ID to the database
          const materialId = getMaterialId(value || undefined)
          if (materialId) {
            onFieldChange?.(operationId, 'material_id', materialId)
          }

          return { ...prev, [operationId]: newSelection }
        }

        // When características changes, reset cor but keep material
        if (field === 'carateristica') {
          const newSelection = {
            ...currentSelection,
            carateristica: value,
            cor: undefined, // Reset color when characteristic changes
          }

          // Send updated material ID based on material + characteristic
          const materialId = getMaterialId(
            currentSelection.material || undefined,
            value || undefined,
          )
          if (materialId) {
            onFieldChange?.(operationId, 'material_id', materialId)
          }

          return { ...prev, [operationId]: newSelection }
        }

        // When cor changes, keep material and características
        if (field === 'cor') {
          const newSelection = { ...currentSelection, cor: value }

          // Send final material ID based on complete selection
          const materialId = getMaterialId(
            currentSelection.material || undefined,
            currentSelection.carateristica || undefined,
            value || undefined,
          )
          if (materialId) {
            onFieldChange?.(operationId, 'material_id', materialId)
          }

          return { ...prev, [operationId]: newSelection }
        }

        return prev
      })
    },
    [getMaterialId, onFieldChange],
  )

  // Handler for input field changes (maintains local state)
  const handleInputFieldChange = useCallback(
    (operationId: string, field: string, value: unknown) => {
      // Update local state immediately
      setFieldValues((prev) => ({
        ...prev,
        [operationId]: {
          ...prev[operationId],
          [field]: value,
        },
      }))

      // Call the database update
      onFieldChange?.(operationId, field, value)
    },
    [onFieldChange],
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatTime = (timeString?: string | null) => {
    if (!timeString) return '-'
    return timeString.slice(0, 5) // HH:MM
  }

  const handleComplete = (operation: ProductionOperationWithRelations) => {
    // Non-destructive: proceed without confirmation
    onComplete(operation.id)
  }

  const handleDelete = (operation: ProductionOperationWithRelations) => {
    if (
      window.confirm(
        `Tem certeza que deseja excluir a operação ${operation.no_interno}?`,
      )
    ) {
      onDelete(operation.id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="border-border border bg-white shadow">
      <div className="overflow-x-auto">
        <Table className="w-full table-fixed border-0 uppercase [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
          <TableHeader className="bg-[var(--orange)]">
            <TableRow>
              <TableHead
                className="w-[180px] cursor-pointer py-2 text-xs font-bold uppercase select-none"
                onClick={() => onSort('data_operacao')}
              >
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Data</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Data</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {sortColumn === 'data_operacao' && (
                    <span>
                      {sortDirection === 'asc' ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead
                className="w-[100px] cursor-pointer py-2 text-xs font-bold uppercase select-none"
                onClick={() => onSort('folhas_obras.numero_fo')}
              >
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>FO</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>FO</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {sortColumn === 'folhas_obras.numero_fo' && (
                    <span>
                      {sortDirection === 'asc' ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead
                className="w-[120px] cursor-pointer py-2 text-xs font-bold uppercase select-none"
                onClick={() => onSort('operador_id')}
              >
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Operador</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Operador</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {sortColumn === 'operador_id' && (
                    <span>
                      {sortDirection === 'asc' ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead className="w-[140px] py-2 text-xs font-bold uppercase select-none">
                Máquinas
              </TableHead>
              <TableHead className="flex-1 py-2 text-xs font-bold uppercase select-none">
                Item
              </TableHead>
              <TableHead
                className="w-[100px] cursor-pointer py-2 text-xs font-bold uppercase select-none"
                onClick={() => onSort('no_interno')}
              >
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Nº Interno</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Nº Interno</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {sortColumn === 'no_interno' && (
                    <span>
                      {sortDirection === 'asc' ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead className="w-[120px] px-2 py-2 text-xs font-bold uppercase select-none">
                Referência
              </TableHead>
              <TableHead className="w-[120px] px-2 py-2 text-xs font-bold uppercase select-none">
                Ref. Fornecedor
              </TableHead>
              <TableHead className="w-[120px] px-2 py-2 text-xs font-bold uppercase select-none">
                Tipo Canal
              </TableHead>
              <TableHead className="w-[120px] px-2 py-2 text-xs font-bold uppercase select-none">
                Dimensões
              </TableHead>
              <TableHead className="w-[120px] px-2 py-2 text-xs font-bold uppercase select-none">
                Valor m² Custo
              </TableHead>
              <TableHead className="w-[120px] px-2 py-2 text-xs font-bold uppercase select-none">
                Valor Placa
              </TableHead>
              <TableHead className="w-[120px] px-2 py-2 text-xs font-bold uppercase select-none">
                Valor/m²
              </TableHead>
              <TableHead className="w-[120px] px-2 py-2 text-xs font-bold uppercase select-none">
                Qt. Palete
              </TableHead>
              <TableHead className="w-[140px] px-2 py-2 text-xs font-bold uppercase select-none">
                Material
              </TableHead>
              <TableHead className="w-[160px] px-2 py-2 text-xs font-bold uppercase select-none">
                Características
              </TableHead>
              <TableHead className="w-[220px] px-2 py-2 text-xs font-bold uppercase select-none">
                Cor
              </TableHead>
              <TableHead
                className="w-[90px] cursor-pointer px-2 py-2 text-right text-xs font-bold uppercase select-none"
                onClick={() => onSort('num_placas_print')}
              >
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Print</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Print</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {sortColumn === 'num_placas_print' && (
                    <span>
                      {sortDirection === 'asc' ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead
                className="w-[90px] cursor-pointer px-2 py-2 text-right text-xs font-bold uppercase select-none"
                onClick={() => onSort('num_placas_corte')}
              >
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Corte</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Corte</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {sortColumn === 'num_placas_corte' && (
                    <span>
                      {sortDirection === 'asc' ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead className="w-[50px] py-2 text-center text-xs font-bold uppercase select-none">
                Notas
              </TableHead>
              <TableHead
                className="w-[100px] cursor-pointer py-2 text-xs font-bold uppercase select-none"
                onClick={() => onSort('concluido')}
              >
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Concluído</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Concluído</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {sortColumn === 'concluido' && (
                    <span>
                      {sortDirection === 'asc' ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead className="w-[120px] py-2 text-center text-xs font-bold uppercase select-none">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={14}
                  className="py-8 text-center text-gray-500"
                >
                  Nenhuma operação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              operations.map((operation) => {
                const materialData = materialSelections[operation.id] ?? {}
                return (
                  <TableRow
                    key={operation.id}
                    className="hover:bg-[var(--main)]"
                  >
                    <TableCell className="font-mono text-xs">
                      <DatePicker
                        selected={
                          operation.data_operacao
                            ? new Date(operation.data_operacao)
                            : new Date()
                        }
                        onSelect={(date) => {
                          debugLog('Date selected:', date)
                        }}
                        placeholder="Data"
                        buttonClassName="w-full h-10 text-sm"
                      />
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {operation.folhas_obras?.numero_fo}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={operation.operador_id || ''}
                        onValueChange={(value) =>
                          onFieldChange?.(operation.id, 'operador_id', value)
                        }
                      >
                        <SelectTrigger className="h-10 w-full text-sm">
                          <SelectValue placeholder="Operador" />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map((operator) => (
                            <SelectItem
                              key={operator.value}
                              value={operator.value}
                            >
                              {operator.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={operation.maquina || ''}
                        onValueChange={(value) =>
                          onFieldChange?.(operation.id, 'maquina_id', value)
                        }
                      >
                        <SelectTrigger className="h-10 w-full text-sm">
                          <SelectValue placeholder="Máquina" />
                        </SelectTrigger>
                        <SelectContent>
                          {machines.map((machine) => (
                            <SelectItem
                              key={machine.value}
                              value={machine.value}
                            >
                              {machine.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {operation.descricao}
                        </div>
                        {operation.codigo && (
                          <div className="truncate font-mono text-xs text-gray-500">
                            {operation.codigo}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="P1236"
                        className="h-10 w-full text-sm"
                        value={fieldValues[operation.id]?.no_interno ?? ''}
                        onChange={(e) =>
                          handleInputFieldChange(
                            operation.id,
                            'no_interno',
                            e.target.value,
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>{materialData.referencia ?? '-'}</TableCell>
                    <TableCell>{materialData.ref_fornecedor ?? '-'}</TableCell>
                    <TableCell>{materialData.tipo_canal ?? '-'}</TableCell>
                    <TableCell>{materialData.dimensoes ?? '-'}</TableCell>
                    <TableCell>
                      {typeof materialData.valor_m2_custo === 'number'
                        ? materialData.valor_m2_custo.toLocaleString('pt-PT', {
                            style: 'currency',
                            currency: 'EUR',
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {typeof materialData.valor_placa === 'number'
                        ? materialData.valor_placa.toLocaleString('pt-PT', {
                            style: 'currency',
                            currency: 'EUR',
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {typeof materialData.valor_m2 === 'number'
                        ? materialData.valor_m2.toLocaleString('pt-PT', {
                            style: 'currency',
                            currency: 'EUR',
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>{materialData.qt_palete ?? '-'}</TableCell>
                    <TableCell className="w-[140px] px-2">
                      <Select
                        value={materialData.material ?? ''}
                        onValueChange={(value) =>
                          handleMaterialChange(operation.id, 'material', value)
                        }
                        disabled={materialsLoading}
                      >
                        <SelectTrigger className="h-10 w-full text-sm">
                          <SelectValue placeholder="Material" />
                        </SelectTrigger>
                        <SelectContent>
                          {materialOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="w-[160px] px-2">
                      <Select
                        value={materialData.carateristica ?? ''}
                        onValueChange={(value) =>
                          handleMaterialChange(
                            operation.id,
                            'carateristica',
                            value,
                          )
                        }
                        disabled={materialsLoading || !materialData.material}
                      >
                        <SelectTrigger className="h-10 w-full text-sm">
                          <SelectValue placeholder="Car" />
                        </SelectTrigger>
                        <SelectContent>
                          {getCaracteristicaOptions(
                            materialData.material ?? '',
                          ).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="w-[220px] px-2">
                      <Select
                        value={materialData.cor ?? ''}
                        onValueChange={(value) =>
                          handleMaterialChange(operation.id, 'cor', value)
                        }
                        disabled={materialsLoading || !materialData.material}
                      >
                        <SelectTrigger className="h-10 w-full text-sm">
                          <SelectValue placeholder="Cor" />
                        </SelectTrigger>
                        <SelectContent>
                          {getCorOptions(
                            materialData.material ?? '',
                            materialData.carateristica ?? '',
                          ).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="w-[120px] px-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        className="h-10 w-full text-right text-sm"
                        min="0"
                        value={
                          fieldValues[operation.id]?.num_placas_print ??
                          operation.num_placas_print ??
                          0
                        }
                        onChange={(e) =>
                          handleInputFieldChange(
                            operation.id,
                            'num_placas_print',
                            e.target.value,
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="w-[120px] px-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        className="h-10 w-full text-right text-sm"
                        min="0"
                        value={
                          fieldValues[operation.id]?.num_placas_corte ??
                          operation.num_placas_corte ??
                          0
                        }
                        onChange={(e) =>
                          handleInputFieldChange(
                            operation.id,
                            'num_placas_corte',
                            e.target.value,
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <SimpleNotasPopover
                        value={
                          fieldValues[operation.id]?.observacoes ??
                          operation.observacoes ??
                          ''
                        }
                        onSave={(value: string) => {
                          handleInputFieldChange(
                            operation.id,
                            'observacoes',
                            value,
                          )
                        }}
                        placeholder="Adicionar notas..."
                        label="Notas"
                        buttonSize="icon"
                        className="mx-auto aspect-square"
                        disabled={false}
                      />
                    </TableCell>
                    <TableCell className="p-2 text-sm">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={operation.concluido ?? false}
                          onCheckedChange={(value) => {
                            onComplete(operation.id)
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="flex w-[120px] justify-center gap-2 pr-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="flex aspect-square size-10 items-center justify-center !p-0"
                        onClick={() => {
                          debugLog(
                            'Duplicate button clicked for operation:',
                            operation,
                          )
                          // onDuplicateOperation(operation); // Add this when you have the function
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="flex aspect-square size-10 items-center justify-center !p-0"
                        onClick={() => handleDelete(operation)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

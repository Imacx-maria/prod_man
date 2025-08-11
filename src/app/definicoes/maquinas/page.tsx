'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import Combobox from '@/components/ui/Combobox'
import { debugLog } from '@/utils/devLogger'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerDescription,
} from '@/components/ui/drawer'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus, Trash2, X, Loader2, Edit, RotateCw } from 'lucide-react'
import PermissionGuard from '@/components/PermissionGuard'
// Machine types for combobox
const MACHINE_TYPES = [
  { value: 'Impressao', label: 'Impressão' },
  { value: 'Corte', label: 'Corte' },
  { value: 'Acabamento', label: 'Acabamento' },
  { value: 'Outros', label: 'Outros' },
]

// Value debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

interface Maquina {
  id: string
  nome_maquina: string
  tipo: string
  ativa: boolean
  valor_m2: number | null
  valor_m2_custo: number | null
}

export default function MaquinasPage() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([])
  const [loading, setLoading] = useState(true)
  const [nameFilter, setNameFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({
    nome_maquina: '',
    valor_m2: '',
    tipo: '',
    ativa: true,
  })

  // Debounced filter values for performance
  const debouncedNameFilter = useDebounce(nameFilter, 300)

  const supabase = createBrowserClient()

  // Convert to database-level filtering
  const fetchMaquinas = useCallback(
    async (filters: { nameFilter?: string } = {}) => {
      setLoading(true)
      try {
        debugLog('Fetching maquinas...', filters)
        debugLog(
          'nameFilter type:',
          typeof filters.nameFilter,
          'value:',
          filters.nameFilter,
        )
        let query = supabase.from('maquinas_operacao').select('*')

        // Apply filters at database level
        if (
          filters.nameFilter &&
          typeof filters.nameFilter === 'string' &&
          filters.nameFilter.trim()
        ) {
          query = query.ilike('nome_maquina', `%${filters.nameFilter.trim()}%`)
        }

        const { data, error } = await query.order('nome_maquina', {
          ascending: true,
        })

        debugLog('Maquinas operacao fetch result:', { data, error })

        if (error) {
          console.error('Supabase error fetching maquinas_operacao:', error)
          alert(`Error fetching maquinas: ${error.message}`)
        } else if (data) {
          debugLog('Successfully fetched maquinas_operacao:', data)
          setMaquinas(data)
        }
      } catch (error) {
        console.error('JavaScript error fetching maquinas:', error)
        alert(`JavaScript error: ${error}`)
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  // Initial load
  useEffect(() => {
    fetchMaquinas()
  }, [fetchMaquinas])

  // Trigger search when filter changes
  useEffect(() => {
    fetchMaquinas({ nameFilter: debouncedNameFilter })
  }, [debouncedNameFilter, fetchMaquinas])

  // Remove client-side filtering - now using database-level filtering
  const filteredMaquinas = maquinas

  // Add handler for inline add
  const handleAddNew = () => {
    if (editingId !== null) return
    setEditingId('new')
    setEditData({
      maquina: '',
      valor_m2: '',
    })
  }

  // Save handler for new row
  const handleAddSave = async () => {
    if (!editData.maquina?.trim()) return
    setSubmitting(true)
    try {
      const valorM2 = editData.valor_m2 ? parseFloat(editData.valor_m2) : null
      const { data, error } = await supabase
        .from('maquinas')
        .insert({
          maquina: editData.maquina,
          valor_m2: valorM2,
        })
        .select('*')
      if (!error && data && data[0]) {
        setMaquinas((prev) => [data[0], ...prev])
      }
      setEditingId(null)
      setEditData({ maquina: '', valor_m2: '' })
    } catch (error) {
      console.error('Error creating maquina:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Inline edit handlers
  const handleEdit = (maquina: Maquina) => {
    setEditingId(maquina.id)
    setEditData({
      nome_maquina: maquina.nome_maquina || '',
      tipo: maquina.tipo || '',
      ativa: maquina.ativa,
      valor_m2:
        maquina.valor_m2 !== null && maquina.valor_m2 !== undefined
          ? maquina.valor_m2.toString()
          : '',
    })
  }

  // Save handler for edit
  const handleEditSave = async (id: string) => {
    if (id === 'new') {
      await handleAddSave()
      return
    }
    if (!editData.maquina?.trim()) return
    setSubmitting(true)
    try {
      const valorM2 = editData.valor_m2 ? parseFloat(editData.valor_m2) : null
      const updates = {
        maquina: editData.maquina,
        valor_m2: valorM2,
      }
      const { error } = await supabase
        .from('maquinas')
        .update(updates)
        .eq('id', id)
      if (!error) {
        setMaquinas((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        )
      }
      setEditingId(null)
      setEditData({ maquina: '', valor_m2: '' })
    } catch (error) {
      console.error('Error updating maquina:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Cancel handler
  const handleEditCancel = () => {
    setEditingId(null)
    setEditData({ maquina: '', valor_m2: '' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta máquina?')) return

    try {
      const { error } = await supabase.from('maquinas').delete().eq('id', id)

      if (!error) {
        setMaquinas((prev) => prev.filter((m) => m.id !== id))
      }
    } catch (error) {
      console.error('Error deleting maquina:', error)
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-'
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  return (
    <PermissionGuard>
      <div className="w-full space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gestão de Máquinas</h1>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchMaquinas()}
                    aria-label="Atualizar"
                    className="h-10 w-10 rounded-none"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleAddNew}
                    variant="default"
                    size="icon"
                    aria-label="Adicionar"
                    disabled={editingId !== null}
                    className="h-10 w-10 rounded-none"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Adicionar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filtrar por nome da máquina..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="h-10 w-[300px] rounded-none"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setNameFilter('')}
                  aria-label="Limpar filtro"
                  className="h-10 w-10 rounded-none"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Limpar filtro</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    fetchMaquinas({ nameFilter: debouncedNameFilter })
                  }
                  aria-label="Atualizar"
                  className="h-10 w-10 rounded-none"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Table */}
        <div className="border-border bg-background w-full rounded-none border-2">
          <div className="w-full rounded-none">
            <Table className="w-full rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="border-border sticky top-0 z-10 min-w-[300px] border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Nome da Máquina
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[120px] border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Tipo
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[80px] border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                    Ativa
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[150px] border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Valor/m²
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[140px] border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-40 text-center uppercase"
                    >
                      <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filteredMaquinas.length === 0 && editingId !== 'new' ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-gray-500 uppercase"
                    >
                      Nenhuma máquina encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Inline add row at the top if editingId === 'new' */}
                    {editingId === 'new' && (
                      <TableRow>
                        <TableCell className="uppercase">-</TableCell>
                        <TableCell className="font-medium uppercase">
                          <Input
                            value={editData.maquina}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                maquina: e.target.value,
                              }))
                            }
                            className="h-10 rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                            autoFocus
                            required
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            value={editData.valor_m2}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                valor_m2: e.target.value,
                              }))
                            }
                            className="h-10 rounded-none border-0 text-right text-sm outline-0 focus:border-0 focus:ring-0"
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="flex justify-center gap-2">
                          {/* Save button */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={handleAddSave}
                                  disabled={
                                    submitting || !editData.maquina?.trim()
                                  }
                                  aria-label="Guardar"
                                  className="h-10 w-10 rounded-none"
                                >
                                  <span className="text-xs">✓</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Guardar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {/* Cancel button */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={handleEditCancel}
                                  disabled={submitting}
                                  aria-label="Cancelar"
                                  className="h-10 w-10 rounded-none"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancelar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredMaquinas.map((maquina) => (
                      <TableRow key={maquina.id}>
                        <TableCell className="font-medium uppercase">
                          {editingId === maquina.id ? (
                            <Input
                              value={editData.nome_maquina}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  nome_maquina: e.target.value,
                                }))
                              }
                              className="h-10 rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                              autoFocus
                              required
                              disabled={submitting}
                            />
                          ) : (
                            maquina.nome_maquina || '-'
                          )}
                        </TableCell>
                        <TableCell className="uppercase">
                          {editingId === maquina.id ? (
                            <Combobox
                              value={editData.tipo}
                              onChange={(value) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  tipo: value,
                                }))
                              }
                              options={MACHINE_TYPES}
                              placeholder="Selecionar tipo"
                              disabled={submitting}
                              className="w-full"
                              maxWidth="120px"
                            />
                          ) : (
                            MACHINE_TYPES.find((t) => t.value === maquina.tipo)
                              ?.label ||
                            maquina.tipo ||
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingId === maquina.id ? (
                            <Checkbox
                              checked={editData.ativa}
                              onCheckedChange={(checked) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  ativa: checked === true,
                                }))
                              }
                              disabled={submitting}
                            />
                          ) : (
                            <Checkbox checked={maquina.ativa} disabled />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === maquina.id ? (
                            <Input
                              value={editData.valor_m2}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  valor_m2: e.target.value,
                                }))
                              }
                              className="h-10 rounded-none border-0 text-right text-sm outline-0 focus:border-0 focus:ring-0"
                              type="number"
                              step="0.01"
                              min="0"
                              disabled={submitting}
                            />
                          ) : (
                            formatCurrency(maquina.valor_m2)
                          )}
                        </TableCell>
                        <TableCell className="flex justify-center gap-2">
                          {editingId === maquina.id ? (
                            <>
                              {/* Save button */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="default"
                                      size="icon"
                                      onClick={() => handleEditSave(maquina.id)}
                                      disabled={
                                        submitting || !editData.maquina?.trim()
                                      }
                                      aria-label="Guardar"
                                      className="h-10 w-10 rounded-none"
                                    >
                                      <span className="text-xs">✓</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Guardar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {/* Cancel button */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={handleEditCancel}
                                      disabled={submitting}
                                      aria-label="Cancelar"
                                      className="h-10 w-10 rounded-none"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Cancelar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          ) : (
                            <>
                              {/* Edit button */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="default"
                                      size="icon"
                                      onClick={() => handleEdit(maquina)}
                                      aria-label="Editar"
                                      disabled={editingId !== null}
                                      className="h-10 w-10 rounded-none"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {/* Delete button */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      onClick={() => handleDelete(maquina.id)}
                                      aria-label="Eliminar"
                                      disabled={editingId !== null}
                                      className="h-10 w-10 rounded-none"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Eliminar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Drawer for add/edit form - keeping structure but marking as unused */}
        <Drawer open={false} onOpenChange={() => {}}>
          <DrawerContent className="border-border !top-0 !mt-0 h-screen min-h-screen rounded-none border-2">
            <div className="flex h-full w-full flex-col px-4 md:px-8">
              <DrawerHeader className="flex-none">
                <div className="mb-2 flex items-center justify-end gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label="Fechar"
                          onClick={() => {}}
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Fechar</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <DrawerTitle>
                  {editingId === 'new' ? 'Nova Máquina' : 'Editar Máquina'}
                </DrawerTitle>
                <DrawerDescription>
                  {editingId === 'new'
                    ? 'Preencha as informações para criar uma nova máquina.'
                    : 'Edite as informações da máquina abaixo.'}
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex-grow overflow-y-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (editingId === null) return
                    if (editingId === 'new') {
                      handleAddSave()
                    } else {
                      handleEditSave(editingId)
                    }
                  }}
                  className="space-y-6"
                >
                  <div>
                    <Label htmlFor="maquina" className="font-base text-sm">
                      Nome da Máquina *
                    </Label>
                    <Input
                      id="maquina"
                      value={editData.maquina}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          maquina: e.target.value,
                        }))
                      }
                      placeholder="Nome da máquina"
                      required
                      className="h-10 rounded-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="valor_m2" className="font-base text-sm">
                      Valor por m² (€)
                    </Label>
                    <Input
                      id="valor_m2"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editData.valor_m2}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          valor_m2: e.target.value,
                        }))
                      }
                      placeholder="Ex: 15.50"
                      className="h-10 rounded-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={submitting || !editData.maquina?.trim()}
                      className="h-10 rounded-none"
                    >
                      {submitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {editingId === 'new' ? 'Criar Máquina' : 'Guardar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleEditCancel}
                      className="h-10 rounded-none"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </PermissionGuard>
  )
}

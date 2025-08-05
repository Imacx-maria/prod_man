'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Plus, Trash2, RotateCw, X, Pencil, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import PermissionGuard from '@/components/PermissionGuard'
import CreatableFornecedorCombobox, {
  FornecedorOption,
} from '@/components/CreatableFornecedorCombobox'

interface IvaExcepcao {
  id: string
  nome_fornecedor: string
  taxa_iva: number
  ativo: boolean
  notas: string | null
  created_at: string
  updated_at: string
}

export default function IvaExcepcoesPage() {
  const [ivaExcepcoes, setIvaExcepcoes] = useState<IvaExcepcao[]>([])
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingFornecedores, setLoadingFornecedores] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [nameFilter, setNameFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({
    nome_fornecedor: '',
    taxa_iva: '',
    ativo: true,
    notas: '',
  })

  const debouncedNameFilter = useDebounce(nameFilter, 300)

  // Auto-fetch when debounced filter changes
  useEffect(() => {
    if (debouncedNameFilter !== null) {
      fetchIvaExcepcoes()
    }
  }, [debouncedNameFilter])

  // Clear filter functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nameFilter === '') {
        fetchIvaExcepcoes()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [nameFilter])

  const supabase = createBrowserClient()

  // Fetch fornecedores for combobox from listagem_compras
  const fetchFornecedores = useCallback(async () => {
    setLoadingFornecedores(true)
    try {
      // Fetch ALL records with a high limit to ensure we get all suppliers
      let allData: any[] = []
      let hasMore = true
      let offset = 0
      const batchSize = 1000

      while (hasMore) {
        const { data, error } = await supabase
          .from('listagem_compras')
          .select('nome_fornecedor')
          .not('nome_fornecedor', 'is', null)
          .range(offset, offset + batchSize - 1)
          .order('nome_fornecedor', { ascending: true })

        if (error) {
          console.error('Error fetching batch:', error)
          break
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data]
          offset += batchSize
          hasMore = data.length === batchSize
        } else {
          hasMore = false
        }
      }

      if (allData.length > 0) {
        // Get unique fornecedor names (since suppliers appear multiple times in listagem_compras)
        const uniqueFornecedores = [
          ...new Set(allData.map((item) => item.nome_fornecedor)),
        ]

        const fornecedoresOptions = uniqueFornecedores.map((nome) => ({
          value: nome,
          label: nome,
        }))
        setFornecedores(fornecedoresOptions)
      }
    } catch (error) {
      console.error('Error fetching fornecedores from listagem_compras:', error)
    } finally {
      setLoadingFornecedores(false)
    }
  }, [supabase])

  // Convert to database-level filtering
  const fetchIvaExcepcoes = useCallback(
    async (filters: { nameFilter?: string } = {}) => {
      setLoading(true)
      try {
        let query = supabase.from('iva_excepcoes').select('*')

        // Apply filters at database level
        if (filters.nameFilter?.trim?.()) {
          const searchTerm = filters.nameFilter.trim()
          query = query.ilike('nome_fornecedor', `%${searchTerm}%`)
        }

        const { data, error } = await query.order('nome_fornecedor', {
          ascending: true,
        })

        if (!error && data) {
          setIvaExcepcoes(data)
        }
      } catch (error) {
        console.error('Error fetching iva excepcoes:', error)
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  // Initial load
  useEffect(() => {
    fetchFornecedores()
    fetchIvaExcepcoes()
  }, [fetchFornecedores, fetchIvaExcepcoes])

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta exceção de IVA?')) return

    try {
      const { error } = await supabase
        .from('iva_excepcoes')
        .delete()
        .eq('id', id)

      if (!error) {
        setIvaExcepcoes((prev) => prev.filter((i) => i.id !== id))
      }
    } catch (error) {
      console.error('Error deleting iva excepcao:', error)
    }
  }

  // Add handler for inline add
  const handleAddNew = () => {
    if (editingId !== null) return
    setEditingId('new')
    setEditData({
      nome_fornecedor: '',
      taxa_iva: '',
      ativo: true,
      notas: '',
    })
  }

  // Save handler for new row
  const handleAddSave = async () => {
    if (!editData.nome_fornecedor.trim() || !editData.taxa_iva.trim()) return

    const taxaIva = parseFloat(editData.taxa_iva)
    if (isNaN(taxaIva) || taxaIva < 0 || taxaIva > 100) {
      alert('Taxa de IVA deve ser um número entre 0 e 100')
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('iva_excepcoes')
        .insert({
          nome_fornecedor: editData.nome_fornecedor,
          taxa_iva: taxaIva,
          ativo: editData.ativo,
          notas: editData.notas || null,
        })
        .select('*')
      if (!error && data && data[0]) {
        setIvaExcepcoes((prev) => [data[0], ...prev])
      }
      setEditingId(null)
      setEditData({
        nome_fornecedor: '',
        taxa_iva: '',
        ativo: true,
        notas: '',
      })
    } catch (error) {
      console.error('Error creating iva excepcao:', error)
      if (error.message?.includes('unique')) {
        alert('Já existe uma exceção de IVA para este fornecedor')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Inline edit handlers
  const handleEdit = (ivaExcepcao: IvaExcepcao) => {
    setEditingId(ivaExcepcao.id)
    setEditData({
      nome_fornecedor: ivaExcepcao.nome_fornecedor,
      taxa_iva: ivaExcepcao.taxa_iva.toString(),
      ativo: ivaExcepcao.ativo,
      notas: ivaExcepcao.notas || '',
    })
  }

  // Save handler for edit
  const handleEditSave = async (id: string) => {
    if (id === 'new') {
      await handleAddSave()
      return
    }
    if (!editData.nome_fornecedor.trim() || !editData.taxa_iva.trim()) return

    const taxaIva = parseFloat(editData.taxa_iva)
    if (isNaN(taxaIva) || taxaIva < 0 || taxaIva > 100) {
      alert('Taxa de IVA deve ser um número entre 0 e 100')
      return
    }

    setSubmitting(true)
    try {
      const updates = {
        nome_fornecedor: editData.nome_fornecedor,
        taxa_iva: taxaIva,
        ativo: editData.ativo,
        notas: editData.notas || null,
        updated_at: new Date().toISOString().split('T')[0],
      }
      const { error } = await supabase
        .from('iva_excepcoes')
        .update(updates)
        .eq('id', id)
      if (!error) {
        setIvaExcepcoes((prev) =>
          prev.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        )
      }
      setEditingId(null)
      setEditData({
        nome_fornecedor: '',
        taxa_iva: '',
        ativo: true,
        notas: '',
      })
    } catch (error) {
      console.error('Error updating iva excepcao:', error)
      if (error.message?.includes('unique')) {
        alert('Já existe uma exceção de IVA para este fornecedor')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Cancel handler
  const handleEditCancel = () => {
    setEditingId(null)
    setEditData({
      nome_fornecedor: '',
      taxa_iva: '',
      ativo: true,
      notas: '',
    })
  }

  return (
    <PermissionGuard>
      <div className="w-full space-y-6 p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gestão de Exceções de IVA</h1>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchIvaExcepcoes()}
                    className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
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
                    size="icon"
                    disabled={editingId !== null}
                    className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
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
        <div className="mb-6 flex items-center gap-2">
          <Input
            placeholder="Filtrar por nome do fornecedor..."
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
                  className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
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
                    fetchIvaExcepcoes({ nameFilter: debouncedNameFilter })
                  }
                  className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Table */}
        <div className="bg-background border-border w-full rounded-none border-2">
          <div className="max-h-[70vh] w-full overflow-y-auto rounded-none">
            <Table className="w-full rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="border-border sticky top-0 z-10 w-[500px] border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Nome Fornecedor
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[120px] border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Taxa IVA (%)
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[80px] border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                    Ativo
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Notas
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[100px] border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
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
                ) : ivaExcepcoes.length === 0 && editingId !== 'new' ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-gray-500 uppercase"
                    >
                      Nenhuma exceção de IVA encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Inline add row at the top if editingId === 'new' */}
                    {editingId === 'new' && (
                      <TableRow>
                        <TableCell className="font-medium">
                          <CreatableFornecedorCombobox
                            options={fornecedores}
                            value={editData.nome_fornecedor}
                            onChange={(selectedName: string) => {
                              setEditData((prev) => ({
                                ...prev,
                                nome_fornecedor: selectedName,
                              }))
                            }}
                            onOptionsUpdate={setFornecedores}
                            placeholder="Selecionar fornecedor..."
                            className="h-10 rounded-none"
                            disabled={submitting || loadingFornecedores}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={editData.taxa_iva}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                taxa_iva: e.target.value,
                              }))
                            }
                            className="h-10 rounded-none"
                            placeholder="Ex: 23.00"
                            required
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={editData.ativo}
                            onCheckedChange={(checked) =>
                              setEditData((prev) => ({
                                ...prev,
                                ativo: checked as boolean,
                              }))
                            }
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editData.notas}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                notas: e.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-none"
                            placeholder="Notas opcionais..."
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            {/* Save button */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="icon"
                                    onClick={handleAddSave}
                                    disabled={
                                      submitting ||
                                      !editData.nome_fornecedor.trim() ||
                                      !editData.taxa_iva.trim()
                                    }
                                    className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
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
                                    className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cancelar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {ivaExcepcoes.map((ivaExcepcao) => (
                      <TableRow key={ivaExcepcao.id}>
                        <TableCell className="font-medium uppercase">
                          {editingId === ivaExcepcao.id ? (
                            <CreatableFornecedorCombobox
                              options={fornecedores}
                              value={editData.nome_fornecedor}
                              onChange={(selectedName: string) => {
                                setEditData((prev) => ({
                                  ...prev,
                                  nome_fornecedor: selectedName,
                                }))
                              }}
                              onOptionsUpdate={setFornecedores}
                              placeholder="Selecionar fornecedor..."
                              className="h-10 rounded-none"
                              disabled={submitting || loadingFornecedores}
                            />
                          ) : (
                            ivaExcepcao.nome_fornecedor
                          )}
                        </TableCell>
                        <TableCell className="uppercase">
                          {editingId === ivaExcepcao.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={editData.taxa_iva}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  taxa_iva: e.target.value,
                                }))
                              }
                              className="h-10 rounded-none"
                              placeholder="Ex: 23.00"
                              required
                              disabled={submitting}
                            />
                          ) : (
                            `${ivaExcepcao.taxa_iva.toFixed(2)}%`
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingId === ivaExcepcao.id ? (
                            <Checkbox
                              checked={editData.ativo}
                              onCheckedChange={(checked) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  ativo: checked as boolean,
                                }))
                              }
                              disabled={submitting}
                            />
                          ) : (
                            <span className="text-sm">
                              {ivaExcepcao.ativo ? '✓' : '✗'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="uppercase">
                          {editingId === ivaExcepcao.id ? (
                            <Input
                              value={editData.notas}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  notas: e.target.value,
                                }))
                              }
                              className="h-10 w-full rounded-none"
                              placeholder="Notas opcionais..."
                              disabled={submitting}
                            />
                          ) : (
                            ivaExcepcao.notas || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            {editingId === ivaExcepcao.id ? (
                              <>
                                {/* Save button */}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="default"
                                        size="icon"
                                        onClick={() =>
                                          handleEditSave(ivaExcepcao.id)
                                        }
                                        disabled={
                                          submitting ||
                                          !editData.nome_fornecedor.trim() ||
                                          !editData.taxa_iva.trim()
                                        }
                                        className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
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
                                        className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
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
                                        onClick={() => handleEdit(ivaExcepcao)}
                                        disabled={editingId !== null}
                                        className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                      >
                                        <Pencil className="h-4 w-4" />
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
                                        onClick={() =>
                                          handleDelete(ivaExcepcao.id)
                                        }
                                        disabled={editingId !== null}
                                        className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Eliminar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}

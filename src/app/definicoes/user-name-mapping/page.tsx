'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Plus, Trash2, X, Loader2, Pencil, RotateCw } from 'lucide-react'
import PermissionGuard from '@/components/PermissionGuard'

interface UserNameMapping {
  id: string
  initials: string | null
  full_name: string | null
  short_name: string | null
  standardized_name: string
  department: string
  active: boolean
  sales: boolean
  created_at: string
  updated_at: string
}

export default function UserNameMappingPage() {
  const [userMappings, setUserMappings] = useState<UserNameMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [nameFilter, setNameFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({
    initials: '',
    full_name: '',
    short_name: '',
    standardized_name: '',
    department: '',
    active: true,
    sales: false,
  })

  // Debounced filter values for performance
  const [debouncedNameFilter, setDebouncedNameFilter] = useState(nameFilter)

  // Update debounced value with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNameFilter(nameFilter)
    }, 300)
    return () => clearTimeout(timer)
  }, [nameFilter])

  const supabase = createBrowserClient()

  // Convert to database-level filtering
  const fetchUserMappings = useCallback(
    async (filters: { nameFilter?: string } = {}) => {
      setLoading(true)
      try {
        let query = supabase.from('user_name_mapping').select('*')

        // Apply filters at database level
        if (filters.nameFilter?.trim?.()) {
          const searchTerm = filters.nameFilter.trim()
          query = query.or(
            `standardized_name.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,short_name.ilike.%${searchTerm}%,initials.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%`,
          )
        }

        const { data, error } = await query.order('standardized_name', {
          ascending: true,
        })

        if (!error && data) {
          setUserMappings(data)
        }
      } catch (error) {
        console.error('Error fetching user mappings:', error)
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  // Initial load
  useEffect(() => {
    fetchUserMappings()
  }, [fetchUserMappings])

  // Trigger search when filter changes
  useEffect(() => {
    fetchUserMappings({ nameFilter: debouncedNameFilter })
  }, [debouncedNameFilter, fetchUserMappings])

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este mapeamento?')) return

    try {
      const { error } = await supabase
        .from('user_name_mapping')
        .delete()
        .eq('id', id)

      if (!error) {
        setUserMappings((prev) => prev.filter((u) => u.id !== id))
      }
    } catch (error) {
      console.error('Error deleting user mapping:', error)
    }
  }

  // Add handler for inline add
  const handleAddNew = () => {
    if (editingId !== null) return
    setEditingId('new')
    setEditData({
      initials: '',
      full_name: '',
      short_name: '',
      standardized_name: '',
      department: '',
      active: true,
      sales: false,
    })
  }

  // Save handler for new row
  const handleAddSave = async () => {
    if (!editData.standardized_name.trim() || !editData.department.trim())
      return
    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('user_name_mapping')
        .insert({
          initials: editData.initials || null,
          full_name: editData.full_name || null,
          short_name: editData.short_name || null,
          standardized_name: editData.standardized_name,
          department: editData.department,
          active: editData.active,
          sales: editData.sales,
        })
        .select('*')
      if (!error && data && data[0]) {
        setUserMappings((prev) => [data[0], ...prev])
      }
      setEditingId(null)
      setEditData({
        initials: '',
        full_name: '',
        short_name: '',
        standardized_name: '',
        department: '',
        active: true,
        sales: false,
      })
    } catch (error) {
      console.error('Error creating user mapping:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Inline edit handlers
  const handleEdit = (userMapping: UserNameMapping) => {
    setEditingId(userMapping.id)
    setEditData({
      initials: userMapping.initials || '',
      full_name: userMapping.full_name || '',
      short_name: userMapping.short_name || '',
      standardized_name: userMapping.standardized_name,
      department: userMapping.department,
      active: userMapping.active,
      sales: userMapping.sales,
    })
  }

  // Save handler for edit
  const handleEditSave = async (id: string) => {
    if (id === 'new') {
      await handleAddSave()
      return
    }
    if (!editData.standardized_name.trim() || !editData.department.trim())
      return
    setSubmitting(true)
    try {
      const updates = {
        initials: editData.initials || null,
        full_name: editData.full_name || null,
        short_name: editData.short_name || null,
        standardized_name: editData.standardized_name,
        department: editData.department,
        active: editData.active,
        sales: editData.sales,
        updated_at: new Date().toISOString().split('T')[0],
      }
      const { error } = await supabase
        .from('user_name_mapping')
        .update(updates)
        .eq('id', id)
      if (!error) {
        setUserMappings((prev) =>
          prev.map((u) => (u.id === id ? { ...u, ...updates } : u)),
        )
      }
      setEditingId(null)
      setEditData({
        initials: '',
        full_name: '',
        short_name: '',
        standardized_name: '',
        department: '',
        active: true,
        sales: false,
      })
    } catch (error) {
      console.error('Error updating user mapping:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Cancel handler
  const handleEditCancel = () => {
    setEditingId(null)
    setEditData({
      initials: '',
      full_name: '',
      short_name: '',
      standardized_name: '',
      department: '',
      active: true,
      sales: false,
    })
  }

  return (
    <PermissionGuard>
      <div className="w-full space-y-6 p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Gestão de Mapeamento de Utilizadores
          </h1>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchUserMappings()}
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
            placeholder="Filtrar por nome, iniciais ou departamento..."
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
                    fetchUserMappings({ nameFilter: debouncedNameFilter })
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
                  <TableHead className="border-border sticky top-0 z-10 w-[100px] border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Iniciais
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 min-w-[200px] border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Nome Completo
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 min-w-[150px] border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Nome Curto
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 min-w-[200px] border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Nome Padronizado
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 min-w-[150px] border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Departamento
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[80px] border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                    Ativo
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[80px] border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                    Vendas
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
                      colSpan={8}
                      className="h-40 text-center uppercase"
                    >
                      <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : userMappings.length === 0 && editingId !== 'new' ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-gray-500 uppercase"
                    >
                      Nenhum mapeamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Inline add row at the top if editingId === 'new' */}
                    {editingId === 'new' && (
                      <TableRow>
                        <TableCell className="uppercase">
                          <Input
                            value={editData.initials}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                initials: e.target.value,
                              }))
                            }
                            className="h-10 rounded-none"
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="uppercase">
                          <Input
                            value={editData.full_name}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                full_name: e.target.value,
                              }))
                            }
                            className="h-10 rounded-none"
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="uppercase">
                          <Input
                            value={editData.short_name}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                short_name: e.target.value,
                              }))
                            }
                            className="h-10 rounded-none"
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="font-medium uppercase">
                          <Input
                            value={editData.standardized_name}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                standardized_name: e.target.value,
                              }))
                            }
                            className="h-10 rounded-none"
                            autoFocus
                            required
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="uppercase">
                          <Input
                            value={editData.department}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                department: e.target.value,
                              }))
                            }
                            className="h-10 rounded-none"
                            required
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={editData.active}
                            onCheckedChange={(checked) =>
                              setEditData((prev) => ({
                                ...prev,
                                active: checked as boolean,
                              }))
                            }
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={editData.sales}
                            onCheckedChange={(checked) =>
                              setEditData((prev) => ({
                                ...prev,
                                sales: checked as boolean,
                              }))
                            }
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
                                      !editData.standardized_name.trim() ||
                                      !editData.department.trim()
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
                    {userMappings.map((userMapping) => (
                      <TableRow key={userMapping.id}>
                        <TableCell className="uppercase">
                          {editingId === userMapping.id ? (
                            <Input
                              value={editData.initials}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  initials: e.target.value,
                                }))
                              }
                              className="h-10 rounded-none"
                              disabled={submitting}
                            />
                          ) : (
                            userMapping.initials || '-'
                          )}
                        </TableCell>
                        <TableCell className="uppercase">
                          {editingId === userMapping.id ? (
                            <Input
                              value={editData.full_name}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  full_name: e.target.value,
                                }))
                              }
                              className="h-10 rounded-none"
                              disabled={submitting}
                            />
                          ) : (
                            userMapping.full_name || '-'
                          )}
                        </TableCell>
                        <TableCell className="uppercase">
                          {editingId === userMapping.id ? (
                            <Input
                              value={editData.short_name}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  short_name: e.target.value,
                                }))
                              }
                              className="h-10 rounded-none"
                              disabled={submitting}
                            />
                          ) : (
                            userMapping.short_name || '-'
                          )}
                        </TableCell>
                        <TableCell className="font-medium uppercase">
                          {editingId === userMapping.id ? (
                            <Input
                              value={editData.standardized_name}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  standardized_name: e.target.value,
                                }))
                              }
                              className="h-10 rounded-none"
                              autoFocus
                              required
                              disabled={submitting}
                            />
                          ) : (
                            userMapping.standardized_name
                          )}
                        </TableCell>
                        <TableCell className="uppercase">
                          {editingId === userMapping.id ? (
                            <Input
                              value={editData.department}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  department: e.target.value,
                                }))
                              }
                              className="h-10 rounded-none"
                              required
                              disabled={submitting}
                            />
                          ) : (
                            userMapping.department
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingId === userMapping.id ? (
                            <Checkbox
                              checked={editData.active}
                              onCheckedChange={(checked) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  active: checked as boolean,
                                }))
                              }
                              disabled={submitting}
                            />
                          ) : (
                            <span className="text-sm">
                              {userMapping.active ? '✓' : '✗'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingId === userMapping.id ? (
                            <Checkbox
                              checked={editData.sales}
                              onCheckedChange={(checked) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  sales: checked as boolean,
                                }))
                              }
                              disabled={submitting}
                            />
                          ) : (
                            <span className="text-sm">
                              {userMapping.sales ? '✓' : '✗'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            {editingId === userMapping.id ? (
                              <>
                                {/* Save button */}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="default"
                                        size="icon"
                                        onClick={() =>
                                          handleEditSave(userMapping.id)
                                        }
                                        disabled={
                                          submitting ||
                                          !editData.standardized_name.trim() ||
                                          !editData.department.trim()
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
                                        onClick={() => handleEdit(userMapping)}
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
                                          handleDelete(userMapping.id)
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

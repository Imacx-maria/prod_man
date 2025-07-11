'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus, Eye, Trash2, X, Loader2, Edit, RotateCw } from 'lucide-react'
import PermissionGuard from '@/components/PermissionGuard'

interface Fornecedor {
  id: string
  numero_phc: string | null
  nome_forn: string
  morada: string | null
  codigo_pos: string | null
  telefone: string | null
  email: string | null
  contacto_principal: string | null
  created_at: string
  updated_at: string
}

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  // Remove drawer logic and related state
  const [nameFilter, setNameFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({
    numero_phc: '',
    nome_forn: '',
    morada: '',
    codigo_pos: '',
    telefone: '',
    email: '',
    contacto_principal: '',
  })

  const supabase = createBrowserClient()

  const fetchFornecedores = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('nome_forn', { ascending: true })

      if (!error && data) {
        setFornecedores(data)
      }
    } catch (error) {
      console.error('Error fetching fornecedores:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFornecedores()
  }, [])

  const filteredFornecedores = fornecedores.filter(
    (fornecedor) =>
      fornecedor.nome_forn.toLowerCase().includes(nameFilter.toLowerCase()) ||
      (fornecedor.numero_phc &&
        fornecedor.numero_phc
          .toLowerCase()
          .includes(nameFilter.toLowerCase())) ||
      (fornecedor.email &&
        fornecedor.email.toLowerCase().includes(nameFilter.toLowerCase())),
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return

    try {
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id)

      if (!error) {
        setFornecedores((prev) => prev.filter((f) => f.id !== id))
      }
    } catch (error) {
      console.error('Error deleting fornecedor:', error)
    }
  }

  // Add handler for inline add
  const handleAddNew = () => {
    if (editingId !== null) return
    setEditingId('new')
    setEditData({
      numero_phc: '',
      nome_forn: '',
      morada: '',
      codigo_pos: '',
      telefone: '',
      email: '',
      contacto_principal: '',
    })
  }

  // Save handler for new row
  const handleAddSave = async () => {
    if (!editData.nome_forn.trim()) return
    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .insert({
          numero_phc: editData.numero_phc || null,
          nome_forn: editData.nome_forn,
          morada: editData.morada || null,
          codigo_pos: editData.codigo_pos || null,
          telefone: editData.telefone || null,
          email: editData.email || null,
          contacto_principal: editData.contacto_principal || null,
        })
        .select('*')
      if (!error && data && data[0]) {
        setFornecedores((prev) => [data[0], ...prev])
      }
      setEditingId(null)
      setEditData({
        numero_phc: '',
        nome_forn: '',
        morada: '',
        codigo_pos: '',
        telefone: '',
        email: '',
        contacto_principal: '',
      })
    } catch (error) {
      console.error('Error creating fornecedor:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Inline edit handlers
  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingId(fornecedor.id)
    setEditData({
      numero_phc: fornecedor.numero_phc || '',
      nome_forn: fornecedor.nome_forn,
      morada: fornecedor.morada || '',
      codigo_pos: fornecedor.codigo_pos || '',
      telefone: fornecedor.telefone || '',
      email: fornecedor.email || '',
      contacto_principal: fornecedor.contacto_principal || '',
    })
  }

  // Save handler for edit
  const handleEditSave = async (id: string) => {
    if (id === 'new') {
      await handleAddSave()
      return
    }
    if (!editData.nome_forn.trim()) return
    setSubmitting(true)
    try {
      const updates = {
        numero_phc: editData.numero_phc || null,
        nome_forn: editData.nome_forn,
        morada: editData.morada || null,
        codigo_pos: editData.codigo_pos || null,
        telefone: editData.telefone || null,
        email: editData.email || null,
        contacto_principal: editData.contacto_principal || null,
        updated_at: new Date().toISOString().split('T')[0],
      }
      const { error } = await supabase
        .from('fornecedores')
        .update(updates)
        .eq('id', id)
      if (!error) {
        setFornecedores((prev) =>
          prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        )
      }
      setEditingId(null)
      setEditData({
        numero_phc: '',
        nome_forn: '',
        morada: '',
        codigo_pos: '',
        telefone: '',
        email: '',
        contacto_principal: '',
      })
    } catch (error) {
      console.error('Error updating fornecedor:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Cancel handler
  const handleEditCancel = () => {
    setEditingId(null)
    setEditData({
      numero_phc: '',
      nome_forn: '',
      morada: '',
      codigo_pos: '',
      telefone: '',
      email: '',
      contacto_principal: '',
    })
  }

  return (
    <PermissionGuard>
      <div className="w-full space-y-6 p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gestão de Fornecedores</h1>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={fetchFornecedores}
                    aria-label="Atualizar"
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
            placeholder="Filtrar por nome, número PHC ou email..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-[300px] rounded-none"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setNameFilter('')}
                  aria-label="Limpar filtro"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Limpar filtro</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Table */}
        <div className="bg-background border-border w-full rounded-none border-2">
          <div className="max-h-[70vh] w-full overflow-y-auto rounded-none">
            <Table className="w-full rounded-none border-0">
              <TableHeader>
                <TableRow>
                  <TableHead className="border-border sticky top-0 z-10 w-[120px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Número PHC
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 min-w-[200px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Nome do Fornecedor
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 min-w-[250px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Morada
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[120px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Telefone
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 min-w-[200px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Email
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[140px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-40 text-center uppercase"
                    >
                      <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filteredFornecedores.length === 0 && editingId !== 'new' ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-gray-500 uppercase"
                    >
                      Nenhum fornecedor encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Inline add row at the top if editingId === 'new' */}
                    {editingId === 'new' && (
                      <TableRow>
                        <TableCell className="rounded-none uppercase">
                          <Input
                            value={editData.numero_phc}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                numero_phc: e.target.value,
                              }))
                            }
                            className="rounded-none"
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="rounded-none font-medium uppercase">
                          <Input
                            value={editData.nome_forn}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                nome_forn: e.target.value,
                              }))
                            }
                            className="rounded-none"
                            autoFocus
                            required
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="rounded-none uppercase">
                          <Input
                            value={editData.morada}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                morada: e.target.value,
                              }))
                            }
                            className="rounded-none"
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="rounded-none uppercase">
                          <Input
                            value={editData.telefone}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                telefone: e.target.value,
                              }))
                            }
                            className="rounded-none"
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="rounded-none lowercase">
                          <Input
                            value={editData.email}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                            className="rounded-none"
                            disabled={submitting}
                          />
                        </TableCell>
                        <TableCell className="rounded-none">
                          <div className="flex gap-2">
                            {/* Save button */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="icon"
                                    onClick={handleAddSave}
                                    disabled={
                                      submitting || !editData.nome_forn.trim()
                                    }
                                    aria-label="Guardar"
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
                    {filteredFornecedores.map((fornecedor) => (
                      <TableRow key={fornecedor.id}>
                        <TableCell className="rounded-none uppercase">
                          {editingId === fornecedor.id ? (
                            <Input
                              value={editData.numero_phc}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  numero_phc: e.target.value,
                                }))
                              }
                              className="rounded-none"
                              disabled={submitting}
                            />
                          ) : (
                            fornecedor.numero_phc || '-'
                          )}
                        </TableCell>
                        <TableCell className="rounded-none font-medium uppercase">
                          {editingId === fornecedor.id ? (
                            <Input
                              value={editData.nome_forn}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  nome_forn: e.target.value,
                                }))
                              }
                              className="rounded-none"
                              autoFocus
                              required
                              disabled={submitting}
                            />
                          ) : (
                            fornecedor.nome_forn
                          )}
                        </TableCell>
                        <TableCell className="rounded-none uppercase">
                          {editingId === fornecedor.id ? (
                            <Input
                              value={editData.morada}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  morada: e.target.value,
                                }))
                              }
                              className="rounded-none"
                              disabled={submitting}
                            />
                          ) : (
                            fornecedor.morada || '-'
                          )}
                        </TableCell>
                        <TableCell className="rounded-none uppercase">
                          {editingId === fornecedor.id ? (
                            <Input
                              value={editData.telefone}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  telefone: e.target.value,
                                }))
                              }
                              className="rounded-none"
                              disabled={submitting}
                            />
                          ) : (
                            fornecedor.telefone || '-'
                          )}
                        </TableCell>
                        <TableCell className="rounded-none lowercase">
                          {editingId === fornecedor.id ? (
                            <Input
                              value={editData.email}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  email: e.target.value,
                                }))
                              }
                              className="rounded-none"
                              disabled={submitting}
                            />
                          ) : (
                            fornecedor.email || '-'
                          )}
                        </TableCell>
                        <TableCell className="rounded-none">
                          <div className="flex gap-2">
                            {editingId === fornecedor.id ? (
                              <>
                                {/* Save button */}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="default"
                                        size="icon"
                                        onClick={() =>
                                          handleEditSave(fornecedor.id)
                                        }
                                        disabled={
                                          submitting ||
                                          !editData.nome_forn.trim()
                                        }
                                        aria-label="Guardar"
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
                                        onClick={() => handleEdit(fornecedor)}
                                        aria-label="Editar"
                                        disabled={editingId !== null}
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
                                        onClick={() =>
                                          handleDelete(fornecedor.id)
                                        }
                                        aria-label="Eliminar fornecedor"
                                        disabled={editingId !== null}
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

        {/* Drawer for add/edit form */}
      </div>
    </PermissionGuard>
  )
}

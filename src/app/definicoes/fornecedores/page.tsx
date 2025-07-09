'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerDescription } from '@/components/ui/drawer'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Eye, Trash2, X, Loader2, Edit, RotateCw } from 'lucide-react'

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
  const [openDrawer, setOpenDrawer] = useState(false)
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null)
  const [formData, setFormData] = useState({
    numero_phc: '',
    nome_forn: '',
    morada: '',
    codigo_pos: '',
    telefone: '',
    email: '',
    contacto_principal: ''
  })
  const [nameFilter, setNameFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  const filteredFornecedores = fornecedores.filter(fornecedor =>
    fornecedor.nome_forn.toLowerCase().includes(nameFilter.toLowerCase()) ||
    (fornecedor.numero_phc && fornecedor.numero_phc.toLowerCase().includes(nameFilter.toLowerCase())) ||
    (fornecedor.email && fornecedor.email.toLowerCase().includes(nameFilter.toLowerCase()))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome_forn.trim()) return

    setSubmitting(true)
    try {
      if (editingFornecedor) {
        // Update existing fornecedor
        const { data, error } = await supabase
          .from('fornecedores')
          .update({
            numero_phc: formData.numero_phc || null,
            nome_forn: formData.nome_forn,
            morada: formData.morada || null,
            codigo_pos: formData.codigo_pos || null,
            telefone: formData.telefone || null,
            email: formData.email || null,
            contacto_principal: formData.contacto_principal || null,
            updated_at: new Date().toISOString().split('T')[0]
          })
          .eq('id', editingFornecedor.id)
          .select('*')

        if (!error && data && data[0]) {
          setFornecedores(prev => prev.map(f => f.id === editingFornecedor.id ? data[0] : f))
        }
      } else {
        // Create new fornecedor
        const { data, error } = await supabase
          .from('fornecedores')
          .insert({
            numero_phc: formData.numero_phc || null,
            nome_forn: formData.nome_forn,
            morada: formData.morada || null,
            codigo_pos: formData.codigo_pos || null,
            telefone: formData.telefone || null,
            email: formData.email || null,
            contacto_principal: formData.contacto_principal || null
          })
          .select('*')

        if (!error && data && data[0]) {
          setFornecedores(prev => [...prev, data[0]])
        }
      }

      resetForm()
    } catch (error) {
      console.error('Error saving fornecedor:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor)
    setFormData({
      numero_phc: fornecedor.numero_phc || '',
      nome_forn: fornecedor.nome_forn,
      morada: fornecedor.morada || '',
      codigo_pos: fornecedor.codigo_pos || '',
      telefone: fornecedor.telefone || '',
      email: fornecedor.email || '',
      contacto_principal: fornecedor.contacto_principal || ''
    })
    setOpenDrawer(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return

    try {
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id)

      if (!error) {
        setFornecedores(prev => prev.filter(f => f.id !== id))
      }
    } catch (error) {
      console.error('Error deleting fornecedor:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      numero_phc: '',
      nome_forn: '',
      morada: '',
      codigo_pos: '',
      telefone: '',
      email: '',
      contacto_principal: ''
    })
    setEditingFornecedor(null)
    setOpenDrawer(false)
  }

  const openNewForm = () => {
    resetForm()
    setOpenDrawer(true)
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestão de Fornecedores</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={fetchFornecedores} aria-label="Atualizar">
                  <RotateCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={openNewForm} variant="default" size="icon" aria-label="Adicionar">
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Adicionar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-6">
        <Input
          placeholder="Filtrar por nome, número PHC ou email..."
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="w-[300px] rounded-none"
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => setNameFilter('')} aria-label="Limpar filtro">
                <X className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Limpar filtro</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Table */}
      <div className="rounded-none bg-background w-full border-2 border-border">
        <div className="max-h-[70vh] overflow-y-auto w-full rounded-none">
          <Table className="w-full border-0 rounded-none">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[120px] font-bold uppercase rounded-none">
                  Número PHC
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border min-w-[200px] font-bold uppercase rounded-none">
                  Nome do Fornecedor
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border min-w-[250px] font-bold uppercase rounded-none">
                  Morada
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[120px] font-bold uppercase rounded-none">
                  Telefone
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border min-w-[200px] font-bold uppercase rounded-none">
                  Email
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[140px] font-bold uppercase rounded-none">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-40 uppercase">
                    <Loader2 className="animate-spin w-8 h-8 text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredFornecedores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 uppercase">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell className="uppercase rounded-none">{fornecedor.numero_phc || '-'}</TableCell>
                    <TableCell className="font-medium uppercase rounded-none">{fornecedor.nome_forn}</TableCell>
                    <TableCell className="uppercase rounded-none">{fornecedor.morada || '-'}</TableCell>
                    <TableCell className="uppercase rounded-none">{fornecedor.telefone || '-'}</TableCell>
                    <TableCell className="lowercase rounded-none">{fornecedor.email || '-'}</TableCell>
                    <TableCell className="rounded-none">
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => handleEdit(fornecedor)}
                                aria-label="Ver detalhes do fornecedor"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDelete(fornecedor.id)}
                                aria-label="Eliminar fornecedor"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Drawer for add/edit form */}
      <Drawer open={openDrawer} onOpenChange={(open) => !open && resetForm()}>
        <DrawerContent className="h-screen min-h-screen !top-0 !mt-0 rounded-none">
          <div className="w-full px-4 md:px-8 flex flex-col h-full">
            <DrawerHeader className="flex-none">
              <div className="flex justify-end items-center gap-2 mb-2">
                <DrawerClose asChild>
                  <Button variant="outline" size="sm" aria-label="Fechar">
                    <X className="w-5 h-5" />
                  </Button>
                </DrawerClose>
              </div>
              <DrawerTitle>
                {editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </DrawerTitle>
              <DrawerDescription>
                {editingFornecedor 
                  ? 'Edite as informações do fornecedor abaixo.'
                  : 'Preencha as informações para criar um novo fornecedor.'
                }
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-grow overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numero_phc" className="font-base text-sm">
                      Número PHC
                    </Label>
                    <Input
                      id="numero_phc"
                      value={formData.numero_phc}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero_phc: e.target.value }))}
                      placeholder="Número do sistema PHC"
                      className="rounded-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="nome_forn" className="font-base text-sm">
                      Nome do Fornecedor *
                    </Label>
                    <Input
                      id="nome_forn"
                      value={formData.nome_forn}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome_forn: e.target.value }))}
                      placeholder="Nome do fornecedor"
                      required
                      className="rounded-none"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="morada" className="font-base text-sm">
                    Morada
                  </Label>
                  <Textarea
                    id="morada"
                    value={formData.morada}
                    onChange={(e) => setFormData(prev => ({ ...prev, morada: e.target.value }))}
                    placeholder="Morada completa do fornecedor"
                    className="min-h-[80px] h-24 resize-none w-full rounded-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="codigo_pos" className="font-base text-sm">
                      Código Postal
                    </Label>
                    <Input
                      id="codigo_pos"
                      value={formData.codigo_pos}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigo_pos: e.target.value }))}
                      placeholder="Ex: 1000-001"
                      className="rounded-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telefone" className="font-base text-sm">
                      Telefone
                    </Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                      placeholder="Ex: 123456789"
                      className="rounded-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="font-base text-sm">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="fornecedor@exemplo.com"
                      className="rounded-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contacto_principal" className="font-base text-sm">
                      Contacto Principal
                    </Label>
                    <Input
                      id="contacto_principal"
                      value={formData.contacto_principal}
                      onChange={(e) => setFormData(prev => ({ ...prev, contacto_principal: e.target.value }))}
                      placeholder="Nome do contacto principal"
                      className="rounded-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting || !formData.nome_forn.trim()} variant="default">
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {editingFornecedor ? 'Guardar' : 'Criar Fornecedor'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} aria-label="Cancelar">
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
} 
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão de Fornecedores</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={fetchFornecedores}>
                  <RotateCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar lista</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={openNewForm}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrar por nome, número PHC ou email..."
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="w-[300px]"
        />
        <Button variant="outline" size="icon" onClick={() => setNameFilter('')}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md bg-background w-full">
        <div className="max-h-[70vh] overflow-y-auto w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[120px] uppercase">
                  Número PHC
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[200px] uppercase">
                  Nome do Fornecedor
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[250px] uppercase">
                  Morada
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[120px] uppercase">
                  Telefone
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[200px] uppercase">
                  Email
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[140px] uppercase">
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
                    <TableCell className="uppercase">{fornecedor.numero_phc || '-'}</TableCell>
                    <TableCell className="font-medium uppercase">{fornecedor.nome_forn}</TableCell>
                    <TableCell className="uppercase">{fornecedor.morada || '-'}</TableCell>
                    <TableCell className="uppercase">{fornecedor.telefone || '-'}</TableCell>
                    <TableCell className="lowercase">{fornecedor.email || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(fornecedor)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(fornecedor.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
        <DrawerContent className="h-screen min-h-screen !top-0 !mt-0">
          <div className="w-full px-4 md:px-8 flex flex-col h-full">
            <DrawerHeader className="flex-none">
              <div className="flex justify-end items-center gap-2 mb-2">
                <DrawerClose asChild>
                  <Button variant="outline" size="sm">
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
                    className="min-h-[80px] h-24 resize-none w-full"
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
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting || !formData.nome_forn.trim()}>
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {editingFornecedor ? 'Atualizar' : 'Criar'} Fornecedor
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
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
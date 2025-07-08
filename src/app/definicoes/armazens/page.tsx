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

interface Armazem {
  id: string
  numero_phc: string | null
  nome_arm: string
  morada: string | null
  codigo_pos: string | null
  created_at: string
  updated_at: string
}

export default function ArmazensPage() {
  const [armazens, setArmazens] = useState<Armazem[]>([])
  const [loading, setLoading] = useState(true)
  const [openDrawer, setOpenDrawer] = useState(false)
  const [editingArmazem, setEditingArmazem] = useState<Armazem | null>(null)
  const [formData, setFormData] = useState({
    numero_phc: '',
    nome_arm: '',
    morada: '',
    codigo_pos: ''
  })
  const [nameFilter, setNameFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createBrowserClient()

  const fetchArmazens = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('armazens')
        .select('*')
        .order('nome_arm', { ascending: true })

      if (!error && data) {
        setArmazens(data)
      }
    } catch (error) {
      console.error('Error fetching armazens:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArmazens()
  }, [])

  const filteredArmazens = armazens.filter(armazem =>
    armazem.nome_arm.toLowerCase().includes(nameFilter.toLowerCase()) ||
    (armazem.numero_phc && armazem.numero_phc.toLowerCase().includes(nameFilter.toLowerCase()))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome_arm.trim()) return

    setSubmitting(true)
    try {
      if (editingArmazem) {
        // Update existing armazem
        const { data, error } = await supabase
          .from('armazens')
          .update({
            numero_phc: formData.numero_phc || null,
            nome_arm: formData.nome_arm,
            morada: formData.morada || null,
            codigo_pos: formData.codigo_pos || null,
            updated_at: new Date().toISOString().split('T')[0]
          })
          .eq('id', editingArmazem.id)
          .select('*')

        if (!error && data && data[0]) {
          setArmazens(prev => prev.map(a => a.id === editingArmazem.id ? data[0] : a))
        }
      } else {
        // Create new armazem
        const { data, error } = await supabase
          .from('armazens')
          .insert({
            numero_phc: formData.numero_phc || null,
            nome_arm: formData.nome_arm,
            morada: formData.morada || null,
            codigo_pos: formData.codigo_pos || null
          })
          .select('*')

        if (!error && data && data[0]) {
          setArmazens(prev => [...prev, data[0]])
        }
      }

      resetForm()
    } catch (error) {
      console.error('Error saving armazem:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (armazem: Armazem) => {
    setEditingArmazem(armazem)
    setFormData({
      numero_phc: armazem.numero_phc || '',
      nome_arm: armazem.nome_arm,
      morada: armazem.morada || '',
      codigo_pos: armazem.codigo_pos || ''
    })
    setOpenDrawer(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este armazém?')) return

    try {
      const { error } = await supabase
        .from('armazens')
        .delete()
        .eq('id', id)

      if (!error) {
        setArmazens(prev => prev.filter(a => a.id !== id))
      }
    } catch (error) {
      console.error('Error deleting armazem:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      numero_phc: '',
      nome_arm: '',
      morada: '',
      codigo_pos: ''
    })
    setEditingArmazem(null)
    setOpenDrawer(false)
  }

  const openNewForm = () => {
    resetForm()
    setOpenDrawer(true)
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão de Armazéns</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={fetchArmazens}>
                  <RotateCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar lista</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={openNewForm}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Armazém
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrar por nome ou número PHC..."
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
                  Nome do Armazém
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[250px] uppercase">
                  Morada
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[120px] uppercase">
                  Código Postal
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[140px] uppercase">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-40 uppercase">
                    <Loader2 className="animate-spin w-8 h-8 text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredArmazens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 uppercase">
                    Nenhum armazém encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredArmazens.map((armazem) => (
                  <TableRow key={armazem.id}>
                    <TableCell className="uppercase">{armazem.numero_phc || '-'}</TableCell>
                    <TableCell className="font-medium uppercase">{armazem.nome_arm}</TableCell>
                    <TableCell className="uppercase">{armazem.morada || '-'}</TableCell>
                    <TableCell className="uppercase">{armazem.codigo_pos || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(armazem)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(armazem.id)}
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
                {editingArmazem ? 'Editar Armazém' : 'Novo Armazém'}
              </DrawerTitle>
              <DrawerDescription>
                {editingArmazem 
                  ? 'Edite as informações do armazém abaixo.'
                  : 'Preencha as informações para criar um novo armazém.'
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
                    <Label htmlFor="nome_arm" className="font-base text-sm">
                      Nome do Armazém *
                    </Label>
                    <Input
                      id="nome_arm"
                      value={formData.nome_arm}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome_arm: e.target.value }))}
                      placeholder="Nome do armazém"
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
                    placeholder="Morada completa do armazém"
                    className="min-h-[80px] h-24 resize-none w-full"
                  />
                </div>

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

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting || !formData.nome_arm.trim()}>
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {editingArmazem ? 'Atualizar' : 'Criar'} Armazém
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
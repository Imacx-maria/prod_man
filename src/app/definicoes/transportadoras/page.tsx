'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerDescription } from '@/components/ui/drawer'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Trash2, X, Loader2, Edit, RotateCw } from 'lucide-react'

interface Transportadora {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export default function TransportadorasPage() {
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([])
  const [loading, setLoading] = useState(true)
  const [openDrawer, setOpenDrawer] = useState(false)
  const [editingTransportadora, setEditingTransportadora] = useState<Transportadora | null>(null)
  const [formData, setFormData] = useState({
    name: ''
  })
  const [nameFilter, setNameFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createBrowserClient()

  const fetchTransportadoras = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transportadora')
        .select('*')
        .order('name', { ascending: true })

      if (!error && data) {
        setTransportadoras(data)
      }
    } catch (error) {
      console.error('Error fetching transportadoras:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransportadoras()
  }, [])

  const filteredTransportadoras = transportadoras.filter(transportadora =>
    transportadora.name.toLowerCase().includes(nameFilter.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSubmitting(true)
    try {
      if (editingTransportadora) {
        // Update existing transportadora
        const { data, error } = await supabase
          .from('transportadora')
          .update({
            name: formData.name,
            updated_at: new Date().toISOString().split('T')[0]
          })
          .eq('id', editingTransportadora.id)
          .select('*')

        if (!error && data && data[0]) {
          setTransportadoras(prev => prev.map(t => t.id === editingTransportadora.id ? data[0] : t))
        }
      } else {
        // Create new transportadora
        const { data, error } = await supabase
          .from('transportadora')
          .insert({
            name: formData.name
          })
          .select('*')

        if (!error && data && data[0]) {
          setTransportadoras(prev => [...prev, data[0]])
        }
      }

      resetForm()
    } catch (error) {
      console.error('Error saving transportadora:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (transportadora: Transportadora) => {
    setEditingTransportadora(transportadora)
    setFormData({
      name: transportadora.name
    })
    setOpenDrawer(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transportadora?')) return

    try {
      const { error } = await supabase
        .from('transportadora')
        .delete()
        .eq('id', id)

      if (!error) {
        setTransportadoras(prev => prev.filter(t => t.id !== id))
      }
    } catch (error) {
      console.error('Error deleting transportadora:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: ''
    })
    setEditingTransportadora(null)
    setOpenDrawer(false)
  }

  const openNewForm = () => {
    resetForm()
    setOpenDrawer(true)
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão de Transportadoras</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={fetchTransportadoras}>
                  <RotateCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar lista</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={openNewForm}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Transportadora
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrar por nome..."
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
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[300px] uppercase">
                  Nome da Transportadora
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[140px] uppercase">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center h-40 uppercase">
                    <Loader2 className="animate-spin w-8 h-8 text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredTransportadoras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-gray-500 uppercase">
                    Nenhuma transportadora encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransportadoras.map((transportadora) => (
                  <TableRow key={transportadora.id}>
                    <TableCell className="font-medium uppercase">{transportadora.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(transportadora)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(transportadora.id)}
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
                {editingTransportadora ? 'Editar Transportadora' : 'Nova Transportadora'}
              </DrawerTitle>
              <DrawerDescription>
                {editingTransportadora 
                  ? 'Edite o nome da transportadora abaixo.'
                  : 'Insira o nome da nova transportadora.'
                }
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-grow overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name" className="font-base text-sm">
                    Nome da Transportadora *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome da transportadora"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting || !formData.name.trim()}>
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {editingTransportadora ? 'Atualizar' : 'Criar'} Transportadora
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
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

interface Complexidade {
  id: string
  grau: string
}

export default function ComplexidadePage() {
  const [complexidades, setComplexidades] = useState<Complexidade[]>([])
  const [loading, setLoading] = useState(true)
  const [openDrawer, setOpenDrawer] = useState(false)
  const [editingComplexidade, setEditingComplexidade] = useState<Complexidade | null>(null)
  const [formData, setFormData] = useState({
    grau: ''
  })
  const [grauFilter, setGrauFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createBrowserClient()

  const fetchComplexidades = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('complexidade')
        .select('*')
        .order('grau', { ascending: true })

      if (!error && data) {
        setComplexidades(data)
      }
    } catch (error) {
      console.error('Error fetching complexidades:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplexidades()
  }, [])

  const filteredComplexidades = complexidades.filter(complexidade =>
    complexidade.grau.toLowerCase().includes(grauFilter.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.grau.trim()) return

    setSubmitting(true)
    try {
      if (editingComplexidade) {
        // Update existing complexidade
        const { data, error } = await supabase
          .from('complexidade')
          .update({
            grau: formData.grau
          })
          .eq('id', editingComplexidade.id)
          .select('*')

        if (!error && data && data[0]) {
          setComplexidades(prev => prev.map(c => c.id === editingComplexidade.id ? data[0] : c))
        }
      } else {
        // Create new complexidade
        const { data, error } = await supabase
          .from('complexidade')
          .insert({
            grau: formData.grau
          })
          .select('*')

        if (!error && data && data[0]) {
          setComplexidades(prev => [...prev, data[0]])
        }
      }

      resetForm()
    } catch (error) {
      console.error('Error saving complexidade:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (complexidade: Complexidade) => {
    setEditingComplexidade(complexidade)
    setFormData({
      grau: complexidade.grau
    })
    setOpenDrawer(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este nível de complexidade?')) return

    try {
      const { error } = await supabase
        .from('complexidade')
        .delete()
        .eq('id', id)

      if (!error) {
        setComplexidades(prev => prev.filter(c => c.id !== id))
      }
    } catch (error) {
      console.error('Error deleting complexidade:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      grau: ''
    })
    setEditingComplexidade(null)
    setOpenDrawer(false)
  }

  const openNewForm = () => {
    resetForm()
    setOpenDrawer(true)
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão de Complexidade</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={fetchComplexidades}>
                  <RotateCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar lista</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={openNewForm}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Nível
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrar por grau..."
          value={grauFilter}
          onChange={(e) => setGrauFilter(e.target.value)}
          className="w-[300px]"
        />
        <Button variant="outline" size="icon" onClick={() => setGrauFilter('')}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md bg-background w-full">
        <div className="max-h-[70vh] overflow-y-auto w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[300px]">
                  Grau de Complexidade
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[140px]">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center h-40">
                    <Loader2 className="animate-spin w-8 h-8 text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredComplexidades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-gray-500">
                    Nenhum nível de complexidade encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredComplexidades.map((complexidade) => (
                  <TableRow key={complexidade.id}>
                    <TableCell className="font-medium">{complexidade.grau}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(complexidade)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(complexidade.id)}
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
                {editingComplexidade ? 'Editar Complexidade' : 'Nova Complexidade'}
              </DrawerTitle>
              <DrawerDescription>
                {editingComplexidade 
                  ? 'Edite o grau de complexidade abaixo.'
                  : 'Insira o novo grau de complexidade.'
                }
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-grow overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="grau" className="font-base text-sm">
                    Grau de Complexidade *
                  </Label>
                  <Input
                    id="grau"
                    value={formData.grau}
                    onChange={(e) => setFormData(prev => ({ ...prev, grau: e.target.value }))}
                    placeholder="Ex: Baixo, Médio, Alto"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting || !formData.grau.trim()}>
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {editingComplexidade ? 'Atualizar' : 'Criar'} Complexidade
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
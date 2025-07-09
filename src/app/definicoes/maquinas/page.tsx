'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerDescription } from '@/components/ui/drawer'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Trash2, X, Loader2, Edit, RotateCw, Eye } from 'lucide-react'

interface Maquina {
  id: string
  maquina: string | null
  valor_m2: number | null
  integer_id: number
}

export default function MaquinasPage() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([])
  const [loading, setLoading] = useState(true)
  const [openDrawer, setOpenDrawer] = useState(false)
  const [editingMaquina, setEditingMaquina] = useState<Maquina | null>(null)
  const [formData, setFormData] = useState({
    maquina: '',
    valor_m2: ''
  })
  const [nameFilter, setNameFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createBrowserClient()

  const fetchMaquinas = async () => {
    setLoading(true)
    try {
      console.log('Fetching maquinas...')
      const { data, error } = await supabase
        .from('maquinas')
        .select('*')
        .order('maquina', { ascending: true })

      console.log('Maquinas fetch result:', { data, error })
      
      if (error) {
        console.error('Supabase error fetching maquinas:', error)
        alert(`Error fetching maquinas: ${error.message}`)
      } else if (data) {
        console.log('Successfully fetched maquinas:', data)
        setMaquinas(data)
      }
    } catch (error) {
      console.error('JavaScript error fetching maquinas:', error)
      alert(`JavaScript error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMaquinas()
  }, [])

  const filteredMaquinas = maquinas.filter(maquina =>
    (maquina.maquina && maquina.maquina.toLowerCase().includes(nameFilter.toLowerCase()))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.maquina.trim()) return

    setSubmitting(true)
    try {
      const valorM2 = formData.valor_m2 ? parseFloat(formData.valor_m2) : null

      if (editingMaquina) {
        // Update existing maquina
        const { data, error } = await supabase
          .from('maquinas')
          .update({
            maquina: formData.maquina,
            valor_m2: valorM2
          })
          .eq('id', editingMaquina.id)
          .select('*')

        if (!error && data && data[0]) {
          setMaquinas(prev => prev.map(m => m.id === editingMaquina.id ? data[0] : m))
        }
      } else {
        // Create new maquina
        const { data, error } = await supabase
          .from('maquinas')
          .insert({
            maquina: formData.maquina,
            valor_m2: valorM2
          })
          .select('*')

        if (!error && data && data[0]) {
          setMaquinas(prev => [...prev, data[0]])
        }
      }

      resetForm()
    } catch (error) {
      console.error('Error saving maquina:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (maquina: Maquina) => {
    setEditingMaquina(maquina)
    setFormData({
      maquina: maquina.maquina || '',
      valor_m2: maquina.valor_m2 ? maquina.valor_m2.toString() : ''
    })
    setOpenDrawer(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta máquina?')) return

    try {
      const { error } = await supabase
        .from('maquinas')
        .delete()
        .eq('id', id)

      if (!error) {
        setMaquinas(prev => prev.filter(m => m.id !== id))
      }
    } catch (error) {
      console.error('Error deleting maquina:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      maquina: '',
      valor_m2: ''
    })
    setEditingMaquina(null)
    setOpenDrawer(false)
  }

  const openNewForm = () => {
    resetForm()
    setOpenDrawer(true)
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-'
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão de Máquinas</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={fetchMaquinas} aria-label="Atualizar">
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
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrar por nome da máquina..."
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="w-[300px] rounded-none border-0 outline-none"
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
      <div className="rounded-none border-2 border-border bg-background w-full">
        <div className="max-h-[70vh] overflow-y-auto w-full bg-background rounded-none">
          <Table className="w-full border-0 bg-background rounded-none">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[100px] font-bold uppercase">
                  ID
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border min-w-[300px] font-bold uppercase">
                  Nome da Máquina
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[150px] font-bold uppercase">
                  Valor/m²
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[140px] font-bold uppercase">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-40 uppercase">
                    <Loader2 className="animate-spin w-8 h-8 text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredMaquinas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500 uppercase">
                    Nenhuma máquina encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaquinas.map((maquina) => (
                  <TableRow key={maquina.id}>
                    <TableCell className="uppercase">{maquina.integer_id}</TableCell>
                    <TableCell className="font-medium uppercase">{maquina.maquina || '-'}</TableCell>
                    <TableCell className="uppercase">{formatCurrency(maquina.valor_m2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => handleEdit(maquina)}
                                aria-label="Ver"
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
                                onClick={() => handleDelete(maquina.id)}
                                aria-label="Eliminar"
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
      <Drawer open={openDrawer} onOpenChange={setOpenDrawer}>
        <DrawerContent className="h-screen min-h-screen !top-0 !mt-0 rounded-none border-2 border-border">
          <div className="w-full px-4 md:px-8 flex flex-col h-full">
            <DrawerHeader className="flex-none">
              <div className="flex justify-end items-center gap-2 mb-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" aria-label="Fechar" onClick={() => setOpenDrawer(false)}>
                        <X className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fechar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <DrawerTitle>
                {editingMaquina ? 'Editar Máquina' : 'Nova Máquina'}
              </DrawerTitle>
              <DrawerDescription>
                {editingMaquina 
                  ? 'Edite as informações da máquina abaixo.'
                  : 'Preencha as informações para criar uma nova máquina.'
                }
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-grow overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="maquina" className="font-base text-sm">
                    Nome da Máquina *
                  </Label>
                  <Input
                    id="maquina"
                    value={formData.maquina}
                    onChange={(e) => setFormData(prev => ({ ...prev, maquina: e.target.value }))}
                    placeholder="Nome da máquina"
                    required
                    className="rounded-none border-0 outline-none"
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
                    value={formData.valor_m2}
                    onChange={(e) => setFormData(prev => ({ ...prev, valor_m2: e.target.value }))}
                    placeholder="Ex: 15.50"
                    className="rounded-none border-0 outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting || !formData.maquina.trim()}> 
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {editingMaquina ? 'Guardar' : 'Criar Máquina'}
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
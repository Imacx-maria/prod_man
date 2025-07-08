'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerDescription } from '@/components/ui/drawer'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import DatePicker from '@/components/ui/DatePicker'
import { Plus, Trash2, X, Loader2, Edit, RotateCw, ArrowUp, ArrowDown } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

interface Feriado {
  id: string
  holiday_date: string
  description: string
  created_at: string
  updated_at: string
}

export default function FeriadosPage() {
  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [loading, setLoading] = useState(true)
  const [openDrawer, setOpenDrawer] = useState(false)
  const [editingFeriado, setEditingFeriado] = useState<Feriado | null>(null)
  const [formData, setFormData] = useState({
    holiday_date: '',
    description: ''
  })
  const [descriptionFilter, setDescriptionFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sortColumn, setSortColumn] = useState<'holiday_date' | 'description'>('holiday_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const supabase = createBrowserClient()

  const fetchFeriados = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('feriados')
        .select('*')
        .order('holiday_date', { ascending: true })

      if (!error && data) {
        setFeriados(data)
      }
    } catch (error) {
      console.error('Error fetching feriados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeriados()
  }, [])

  const filteredFeriados = feriados.filter(feriado =>
    feriado.description.toLowerCase().includes(descriptionFilter.toLowerCase())
  )

  const sortedFeriados = [...filteredFeriados].sort((a, b) => {
    if (sortColumn === 'holiday_date') {
      const aValue = new Date(a.holiday_date).getTime()
      const bValue = new Date(b.holiday_date).getTime()
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    } else {
      const aValue = a.description.toLowerCase()
      const bValue = b.description.toLowerCase()
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    }
  })

  const handleSort = (column: 'holiday_date' | 'description') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.holiday_date || !formData.description.trim()) return

    setSubmitting(true)
    try {
      if (editingFeriado) {
        // Update existing feriado
        const { data, error } = await supabase
          .from('feriados')
          .update({
            holiday_date: formData.holiday_date,
            description: formData.description,
            updated_at: new Date().toISOString().split('T')[0]
          })
          .eq('id', editingFeriado.id)
          .select('*')

        if (!error && data && data[0]) {
          setFeriados(prev => prev.map(f => f.id === editingFeriado.id ? data[0] : f))
        }
      } else {
        // Create new feriado
        const { data, error } = await supabase
          .from('feriados')
          .insert({
            holiday_date: formData.holiday_date,
            description: formData.description
          })
          .select('*')

        if (!error && data && data[0]) {
          setFeriados(prev => [...prev, data[0]])
        }
      }

      resetForm()
    } catch (error) {
      console.error('Error saving feriado:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (feriado: Feriado) => {
    setEditingFeriado(feriado)
    setFormData({
      holiday_date: feriado.holiday_date,
      description: feriado.description
    })
    setOpenDrawer(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este feriado?')) return

    try {
      const { error } = await supabase
        .from('feriados')
        .delete()
        .eq('id', id)

      if (!error) {
        setFeriados(prev => prev.filter(f => f.id !== id))
      }
    } catch (error) {
      console.error('Error deleting feriado:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      holiday_date: '',
      description: ''
    })
    setEditingFeriado(null)
    setOpenDrawer(false)
  }

  const openNewForm = () => {
    resetForm()
    setOpenDrawer(true)
  }

  const formatDisplayDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'dd/MM/yyyy', { locale: pt })
    } catch {
      return dateString
    }
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão de Feriados</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={fetchFeriados}>
                  <RotateCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar lista</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={openNewForm}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Feriado
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrar por descrição..."
          value={descriptionFilter}
          onChange={(e) => setDescriptionFilter(e.target.value)}
          className="w-[300px]"
        />
        <Button variant="outline" size="icon" onClick={() => setDescriptionFilter('')}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md bg-background w-full">
        <div className="max-h-[70vh] overflow-y-auto w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border cursor-pointer select-none w-[140px] uppercase"
                  onClick={() => handleSort('holiday_date')}
                >
                  Data
                  {sortColumn === 'holiday_date' && (
                    sortDirection === 'asc' ? 
                    <ArrowUp className="inline w-3 h-3 ml-1" /> : 
                    <ArrowDown className="inline w-3 h-3 ml-1" />
                  )}
                </TableHead>
                <TableHead 
                  className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border cursor-pointer select-none min-w-[300px] uppercase"
                  onClick={() => handleSort('description')}
                >
                  Descrição
                  {sortColumn === 'description' && (
                    sortDirection === 'asc' ? 
                    <ArrowUp className="inline w-3 h-3 ml-1" /> : 
                    <ArrowDown className="inline w-3 h-3 ml-1" />
                  )}
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[140px] uppercase">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-40 uppercase">
                    <Loader2 className="animate-spin w-8 h-8 text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : sortedFeriados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500 uppercase">
                    Nenhum feriado encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                sortedFeriados.map((feriado) => (
                  <TableRow key={feriado.id}>
                    <TableCell className="font-medium uppercase">{formatDisplayDate(feriado.holiday_date)}</TableCell>
                    <TableCell className="uppercase">{feriado.description}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(feriado)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(feriado.id)}
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
                {editingFeriado ? 'Editar Feriado' : 'Novo Feriado'}
              </DrawerTitle>
              <DrawerDescription>
                {editingFeriado 
                  ? 'Edite as informações do feriado abaixo.'
                  : 'Preencha as informações para criar um novo feriado.'
                }
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-grow overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="holiday_date" className="font-base text-sm">
                    Data do Feriado *
                  </Label>
                  <DatePicker
                    selected={formData.holiday_date ? new Date(formData.holiday_date) : undefined}
                    onSelect={(date) => {
                      const isoDate = date ? date.toISOString().split('T')[0] : ''
                      setFormData(prev => ({ ...prev, holiday_date: isoDate }))
                    }}
                    buttonClassName="w-full justify-start"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="font-base text-sm">
                    Descrição *
                  </Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ex: Natal, Ano Novo, Dia da República"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={submitting || !formData.holiday_date || !formData.description.trim()}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {editingFeriado ? 'Atualizar' : 'Criar'} Feriado
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
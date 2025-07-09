'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editDate, setEditDate] = useState<Date | undefined>(undefined)
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

  const handleAddNew = async () => {
    const description = prompt('Digite a descrição do feriado:')
    if (!description?.trim()) return

    const dateStr = prompt('Digite a data (YYYY-MM-DD):')
    if (!dateStr?.trim()) return

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateStr)) {
      alert('Formato de data inválido. Use YYYY-MM-DD')
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('feriados')
        .insert({
          holiday_date: dateStr,
          description: description.trim()
        })
        .select('*')

      if (!error && data && data[0]) {
        setFeriados(prev => [...prev, data[0]])
      }
    } catch (error) {
      console.error('Error creating feriado:', error)
    } finally {
      setSubmitting(false)
    }
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
              <TooltipContent>Atualizar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleAddNew}>
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Novo Feriado</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrar por descrição..."
          value={descriptionFilter}
          onChange={(e) => setDescriptionFilter(e.target.value)}
          className="w-[300px] rounded-none"
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => setDescriptionFilter('')}>
                <X className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Limpar filtro</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Table */}
      <div className="bg-background w-full">
        <div className="max-h-[70vh] overflow-y-auto w-full">
          <Table className="w-full border-2 border-border">
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border cursor-pointer select-none w-[140px] font-bold uppercase"
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
                  className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border cursor-pointer select-none min-w-[300px] font-bold uppercase"
                  onClick={() => handleSort('description')}
                >
                  Descrição
                  {sortColumn === 'description' && (
                    sortDirection === 'asc' ? 
                    <ArrowUp className="inline w-3 h-3 ml-1" /> : 
                    <ArrowDown className="inline w-3 h-3 ml-1" />
                  )}
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[140px] font-bold uppercase">
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
                    <TableCell className="font-medium uppercase">
                      {editingId === feriado.id ? (
                        <DatePicker
                          selected={editDate}
                          onSelect={(date) => {
                            setEditDate(date);
                          }}
                          buttonClassName="w-full h-10 border-0 outline-0 focus:ring-0 focus:border-0 rounded-none"
                        />
                      ) : (
                        formatDisplayDate(feriado.holiday_date)
                      )}
                    </TableCell>
                    <TableCell className="uppercase">
                      {editingId === feriado.id ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="rounded-none flex-1"
                            placeholder="Descrição do feriado"
                          />
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="icon"
                                    onClick={async () => {
                                      if (!editDescription.trim()) return;
                                      
                                      setSubmitting(true);
                                      try {
                                        const isoDate = editDate ? editDate.toISOString().split('T')[0] : feriado.holiday_date;
                                        const { error } = await supabase
                                          .from('feriados')
                                          .update({ 
                                            holiday_date: isoDate,
                                            description: editDescription.trim(),
                                            updated_at: new Date().toISOString().split('T')[0]
                                          })
                                          .eq('id', feriado.id);
                                        
                                        if (!error) {
                                          setFeriados(prev => prev.map(f => 
                                            f.id === feriado.id ? { 
                                              ...f, 
                                              holiday_date: isoDate,
                                              description: editDescription.trim() 
                                            } : f
                                          ));
                                        }
                                      } catch (error) {
                                        console.error('Error updating:', error);
                                      } finally {
                                        setSubmitting(false);
                                        setEditingId(null);
                                        setEditDescription('');
                                        setEditDate(undefined);
                                      }
                                    }}
                                    disabled={!editDescription.trim() || submitting}
                                  >
                                    <span className="text-xs">✓</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Guardar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      setEditingId(null);
                                      setEditDescription('');
                                      setEditDate(undefined);
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cancelar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      ) : (
                        feriado.description
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => {
                                  setEditingId(feriado.id);
                                  setEditDescription(feriado.description);
                                  setEditDate(new Date(feriado.holiday_date));
                                }}
                                disabled={editingId !== null}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDelete(feriado.id)}
                                disabled={editingId !== null}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
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


    </div>
  )
} 
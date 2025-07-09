'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Trash2, X, Loader2, Edit, RotateCw } from 'lucide-react'

interface Complexidade {
  id: string
  grau: string
}

export default function ComplexidadePage() {
  const [complexidades, setComplexidades] = useState<Complexidade[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
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

  const handleAddNew = async () => {
    const newGrau = prompt('Digite o novo grau de complexidade:')
    if (!newGrau?.trim()) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('complexidade')
        .insert({
          grau: newGrau.trim()
        })
        .select('*')

      if (!error && data && data[0]) {
        setComplexidades(prev => [...prev, data[0]])
      }
    } catch (error) {
      console.error('Error creating complexidade:', error)
    } finally {
      setSubmitting(false)
    }
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
              <TooltipContent>Novo Nível</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrar por grau..."
          value={grauFilter}
          onChange={(e) => setGrauFilter(e.target.value)}
          className="w-[300px] rounded-none"
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => setGrauFilter('')}>
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
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[300px] font-bold">
                  Grau de Complexidade
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[140px] font-bold">
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
                    <TableCell className="font-medium">
                      {editingId === complexidade.id ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && editValue.trim()) {
                              setSubmitting(true);
                              try {
                                const { error } = await supabase
                                  .from('complexidade')
                                  .update({ grau: editValue.trim() })
                                  .eq('id', complexidade.id);
                                
                                if (!error) {
                                  setComplexidades(prev => prev.map(c => 
                                    c.id === complexidade.id ? { ...c, grau: editValue.trim() } : c
                                  ));
                                }
                              } catch (error) {
                                console.error('Error updating:', error);
                              } finally {
                                setSubmitting(false);
                                setEditingId(null);
                                setEditValue('');
                              }
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                              setEditValue('');
                            }
                          }}
                          onBlur={() => {
                            setEditingId(null);
                            setEditValue('');
                          }}
                          className="rounded-none"
                          autoFocus
                        />
                      ) : (
                        complexidade.grau
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
                                  setEditingId(complexidade.id);
                                  setEditValue(complexidade.grau);
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
                                onClick={() => handleDelete(complexidade.id)}
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
'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import PermissionGuard from '@/components/PermissionGuard'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Combobox from '@/components/ui/Combobox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  X,
  RotateCw,
  Search,
  Filter,
  Download,
  AlertCircle,
  Calendar,
  User,
  Settings,
  Eye,
  ArrowUp,
  ArrowDown,
  Trash2,
  RefreshCcw,
  Loader2,
  Copy,
  Check,
} from 'lucide-react'
import DatePicker from '@/components/ui/DatePicker'
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
  DrawerDescription,
} from '@/components/ui/drawer'
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import SimpleNotasPopover from '@/components/ui/SimpleNotasPopover'
import { createBrowserClient } from '@/utils/supabase'
import ProductionAnalyticsCharts from '@/components/ProductionAnalyticsCharts'

// Types
interface ProductionItem {
  id: string
  folha_obra_id: string
  descricao: string
  codigo?: string | null
  quantidade?: number | null
  concluido?: boolean
  concluido_maq?: boolean | null
  brindes?: boolean
  prioridade?: boolean | null
  complexidade?: string | null
  created_at?: string | null
  folhas_obras?: {
    numero_fo?: string
    nome_campanha?: string
    cliente?: string
  } | null
  designer_items?: {
    paginacao?: boolean
    path_trabalho?: string
  } | null
  logistica_entregas?:
    | {
        concluido?: boolean
      }[]
    | {
        concluido?: boolean
      }
    | null
}

interface ProductionOperation {
  id: string
  data_operacao: string
  operador_id?: string | null
  folha_obra_id: string
  item_id: string
  no_interno: string
  Tipo_Op?: string
  maquina?: string | null
  material_id?: string | null
  stock_consumido_id?: string | null
  num_placas_print?: number | null
  num_placas_corte?: number | null
  QT_print?: number | null
  observacoes?: string | null
  notas?: string | null
  notas_imp?: string | null
  status?: string
  concluido?: boolean
  data_conclusao?: string | null
  created_at?: string
  updated_at?: string
  N_Pal?: string | null
  profiles?: {
    first_name?: string
    last_name?: string
    roles?: {
      name?: string
    }
  }
  materiais?: {
    material?: string
    cor?: string
  }
}

interface Profile {
  id: string
  first_name: string
  last_name: string
  roles?: {
    name: string
  }
}

interface Machine {
  id: string
  nome_maquina: string
  tipo: string
  ativa?: boolean
}

interface Material {
  id: string
  material?: string
  cor?: string
  tipo?: string
  carateristica?: string
  referencia?: string
}

interface Palete {
  id: string
  no_palete: string
  ref_cartao?: string | null
  fornecedor_id?: string | null
  fornecedores?: {
    nome_forn: string
  } | null
}

type Holiday = {
  id: string
  holiday_date: string
  description: string
}

export default function OperacoesPage() {
  return (
    <PermissionGuard>
      <OperacoesPageContent />
    </PermissionGuard>
  )
}

function OperacoesPageContent() {
  const supabase = useMemo(() => createBrowserClient(), [])

  // State
  const [items, setItems] = useState<ProductionItem[]>([])
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  // Filters
  const [foFilter, setFoFilter] = useState('')
  const [itemFilter, setItemFilter] = useState('')

  // Sorting
  type SortKey =
    | 'numero_fo'
    | 'nome_campanha'
    | 'descricao'
    | 'quantidade'
    | 'prioridade'
  const [sortCol, setSortCol] = useState<SortKey>('numero_fo')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = useCallback(
    (col: SortKey) => {
      if (sortCol === col) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
      } else {
        setSortCol(col)
        setSortDir('asc')
      }
    },
    [sortCol, sortDir],
  )

  // Add the getPColor function for item priority
  const getPColor = (item: ProductionItem): string => {
    if (item.prioridade) return 'bg-red-500'
    if (item.created_at) {
      const days =
        (Date.now() - new Date(item.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
      if (days > 3) return 'bg-[var(--blue-light)]'
    }
    return 'bg-green-500'
  }

  // Update item field function
  const updateItem = async (itemId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('items_base')
        .update({ [field]: value })
        .eq('id', itemId)

      if (error) {
        console.error(
          `Error updating item ${itemId} field ${field}:`,
          error?.message || error,
        )
        alert(
          `Erro ao atualizar ${field}: ${error?.message || JSON.stringify(error)}`,
        )
      } else {
        // Update local state
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId ? { ...item, [field]: value } : item,
          ),
        )
      }
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('Starting to fetch production items...')

      // First, let's try a simple query to test basic access to items_base
      const { data: testData, error: testError } = await supabase
        .from('items_base')
        .select('id')
        .limit(1)

      if (testError) {
        console.error('Basic items_base access failed:', testError)
        throw new Error(`Database access error: ${testError.message}`)
      }

      console.log(
        'Basic items_base access successful, found records:',
        testData?.length || 0,
      )

      // If there are no items at all, return empty result
      if (!testData || testData.length === 0) {
        console.log('No items found in items_base table')
        setItems([])
        return
      }

      // Now try the complex query with better error handling
      const { data: itemsData, error: itemsError } = await supabase.from(
        'items_base',
      ).select(`
          id,
          folha_obra_id,
          descricao,
          codigo,
          quantidade,
          concluido,
          concluido_maq,
          brindes,
          prioridade,
          complexidade,
          created_at,
          folhas_obras (
            numero_fo,
            nome_campanha,
            cliente
          ),
          designer_items (
            paginacao,
            path_trabalho
          ),
          logistica_entregas (
            concluido
          )
        `)

      if (itemsError) {
        console.error('Complex query failed:', itemsError)
        throw new Error(
          `Failed to fetch items with relations: ${itemsError.message || JSON.stringify(itemsError)}`,
        )
      }

      console.log('Items query result:', itemsData)
      console.log('Number of items retrieved:', itemsData?.length || 0)

      // Check if we got any data
      if (!itemsData) {
        console.log('Query returned null/undefined data')
        setItems([])
        return
      }

      // Transform the data to match our interface
      const transformedItems = itemsData.map((item) => ({
        ...item,
        folhas_obras: Array.isArray(item.folhas_obras)
          ? item.folhas_obras[0]
          : item.folhas_obras,
        designer_items: Array.isArray(item.designer_items)
          ? item.designer_items[0]
          : item.designer_items,
        logistica_entregas: Array.isArray(item.logistica_entregas)
          ? item.logistica_entregas
          : item.logistica_entregas,
      }))

      console.log('Transformed items:', transformedItems.length)

      // Filter items that meet all conditions:
      const filteredItems = transformedItems.filter((item) => {
        let hasLogisticaEntregasNotConcluida = false

        if (item.logistica_entregas) {
          if (Array.isArray(item.logistica_entregas)) {
            hasLogisticaEntregasNotConcluida = (
              item.logistica_entregas as any[]
            ).some((entrega: any) => entrega.concluido === false)
          } else {
            hasLogisticaEntregasNotConcluida =
              (item.logistica_entregas as any).concluido === false
          }
        }

        const hasPaginacaoTrue = item.designer_items?.paginacao === true
        const isNotBrinde = item.brindes !== true
        const isNotOffset = item.complexidade !== 'OFFSET'

        const includeItem =
          hasLogisticaEntregasNotConcluida &&
          hasPaginacaoTrue &&
          isNotBrinde &&
          isNotOffset

        if (!includeItem) {
          console.log(`Item ${item.id} filtered out:`, {
            hasLogisticaEntregasNotConcluida,
            hasPaginacaoTrue,
            isNotBrinde,
            isNotOffset,
            logistica_entregas: item.logistica_entregas,
            designer_items: item.designer_items,
            brindes: item.brindes,
            complexidade: item.complexidade,
          })
        }

        return includeItem
      })

      console.log('Filtered items:', filteredItems.length)
      setItems(filteredItems)
    } catch (error: any) {
      console.error('Error fetching data:', error)
      const errorMessage =
        error?.message || error?.toString() || 'Unknown error occurred'
      setError(`Failed to load production items: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Debug function to help troubleshoot issues
  const runDebugCheck = useCallback(async () => {
    console.log('Running debug check...')
    const debug: any = {}

    try {
      // Check basic table access and counts
      const tables = [
        'items_base',
        'folhas_obras',
        'designer_items',
        'logistica_entregas',
      ]

      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })

          if (error) {
            debug[table] = { error: error.message, accessible: false }
          } else {
            debug[table] = { count: count || 0, accessible: true }
          }
        } catch (err: any) {
          debug[table] = { error: err.message, accessible: false }
        }
      }

      // Check items with relationships
      try {
        const { data: itemsWithDesigner } = await supabase
          .from('items_base')
          .select(
            `
            id,
            designer_items(paginacao)
          `,
          )
          .limit(10)

        const itemsWithPaginacao =
          itemsWithDesigner?.filter(
            (item: any) =>
              item.designer_items &&
              (Array.isArray(item.designer_items)
                ? item.designer_items.some((d: any) => d.paginacao === true)
                : (item.designer_items as any)?.paginacao === true),
          ) || []

        debug.items_with_paginacao = itemsWithPaginacao.length
        debug.sample_items_with_designer = itemsWithDesigner?.slice(0, 3)
      } catch (err: any) {
        debug.relationship_check = { error: err.message }
      }

      // Check authentication
      const {
        data: { user },
      } = await supabase.auth.getUser()
      debug.authenticated = !!user
      debug.user_id = user?.id || 'Not authenticated'

      setDebugInfo(debug)
      setShowDebug(true)
    } catch (err: any) {
      console.error('Debug check failed:', err)
      setDebugInfo({ general_error: err.message })
      setShowDebug(true)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = items.length
    const completed = items.filter((item) => item.concluido_maq === true).length
    const pending = total - completed

    return { total, completed, pending }
  }, [items])

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const foMatch =
        !foFilter ||
        item.folhas_obras?.numero_fo
          ?.toLowerCase()
          .includes(foFilter.toLowerCase())
      const itemMatch =
        !itemFilter ||
        item.descricao?.toLowerCase().includes(itemFilter.toLowerCase())

      return foMatch && itemMatch
    })
  }, [items, foFilter, itemFilter])

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortCol) {
        case 'numero_fo':
          aVal = a.folhas_obras?.numero_fo || ''
          bVal = b.folhas_obras?.numero_fo || ''
          break
        case 'nome_campanha':
          aVal = a.folhas_obras?.nome_campanha || ''
          bVal = b.folhas_obras?.nome_campanha || ''
          break
        case 'descricao':
          aVal = a.descricao || ''
          bVal = b.descricao || ''
          break
        case 'quantidade':
          aVal = a.quantidade || 0
          bVal = b.quantidade || 0
          break
        case 'prioridade':
          aVal = a.prioridade || false
          bVal = b.prioridade || false
          break
        default:
          aVal = a.id
          bVal = b.id
      }

      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      } else {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
    })

    return sorted
  }, [filteredItems, sortCol, sortDir])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full space-y-6">
        <h1 className="text-2xl font-bold">Operações de Produção</h1>
        <div className="rounded-none border-2 border-red-200 bg-red-50 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-red-800">
                  Erro ao carregar dados
                </h3>
                <p className="mt-1 text-red-700">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RotateCw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
            </div>
            <div className="space-y-2 text-sm text-red-600">
              <p>
                <strong>Possíveis causas:</strong>
              </p>
              <ul className="ml-4 list-inside list-disc space-y-1">
                <li>Problemas de conectividade com a base de dados</li>
                <li>Permissões de acesso insuficientes</li>
                <li>Estrutura da base de dados não inicializada</li>
              </ul>
              <p>
                <strong>Verifique:</strong>
              </p>
              <ul className="ml-4 list-inside list-disc space-y-1">
                <li>Se está autenticado no sistema</li>
                <li>Se a base de dados contém os dados necessários</li>
                <li>A consola do navegador para mais detalhes técnicos</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={runDebugCheck}>
                <Settings className="mr-2 h-4 w-4" />
                Diagnóstico
              </Button>
            </div>
            {showDebug && debugInfo && (
              <div className="mt-4 rounded-none border border-gray-300 bg-gray-100 p-4">
                <h4 className="mb-2 font-semibold text-gray-800">
                  Informação de Diagnóstico:
                </h4>
                <pre className="max-h-60 overflow-auto text-xs text-gray-700">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebug(false)}
                  className="mt-2"
                >
                  Fechar Diagnóstico
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show empty state when no items but no error
  if (!loading && items.length === 0 && !error) {
    return (
      <div className="w-full space-y-6">
        <h1 className="text-2xl font-bold">Operações de Produção</h1>

        {/* Statistics */}
        <div className="flex gap-4 text-sm">
          <span>Total: 0</span>
          <span>Concluído: 0</span>
          <span>Pendente: 0</span>
        </div>

        <div className="rounded-none border-2 border-gray-200 bg-gray-50 p-6">
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <AlertCircle className="h-12 w-12 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Nenhum item pronto para produção
              </h3>
              <p className="mt-2 text-gray-600">
                Não foram encontrados itens que atendam aos critérios
                necessários para operações de produção.
              </p>
            </div>
            <div className="space-y-2 text-sm text-gray-500">
              <p>
                <strong>Para um item aparecer aqui, deve ter:</strong>
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  <strong>Paginação concluída</strong> (designer_items.paginacao
                  = true)
                </li>
                <li>
                  <strong>Entregas não concluídas</strong>{' '}
                  (logistica_entregas.concluido = false)
                </li>
                <li>
                  <strong>Não ser brinde</strong> (brindes ≠ true)
                </li>
                <li>
                  <strong>Complexidade não ser OFFSET</strong> (complexidade ≠
                  &apos;OFFSET&apos;)
                </li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchData}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar Lista
              </Button>
              <Button variant="outline" onClick={runDebugCheck}>
                <Settings className="mr-2 h-4 w-4" />
                Diagnóstico
              </Button>
            </div>
          </div>
        </div>
        {showDebug && debugInfo && (
          <div className="mt-4 rounded-none border border-gray-300 bg-gray-100 p-4">
            <h4 className="mb-2 font-semibold text-gray-800">
              Informação de Diagnóstico:
            </h4>
            <pre className="max-h-60 overflow-auto text-xs text-gray-700">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebug(false)}
              className="mt-2"
            >
              Fechar Diagnóstico
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-bold">Operações de Produção</h1>

      {/* Statistics */}
      <div className="flex gap-4 text-sm">
        <span>Total: {stats.total}</span>
        <span>Concluído: {stats.completed}</span>
        <span>Pendente: {stats.pending}</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrar FO"
          className="w-40"
          value={foFilter}
          onChange={(e) => setFoFilter(e.target.value)}
        />
        <Input
          placeholder="Filtrar Item"
          className="flex-1"
          value={itemFilter}
          onChange={(e) => setItemFilter(e.target.value)}
        />
        <Button
          size="icon"
          variant="outline"
          onClick={() => {
            setFoFilter('')
            setItemFilter('')
          }}
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={fetchData}
          title="Refresh data"
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="operacoes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="operacoes">Operações ({stats.total})</TabsTrigger>
          <TabsTrigger value="analytics">Análises & Gráficos</TabsTrigger>
        </TabsList>

        <TabsContent value="operacoes">
          {/* Main table */}
          <div className="bg-background border-border w-full rounded-none border-2">
            <div className="w-full rounded-none">
              <Table className="w-full table-fixed border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      onClick={() => toggleSort('numero_fo')}
                      className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] text-black uppercase select-none"
                    >
                      FO{' '}
                      {sortCol === 'numero_fo' &&
                        (sortDir === 'asc' ? (
                          <ArrowUp className="ml-1 inline h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 inline h-3 w-3" />
                        ))}
                    </TableHead>
                    <TableHead
                      onClick={() => toggleSort('nome_campanha')}
                      className="border-border sticky top-0 z-10 cursor-pointer border-b-2 bg-[var(--orange)] text-black uppercase select-none"
                    >
                      Campanha{' '}
                      {sortCol === 'nome_campanha' &&
                        (sortDir === 'asc' ? (
                          <ArrowUp className="ml-1 inline h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 inline h-3 w-3" />
                        ))}
                    </TableHead>
                    <TableHead
                      onClick={() => toggleSort('descricao')}
                      className="border-border sticky top-0 z-10 cursor-pointer border-b-2 bg-[var(--orange)] text-black uppercase select-none"
                    >
                      Item{' '}
                      {sortCol === 'descricao' &&
                        (sortDir === 'asc' ? (
                          <ArrowUp className="ml-1 inline h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 inline h-3 w-3" />
                        ))}
                    </TableHead>
                    <TableHead
                      onClick={() => toggleSort('quantidade')}
                      className="border-border sticky top-0 z-10 w-[100px] cursor-pointer border-b-2 bg-[var(--orange)] text-right text-black uppercase select-none"
                    >
                      Quantidade{' '}
                      {sortCol === 'quantidade' &&
                        (sortDir === 'asc' ? (
                          <ArrowUp className="ml-1 inline h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 inline h-3 w-3" />
                        ))}
                    </TableHead>
                    <TableHead
                      onClick={() => toggleSort('prioridade')}
                      className="border-border sticky top-0 z-10 w-[36px] min-w-[36px] cursor-pointer border-b-2 bg-[var(--orange)] text-black uppercase select-none"
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              P{' '}
                              {sortCol === 'prioridade' &&
                                (sortDir === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Prioridade</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="border-border sticky top-0 z-10 w-[100px] border-b-2 bg-[var(--orange)] text-black uppercase">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-[var(--main)]">
                      <TableCell className="w-[120px]">
                        {item.folhas_obras?.numero_fo}
                      </TableCell>
                      <TableCell>{item.folhas_obras?.nome_campanha}</TableCell>
                      <TableCell>{item.descricao}</TableCell>
                      <TableCell className="w-[100px] text-right">
                        {item.quantidade}
                      </TableCell>
                      <TableCell className="w-[36px] min-w-[36px] text-center">
                        <button
                          className={`focus:ring-primary mx-auto flex h-3 w-3 items-center justify-center rounded-full transition-colors focus:ring-2 focus:outline-none ${getPColor(item)}`}
                          title={
                            item.prioridade
                              ? 'Prioritário'
                              : item.created_at &&
                                  (Date.now() -
                                    new Date(item.created_at).getTime()) /
                                    (1000 * 60 * 60 * 24) >
                                    3
                                ? 'Aguardando há mais de 3 dias'
                                : 'Normal'
                          }
                          onClick={async () => {
                            const newPrioridade = !item.prioridade
                            await updateItem(
                              item.id,
                              'prioridade',
                              newPrioridade,
                            )
                          }}
                        />
                      </TableCell>
                      <TableCell className="w-[100px]">
                        <Button
                          size="icon"
                          variant="default"
                          onClick={() => setOpenItemId(item.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center">
                        Nenhum item encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mb-8">
          <ProductionAnalyticsCharts
            supabase={supabase}
            onRefresh={fetchData}
          />
        </TabsContent>
      </Tabs>

      {/* Drawer */}
      <Drawer
        open={!!openItemId}
        onOpenChange={(open) => !open && setOpenItemId(null)}
        shouldScaleBackground={false}
      >
        <DrawerContent className="!top-0 h-[98vh] max-h-[98vh] min-h-[98vh] !transform-none overflow-y-auto !filter-none !backdrop-filter-none will-change-auto">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Operações de Produção</DrawerTitle>
            <DrawerDescription>
              Gestão de operações de impressão e corte
            </DrawerDescription>
          </DrawerHeader>
          {openItemId && (
            <ItemDrawerContent
              itemId={openItemId}
              items={items}
              onClose={() => setOpenItemId(null)}
              supabase={supabase}
            />
          )}
        </DrawerContent>
      </Drawer>
    </div>
  )
}

// Drawer content component
interface ItemDrawerProps {
  itemId: string
  items: ProductionItem[]
  onClose: () => void
  supabase: any
}

function ItemDrawerContent({
  itemId,
  items,
  onClose,
  supabase,
}: ItemDrawerProps) {
  const item = items.find((i) => i.id === itemId)
  const [operations, setOperations] = useState<ProductionOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [operators, setOperators] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])

  // State to track totals from each table component
  const [totalQuantidadeImpressao, setTotalQuantidadeImpressao] = useState(0)
  const [totalQuantidadeCorte, setTotalQuantidadeCorte] = useState(0)

  // Fetch operations and reference data
  const fetchOperations = useCallback(async () => {
    if (!item) return

    setLoading(true)
    try {
      const { data: operationsData, error } = await supabase
        .from('producao_operacoes')
        .select(
          `
           id, data_operacao, operador_id, folha_obra_id, item_id, no_interno,
           Tipo_Op, maquina, material_id, stock_consumido_id, num_placas_print, num_placas_corte, QT_print,
           observacoes, notas, notas_imp, status, concluido, data_conclusao, created_at, updated_at, N_Pal,
           profiles!operador_id (
             first_name, 
             last_name,
             roles!profiles_role_id_fkey (
               name
             )
           ),
           materiais (material, cor)
         `,
        )
        .eq('item_id', item.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching operations:', error)
      } else {
        setOperations(operationsData || [])
      }
    } catch (error) {
      console.error('Error fetching operations:', error)
    } finally {
      setLoading(false)
    }
  }, [item, supabase])

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const [operatorsRes, machinesRes, materialsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            `
            id, 
            first_name, 
            last_name,
            roles!profiles_role_id_fkey (
              name
            )
          `,
          )
          .in('role_id', [
            '968afe0b-0b14-46b2-9269-4fc9f120bbfa',
            '2e18fb9d-52ef-4216-90ea-699372cd5a87',
          ]),
        supabase.from('maquinas_operacao').select('id, nome_maquina, tipo'),
        supabase
          .from('materiais')
          .select('id, material, cor, tipo, carateristica, referencia'),
      ])

      if (!operatorsRes.error) setOperators(operatorsRes.data || [])
      if (!machinesRes.error) setMachines(machinesRes.data || [])
      if (!materialsRes.error) {
        setMaterials(materialsRes.data || [])
      }
    } catch (error) {
      console.error('Error fetching reference data:', error)
    }
  }, [supabase])

  useEffect(() => {
    fetchReferenceData()
    fetchOperations()
  }, [fetchReferenceData, fetchOperations])

  if (!item) return null

  // Both tabs show the same operations - they are independent entries
  const impressaoOperations = operations.filter(
    (op) => op.Tipo_Op === 'Impressao',
  )
  const corteOperations = operations.filter((op) => op.Tipo_Op === 'Corte')

  return (
    <div className="relative space-y-6 p-6">
      {/* Close button and Quantity in top right */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs font-bold uppercase">Quantidade</div>
          <div className="font-mono text-lg">{item.quantidade}</div>
        </div>
        <Button size="icon" variant="outline" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Item info */}
      <div className="mb-6 p-4 uppercase">
        <div className="mb-2 flex items-center gap-8">
          <div>
            <div className="text-xs font-bold">FO</div>
            <div className="font-mono">{item.folhas_obras?.numero_fo}</div>
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold">Item</div>
            <div className="truncate font-mono">{item.descricao}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="impressao" className="w-full">
        <TabsList>
          <TabsTrigger value="impressao">
            Impressão ({totalQuantidadeImpressao})
          </TabsTrigger>
          <TabsTrigger value="corte">
            Corte ({totalQuantidadeCorte})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="impressao">
          <OperationsTable
            operations={impressaoOperations}
            type="impressao"
            itemId={item.id}
            item={item}
            operators={operators}
            machines={machines}
            materials={materials}
            supabase={supabase}
            onRefresh={fetchOperations}
            onTotalChange={setTotalQuantidadeImpressao}
          />
        </TabsContent>

        <TabsContent value="corte">
          <OperationsTable
            operations={corteOperations}
            type="corte"
            itemId={item.id}
            item={item}
            operators={operators}
            machines={machines}
            materials={materials}
            supabase={supabase}
            onRefresh={fetchOperations}
            onTotalChange={setTotalQuantidadeCorte}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Operations table component
interface OperationsTableProps {
  operations: ProductionOperation[]
  type: 'impressao' | 'corte'
  itemId: string
  item: ProductionItem
  operators: any[]
  machines: any[]
  materials: any[]
  supabase: any
  onRefresh: () => void
  onTotalChange?: (total: number) => void
}

function OperationsTable({
  operations,
  type,
  itemId,
  item,
  operators,
  machines,
  materials,
  supabase,
  onRefresh,
  onTotalChange,
}: OperationsTableProps) {
  const quantityField =
    type === 'impressao' ? 'num_placas_print' : 'num_placas_corte'
  const machineField = 'maquina' // Both impressao and corte use the same maquina field
  const notesField = type === 'impressao' ? 'notas_imp' : 'notas' // Different notes fields

  // Local state to track material selections for each operation
  const [materialSelections, setMaterialSelections] = useState<{
    [operationId: string]: {
      material?: string
      caracteristica?: string
      cor?: string
    }
  }>({})

  // Local state to track notes values for immediate feedback
  const [notesValues, setNotesValues] = useState<{
    [operationId: string]: string
  }>({})

  // Loading state to prevent rapid updates
  const [isUpdating, setIsUpdating] = useState(false)

  // NEW: Pending operations state for unsaved records
  const [pendingOperations, setPendingOperations] = useState<{
    [tempId: string]: Partial<ProductionOperation & { isPending: boolean }>
  }>({})

  // NEW: State for paletes data (only for Impressão tab)
  const [paletes, setPaletes] = useState<Palete[]>([])
  const [paletesLoading, setPaletesLoading] = useState(true)

  // NEW: State to track palette selections for each operation
  const [paletteSelections, setPaletteSelections] = useState<{
    [operationId: string]: string
  }>({})

  // Combine pending and saved operations for display
  const displayOperations = useMemo(() => {
    const saved = operations.filter(
      (op) => op.Tipo_Op === (type === 'impressao' ? 'Impressao' : 'Corte'),
    )
    const pending = Object.values(pendingOperations).filter(
      (op) => op.Tipo_Op === (type === 'impressao' ? 'Impressao' : 'Corte'),
    )
    return [...saved, ...(pending as ProductionOperation[])]
  }, [operations, pendingOperations, type])

  // NEW: Fetch paletes data (for both Impressão and Corte tabs)
  const fetchPaletes = useCallback(async () => {
    setPaletesLoading(true)
    try {
      const { data, error } = await supabase
        .from('paletes')
        .select(
          `
          id,
          no_palete,
          ref_cartao,
          fornecedor_id,
          fornecedores(nome_forn)
        `,
        )
        .order('no_palete', { ascending: true })

      if (!error && data) {
        setPaletes(data)
      }
    } catch (error) {
      console.error('Error fetching paletes:', error)
    } finally {
      setPaletesLoading(false)
    }
  }, [supabase])

  // NEW: useEffect to fetch paletes data for both tabs
  useEffect(() => {
    fetchPaletes()
  }, [fetchPaletes])

  // Initialize material selections and notes - simplified approach
  useEffect(() => {
    if (isUpdating) return // Skip if currently updating to prevent loops

    const newSelections: {
      [operationId: string]: {
        material?: string
        caracteristica?: string
        cor?: string
      }
    } = {}
    const newNotesValues: { [operationId: string]: string } = {}
    const newPaletteSelections: { [operationId: string]: string } = {}

    displayOperations.forEach((operation) => {
      // Initialize material selections
      if (operation.material_id && materials.length > 0) {
        const material = materials.find((m) => m.id === operation.material_id)
        if (material) {
          newSelections[operation.id] = {
            material: material.material,
            caracteristica: material.carateristica,
            cor: material.cor,
          }
        }
      } else {
        newSelections[operation.id] = {}
      }

      // Initialize palette selections from N_Pal field
      if (operation.N_Pal && paletes.length > 0) {
        const palette = paletes.find((p) => p.no_palete === operation.N_Pal)
        if (palette) {
          newPaletteSelections[operation.id] = palette.id
        }
      }

      // Use the appropriate notes field based on operation type
      const notesValue =
        type === 'impressao' ? operation.notas_imp : (operation as any).notas
      newNotesValues[operation.id] = notesValue || ''

      // Debug log to verify field connection
      if (type === 'impressao') {
        console.log(
          `Operation ${operation.id} - notas_imp value:`,
          operation.notas_imp,
        )
      } else {
        console.log(
          `Operation ${operation.id} - notas value:`,
          (operation as any).notas,
        )
      }
    })

    setMaterialSelections(newSelections)
    setNotesValues(newNotesValues)
    setPaletteSelections(newPaletteSelections)
  }, [displayOperations, materials, paletes, isUpdating, type])

  // Calculate and report total quantity including pending operations
  useEffect(() => {
    const quantityField =
      type === 'impressao' ? 'num_placas_print' : 'num_placas_corte'
    const total = displayOperations.reduce(
      (sum, op) => sum + (op[quantityField] || 0),
      0,
    )
    onTotalChange?.(total)
  }, [displayOperations, type, onTotalChange])

  const addOperation = () => {
    if (isUpdating) return

    // Use the passed item to build the no_interno field
    if (!item) {
      alert('Item não encontrado')
      return
    }

    // Create temporary ID for pending operation
    const tempId = `temp_${Date.now()}`

    // Create pending operation (not saved to database)
    const pendingOp = {
      id: tempId,
      item_id: itemId,
      folha_obra_id: item.folha_obra_id,
      no_interno: `${item.folhas_obras?.numero_fo || 'FO'}-${item.descricao?.substring(0, 10) || 'ITEM'}`,
      [quantityField]: 1,
      data_operacao: new Date().toISOString().split('T')[0],
      Tipo_Op: type === 'impressao' ? 'Impressao' : 'Corte',
      isPending: true, // Flag to identify pending operations
    }

    // Add to pending operations (local state only)
    setPendingOperations((prev) => ({
      ...prev,
      [tempId]: pendingOp,
    }))
  }

  // NEW: Accept operation function (Save + Copy for Impressão)
  const acceptOperation = async (
    pendingOperation: ProductionOperation & { isPending?: boolean },
  ) => {
    try {
      setIsUpdating(true)

      // 1. Save the operation to database
      const operationData = {
        item_id: pendingOperation.item_id,
        folha_obra_id: pendingOperation.folha_obra_id,
        no_interno: pendingOperation.no_interno,
        material_id: pendingOperation.material_id,
        [quantityField]: pendingOperation[quantityField],
        [notesField]: pendingOperation[notesField],
        data_operacao: pendingOperation.data_operacao,
        operador_id: pendingOperation.operador_id,
        maquina: pendingOperation.maquina,
        Tipo_Op: pendingOperation.Tipo_Op,
        N_Pal: pendingOperation.N_Pal,
      }

      const { data: savedOperation, error: saveError } = await supabase
        .from('producao_operacoes')
        .insert(operationData)
        .select()
        .single()

      if (saveError) throw saveError

      // 2. If this is an Impressão operation, automatically create corresponding Corte operation
      if (type === 'impressao' && savedOperation) {
        console.log('🔄 Creating Corte operation from Impressão:', {
          pendingOperation_material_id: pendingOperation.material_id,
          pendingOperation_num_placas_print: pendingOperation.num_placas_print,
          pendingOperation_N_Pal: pendingOperation.N_Pal,
          copying_to_QT_print: pendingOperation.num_placas_print,
        })

        const corteOperation = {
          item_id: pendingOperation.item_id,
          folha_obra_id: pendingOperation.folha_obra_id,
          no_interno: pendingOperation.no_interno,
          material_id: pendingOperation.material_id, // Copy material
          QT_print: pendingOperation.num_placas_print, // Copy quantity to QT_print field
          // num_placas_corte: leave empty - don't copy quantity here
          notas: pendingOperation.notas_imp, // Copy notes
          N_Pal: pendingOperation.N_Pal, // Copy palette number
          data_operacao: new Date().toISOString().split('T')[0], // Today's date
          Tipo_Op: 'Corte',
          // operador_id and maquina left empty for cutting operator
        }

        console.log('📋 Corte operation to be created:', corteOperation)

        const { error: corteError } = await supabase
          .from('producao_operacoes')
          .insert(corteOperation)

        if (corteError) {
          console.error('Error creating Corte operation:', corteError)
          // Don't throw here - the Impressão operation was saved successfully
        }
      }

      // 3. Remove from pending operations
      setPendingOperations((prev) => {
        const updated = { ...prev }
        delete updated[pendingOperation.id]
        return updated
      })

      // 4. Refresh both tabs
      onRefresh()
    } catch (error) {
      console.error('Error accepting operation:', error)
      alert('Erro ao aceitar operação')
    } finally {
      setIsUpdating(false)
    }
  }

  // NEW: Cancel operation function
  const cancelOperation = (tempId: string) => {
    setPendingOperations((prev) => {
      const updated = { ...prev }
      delete updated[tempId]
      return updated
    })
  }

  // NEW: Duplicate operation function
  const duplicateOperation = (sourceOperation: ProductionOperation) => {
    if (isUpdating) return

    // Create temporary ID for the duplicated operation
    const tempId = `temp_${Date.now()}`

    // Create duplicated operation (as pending)
    const duplicatedOp = {
      id: tempId,
      item_id: sourceOperation.item_id,
      folha_obra_id: sourceOperation.folha_obra_id,
      no_interno: sourceOperation.no_interno,
      material_id: sourceOperation.material_id,
      [quantityField]: sourceOperation[quantityField] || 1,
      [notesField]: sourceOperation[notesField] || '',
      data_operacao: new Date().toISOString().split('T')[0], // Today's date
      operador_id: sourceOperation.operador_id,
      maquina: sourceOperation.maquina,
      Tipo_Op: sourceOperation.Tipo_Op,
      N_Pal: sourceOperation.N_Pal,
      QT_print: sourceOperation.QT_print,
      isPending: true, // Flag to identify as pending operation
    }

    console.log(`📋 Duplicating operation:`, sourceOperation)
    console.log(`✨ Created duplicate:`, duplicatedOp)

    // Add to pending operations (local state only)
    setPendingOperations((prev) => ({
      ...prev,
      [tempId]: duplicatedOp,
    }))

    // Copy material selections if they exist
    if (sourceOperation.material_id && sourceOperation.materiais) {
      setMaterialSelections((prev) => ({
        ...prev,
        [tempId]: {
          material: sourceOperation.materiais?.material || '',
          caracteristica: sourceOperation.materiais?.cor || '', // Note: this might need adjustment based on your data structure
          cor: sourceOperation.materiais?.cor || '',
        },
      }))
    }

    // Copy notes values if they exist
    if (sourceOperation[notesField]) {
      setNotesValues((prev) => ({
        ...prev,
        [tempId]: sourceOperation[notesField] || '',
      }))
    }

    // Copy palette selection if it exists
    if (sourceOperation.N_Pal) {
      setPaletteSelections((prev) => ({
        ...prev,
        [tempId]: sourceOperation.N_Pal || '',
      }))
    }
  }

  // NEW: Update pending operation function
  const updatePendingOperation = (
    tempId: string,
    field: string,
    value: any,
  ) => {
    console.log(`📝 Updating pending operation ${tempId}: ${field} = ${value}`)

    setPendingOperations((prev) => {
      const updated = {
        ...prev,
        [tempId]: {
          ...prev[tempId],
          [field]: value,
        },
      }

      console.log(`📊 Updated pending operation:`, updated[tempId])
      return updated
    })

    // Also update local state for material selections and notes
    if (field === 'material_id') {
      const material = materials.find((m) => m.id === value)
      if (material) {
        setMaterialSelections((prev) => ({
          ...prev,
          [tempId]: {
            material: material.material,
            caracteristica: material.carateristica,
            cor: material.cor,
          },
        }))
      }
    } else if (field === notesField) {
      setNotesValues((prev) => ({
        ...prev,
        [tempId]: value,
      }))
    }
  }

  // Stock management functions
  const updateStockOnOperation = async (
    materialId: string,
    oldQuantity: number = 0,
    newQuantity: number = 0,
  ) => {
    if (!materialId) return

    try {
      // Calculate the difference in consumption
      const consumptionDiff = newQuantity - oldQuantity

      if (consumptionDiff === 0) return // No change needed

      // Get the current material's stock_correct value
      const { data: materialData, error: materialError } = await supabase
        .from('materiais')
        .select('stock_correct')
        .eq('id', materialId)
        .single()

      if (materialError) {
        console.error('Error fetching stock_correct:', materialError)
        return
      }

      // If no stock_correct exists, calculate it first from current stock levels
      let currentStockCorrect = materialData?.stock_correct

      if (currentStockCorrect === null || currentStockCorrect === undefined) {
        // Calculate current stock in a traditional way
        const [stocksResult, operationsResult] = await Promise.all([
          supabase
            .from('stocks')
            .select('quantidade')
            .eq('material_id', materialId),
          supabase
            .from('producao_operacoes')
            .select('num_placas_corte')
            .eq('material_id', materialId),
        ])

        const stockTotal =
          stocksResult.data?.reduce(
            (sum: number, stock: any) => sum + (stock.quantidade || 0),
            0,
          ) || 0

        const operationsTotal =
          operationsResult.data?.reduce(
            (sum: number, op: any) => sum + (op.num_placas_corte || 0),
            0,
          ) || 0

        currentStockCorrect = stockTotal - operationsTotal
      }

      // Calculate new stock_correct value
      const newStockCorrect = currentStockCorrect - consumptionDiff

      // Update stock_correct in materiais table
      const { error: updateError } = await supabase
        .from('materiais')
        .update({
          stock_correct: newStockCorrect,
          stock_correct_updated_at: new Date().toISOString(),
        })
        .eq('id', materialId)

      if (updateError) {
        console.error('Error updating stock_correct:', updateError)
      }
    } catch (error) {
      console.error('Error in updateStockOnOperation:', error)
    }
  }

  const updateOperation = async (
    operationId: string,
    field: string,
    value: any,
  ) => {
    console.log(
      `🚀 updateOperation called: operationId=${operationId}, field=${field}, value="${value}", isUpdating=${isUpdating}`,
    )

    // Check if this is a pending operation
    if (operationId.startsWith('temp_')) {
      updatePendingOperation(operationId, field, value)
      return
    }

    if (isUpdating) {
      console.log(`⏸️ Update blocked - already updating`)
      return // Prevent multiple simultaneous updates
    }

    try {
      console.log(`⏳ Setting isUpdating to true and starting update...`)
      setIsUpdating(true)

      // Get the current operation to compare values - needed for stock operations AND sync logic
      let currentOperation = null
      if (
        field === 'material_id' ||
        field === 'num_placas_corte' ||
        field === 'num_placas_print' ||
        field === 'notas_imp' ||
        field === 'N_Pal'
      ) {
        const { data } = await supabase
          .from('producao_operacoes')
          .select(
            'id, material_id, num_placas_corte, num_placas_print, Tipo_Op, item_id, folha_obra_id, no_interno, N_Pal',
          )
          .eq('id', operationId)
          .single()
        currentOperation = data
      }

      // Debug log for notes fields
      if (field === 'notas_imp' || field === 'notas') {
        console.log(
          `🔄 Updating operation ${operationId} - field: ${field}, value: "${value}"`,
        )

        // Test if we can read the current operation first
        const { data: testRead, error: testReadError } = await supabase
          .from('producao_operacoes')
          .select('id, notas, notas_imp')
          .eq('id', operationId)
          .single()
        console.log(`🔍 Test read result:`, { testRead, testReadError })
      }

      const { data, error } = await supabase
        .from('producao_operacoes')
        .update({ [field]: value })
        .eq('id', operationId)
        .select()

      // Debug log for notes update results
      if (field === 'notas_imp' || field === 'notas') {
        console.log(`✅ Update result for ${field}:`, { data, error })
        if (data && data.length > 0) {
          console.log(`📝 Updated operation data:`, data[0])
        }
      }

      if (error) {
        console.error(
          `Error updating operation ${operationId} field ${field}:`,
          error?.message || error,
        )
        alert(
          `Erro ao atualizar ${field}: ${error?.message || JSON.stringify(error)}`,
        )
      } else {
        // Handle automatic stock deduction for cutting operations
        if (currentOperation && currentOperation.Tipo_Op === 'Corte') {
          if (field === 'material_id') {
            // Material changed - revert old material stock and deduct from new material
            const oldMaterialId = currentOperation.material_id
            const newMaterialId = value
            const quantity = currentOperation.num_placas_corte || 0

            if (oldMaterialId && quantity > 0) {
              // Add back to old material
              await updateStockOnOperation(oldMaterialId, quantity, 0)
            }
            if (newMaterialId && quantity > 0) {
              // Deduct from new material
              await updateStockOnOperation(newMaterialId, 0, quantity)
            }
          } else if (field === 'num_placas_corte') {
            // Quantity changed - update stock accordingly
            const materialId = currentOperation.material_id
            const oldQuantity = currentOperation.num_placas_corte || 0
            const newQuantity = value || 0

            if (materialId) {
              await updateStockOnOperation(materialId, oldQuantity, newQuantity)
            }
          }
        }

        // NEW: Auto-sync Impressão changes to corresponding Corte operation
        if (currentOperation && currentOperation.Tipo_Op === 'Impressao') {
          if (
            field === 'material_id' ||
            field === 'num_placas_print' ||
            field === 'notas_imp' ||
            field === 'N_Pal'
          ) {
            console.log(`🔄 Impressão operation updated, syncing to Corte...`)

            // Find corresponding Corte operation
            const { data: corteOperations } = await supabase
              .from('producao_operacoes')
              .select('id')
              .eq('item_id', currentOperation.item_id || itemId)
              .eq(
                'folha_obra_id',
                currentOperation.folha_obra_id || item.folha_obra_id,
              )
              .eq(
                'no_interno',
                currentOperation.no_interno ||
                  `${item.folhas_obras?.numero_fo || 'FO'}-${item.descricao?.substring(0, 10) || 'ITEM'}`,
              )
              .eq('Tipo_Op', 'Corte')

            if (corteOperations && corteOperations.length > 0) {
              const corteId = corteOperations[0].id
              console.log(`✅ Found corresponding Corte operation: ${corteId}`)

              // Prepare update data for Corte operation
              const corteUpdateData: any = {}

              if (field === 'material_id') {
                corteUpdateData.material_id = value
                console.log(`📦 Syncing material_id: ${value}`)
              }

              if (field === 'num_placas_print') {
                corteUpdateData.QT_print = value
                console.log(`🔢 Syncing quantity to QT_print: ${value}`)
              }

              if (field === 'notas_imp') {
                corteUpdateData.notas = value
                console.log(`📝 Syncing notes: ${value}`)
              }

              if (field === 'N_Pal') {
                corteUpdateData.N_Pal = value
                console.log(`🎨 Syncing palette: ${value}`)
              }

              // Update the Corte operation
              const { error: corteError } = await supabase
                .from('producao_operacoes')
                .update(corteUpdateData)
                .eq('id', corteId)

              if (corteError) {
                console.error('Error syncing to Corte operation:', corteError)
              } else {
                console.log(`✅ Successfully synced changes to Corte operation`)
              }
            } else {
              console.log(`ℹ️ No corresponding Corte operation found to sync`)
            }
          }
        }

        // Update local state immediately for notes fields
        if (field === 'notas' || field === 'notas_imp') {
          setNotesValues((prev) => ({
            ...prev,
            [operationId]: value,
          }))
        }

        onRefresh()
      }
    } catch (error) {
      console.error('❌ Error updating operation:', error)
    } finally {
      console.log(`🔧 Setting isUpdating back to false`)
      setIsUpdating(false)
    }
  }

  // NEW: Handle palette selection and auto-fill materials
  const handlePaletteSelection = async (
    operationId: string,
    paletteId: string,
  ) => {
    console.log(
      `🎨 Palette selection: operation=${operationId}, palette=${paletteId}`,
    )

    // Find the selected palette
    const selectedPalette = paletes.find((p) => p.id === paletteId)
    if (!selectedPalette) {
      console.log(`❌ Palette not found: ${paletteId}`)
      return
    }

    console.log(`✅ Found palette:`, selectedPalette)

    // Update palette selection in local state immediately
    setPaletteSelections((prev) => ({
      ...prev,
      [operationId]: paletteId,
    }))

    // Check if this is a pending operation
    if (operationId.startsWith('temp_')) {
      // For pending operations, update the pending state
      updatePendingOperation(operationId, 'N_Pal', selectedPalette.no_palete)

      // If the palette has a reference, also update material for pending operation
      if (selectedPalette.ref_cartao) {
        console.log(
          `🔍 Looking for material with ref_cartao: ${selectedPalette.ref_cartao}`,
        )
        console.log(
          `📦 Available materials:`,
          materials
            .filter((m) => m.tipo === 'RÍGIDOS')
            .map((m) => ({
              id: m.id,
              referencia: m.referencia,
              material: m.material,
              carateristica: m.carateristica,
              cor: m.cor,
            })),
        )

        const matchingMaterial = materials.find(
          (m) =>
            m.referencia === selectedPalette.ref_cartao && m.tipo === 'RÍGIDOS',
        )

        console.log(`🎯 Found matching material:`, matchingMaterial)

        if (matchingMaterial) {
          console.log(
            `🎯 Auto-filling material for pending operation:`,
            matchingMaterial,
          )
          // IMPORTANT: Save the material_id to the pending operation data
          updatePendingOperation(
            operationId,
            'material_id',
            matchingMaterial.id,
          )

          // Update material selections immediately for UI display
          setMaterialSelections((prev) => ({
            ...prev,
            [operationId]: {
              material: matchingMaterial.material || '',
              caracteristica: matchingMaterial.carateristica || '',
              cor: matchingMaterial.cor || '',
            },
          }))
        }
      }
    } else {
      // For saved operations, save to database
      console.log(`💾 Saving palette to database: ${selectedPalette.no_palete}`)
      // updateOperation will automatically sync to Corte if this is an Impressão operation
      await updateOperation(operationId, 'N_Pal', selectedPalette.no_palete)

      // If the palette has a reference, try to auto-fill material
      if (selectedPalette.ref_cartao) {
        // Find material by reference (ref_cartao)
        const matchingMaterial = materials.find(
          (m) =>
            m.referencia === selectedPalette.ref_cartao && m.tipo === 'RÍGIDOS',
        )

        if (matchingMaterial) {
          console.log(`🎯 Auto-filling material:`, matchingMaterial)
          // Update the operation's material_id - this will trigger onRefresh and auto-update the material combos
          // This will also automatically sync to Corte if this is an Impressão operation
          await updateOperation(operationId, 'material_id', matchingMaterial.id)

          // Manually update material selections immediately for better UX
          setMaterialSelections((prev) => ({
            ...prev,
            [operationId]: {
              material: matchingMaterial.material || '',
              caracteristica: matchingMaterial.carateristica || '',
              cor: matchingMaterial.cor || '',
            },
          }))
        } else {
          console.log(
            `❌ No matching material found for reference: ${selectedPalette.ref_cartao}`,
          )
        }
      } else {
        console.log(
          `ℹ️ Palette has no ref_cartao: ${selectedPalette.no_palete}`,
        )
      }
    }
  }

  const deleteOperation = async (operationId: string) => {
    if (isUpdating) return

    // Add confirmation dialog
    if (!confirm('Tem certeza que deseja eliminar esta operação?')) {
      return
    }

    try {
      setIsUpdating(true)
      console.log(`🗑️ Attempting to delete operation: ${operationId}`)

      // Check if this is a pending operation (temp ID)
      if (operationId.startsWith('temp_')) {
        console.log(`🔄 Deleting pending operation: ${operationId}`)
        // Remove from pending operations state
        setPendingOperations((prev) => {
          const updated = { ...prev }
          delete updated[operationId]
          return updated
        })
        alert('Operação eliminada com sucesso!')
        return
      }

      // For saved operations, try to get operation details before deleting
      const { data: operation, error: fetchError } = await supabase
        .from('producao_operacoes')
        .select('material_id, num_placas_corte, Tipo_Op')
        .eq('id', operationId)
        .single()

      if (fetchError) {
        console.error('Error fetching operation before delete:', fetchError)

        // If operation doesn't exist (already deleted or sync issue), just refresh
        if (fetchError.code === 'PGRST116') {
          console.log(
            `ℹ️ Operation not found in database, probably already deleted`,
          )
          onRefresh()
          alert('Operação não encontrada (possivelmente já eliminada)')
          return
        }

        alert(`Erro ao buscar operação: ${fetchError.message}`)
        return
      }

      console.log(`📋 Operation to delete:`, operation)

      const { data: deleteData, error: deleteError } = await supabase
        .from('producao_operacoes')
        .delete()
        .eq('id', operationId)
        .select()

      console.log(`🗑️ Delete result:`, { deleteData, deleteError })

      if (deleteError) {
        console.error('Error deleting operation:', deleteError)
        alert(`Erro ao eliminar operação: ${deleteError.message}`)
        return
      }

      console.log(`✅ Operation deleted successfully`)

      // Add stock back if it was a cutting operation
      if (
        operation &&
        operation.Tipo_Op === 'Corte' &&
        operation.material_id &&
        operation.num_placas_corte
      ) {
        console.log(`📦 Restoring stock for cutting operation`)
        await updateStockOnOperation(
          operation.material_id,
          operation.num_placas_corte,
          0,
        )
      }

      // Refresh the data
      onRefresh()
      alert('Operação eliminada com sucesso!')
    } catch (error) {
      console.error('Error deleting operation:', error)
      alert(`Erro inesperado ao eliminar operação: ${error}`)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Operações de {type === 'impressao' ? 'Impressão' : 'Corte'}
        </h3>
        <Button onClick={addOperation} disabled={isUpdating}>
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </>
          )}
        </Button>
      </div>

      {/* Path trabalho display */}
      {item.designer_items?.path_trabalho && (
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs font-bold uppercase">
            Path Trabalho
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={item.designer_items.path_trabalho}
              readOnly
              className="flex-1 cursor-text rounded-none font-mono text-sm select-all"
              title="Campo apenas de leitura - clique para selecionar todo o texto"
              style={{ cursor: 'text' }}
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                navigator.clipboard
                  .writeText(item.designer_items?.path_trabalho || '')
                  .then(() => {
                    alert('Path copiado para a área de transferência!')
                  })
                  .catch((err) => {
                    console.error('Failed to copy: ', err)
                    alert('Erro ao copiar path')
                  })
              }}
              title="Copiar path para área de transferência"
              className="shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="bg-background border-border w-full rounded-none border-2">
        <div className="w-full rounded-none">
          <Table className="w-full border-0">
            <TableHeader>
              <TableRow>
                <TableHead className="border-border w-[150px] min-w-[150px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Data
                </TableHead>
                <TableHead className="border-border w-[120px] min-w-[120px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Operador
                </TableHead>
                <TableHead className="border-border w-[160px] min-w-[160px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Máquina
                </TableHead>
                <TableHead className="border-border w-[160px] min-w-[160px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Pallete
                </TableHead>
                <TableHead className="border-border w-[160px] min-w-[160px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Material
                </TableHead>
                <TableHead className="border-border w-[160px] min-w-[160px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Caract.
                </TableHead>
                <TableHead className="border-border w-[240px] min-w-[240px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Cor
                </TableHead>
                {type === 'corte' && (
                  <TableHead className="border-border w-[80px] min-w-[80px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                    QT_print
                  </TableHead>
                )}
                <TableHead className="border-border w-[80px] min-w-[80px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Quantidade
                </TableHead>
                <TableHead className="border-border border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  {type === 'impressao' ? 'Notas Imp.' : 'Notas'}
                </TableHead>
                <TableHead className="border-border w-[130px] min-w-[130px] border-b-2 bg-[var(--orange)] p-2 text-center text-sm text-black uppercase">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayOperations.map((operation) => (
                <TableRow
                  key={operation.id}
                  className={`${(operation as any).isPending ? 'border-l-4 border-l-yellow-400 bg-yellow-50' : ''}`}
                >
                  <TableCell className="w-[150px] min-w-[150px] p-2 text-sm">
                    <DatePicker
                      selected={
                        operation.data_operacao
                          ? new Date(operation.data_operacao)
                          : undefined
                      }
                      onSelect={(date) => {
                        const newValue = date
                          ? date.toISOString().split('T')[0]
                          : null
                        // For pending operations, update locally only
                        if ((operation as any).isPending) {
                          updatePendingOperation(
                            operation.id,
                            'data_operacao',
                            newValue,
                          )
                        } else {
                          // For saved operations, update database immediately
                          updateOperation(
                            operation.id,
                            'data_operacao',
                            newValue,
                          )
                        }
                      }}
                      buttonClassName="w-full h-10"
                    />
                  </TableCell>
                  <TableCell className="w-[120px] min-w-[120px] p-2 text-sm">
                    <Select
                      value={operation.operador_id || ''}
                      onValueChange={(value) => {
                        // For pending operations, update locally only
                        if ((operation as any).isPending) {
                          updatePendingOperation(
                            operation.id,
                            'operador_id',
                            value,
                          )
                        } else {
                          // For saved operations, update database immediately
                          updateOperation(operation.id, 'operador_id', value)
                        }
                      }}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Selecionar operador">
                          {isUpdating ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="truncate uppercase">
                                Atualizando...
                              </span>
                            </div>
                          ) : operation.operador_id ? (
                            <span className="truncate uppercase">
                              {operation.profiles
                                ? operation.profiles.first_name
                                : (() => {
                                    const selectedOperator = operators.find(
                                      (op) => op.id === operation.operador_id,
                                    )
                                    return selectedOperator
                                      ? selectedOperator.first_name
                                      : 'Operador'
                                  })()}
                            </span>
                          ) : (
                            <span className="truncate uppercase">
                              Selecionar
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent disablePortal>
                        {operators.map((operator) => (
                          <SelectItem
                            key={operator.id}
                            value={operator.id}
                            className="uppercase"
                          >
                            {operator.first_name} {operator.last_name}
                            {operator.roles?.name && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({operator.roles.name})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="w-[160px] min-w-[160px] p-2 text-sm">
                    <Select
                      value={operation[machineField] || ''}
                      onValueChange={async (value) => {
                        const selectedMachine = machines.find(
                          (m) => m.id === value,
                        )

                        // For pending operations, update locally only
                        if ((operation as any).isPending) {
                          updatePendingOperation(
                            operation.id,
                            machineField,
                            value,
                          )
                          if (selectedMachine) {
                            updatePendingOperation(
                              operation.id,
                              'Tipo_Op',
                              selectedMachine.tipo,
                            )
                          }
                        } else {
                          // For saved operations, update database immediately
                          await updateOperation(
                            operation.id,
                            machineField,
                            value,
                          )
                          if (selectedMachine) {
                            await updateOperation(
                              operation.id,
                              'Tipo_Op',
                              selectedMachine.tipo,
                            )
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Selecionar máquina">
                          <span className="truncate uppercase">
                            {operation[machineField]
                              ? machines.find(
                                  (m) => m.id === operation[machineField],
                                )?.nome_maquina ||
                                machines.find(
                                  (m) =>
                                    m.nome_maquina === operation[machineField],
                                )?.nome_maquina ||
                                'Máquina Selecionada'
                              : 'Selecionar máquina'}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent disablePortal>
                        {machines
                          .filter(
                            (machine) =>
                              machine.tipo ===
                              (type === 'impressao' ? 'Impressao' : 'Corte'),
                          )
                          .map((machine) => (
                            <SelectItem
                              key={machine.id}
                              value={machine.id}
                              className="uppercase"
                            >
                              {machine.nome_maquina}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {/* PALLETE Column - For both Impressão and Corte */}
                  <TableCell className="w-[160px] min-w-[160px] p-2 text-sm">
                    <Combobox
                      options={paletes.map((palete) => ({
                        value: palete.id,
                        label: palete.no_palete,
                      }))}
                      value={paletteSelections[operation.id] || ''}
                      onChange={(value: string) => {
                        // For pending operations, update locally only
                        if ((operation as any).isPending) {
                          const selectedPalette = paletes.find(
                            (p) => p.id === value,
                          )
                          if (selectedPalette) {
                            updatePendingOperation(
                              operation.id,
                              'N_Pal',
                              selectedPalette.no_palete,
                            )
                            setPaletteSelections((prev) => ({
                              ...prev,
                              [operation.id]: value,
                            }))
                            // Handle material auto-fill for pending operations
                            if (selectedPalette.ref_cartao) {
                              const matchingMaterial = materials.find(
                                (m) =>
                                  m.referencia === selectedPalette.ref_cartao &&
                                  m.tipo === 'RÍGIDOS',
                              )
                              if (matchingMaterial) {
                                updatePendingOperation(
                                  operation.id,
                                  'material_id',
                                  matchingMaterial.id,
                                )
                                setMaterialSelections((prev) => ({
                                  ...prev,
                                  [operation.id]: {
                                    material: matchingMaterial.material || '',
                                    caracteristica:
                                      matchingMaterial.carateristica || '',
                                    cor: matchingMaterial.cor || '',
                                  },
                                }))
                              }
                            }
                          }
                        } else {
                          // For saved operations, use existing function
                          handlePaletteSelection(operation.id, value)
                        }
                      }}
                      placeholder="Selecionar palete"
                      emptyMessage="Nenhuma palete encontrada"
                      searchPlaceholder="Procurar palete..."
                      disabled={paletesLoading}
                      className="h-10 w-full"
                      buttonClassName="uppercase truncate"
                    />
                  </TableCell>
                  {/* Material Combo 1 */}
                  <TableCell className="w-[160px] min-w-[160px] p-2 text-sm">
                    <Select
                      value={materialSelections[operation.id]?.material || ''}
                      onValueChange={(value) => {
                        setMaterialSelections((prev) => ({
                          ...prev,
                          [operation.id]: {
                            material: value,
                            caracteristica: undefined,
                            cor: undefined,
                          },
                        }))
                        // For pending operations, no database update needed yet
                        // Material ID will be set when all three dropdowns are selected
                      }}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Mat">
                          <span className="truncate uppercase">
                            {materialSelections[operation.id]?.material ||
                              'Mat'}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent disablePortal>
                        {Array.from(
                          new Set(
                            materials
                              .filter((m) => m.tipo === 'RÍGIDOS')
                              .map((m) => m.material)
                              .filter(Boolean),
                          ),
                        ).map((material) => (
                          <SelectItem
                            key={material}
                            value={material}
                            className="uppercase"
                          >
                            {material}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {/* Material Combo 2 */}
                  <TableCell className="w-[160px] min-w-[160px] p-2 text-sm">
                    <Select
                      key={`caract-${operation.id}-${materialSelections[operation.id]?.material || 'none'}`}
                      value={
                        materialSelections[operation.id]?.caracteristica || ''
                      }
                      onValueChange={(value) => {
                        const currentSelection =
                          materialSelections[operation.id]
                        setMaterialSelections((prev) => ({
                          ...prev,
                          [operation.id]: {
                            ...currentSelection,
                            caracteristica: value,
                            cor: undefined,
                          },
                        }))
                        // For pending operations, no database update needed yet
                        // Material ID will be set when all three dropdowns are selected
                      }}
                      disabled={!materialSelections[operation.id]?.material}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Caract">
                          <span className="truncate uppercase">
                            {materialSelections[operation.id]?.caracteristica ||
                              'Caract'}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent disablePortal>
                        {(() => {
                          const filtered = materials
                            .filter(
                              (m) =>
                                m.tipo === 'RÍGIDOS' &&
                                m.material?.toLowerCase() ===
                                  materialSelections[
                                    operation.id
                                  ]?.material?.toLowerCase(),
                            )
                            .map((m) => m.carateristica)
                            .filter(Boolean)
                          const unique = Array.from(new Set(filtered))
                          return unique
                        })().map((caracteristica) => (
                          <SelectItem
                            key={caracteristica}
                            value={caracteristica}
                            className="uppercase"
                          >
                            {caracteristica}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {/* Material Combo 3 */}
                  <TableCell className="w-[240px] min-w-[240px] p-2 text-sm">
                    <Select
                      key={`cor-${operation.id}-${materialSelections[operation.id]?.material || 'none'}-${materialSelections[operation.id]?.caracteristica || 'none'}`}
                      value={materialSelections[operation.id]?.cor || ''}
                      onValueChange={(value) => {
                        const currentSelection =
                          materialSelections[operation.id]
                        const updatedSelection = {
                          ...currentSelection,
                          cor: value,
                        }
                        setMaterialSelections((prev) => ({
                          ...prev,
                          [operation.id]: updatedSelection,
                        }))
                        // Only update material_id if all three are selected and a matching material exists
                        const foundMaterial = materials.find(
                          (m) =>
                            m.tipo === 'RÍGIDOS' &&
                            m.material?.toLowerCase() ===
                              updatedSelection.material?.toLowerCase() &&
                            m.carateristica?.toLowerCase() ===
                              updatedSelection.caracteristica?.toLowerCase() &&
                            m.cor?.toLowerCase() === value?.toLowerCase(),
                        )
                        if (
                          foundMaterial &&
                          updatedSelection.material &&
                          updatedSelection.caracteristica &&
                          value
                        ) {
                          // For pending operations, update locally only
                          if ((operation as any).isPending) {
                            updatePendingOperation(
                              operation.id,
                              'material_id',
                              foundMaterial.id,
                            )
                          } else {
                            // For saved operations, update database immediately with stock deduction
                            updateOperation(
                              operation.id,
                              'material_id',
                              foundMaterial.id,
                            )
                          }
                        }
                      }}
                      disabled={
                        !materialSelections[operation.id]?.caracteristica
                      }
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Cor">
                          <span className="truncate uppercase">
                            {materialSelections[operation.id]?.cor || 'Cor'}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent disablePortal>
                        {(() => {
                          const filtered = materials
                            .filter(
                              (m) =>
                                m.tipo === 'RÍGIDOS' &&
                                m.material?.toLowerCase() ===
                                  materialSelections[
                                    operation.id
                                  ]?.material?.toLowerCase() &&
                                m.carateristica?.toLowerCase() ===
                                  materialSelections[
                                    operation.id
                                  ]?.caracteristica?.toLowerCase(),
                            )
                            .map((m) => m.cor)
                            .filter(Boolean)
                          const unique = Array.from(new Set(filtered))
                          return unique
                        })().map((cor) => (
                          <SelectItem
                            key={cor}
                            value={cor}
                            className="uppercase"
                          >
                            {cor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {type === 'corte' && (
                    <TableCell className="w-[80px] min-w-[80px] p-2 text-sm">
                      <Input
                        type="number"
                        className="h-10 w-full [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={operation.QT_print || ''}
                        onChange={(e) => {
                          const newValue = Number(e.target.value)
                          // For pending operations, update locally only
                          if ((operation as any).isPending) {
                            updatePendingOperation(
                              operation.id,
                              'QT_print',
                              newValue,
                            )
                          } else {
                            // For saved operations, update database immediately
                            updateOperation(operation.id, 'QT_print', newValue)
                          }
                        }}
                        disabled
                        style={{ backgroundColor: '#f3f4f6' }}
                      />
                    </TableCell>
                  )}
                  <TableCell className="w-[80px] min-w-[80px] p-2 text-sm">
                    <Input
                      type="number"
                      className="h-10 w-full [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={operation[quantityField] || ''}
                      onChange={(e) => {
                        const newValue = Number(e.target.value)
                        // For pending operations, update locally only
                        if ((operation as any).isPending) {
                          updatePendingOperation(
                            operation.id,
                            quantityField,
                            newValue,
                          )
                        } else {
                          // For saved operations, update database immediately
                          updateOperation(operation.id, quantityField, newValue)
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="p-2 text-sm">
                    <Input
                      value={notesValues[operation.id] || ''}
                      onChange={(e) => {
                        // Update local state immediately for better UX
                        const newValue = e.target.value
                        console.log(
                          `📝 onChange for operation ${operation.id}: "${newValue}"`,
                        )
                        setNotesValues((prev) => ({
                          ...prev,
                          [operation.id]: newValue,
                        }))

                        // Save to database immediately (no need to wait for onBlur)
                        console.log(`💾 Saving immediately via onChange`)
                        updateOperation(operation.id, notesField, newValue)
                      }}
                      placeholder={
                        type === 'impressao'
                          ? 'Notas de impressão...'
                          : 'Notas...'
                      }
                      className="h-8 w-full rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                    />
                  </TableCell>
                  <TableCell className="w-[130px] min-w-[130px] p-2 text-sm">
                    {(operation as any).isPending ? (
                      // For pending operations: Duplicate, Accept and Cancel buttons
                      <div className="flex justify-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => duplicateOperation(operation)}
                                disabled={isUpdating}
                                className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="default"
                                onClick={() =>
                                  acceptOperation(
                                    operation as ProductionOperation & {
                                      isPending?: boolean
                                    },
                                  )
                                }
                                disabled={isUpdating}
                                className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {type === 'impressao'
                                ? 'Aceitar e copiar para corte'
                                : 'Aceitar'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => cancelOperation(operation.id)}
                          className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      // For saved operations: Duplicate and Delete buttons
                      <div className="flex justify-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => duplicateOperation(operation)}
                                disabled={isUpdating}
                                className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => deleteOperation(operation.id)}
                          className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {displayOperations.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={type === 'corte' ? 11 : 10}
                    className="py-8 text-center"
                  >
                    Nenhuma operação encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ArrowUp, ArrowDown, RefreshCcw, Eye, EyeOff, X } from 'lucide-react'
import DatePicker from '@/components/ui/DatePicker'
import { createBrowserClient } from '@/utils/supabase'

// Value-based debounce hook for filters
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

interface DashboardLogisticaRecord {
  // From folhas_obras
  folha_obra_id: string
  numero_fo: string
  numero_orc?: number
  nome_campanha: string
  fo_data_saida?: string
  fo_saiu?: boolean
  cliente?: string
  id_cliente?: string

  // From items_base
  item_id: string
  item_descricao: string
  codigo?: string
  quantidade?: number
  brindes?: boolean
  data_conc?: string

  // From logistica_entregas (these fields moved here)
  logistica_id?: string
  guia?: string
  notas?: string
  transportadora?: string
  local_entrega?: string
  local_recolha?: string
  contacto?: string
  telefone?: string
  contacto_entrega?: string
  telefone_entrega?: string
  logistica_quantidade?: number
  data?: string
  id_local_entrega?: string
  id_local_recolha?: string
  // New/moved fields in logistica_entregas
  concluido?: boolean
  data_concluido?: string
  saiu?: boolean
  data_saida?: string // Added field for departure date
}

interface Cliente {
  value: string
  label: string
}

interface Transportadora {
  value: string
  label: string
}

interface DashboardLogisticaTableProps {
  onRefresh?: () => void
}

// Define sortable columns type following the same pattern as main production table
type SortableLogisticaKey =
  | 'numero_fo'
  | 'cliente'
  | 'nome_campanha'
  | 'item'
  | 'codigo'
  | 'guia'
  | 'transportadora'
  | 'data_concluido'
  | 'concluido'
  | 'local_entrega'
  | 'data_saida'
  | 'saiu'

export const DashboardLogisticaTable: React.FC<
  DashboardLogisticaTableProps
> = ({ onRefresh }) => {
  const [records, setRecords] = useState<DashboardLogisticaRecord[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([])
  const [loading, setLoading] = useState(true)
  const [showDispatched, setShowDispatched] = useState(false)

  // Filter state
  const [filters, setFilters] = useState({
    cliente: '',
    nomeCampanha: '',
    item: '',
    codigo: '',
    guia: '',
  })

  // Add date filter state for today/tomorrow
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow'>(
    'all',
  )

  // Debounced filter values for performance
  const debouncedFilters = useDebounce(filters, 300)

  // Updated sorting state to match main production table pattern
  const [sortCol, setSortCol] = useState<SortableLogisticaKey>('numero_fo')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Toggle sort function following the same pattern as main production table
  const toggleSort = useCallback(
    (c: SortableLogisticaKey) => {
      if (sortCol === c) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
      else {
        setSortCol(c)
        setSortDir('asc')
      }
    },
    [sortCol, sortDir],
  )

  const supabase = useMemo(() => createBrowserClient(), [])

  // Utility function to parse a date string as a local date (to avoid timezone issues)
  const parseDateFromYYYYMMDD = useCallback((dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day)
  }, [])

  // Format date for database storage (YYYY-MM-DD)
  const formatDateForDB = useCallback((date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  // Helper function to get cliente IDs for filtering
  const getClienteIds = useCallback(
    async (searchTerm: string): Promise<string> => {
      const { data: matchingClientes } = await supabase
        .from('clientes')
        .select('id')
        .ilike('nome_cl', `%${searchTerm}%`)

      return matchingClientes?.map((c) => c.id).join(',') || ''
    },
    [supabase],
  )

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayString = useCallback((): string => {
    const today = new Date()
    return formatDateForDB(today)
  }, [formatDateForDB])

  // Helper function to get tomorrow's date in YYYY-MM-DD format
  const getTomorrowString = useCallback((): string => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return formatDateForDB(tomorrow)
  }, [formatDateForDB])

  // Fetch data with database-level filtering
  const fetchData = useCallback(
    async (dispatched = false, filterParams: Partial<typeof filters> = {}) => {
      setLoading(true)
      try {
        // Fetch work orders with their items and logistics entries
        // Show all items regardless of concluido status
        let logisticsQuery = supabase.from('folhas_obras').select(`
          id,
          numero_fo,
          numero_orc,
          nome_campanha,
          data_saida,
          saiu,
          cliente,
          id_cliente,
          items_base!inner (
            id,
            brindes,
            descricao,
            codigo,
            quantidade,
            data_conc,
            logistica_entregas!inner (
              id,
              guia,
              notas,
              transportadora,
              local_entrega,
              local_recolha,
              contacto,
              telefone,
              contacto_entrega,
              telefone_entrega,
              quantidade,
              data,
              id_local_entrega,
              id_local_recolha,
              created_at,
              concluido,
              data_concluido,
              saiu,
              data_saida
            )
          )
        `)

        if (dispatched) {
          logisticsQuery = logisticsQuery.eq(
            'items_base.logistica_entregas.saiu',
            true,
          )
        }

        // Apply database-level filters
        if (filterParams.cliente?.trim()) {
          logisticsQuery = logisticsQuery.ilike(
            'cliente',
            `%${filterParams.cliente.trim()}%`,
          )
        }

        if (filterParams.nomeCampanha?.trim()) {
          logisticsQuery = logisticsQuery.ilike(
            'nome_campanha',
            `%${filterParams.nomeCampanha.trim()}%`,
          )
        }

        if (filterParams.item?.trim()) {
          logisticsQuery = logisticsQuery.ilike(
            'items_base.descricao',
            `%${filterParams.item.trim()}%`,
          )
        }

        if (filterParams.codigo?.trim()) {
          logisticsQuery = logisticsQuery.ilike(
            'items_base.codigo',
            `%${filterParams.codigo.trim()}%`,
          )
        }

        if (filterParams.guia?.trim()) {
          logisticsQuery = logisticsQuery.ilike(
            'items_base.logistica_entregas.guia',
            `%${filterParams.guia.trim()}%`,
          )
        }
        const { data: logisticsData, error: logisticsError } =
          await logisticsQuery.order('numero_fo')

        if (logisticsError) {
          console.error('Error fetching logistics:', logisticsError)
          return
        }

        console.log('Fetched logistics data:', logisticsData)
        console.log('Logistics count:', logisticsData?.length || 0)

        // Fetch clientes
        const { data: clientesData, error: clientesError } = await supabase
          .from('clientes')
          .select('id, nome_cl')
          .order('nome_cl')

        if (clientesError) {
          console.error('Error fetching clientes:', clientesError)
        }

        // Fetch transportadoras
        const { data: transportadorasData, error: transportadorasError } =
          await supabase.from('transportadora').select('id, name').order('name')

        if (transportadorasError) {
          console.error('Error fetching transportadoras:', transportadorasError)
        }

        // Transform the nested data into flat records for each logistics entry
        const flatRecords: DashboardLogisticaRecord[] = []
        ;(logisticsData || []).forEach((folhaObra) => {
          if (!folhaObra.items_base) return
          folhaObra.items_base.forEach((item: any) => {
            if (item.logistica_entregas && item.logistica_entregas.length > 0) {
              item.logistica_entregas.forEach((logistica: any) => {
                flatRecords.push({
                  // From folhas_obras
                  folha_obra_id: folhaObra.id,
                  numero_fo: folhaObra.numero_fo,
                  numero_orc: folhaObra.numero_orc,
                  nome_campanha: folhaObra.nome_campanha,
                  fo_data_saida: folhaObra.data_saida,
                  fo_saiu: folhaObra.saiu,
                  cliente: folhaObra.cliente,
                  id_cliente: folhaObra.id_cliente,
                  // From items_base
                  item_id: item.id,
                  item_descricao: item.descricao,
                  codigo: item.codigo,
                  quantidade: item.quantidade,
                  brindes: item.brindes,
                  data_conc: item.data_conc,
                  // From logistica_entregas (including moved fields)
                  logistica_id: logistica.id,
                  guia: logistica.guia,
                  notas: logistica.notas,
                  transportadora: logistica.transportadora,
                  local_entrega: logistica.local_entrega,
                  local_recolha: logistica.local_recolha,
                  contacto: logistica.contacto,
                  telefone: logistica.telefone,
                  contacto_entrega: logistica.contacto_entrega,
                  telefone_entrega: logistica.telefone_entrega,
                  logistica_quantidade: logistica.quantidade,
                  data: logistica.data,
                  id_local_entrega: logistica.id_local_entrega,
                  id_local_recolha: logistica.id_local_recolha,
                  concluido: logistica.concluido,
                  data_concluido: logistica.data_concluido,
                  saiu: logistica.saiu,
                  data_saida: logistica.data_saida,
                })
              })
            }
          })
        })

        // Filter: show all records based on saiu status - no date filtering, show all completed items
        const filteredRecords = flatRecords.filter((record) => {
          // Show all items with data_concluido regardless of date
          // Filter based on dispatch status
          if (dispatched) {
            return record.saiu === true
          } else {
            return record.saiu === false
          }
        })

        console.log('Processed flat records:', filteredRecords)
        console.log('Flat records count:', filteredRecords.length)

        setRecords(filteredRecords)
        setClientes(
          clientesData?.map((c: any) => ({ value: c.id, label: c.nome_cl })) ||
            [],
        )
        setTransportadoras(
          transportadorasData?.map((t: any) => ({
            value: t.id,
            label: t.name,
          })) || [],
        )
      } catch (error) {
        console.error('Error in fetchData:', error)
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  // On mount and when showDispatched changes, refetch data
  useEffect(() => {
    fetchData(showDispatched)
  }, [fetchData, showDispatched])

  // Auto-refresh when page gains focus (user switches back from production page)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Page gained focus, refreshing logistics data...')
      fetchData(showDispatched)
    }

    window.addEventListener('focus', handleFocus)

    // Also listen for visibility change (when tab becomes visible)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Tab became visible, refreshing logistics data...')
        fetchData(showDispatched)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchData, showDispatched])

  // Create lookup dictionaries
  const clienteLookup = useMemo(() => {
    const lookup: Record<string, string> = {}
    clientes.forEach((cliente) => {
      lookup[cliente.value] = cliente.label
    })
    return lookup
  }, [clientes])

  const transportadoraLookup = useMemo(() => {
    const lookup: Record<string, string> = {}
    transportadoras.forEach((t) => {
      lookup[t.value] = t.label
    })
    return lookup
  }, [transportadoras])

  // Client-side filtering logic
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      // Cliente filter - search both direct cliente field and resolved client name
      const clienteMatch =
        !filters.cliente ||
        record.cliente?.toLowerCase().includes(filters.cliente.toLowerCase()) ||
        (record.id_cliente &&
          clienteLookup[record.id_cliente]
            ?.toLowerCase()
            .includes(filters.cliente.toLowerCase()))

      // Nome Campanha filter
      const campanhaMatch =
        !filters.nomeCampanha ||
        record.nome_campanha
          ?.toLowerCase()
          .includes(filters.nomeCampanha.toLowerCase())

      // Item filter
      const itemMatch =
        !filters.item ||
        record.item_descricao
          ?.toLowerCase()
          .includes(filters.item.toLowerCase())

      // Código filter
      const codigoMatch =
        !filters.codigo ||
        record.codigo?.toLowerCase().includes(filters.codigo.toLowerCase())

      // Guia filter
      const guiaMatch =
        !filters.guia ||
        record.guia?.toLowerCase().includes(filters.guia.toLowerCase())

      // Date filter for data_saida
      let dateMatch = true
      if (dateFilter !== 'all' && record.data_saida) {
        const recordDate = record.data_saida.split('T')[0] // Get YYYY-MM-DD part
        if (dateFilter === 'today') {
          dateMatch = recordDate === getTodayString()
        } else if (dateFilter === 'tomorrow') {
          dateMatch = recordDate === getTomorrowString()
        }
      } else if (dateFilter !== 'all' && !record.data_saida) {
        // If date filter is active but record has no data_saida, don't show it
        dateMatch = false
      }

      return (
        clienteMatch &&
        campanhaMatch &&
        itemMatch &&
        codigoMatch &&
        guiaMatch &&
        dateMatch
      )
    })
  }, [
    records,
    filters,
    clienteLookup,
    dateFilter,
    getTodayString,
    getTomorrowString,
  ])

  // Updated sorting logic following the same pattern as main production table
  const sorted = useMemo(() => {
    const arr = [...filteredRecords]
    arr.sort((a, b) => {
      let A: any, B: any
      switch (sortCol) {
        case 'numero_fo':
          A = a.numero_fo ?? ''
          B = b.numero_fo ?? ''
          break
        case 'cliente': {
          const clientIdA = a.id_cliente
          const clientIdB = b.id_cliente
          A = (clientIdA ? clienteLookup[clientIdA] : '') || a.cliente || ''
          B = (clientIdB ? clienteLookup[clientIdB] : '') || b.cliente || ''
          break
        }
        case 'nome_campanha':
          A = a.nome_campanha ?? ''
          B = b.nome_campanha ?? ''
          break
        case 'item':
          A = a.item_descricao ?? ''
          B = b.item_descricao ?? ''
          break
        case 'codigo':
          A = a.codigo ?? ''
          B = b.codigo ?? ''
          break
        case 'guia':
          A = a.guia ?? ''
          B = b.guia ?? ''
          break
        case 'transportadora': {
          const transIdA = a.transportadora
          const transIdB = b.transportadora
          A = (transIdA ? transportadoraLookup[transIdA] : '') || ''
          B = (transIdB ? transportadoraLookup[transIdB] : '') || ''
          break
        }
        case 'data_concluido':
          A = a.data_concluido ? new Date(a.data_concluido).getTime() : 0
          B = b.data_concluido ? new Date(b.data_concluido).getTime() : 0
          break
        case 'concluido':
          A = a.concluido ?? false
          B = b.concluido ?? false
          break
        case 'local_entrega':
          A = a.local_entrega ?? ''
          B = b.local_entrega ?? ''
          break
        case 'data_saida':
          A = a.data_saida ? new Date(a.data_saida).getTime() : 0
          B = b.data_saida ? new Date(b.data_saida).getTime() : 0
          break
        case 'saiu':
          A = a.saiu ?? false
          B = b.saiu ?? false
          break
        default:
          A = a.numero_fo
          B = b.numero_fo
      }
      if (typeof A === 'string')
        return sortDir === 'asc' ? A.localeCompare(B) : B.localeCompare(A)
      if (typeof A === 'number') return sortDir === 'asc' ? A - B : B - A
      if (typeof A === 'boolean') return sortDir === 'asc' ? +A - +B : +B - +A
      return 0
    })
    return arr
  }, [filteredRecords, sortCol, sortDir, clienteLookup, transportadoraLookup])

  // Clear filters function
  const clearFilters = useCallback(() => {
    setFilters({
      cliente: '',
      nomeCampanha: '',
      item: '',
      codigo: '',
      guia: '',
    })
    setDateFilter('all')
  }, [])

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchData(showDispatched)
    onRefresh?.()
  }, [fetchData, onRefresh, showDispatched])

  // Update saiu status - now updates logistica_entregas instead of items_base
  const handleSaiuUpdate = useCallback(
    async (record: DashboardLogisticaRecord, value: boolean) => {
      try {
        if (!record.logistica_id) {
          console.error('Cannot update saiu: missing logistica_id', record)
          return
        }

        // Update logistica_entregas saiu field
        await supabase
          .from('logistica_entregas')
          .update({ saiu: value })
          .eq('id', record.logistica_id)

        // Refresh data
        await fetchData(showDispatched)
      } catch (error) {
        console.error('Error updating saiu status:', error)
      }
    },
    [supabase, fetchData, showDispatched],
  )

  // Update data_saida status - now updates logistica_entregas.data_saida field
  const handleDataSaidaUpdate = useCallback(
    async (record: DashboardLogisticaRecord, date: Date | null) => {
      try {
        if (!record.logistica_id) {
          console.error(
            'Cannot update data_saida: missing logistica_id',
            record,
          )
          return
        }

        const dateString = date ? formatDateForDB(date) : null
        await supabase
          .from('logistica_entregas')
          .update({ data_saida: dateString })
          .eq('id', record.logistica_id)

        // Refresh data
        await fetchData(showDispatched)
      } catch (error) {
        console.error('Error updating data_saida:', error)
      }
    },
    [supabase, fetchData, formatDateForDB, showDispatched],
  )

  // Update concluido status - updates logistica_entregas.concluido field
  const handleConcluidoUpdate = useCallback(
    async (record: DashboardLogisticaRecord, value: boolean) => {
      try {
        if (!record.logistica_id) {
          console.error('Cannot update concluido: missing logistica_id', record)
          return
        }

        await supabase
          .from('logistica_entregas')
          .update({ concluido: value })
          .eq('id', record.logistica_id)

        // Refresh data
        await fetchData(showDispatched)
      } catch (error) {
        console.error('Error updating concluido status:', error)
      }
    },
    [supabase, fetchData, showDispatched],
  )

  if (loading) {
    return (
      <div className="w-full px-6">
        <h2 className="mb-4 text-2xl font-bold">Trabalhos Concluídos</h2>
        <div className="flex h-40 items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full pr-6 pl-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trabalhos Concluídos</h2>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowDispatched((v) => !v)}
                  aria-label={
                    showDispatched
                      ? 'Mostrar Não Despachados'
                      : 'Mostrar Despachados'
                  }
                  className={`border-border border-2 ${showDispatched ? 'bg-[var(--main)]' : ''}`}
                >
                  {showDispatched ? (
                    <Eye className="h-5 w-5" />
                  ) : (
                    <EyeOff className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showDispatched
                  ? 'Mostrar Não Despachados'
                  : 'Mostrar Despachados'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleRefresh}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder="Cliente"
          className="w-[200px] rounded-none"
          value={filters.cliente}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, cliente: e.target.value }))
          }
        />
        <Input
          placeholder="Nome Campanha"
          className="flex-1 rounded-none"
          value={filters.nomeCampanha}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, nomeCampanha: e.target.value }))
          }
        />
        <Input
          placeholder="Item"
          className="flex-1 rounded-none"
          value={filters.item}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, item: e.target.value }))
          }
        />
        <Input
          placeholder="Código"
          className="w-[140px] rounded-none"
          value={filters.codigo}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, codigo: e.target.value }))
          }
        />
        <Input
          placeholder="Guia"
          className="w-[140px] rounded-none"
          value={filters.guia}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, guia: e.target.value }))
          }
        />

        {/* Date filter buttons */}
        <div className="border-border flex items-center gap-1 border-l pl-2">
          <Button
            variant={dateFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateFilter('all')}
            className="h-10 rounded-none px-3 text-xs"
          >
            Todos
          </Button>
          <Button
            variant={dateFilter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateFilter('today')}
            className="h-10 rounded-none px-3 text-xs"
          >
            Hoje
          </Button>
          <Button
            variant={dateFilter === 'tomorrow' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateFilter('tomorrow')}
            className="h-10 rounded-none px-3 text-xs"
          >
            Amanhã
          </Button>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                className="rounded-none"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Limpar Filtros</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="bg-background border-border w-full rounded-none border-2">
        <div className="w-full rounded-none">
          <Table className="w-full table-fixed border-0 uppercase [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
            <TableHeader>
              <TableRow>
                <TableHead
                  onClick={() => toggleSort('numero_fo')}
                  className="border-border sticky top-0 z-10 w-[90px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
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
                  onClick={() => toggleSort('cliente')}
                  className="border-border sticky top-0 z-10 cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                >
                  Cliente{' '}
                  {sortCol === 'cliente' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="ml-1 inline h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 inline h-3 w-3" />
                    ))}
                </TableHead>
                <TableHead
                  onClick={() => toggleSort('nome_campanha')}
                  className="border-border sticky top-0 z-10 cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                >
                  Nome Campanha{' '}
                  {sortCol === 'nome_campanha' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="ml-1 inline h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 inline h-3 w-3" />
                    ))}
                </TableHead>
                <TableHead
                  onClick={() => toggleSort('item')}
                  className="border-border sticky top-0 z-10 cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                >
                  Item{' '}
                  {sortCol === 'item' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="ml-1 inline h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 inline h-3 w-3" />
                    ))}
                </TableHead>
                <TableHead
                  onClick={() => toggleSort('codigo')}
                  className="border-border sticky top-0 z-10 cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                >
                  Código{' '}
                  {sortCol === 'codigo' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="ml-1 inline h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 inline h-3 w-3" />
                    ))}
                </TableHead>
                <TableHead
                  onClick={() => toggleSort('guia')}
                  className="border-border sticky top-0 z-10 w-[90px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                >
                  Guia{' '}
                  {sortCol === 'guia' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="ml-1 inline h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 inline h-3 w-3" />
                    ))}
                </TableHead>
                <TableHead
                  onClick={() => toggleSort('transportadora')}
                  className="border-border sticky top-0 z-10 cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                >
                  Transportadora{' '}
                  {sortCol === 'transportadora' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="ml-1 inline h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 inline h-3 w-3" />
                    ))}
                </TableHead>
                <TableHead
                  onClick={() => toggleSort('local_entrega')}
                  className="border-border sticky top-0 z-10 cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                >
                  Local Entrega{' '}
                  {sortCol === 'local_entrega' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="ml-1 inline h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 inline h-3 w-3" />
                    ))}
                </TableHead>
                <TableHead
                  onClick={() => toggleSort('data_concluido')}
                  className="border-border sticky top-0 z-10 w-32 cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                >
                  Data Concluído{' '}
                  {sortCol === 'data_concluido' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="ml-1 inline h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 inline h-3 w-3" />
                    ))}
                </TableHead>
                <TableHead
                  onClick={() => toggleSort('concluido')}
                  className="border-border sticky top-0 z-10 w-12 cursor-pointer border-b-2 bg-[var(--orange)] text-center font-bold uppercase select-none"
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          C{' '}
                          {sortCol === 'concluido' &&
                            (sortDir === 'asc' ? (
                              <ArrowUp className="ml-1 inline h-3 w-3" />
                            ) : (
                              <ArrowDown className="ml-1 inline h-3 w-3" />
                            ))}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Concluído</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead
                  onClick={() => toggleSort('data_saida')}
                  className="border-border sticky top-0 z-10 w-44 cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                >
                  Data Saída{' '}
                  {sortCol === 'data_saida' &&
                    (sortDir === 'asc' ? (
                      <ArrowUp className="ml-1 inline h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 inline h-3 w-3" />
                    ))}
                </TableHead>
                <TableHead
                  onClick={() => toggleSort('saiu')}
                  className="border-border sticky top-0 z-10 w-12 cursor-pointer border-b-2 bg-[var(--orange)] text-center font-bold uppercase select-none"
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          S{' '}
                          {sortCol === 'saiu' &&
                            (sortDir === 'asc' ? (
                              <ArrowUp className="ml-1 inline h-3 w-3" />
                            ) : (
                              <ArrowDown className="ml-1 inline h-3 w-3" />
                            ))}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Saiu</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="border-border w-12 border-b-2 bg-[var(--orange)] font-bold"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((record) => (
                <TableRow
                  key={`${record.item_id}-${record.logistica_id || 'no-logistics'}`}
                >
                  <TableCell>{record.numero_fo || '-'}</TableCell>
                  <TableCell>
                    {(() => {
                      const clientId = record.id_cliente
                      return (
                        (clientId ? clienteLookup[clientId] : '') ||
                        record.cliente ||
                        '-'
                      )
                    })()}
                  </TableCell>
                  <TableCell>{record.nome_campanha || '-'}</TableCell>
                  <TableCell>{record.item_descricao || '-'}</TableCell>
                  <TableCell>{record.codigo || '-'}</TableCell>
                  <TableCell>{record.guia || '-'}</TableCell>
                  <TableCell>
                    {(() => {
                      const transId = record.transportadora
                      return (
                        (transId ? transportadoraLookup[transId] : '') || '-'
                      )
                    })()}
                  </TableCell>
                  <TableCell>{record.local_entrega || '-'}</TableCell>
                  <TableCell>
                    {record.data_concluido
                      ? new Date(record.data_concluido).toLocaleDateString(
                          'pt-PT',
                        )
                      : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={!!record.concluido}
                        onCheckedChange={(checked) => {
                          const value =
                            checked === 'indeterminate' ? false : checked
                          handleConcluidoUpdate(record, value)
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <DatePicker
                      selected={
                        record.data_saida
                          ? parseDateFromYYYYMMDD(
                              record.data_saida.split('T')[0],
                            )
                          : undefined
                      }
                      onSelect={(date) =>
                        handleDataSaidaUpdate(record, date || null)
                      }
                      buttonClassName="w-full h-10 max-w-[160px]"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={!!record.saiu}
                        onCheckedChange={(checked) => {
                          const value =
                            checked === 'indeterminate' ? false : checked
                          handleSaiuUpdate(record, value)
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="py-8 text-center">
                    Nenhum trabalho concluído encontrado.
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

export default DashboardLogisticaTable

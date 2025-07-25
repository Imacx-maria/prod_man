'use client'

/**
 * Faturacao – Invoice Management
 * ------------------------------
 * Manages billing and invoice related operations for production jobs
 * Uses folhas_obras_with_dias view for enhanced job data with calculated work days
 *
 * FILTERING RULES:
 * - Only shows jobs that have ORC (numero_orc) values
 * - Jobs missing ORC are filtered out
 * - FO (numero_fo) values are optional and not required for display
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createBrowserClient } from '@/utils/supabase'
import { format } from 'date-fns'
import {
  ArrowUp,
  ArrowDown,
  Eye,
  RotateCw,
  Plus,
  Trash2,
  X,
  RefreshCcw,
  Copy,
} from 'lucide-react'
import CreatableClienteCombobox from '@/components/CreatableClienteCombobox'
import SimpleNotasPopover from '@/components/ui/SimpleNotasPopover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import PermissionGuard from '@/components/PermissionGuard'
import { Loader2 } from 'lucide-react'
import { Suspense } from 'react'
import FinancialAnalyticsCharts from '@/components/FinancialAnalyticsCharts'
import {
  groupMonthYearData,
  groupMonthYearDataByYear,
  formatSimplePeriodDisplay,
  type MonthYearData,
  type SimpleGroupedData,
  convertToStandardPeriod,
  convertToDisplayPeriod,
} from '@/utils/date'

/* ---------- constants ---------- */
const JOBS_PER_PAGE = 50 // Pagination limit for better performance
const ITEMS_FETCH_LIMIT = 200 // Reasonable limit for items per request

/* ---------- types ---------- */
interface Job {
  id: string
  numero_fo: string
  numero_orc?: number | null
  nome_campanha: string
  data_saida: string | null
  prioridade: boolean | null
  notas: string | null
  concluido?: boolean | null // C
  saiu?: boolean | null // S
  fatura?: boolean | null // F
  created_at?: string | null
  cliente?: string | null
  id_cliente?: string | null
  data_concluido?: string | null
  updated_at?: string | null
  dias_trabalho?: number | null
  logistica_data_saida?: string | null
  logistica_concluido?: boolean | null // C from logistica_entregas
}

interface Item {
  id: string
  folha_obra_id: string
  descricao: string
  codigo?: string | null
  quantidade?: number | null
  concluido?: boolean | null
  data_concluido?: string | null
  logistica_data_saida?: string | null
  dias_conclusao?: number | null
  dias_saida?: number | null
}

interface LoadingState {
  jobs: boolean
  items: boolean
  clientes: boolean
}

/* ---------- helpers ---------- */
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

// Calculate working days between two dates, excluding weekends and holidays
function calculateWorkingDays(
  startDate: string | null,
  endDate: string | null,
  holidays: string[] = [],
): number | null {
  if (!startDate || !endDate) return null

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (end < start) return 0

  let workingDays = 0
  const current = new Date(start)

  while (current <= end) {
    const dayOfWeek = current.getDay() // 0 = Sunday, 6 = Saturday
    const dateString = current.toISOString().split('T')[0]

    // Skip weekends and holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateString)) {
      workingDays++
    }

    current.setDate(current.getDate() + 1)
  }

  return workingDays
}

/* ---------- Loading Components ---------- */
const JobsTableSkeleton = () => (
  <div className="space-y-2">
    <div className="h-10 animate-pulse rounded bg-gray-200" /> {/* Header */}
    {[...Array(8)].map((_, i) => (
      <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
    ))}
  </div>
)

const ErrorMessage = ({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) => (
  <div className="rounded-md border border-red-200 bg-red-50 p-4">
    <div className="flex items-center justify-between">
      <p className="text-red-700">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  </div>
)

/* ---------- main page ---------- */
export default function FaturacaoPage() {
  const supabase = useMemo(() => createBrowserClient(), [])

  /* state */
  const [jobs, setJobs] = useState<Job[]>([])
  const [allItems, setAllItems] = useState<Item[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [clientes, setClientes] = useState<{ value: string; label: string }[]>(
    [],
  )

  /* loading states */
  const [loading, setLoading] = useState<LoadingState>({
    jobs: true,
    items: true,
    clientes: true,
  })
  const [error, setError] = useState<string | null>(null)

  /* pagination */
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMoreJobs, setHasMoreJobs] = useState(true)

  /* filters */
  const [foF, setFoF] = useState('')
  const [campF, setCampF] = useState('')
  const [itemF, setItemF] = useState('')
  const [codeF, setCodeF] = useState('')
  const [clientF, setClientF] = useState('')
  // F (fatura) toggle: false = show F false, true = show F true
  const [showFatura, setShowFatura] = useState(false)

  // Debounced filter values for performance
  const debouncedFoF = useDebounce(foF, 300)
  const debouncedCampF = useDebounce(campF, 300)
  const debouncedItemF = useDebounce(itemF, 300)
  const debouncedCodeF = useDebounce(codeF, 300)
  const debouncedClientF = useDebounce(clientF, 300)

  /* sorting */
  type SortableJobKey =
    | 'numero_orc'
    | 'numero_fo'
    | 'cliente'
    | 'nome_campanha'
    | 'notas'
    | 'fatura'
    | 'dias_trabalho'
    | 'logistica_concluido'
  const [sortCol, setSortCol] = useState<SortableJobKey>('numero_fo')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const toggleSort = useCallback(
    (c: SortableJobKey) => {
      if (sortCol === c) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
      else {
        setSortCol(c)
        setSortDir('asc')
      }
    },
    [sortCol, sortDir],
  )

  /* ---------- Data Fetching ---------- */

  // Fetch clientes
  const fetchClientes = useCallback(async () => {
    setLoading((prev) => ({ ...prev, clientes: true }))
    try {
      const { data: clientesData, error } = await supabase
        .from('clientes')
        .select('id, nome_cl')
        .order('nome_cl', { ascending: true })

      if (error) throw error

      if (clientesData) {
        const clienteOptions = clientesData.map((c: any) => ({
          value: c.id,
          label: c.nome_cl,
        }))
        setClientes(clienteOptions)
      }
    } catch (error) {
      console.error('Error fetching clientes:', error)
      setError('Failed to load client data')
    } finally {
      setLoading((prev) => ({ ...prev, clientes: false }))
    }
  }, [supabase])

  // Fetch jobs with database-level filtering
  const fetchJobs = useCallback(
    async (
      page = 0,
      reset = false,
      filters: {
        foF?: string
        campF?: string
        itemF?: string
        codeF?: string
        clientF?: string
        showFatura?: boolean
      } = {},
    ) => {
      setLoading((prev) => ({ ...prev, jobs: true }))
      try {
        const startRange = page * JOBS_PER_PAGE
        const endRange = startRange + JOBS_PER_PAGE - 1

        // Calculate 2 months ago date for completed jobs filter
        const twoMonthsAgo = new Date()
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
        const twoMonthsAgoString = twoMonthsAgo.toISOString()

        // Build the base query
        let query = supabase.from('folhas_obras_with_dias').select(
          `
          id, numero_fo, numero_orc, nome_campanha, data_saida, 
          prioridade, notas, concluido, saiu, fatura, created_at, 
          cliente, id_cliente, data_concluido, updated_at, dias_trabalho
        `,
          { count: 'exact' },
        )

        // ALWAYS filter to require ORC values (FO is optional)
        query = query.not('numero_orc', 'is', null)
        query = query.neq('numero_orc', 0)

        // For completed jobs, filter by last 2 months
        query = query.or(
          `data_concluido.gte.${twoMonthsAgoString},updated_at.gte.${twoMonthsAgoString},created_at.gte.${twoMonthsAgoString}`,
        )

        // Direct field filters
        if (filters.foF && filters.foF.trim() !== '') {
          query = query.ilike('numero_fo', `%${filters.foF.trim()}%`)
        }

        if (filters.campF && filters.campF.trim() !== '') {
          query = query.ilike('nome_campanha', `%${filters.campF.trim()}%`)
        }

        if (filters.clientF && filters.clientF.trim() !== '') {
          query = query.ilike('cliente', `%${filters.clientF.trim()}%`)
        }

        // Fatura filter - by default show only non-invoiced jobs (fatura = false or null)
        if (filters.showFatura !== undefined) {
          if (filters.showFatura) {
            query = query.eq('fatura', true)
          } else {
            query = query.or('fatura.is.null,fatura.eq.false')
          }
        } else {
          // Default: show only non-invoiced jobs
          query = query.or('fatura.is.null,fatura.eq.false')
        }

        // Order and pagination
        query = query
          .order('created_at', { ascending: false })
          .range(startRange, endRange)

        // Execute the main query
        const { data: jobsData, error, count } = await query

        if (error) {
          console.error('Supabase error details:', error)
          throw error
        }

        let filteredJobs = (jobsData as Job[]) || []

        // For item/code filters, we need to do a separate query and filter
        if (
          (filters.itemF && filters.itemF.trim() !== '') ||
          (filters.codeF && filters.codeF.trim() !== '')
        ) {
          if (filteredJobs.length > 0) {
            const jobIds = filteredJobs.map((job) => job.id)

            let itemQuery = supabase
              .from('items_base')
              .select('folha_obra_id')
              .in('folha_obra_id', jobIds)

            if (filters.itemF && filters.itemF.trim() !== '') {
              itemQuery = itemQuery.ilike(
                'descricao',
                `%${filters.itemF.trim()}%`,
              )
            }

            if (filters.codeF && filters.codeF.trim() !== '') {
              itemQuery = itemQuery.ilike('codigo', `%${filters.codeF.trim()}%`)
            }

            const { data: matchingItems } = await itemQuery

            if (matchingItems) {
              const matchingJobIds = new Set(
                matchingItems.map((item: any) => item.folha_obra_id),
              )
              filteredJobs = filteredJobs.filter((job) =>
                matchingJobIds.has(job.id),
              )
            } else {
              filteredJobs = []
            }
          }
        }

        if (filteredJobs) {
          setJobs((prev) => (reset ? filteredJobs : [...prev, ...filteredJobs]))
          setHasMoreJobs((count || 0) > endRange + 1)
          setCurrentPage(page)
        }
      } catch (error) {
        console.error('Error fetching jobs:', error)
        setError(
          `Failed to load jobs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      } finally {
        setLoading((prev) => ({ ...prev, jobs: false }))
      }
    },
    [supabase],
  )

  // Fetch items for loaded jobs
  const fetchItems = useCallback(
    async (jobIds: string[]) => {
      if (jobIds.length === 0) return

      setLoading((prev) => ({ ...prev, items: true }))
      try {
        // Fetch items with logistics data
        const { data: itemsData, error } = await supabase
          .from('items_base')
          .select(
            `
            id, folha_obra_id, descricao, codigo, 
            quantidade, created_at,
            logistica_entregas (
              data_concluido,
              data_saida
            )
          `,
          )
          .in('folha_obra_id', jobIds)
          .limit(ITEMS_FETCH_LIMIT)

        if (error) throw error

        if (itemsData) {
          // Process items to calculate working days
          const processedItems = itemsData.map((item: any) => {
            const logistics = item.logistica_entregas?.[0] || {}
            const diasConclusao = calculateWorkingDays(
              item.created_at,
              logistics.data_concluido,
            )
            const diasSaida = calculateWorkingDays(
              item.created_at,
              logistics.data_saida,
            )

            return {
              id: item.id,
              folha_obra_id: item.folha_obra_id,
              descricao: item.descricao,
              codigo: item.codigo,
              quantidade: item.quantidade,
              data_concluido: logistics.data_concluido,
              logistica_data_saida: logistics.data_saida,
              dias_conclusao: diasConclusao,
              dias_saida: diasSaida,
            }
          })

          setAllItems((prev) => {
            const filtered = prev.filter(
              (item) => !jobIds.includes(item.folha_obra_id),
            )
            return [...filtered, ...processedItems]
          })
        }
      } catch (error) {
        console.error('Error fetching items:', error)
        setError('Failed to load items')
      } finally {
        setLoading((prev) => ({ ...prev, items: false }))
      }
    },
    [supabase],
  )

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      setError(null)
      const clientesPromise = fetchClientes()
      await fetchJobs(0, true)
      await clientesPromise
    }

    loadInitialData()
  }, [fetchClientes, fetchJobs])

  // Trigger search when filters change
  useEffect(() => {
    if (
      debouncedFoF ||
      debouncedCampF ||
      debouncedItemF ||
      debouncedCodeF ||
      debouncedClientF ||
      showFatura
    ) {
      setHasMoreJobs(true)
      setCurrentPage(0)
      fetchJobs(0, true, {
        foF: debouncedFoF,
        campF: debouncedCampF,
        itemF: debouncedItemF,
        codeF: debouncedCodeF,
        clientF: debouncedClientF,
        showFatura,
      })
    } else {
      setHasMoreJobs(true)
      setCurrentPage(0)
      fetchJobs(0, true)
    }
  }, [
    debouncedFoF,
    debouncedCampF,
    debouncedItemF,
    debouncedCodeF,
    debouncedClientF,
    showFatura,
    fetchJobs,
  ])

  // Load items when jobs change
  useEffect(() => {
    if (jobs.length > 0) {
      const jobIds = jobs
        .map((job) => job.id)
        .filter((id) => !id.startsWith('temp-'))
      if (jobIds.length > 0) {
        fetchItems(jobIds)
      }
    }
  }, [jobs, fetchItems])

  // Load more jobs function
  const loadMoreJobs = useCallback(() => {
    if (!loading.jobs && hasMoreJobs) {
      fetchJobs(currentPage + 1, false, {
        foF: debouncedFoF,
        campF: debouncedCampF,
        itemF: debouncedItemF,
        codeF: debouncedCodeF,
        clientF: debouncedClientF,
        showFatura,
      })
    }
  }, [
    loading.jobs,
    hasMoreJobs,
    currentPage,
    fetchJobs,
    debouncedFoF,
    debouncedCampF,
    debouncedItemF,
    debouncedCodeF,
    debouncedClientF,
    showFatura,
  ])

  // Retry function for error recovery
  const retryFetch = useCallback(() => {
    setError(null)
    fetchJobs(0, true)
    fetchClientes()
  }, [fetchJobs, fetchClientes])

  /* jobs are pre-filtered by database */
  const filtered = jobs

  // Calculate working days for each job based on its items
  const jobsWithCalculatedDays = useMemo(() => {
    return filtered.map((job) => {
      const jobItems = allItems.filter((item) => item.folha_obra_id === job.id)
      let maxDays = 0
      let latestDataSaida: string | null = null
      let allItemsConcluido = true

      jobItems.forEach((item) => {
        const diasConc = item.dias_conclusao || 0
        const diasSaida = item.dias_saida || 0
        const maxItemDays = Math.max(diasConc, diasSaida)
        maxDays = Math.max(maxDays, maxItemDays)

        // Find the latest data_saida from all items
        if (item.logistica_data_saida) {
          if (!latestDataSaida || item.logistica_data_saida > latestDataSaida) {
            latestDataSaida = item.logistica_data_saida
          }
        }

        // Check if all items are completed (have data_concluido)
        if (!item.data_concluido) {
          allItemsConcluido = false
        }
      })

      // If no items, consider as not completed
      if (jobItems.length === 0) {
        allItemsConcluido = false
      }

      return {
        ...job,
        dias_trabalho: maxDays > 0 ? maxDays : null,
        logistica_data_saida: latestDataSaida,
        logistica_concluido: allItemsConcluido,
      }
    })
  }, [filtered, allItems])

  /* sort */
  const sorted = useMemo(() => {
    const arr = [...jobsWithCalculatedDays]
    arr.sort((a, b) => {
      let A: any, B: any
      switch (sortCol) {
        case 'numero_orc':
          A = a.numero_orc ?? ''
          B = b.numero_orc ?? ''
          break
        case 'numero_fo':
          A = a.numero_fo ?? ''
          B = b.numero_fo ?? ''
          break
        case 'cliente':
          A = a.cliente ?? ''
          B = b.cliente ?? ''
          break
        case 'nome_campanha':
          A = a.nome_campanha ?? ''
          B = b.nome_campanha ?? ''
          break
        case 'notas':
          A = a.notas ?? ''
          B = b.notas ?? ''
          break
        case 'fatura':
          A = a.fatura ?? false
          B = b.fatura ?? false
          break
        case 'dias_trabalho':
          A = a.dias_trabalho ?? 0
          B = b.dias_trabalho ?? 0
          break
        case 'logistica_concluido':
          A = a.logistica_concluido ?? false
          B = b.logistica_concluido ?? false
          break
        default:
          A = a.id
          B = b.id
      }
      if (typeof A === 'string')
        return sortDir === 'asc' ? A.localeCompare(B) : B.localeCompare(A)
      if (typeof A === 'number') return sortDir === 'asc' ? A - B : B - A
      if (typeof A === 'boolean') return sortDir === 'asc' ? +A - +B : +B - +A
      return 0
    })
    return arr
  }, [jobsWithCalculatedDays, sortCol, sortDir])

  /* ---------- render ---------- */
  return (
    <PermissionGuard>
      <div className="w-full space-y-6">
        <h1 className="text-2xl font-bold">Faturação</h1>

        <Tabs defaultValue="invoicing" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-2">
            <TabsTrigger value="invoicing">Gestão de Faturação</TabsTrigger>
            <TabsTrigger value="analytics">Análises Financeiras</TabsTrigger>
          </TabsList>

          <TabsContent value="invoicing" className="space-y-6">
            {/* filter bar */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Filtra FO"
                  className="h-10 w-28 rounded-none"
                  value={foF}
                  onChange={(e) => setFoF(e.target.value)}
                />
                <Input
                  placeholder="Filtra Nome Campanha"
                  className="h-10 flex-1 rounded-none"
                  value={campF}
                  onChange={(e) => setCampF(e.target.value)}
                />
                <Input
                  placeholder="Filtra Item"
                  className="h-10 flex-1 rounded-none"
                  value={itemF}
                  onChange={(e) => setItemF(e.target.value)}
                />
                <Input
                  placeholder="Filtra Código"
                  className="h-10 w-40 rounded-none"
                  value={codeF}
                  onChange={(e) => setCodeF(e.target.value)}
                />
                <Input
                  placeholder="Filtra Cliente"
                  className="h-10 flex-1 rounded-none"
                  value={clientF}
                  onChange={(e) => setClientF(e.target.value)}
                />

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setFoF('')
                          setCampF('')
                          setItemF('')
                          setCodeF('')
                          setClientF('')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Limpar Filtros</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={async () => {
                          setError(null)
                          setJobs([])
                          setAllItems([])
                          setCurrentPage(0)
                          setHasMoreJobs(true)
                          await fetchJobs(0, true, {
                            foF: debouncedFoF,
                            campF: debouncedCampF,
                            itemF: debouncedItemF,
                            codeF: debouncedCodeF,
                            clientF: debouncedClientF,
                            showFatura,
                          })
                        }}
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Atualizar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Error handling */}
            {error && <ErrorMessage message={error} onRetry={retryFetch} />}

            {/* jobs table */}
            {loading.jobs && jobs.length === 0 ? (
              <JobsTableSkeleton />
            ) : (
              <>
                <div className="bg-background border-border w-full rounded-none border-2">
                  <div className="w-full rounded-none">
                    <Table className="w-full border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                      <TableHeader>
                        <TableRow className="rounded-none">
                          <TableHead
                            onClick={() => toggleSort('numero_orc')}
                            className="border-border sticky top-0 z-10 w-[90px] max-w-[90px] cursor-pointer overflow-hidden rounded-none border-b-2 bg-[var(--orange)] text-center font-bold text-ellipsis whitespace-nowrap text-black uppercase select-none"
                          >
                            ORC{' '}
                            {sortCol === 'numero_orc' &&
                              (sortDir === 'asc' ? (
                                <ArrowUp className="ml-1 inline h-3 w-3" />
                              ) : (
                                <ArrowDown className="ml-1 inline h-3 w-3" />
                              ))}
                          </TableHead>
                          <TableHead
                            onClick={() => toggleSort('numero_fo')}
                            className="border-border sticky top-0 z-10 w-[90px] max-w-[90px] cursor-pointer overflow-hidden rounded-none border-b-2 bg-[var(--orange)] text-center font-bold text-ellipsis whitespace-nowrap text-black uppercase select-none"
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
                            className="border-border sticky top-0 z-10 w-[200px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] font-bold text-black uppercase select-none"
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
                            className="border-border sticky top-0 z-10 flex-1 cursor-pointer rounded-none border-b-2 bg-[var(--orange)] font-bold text-black uppercase select-none"
                          >
                            Nome Campanha{' '}
                            {sortCol === 'nome_campanha' &&
                              (sortDir === 'asc' ? (
                                <ArrowUp className="ml-1 inline h-3 w-3" />
                              ) : (
                                <ArrowDown className="ml-1 inline h-3 w-3" />
                              ))}
                          </TableHead>
                          <TableHead className="border-border sticky top-0 z-10 w-[100px] rounded-none border-b-2 bg-[var(--orange)] text-center font-bold text-black uppercase">
                            Data Saída
                          </TableHead>
                          <TableHead
                            onClick={() => toggleSort('dias_trabalho')}
                            className="border-border sticky top-0 z-10 w-[90px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] text-center font-bold text-black uppercase select-none"
                          >
                            Dias{' '}
                            {sortCol === 'dias_trabalho' &&
                              (sortDir === 'asc' ? (
                                <ArrowUp className="ml-1 inline h-3 w-3" />
                              ) : (
                                <ArrowDown className="ml-1 inline h-3 w-3" />
                              ))}
                          </TableHead>
                          <TableHead
                            onClick={() => toggleSort('notas')}
                            className="border-border sticky top-0 z-10 w-[50px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] font-bold text-black uppercase select-none"
                          >
                            Nota{' '}
                            {sortCol === 'notas' &&
                              (sortDir === 'asc' ? (
                                <ArrowUp className="ml-1 inline h-3 w-3" />
                              ) : (
                                <ArrowDown className="ml-1 inline h-3 w-3" />
                              ))}
                          </TableHead>

                          <TableHead
                            onClick={() => toggleSort('logistica_concluido')}
                            className="border-border sticky top-0 z-10 w-[36px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] p-0 text-center font-bold text-black uppercase select-none"
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    C{' '}
                                    {sortCol === 'logistica_concluido' &&
                                      (sortDir === 'asc' ? (
                                        <ArrowUp className="ml-1 inline h-3 w-3" />
                                      ) : (
                                        <ArrowDown className="ml-1 inline h-3 w-3" />
                                      ))}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Concluído (Logística)
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>

                          <TableHead
                            onClick={() => toggleSort('fatura')}
                            className="border-border sticky top-0 z-10 w-[36px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] p-0 text-center font-bold text-black uppercase select-none"
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    F{' '}
                                    {sortCol === 'fatura' &&
                                      (sortDir === 'asc' ? (
                                        <ArrowUp className="ml-1 inline h-3 w-3" />
                                      ) : (
                                        <ArrowDown className="ml-1 inline h-3 w-3" />
                                      ))}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Faturado</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>

                          <TableHead className="border-border sticky top-0 z-10 w-[100px] rounded-none border-b-2 bg-[var(--orange)] text-center font-bold text-black uppercase">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sorted.map((job) => (
                          <TableRow
                            key={job.id}
                            className="hover:bg-[var(--main)]"
                          >
                            <TableCell className="w-[90px] max-w-[90px]">
                              <Input
                                type="text"
                                maxLength={6}
                                value={job.numero_orc ?? ''}
                                onChange={(e) => {
                                  const value =
                                    e.target.value === ''
                                      ? null
                                      : Number(e.target.value)
                                  setJobs((prevJobs) =>
                                    prevJobs.map((j) =>
                                      j.id === job.id
                                        ? { ...j, numero_orc: value }
                                        : j,
                                    ),
                                  )
                                }}
                                onBlur={async (e) => {
                                  const value =
                                    e.target.value === ''
                                      ? null
                                      : Number(e.target.value)
                                  await supabase
                                    .from('folhas_obras')
                                    .update({ numero_orc: value })
                                    .eq('id', job.id)
                                }}
                                className="h-10 rounded-none border-0 text-right text-sm outline-0 focus:border-0 focus:ring-0"
                                placeholder="ORC"
                              />
                            </TableCell>
                            <TableCell className="w-[90px] max-w-[90px]">
                              <Input
                                maxLength={6}
                                value={job.numero_fo}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setJobs((prevJobs) =>
                                    prevJobs.map((j) =>
                                      j.id === job.id
                                        ? { ...j, numero_fo: value }
                                        : j,
                                    ),
                                  )
                                }}
                                onBlur={async (e) => {
                                  const value = e.target.value
                                  await supabase
                                    .from('folhas_obras')
                                    .update({ numero_fo: value })
                                    .eq('id', job.id)
                                }}
                                className="h-10 rounded-none border-0 text-right text-sm outline-0 focus:border-0 focus:ring-0"
                                placeholder="FO"
                              />
                            </TableCell>
                            <TableCell className="w-[200px]">
                              <CreatableClienteCombobox
                                value={job.id_cliente || ''}
                                onChange={async (selectedId: string) => {
                                  const selected = clientes.find(
                                    (c) => c.value === selectedId,
                                  )
                                  setJobs((prevJobs) =>
                                    prevJobs.map((j) =>
                                      j.id === job.id
                                        ? {
                                            ...j,
                                            id_cliente: selectedId,
                                            cliente: selected
                                              ? selected.label
                                              : '',
                                          }
                                        : j,
                                    ),
                                  )
                                  await supabase
                                    .from('folhas_obras')
                                    .update({
                                      id_cliente: selectedId,
                                      cliente: selected?.label || '',
                                    })
                                    .eq('id', job.id)
                                }}
                                options={clientes}
                                onOptionsUpdate={(newClientes) => {
                                  setClientes(newClientes)
                                }}
                                placeholder="Cliente"
                                disabled={loading.clientes}
                                loading={loading.clientes}
                              />
                            </TableCell>
                            <TableCell className="flex-1">
                              <Input
                                value={job.nome_campanha}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setJobs((prevJobs) =>
                                    prevJobs.map((j) =>
                                      j.id === job.id
                                        ? { ...j, nome_campanha: value }
                                        : j,
                                    ),
                                  )
                                }}
                                onBlur={async (e) => {
                                  const value = e.target.value
                                  await supabase
                                    .from('folhas_obras')
                                    .update({ nome_campanha: value })
                                    .eq('id', job.id)
                                }}
                                className="h-10 w-full rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                                placeholder="Nome da Campanha"
                              />
                            </TableCell>
                            <TableCell className="w-[100px] text-center text-xs">
                              {job.logistica_data_saida
                                ? format(
                                    new Date(job.logistica_data_saida),
                                    'dd/MM/yyyy',
                                  )
                                : '-'}
                            </TableCell>
                            <TableCell className="w-[90px] text-right">
                              {job.dias_trabalho ?? '-'}
                            </TableCell>
                            <TableCell className="w-[50px] text-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <SimpleNotasPopover
                                        value={job.notas ?? ''}
                                        onSave={async (newNotas) => {
                                          await supabase
                                            .from('folhas_obras')
                                            .update({ notas: newNotas })
                                            .eq('id', job.id)
                                          setJobs((prev: Job[]) =>
                                            prev.map((j: Job) =>
                                              j.id === job.id
                                                ? { ...j, notas: newNotas }
                                                : j,
                                            ),
                                          )
                                        }}
                                        placeholder="Adicionar notas..."
                                        label="Notas"
                                        buttonSize="icon"
                                        className="mx-auto aspect-square"
                                        disabled={false}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  {job.notas && job.notas.trim() !== '' && (
                                    <TooltipContent>{job.notas}</TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="w-[36px] p-0 text-center">
                              <Checkbox
                                checked={!!job.logistica_concluido}
                                disabled={true}
                              />
                            </TableCell>
                            <TableCell className="w-[36px] p-0 text-center">
                              <Checkbox
                                checked={!!job.fatura}
                                onCheckedChange={async (checked) => {
                                  const value =
                                    checked === 'indeterminate'
                                      ? false
                                      : checked
                                  setJobs((prevJobs) =>
                                    prevJobs.map((j) =>
                                      j.id === job.id
                                        ? { ...j, fatura: value }
                                        : j,
                                    ),
                                  )
                                  await supabase
                                    .from('folhas_obras')
                                    .update({ fatura: value })
                                    .eq('id', job.id)
                                }}
                              />
                            </TableCell>
                            <TableCell className="w-[100px] p-0 pr-2">
                              <div className="flex justify-center gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="default"
                                        onClick={() => setOpenId(job.id)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Items</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="destructive"
                                        onClick={async () => {
                                          if (
                                            !confirm(
                                              `Tem certeza que deseja eliminar a Folha de Obra ${job.numero_fo}? Esta ação irá eliminar todos os itens associados.`,
                                            )
                                          ) {
                                            return
                                          }

                                          try {
                                            // Delete items first
                                            const { data: itemsData } =
                                              await supabase
                                                .from('items_base')
                                                .select('id')
                                                .eq('folha_obra_id', job.id)

                                            if (
                                              itemsData &&
                                              itemsData.length > 0
                                            ) {
                                              const itemIds = itemsData.map(
                                                (item: any) => item.id,
                                              )
                                              await supabase
                                                .from('items_base')
                                                .delete()
                                                .in('id', itemIds)
                                            }

                                            // Then delete the job
                                            await supabase
                                              .from('folhas_obras')
                                              .delete()
                                              .eq('id', job.id)

                                            // Update local state
                                            setJobs((prevJobs) =>
                                              prevJobs.filter(
                                                (j) => j.id !== job.id,
                                              ),
                                            )
                                            setAllItems((prevItems) =>
                                              prevItems.filter(
                                                (item) =>
                                                  item.folha_obra_id !== job.id,
                                              ),
                                            )
                                          } catch (error) {
                                            console.error(
                                              'Error deleting job:',
                                              error,
                                            )
                                            alert(
                                              'Erro ao eliminar a Folha de Obra. Tente novamente.',
                                            )
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Eliminar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {sorted.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="py-8 text-center">
                              Nenhum trabalho encontrado.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Load More Button */}
                {hasMoreJobs && !loading.jobs && (
                  <div className="mt-4 flex justify-center">
                    <Button variant="outline" onClick={loadMoreJobs}>
                      <Loader2
                        className={`mr-2 h-4 w-4 ${loading.jobs ? 'animate-spin' : ''}`}
                      />
                      Load More Jobs ({JOBS_PER_PAGE} more)
                    </Button>
                  </div>
                )}

                {/* Loading indicator for additional pages */}
                {loading.jobs && jobs.length > 0 && (
                  <div className="mt-4 flex justify-center">
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading more jobs...
                    </div>
                  </div>
                )}
              </>
            )}

            {/* drawer */}
            <Drawer
              open={!!openId}
              onOpenChange={(o) => !o && setOpenId(null)}
              shouldScaleBackground={false}
            >
              <DrawerContent className="!top-0 h-[98vh] max-h-[98vh] min-h-[98vh] !transform-none overflow-y-auto !filter-none !backdrop-filter-none will-change-auto">
                <DrawerHeader className="sr-only">
                  <DrawerTitle>
                    {openId && jobs.find((j) => j.id === openId)
                      ? `Trabalho (FO: ${jobs.find((j) => j.id === openId)?.numero_fo})`
                      : 'Detalhes do Trabalho'}
                  </DrawerTitle>
                  <DrawerDescription>
                    Detalhes Produção Folha de Obra
                  </DrawerDescription>
                </DrawerHeader>
                {openId && (
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Loading...</span>
                      </div>
                    }
                  >
                    <div className="relative space-y-6 p-6">
                      {/* Header buttons */}
                      <div className="absolute top-6 right-6 z-10 flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => {
                                  const items = allItems
                                    .filter(
                                      (item) => item.folha_obra_id === openId,
                                    )
                                    .map(
                                      (item) =>
                                        `${item.descricao.toUpperCase()} - ${item.codigo?.toUpperCase() || ''} - ${item.quantidade}`,
                                    )
                                    .join('\n')
                                  navigator.clipboard.writeText(items)
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar items</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setOpenId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Job Info Header */}
                      <div className="mb-6 p-4 uppercase">
                        <div className="mb-2 flex items-center gap-8">
                          <div>
                            <div className="text-xs font-bold">ORC</div>
                            <div className="font-mono">
                              {jobs.find((j) => j.id === openId)?.numero_orc ??
                                '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-bold">FO</div>
                            <div className="font-mono">
                              {jobs.find((j) => j.id === openId)?.numero_fo}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-bold">
                              Nome Campanha
                            </div>
                            <div className="truncate font-mono">
                              {jobs.find((j) => j.id === openId)?.nome_campanha}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Items Table */}
                      <div className="mt-6">
                        <div className="bg-background border-border w-full rounded-none border-2">
                          <div className="w-full rounded-none">
                            <Table className="w-full rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="border-border sticky top-0 z-10 flex-1 border-b-2 bg-[var(--orange)] font-bold uppercase">
                                    Item
                                  </TableHead>
                                  <TableHead className="border-border sticky top-0 z-10 w-[140px] border-b-2 bg-[var(--orange)] font-bold uppercase">
                                    Código
                                  </TableHead>
                                  <TableHead className="border-border sticky top-0 z-10 w-[90px] border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                                    Quantidade
                                  </TableHead>
                                  <TableHead className="border-border sticky top-0 z-10 w-[90px] border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                                    Dias Conc.
                                  </TableHead>
                                  <TableHead className="border-border sticky top-0 z-10 w-[90px] border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                                    Dias Saída
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allItems
                                  .filter(
                                    (item) => item.folha_obra_id === openId,
                                  )
                                  .map((item) => (
                                    <TableRow
                                      key={item.id}
                                      className="hover:bg-[var(--main)]"
                                    >
                                      <TableCell>
                                        <Input
                                          value={item.descricao}
                                          onChange={(e) => {
                                            const value = e.target.value
                                            setAllItems((prevItems) =>
                                              prevItems.map((i) =>
                                                i.id === item.id
                                                  ? { ...i, descricao: value }
                                                  : i,
                                              ),
                                            )
                                          }}
                                          onBlur={async (e) => {
                                            const value = e.target.value
                                            await supabase
                                              .from('items_base')
                                              .update({ descricao: value })
                                              .eq('id', item.id)
                                          }}
                                          className="h-10 w-full rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                                          placeholder="Item"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={item.codigo || ''}
                                          onChange={(e) => {
                                            const value = e.target.value
                                            setAllItems((prevItems) =>
                                              prevItems.map((i) =>
                                                i.id === item.id
                                                  ? { ...i, codigo: value }
                                                  : i,
                                              ),
                                            )
                                          }}
                                          onBlur={async (e) => {
                                            const value = e.target.value
                                            await supabase
                                              .from('items_base')
                                              .update({ codigo: value })
                                              .eq('id', item.id)
                                          }}
                                          className="h-10 w-full rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                                          placeholder="Código"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          value={item.quantidade || ''}
                                          onChange={(e) => {
                                            const value =
                                              e.target.value === ''
                                                ? null
                                                : Number(e.target.value)
                                            setAllItems((prevItems) =>
                                              prevItems.map((i) =>
                                                i.id === item.id
                                                  ? { ...i, quantidade: value }
                                                  : i,
                                              ),
                                            )
                                          }}
                                          onBlur={async (e) => {
                                            const value =
                                              e.target.value === ''
                                                ? null
                                                : Number(e.target.value)
                                            await supabase
                                              .from('items_base')
                                              .update({ quantidade: value })
                                              .eq('id', item.id)
                                          }}
                                          className="h-10 w-full rounded-none border-0 text-right text-sm outline-0 focus:border-0 focus:ring-0"
                                          placeholder="Quantidade"
                                        />
                                      </TableCell>
                                      <TableCell className="w-[90px] text-center">
                                        {item.dias_conclusao ?? '-'}
                                      </TableCell>
                                      <TableCell className="w-[90px] text-center">
                                        {item.dias_saida ?? '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                {allItems.filter(
                                  (item) => item.folha_obra_id === openId,
                                ).length === 0 && (
                                  <TableRow>
                                    <TableCell
                                      colSpan={3}
                                      className="text-center text-gray-500"
                                    >
                                      Nenhum item encontrado.
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Suspense>
                )}
              </DrawerContent>
            </Drawer>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <FinancialAnalyticsCharts
              supabase={supabase}
              onRefresh={async () => {
                // The analytics component will handle its own refresh
                return Promise.resolve()
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  )
}

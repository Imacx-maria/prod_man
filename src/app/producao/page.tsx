'use client'

/**
 * Producao – full refactor (single-drawer, production-parity UI)
 * --------------------------------------------------------------
 * Optimized version with improved queries and loading states
 * NO caching - preserves real-time data accuracy
 */

// Note: This is a client component - metadata should be added to layout.tsx or a parent server component

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
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
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import DatePicker from '@/components/ui/DatePicker'
import { createBrowserClient } from '@/utils/supabase'
import { format } from 'date-fns'
import {
  ArrowUp,
  ArrowDown,
  Eye,
  RotateCw,
  Plus,
  Clock,
  FileText,
  Trash2,
  Copy,
  X,
  ReceiptText,
  RefreshCcw,
} from 'lucide-react'
import CreatableClienteCombobox, {
  ClienteOption,
} from '@/components/CreatableClienteCombobox'
import SimpleNotasPopover from '@/components/ui/SimpleNotasPopover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import PermissionGuard from '@/components/PermissionGuard'
import {
  ArrowLeft,
  ArrowRight,
  Grid2x2Check,
  Loader2,
  SquareChartGantt,
  Download,
} from 'lucide-react'
import LogisticaTableWithCreatable from '@/components/LogisticaTableWithCreatable'
import { LogisticaRecord } from '@/types/logistica'
import { useLogisticaData } from '@/utils/useLogisticaData'
import { exportProducaoToExcel } from '@/utils/exportProducaoToExcel'
import { Suspense } from 'react'

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
}

interface Item {
  id: string
  folha_obra_id: string
  descricao: string
  codigo?: string | null
  quantidade?: number | null
  paginacao?: boolean | null
  brindes?: boolean | null
  concluido?: boolean | null
}

interface LoadingState {
  jobs: boolean
  items: boolean
  clientes: boolean
}

/* ---------- helpers ---------- */
const dotColor = (v?: boolean | null, warn = false) =>
  v ? 'bg-green-600' : warn ? 'bg-orange-500' : 'bg-red-600'

// Utility function to parse a date string as a local date
function parseDateFromYYYYMMDD(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Helper to get the latest completion date for a job - now moved to logistica_entregas
// This will be handled by the logistics data fetching

/* ---------- Performance optimizations ---------- */
// Debounce hook for filter inputs
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

// Simple helper functions for performance (moved out of component to avoid SSR issues)
const getPColor = (job: Job): string => {
  if (job.prioridade) return 'bg-red-500'
  if (job.created_at) {
    const days =
      (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (days > 3) return 'bg-[var(--blue-light)]'
  }
  return 'bg-green-500'
}

const getAColor = (jobId: string, allItems: Item[]): string => {
  const items = allItems.filter((i) => i.folha_obra_id === jobId)
  if (items.length === 0) return 'bg-red-500'
  const withArtwork = items.filter((i) => i.paginacao)
  if (withArtwork.length === 0) return 'bg-red-500'
  if (withArtwork.length === items.length) return 'bg-green-500'
  return 'bg-[var(--blue-light)]'
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

/* ---------- Performance optimizations complete ---------- */

/* ---------- main page ---------- */
export default function ProducaoPage() {
  const supabase = useMemo(() => createBrowserClient(), [])

  /* state */
  const [jobs, setJobs] = useState<Job[]>([])
  const [allItems, setAllItems] = useState<Item[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [clientes, setClientes] = useState<{ value: string; label: string }[]>(
    [],
  )
  const [jobsSaiuStatus, setJobsSaiuStatus] = useState<Record<string, boolean>>(
    {},
  )
  const [jobsCompletionStatus, setJobsCompletionStatus] = useState<
    Record<string, { completed: boolean; percentage: number }>
  >({})

  /* duplicate validation state */
  const [duplicateDialog, setDuplicateDialog] = useState<{
    isOpen: boolean
    type: 'orc' | 'fo'
    value: string | number
    existingJob?: Job
    currentJobId: string
    originalValue?: string | number | null
    onConfirm?: () => void
    onCancel?: () => void
  }>({
    isOpen: false,
    type: 'orc',
    value: '',
    currentJobId: '',
  })

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

  /* tab state */
  const [activeTab, setActiveTab] = useState<'em_curso' | 'concluidos'>(
    'em_curso',
  )

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
    | 'prioridade'
    | 'data_concluido'
    | 'concluido'
    | 'saiu'
    | 'fatura'
    | 'artwork'
  const [sortCol, setSortCol] = useState<SortableJobKey>('prioridade')
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

  /* ---------- Duplicate Validation Functions ---------- */

  // Check if ORC number already exists
  const checkOrcDuplicate = useCallback(
    async (orcNumber: number, currentJobId: string) => {
      if (!orcNumber || orcNumber === null) {
        return null
      }

      try {
        let query = supabase
          .from('folhas_obras')
          .select('id, numero_orc, numero_fo, nome_campanha, cliente')
          .eq('numero_orc', orcNumber)

        // Only add the neq filter if currentJobId is not a temp job (temp jobs have string IDs like "temp-xxx")
        if (
          currentJobId &&
          currentJobId.trim() !== '' &&
          !currentJobId.startsWith('temp-')
        ) {
          query = query.neq('id', currentJobId)
        }

        const { data, error } = await query.limit(1)

        if (error) throw error

        return data && data.length > 0 ? (data[0] as Job) : null
      } catch (error) {
        console.error('Error checking ORC duplicate:', error)
        return null
      }
    },
    [supabase],
  )

  // Check if FO number already exists
  const checkFoDuplicate = useCallback(
    async (foNumber: string, currentJobId: string) => {
      if (!foNumber || foNumber.trim() === '') {
        return null
      }

      try {
        let query = supabase
          .from('folhas_obras')
          .select('id, numero_orc, numero_fo, nome_campanha, cliente')
          .eq('numero_fo', foNumber.trim())

        // Only add the neq filter if currentJobId is not a temp job (temp jobs have string IDs like "temp-xxx")
        if (
          currentJobId &&
          currentJobId.trim() !== '' &&
          !currentJobId.startsWith('temp-')
        ) {
          query = query.neq('id', currentJobId)
        }

        const { data, error } = await query.limit(1)

        if (error) throw error

        return data && data.length > 0 ? (data[0] as Job) : null
      } catch (error) {
        console.error('Error checking FO duplicate:', error)
        return null
      }
    },
    [supabase],
  )

  /* ---------- Optimized Data Fetching ---------- */

  // Fetch clientes (static data - can be cached client-side)
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
  // Note: Tab filtering (em_curso vs concluidos) is now based on logistics completion status
  // - em_curso: Shows jobs where NOT ALL logistics entries have concluido=true
  // - concluidos: Shows jobs where ALL logistics entries have concluido=true for ALL items
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
        activeTab?: 'em_curso' | 'concluidos'
      } = {},
    ) => {
      setLoading((prev) => ({ ...prev, jobs: true }))
      try {
        // Optimized query with specific columns and proper pagination
        const startRange = page * JOBS_PER_PAGE
        const endRange = startRange + JOBS_PER_PAGE - 1

        // Calculate 2 months ago date for completed jobs filter
        const twoMonthsAgo = new Date()
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
        const twoMonthsAgoString = twoMonthsAgo.toISOString()

        // Build the base query
        let query = supabase.from('folhas_obras').select(
          `
          id, numero_fo, numero_orc, nome_campanha, data_saida, 
          prioridade, notas, concluido, saiu, fatura, created_at, 
          cliente, id_cliente, data_concluido, updated_at
        `,
          { count: 'exact' },
        )

        // Apply filters

        // Tab-based filtering (completion status)
        if (filters.activeTab === 'em_curso') {
          // For em_curso tab, we'll apply logistics-based filtering after the main query
          // For now, just get all jobs and filter them later
        } else if (filters.activeTab === 'concluidos') {
          // For completed jobs, filter by last 2 months
          query = query.or(
            `data_concluido.gte.${twoMonthsAgoString},updated_at.gte.${twoMonthsAgoString},created_at.gte.${twoMonthsAgoString}`,
          )
        }

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

        // Fatura filter
        if (filters.showFatura !== undefined) {
          if (filters.showFatura) {
            query = query.eq('fatura', true)
          } else {
            query = query.or('fatura.is.null,fatura.eq.false')
          }
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

        // Apply logistics-based filtering for tabs
        if (
          filteredJobs.length > 0 &&
          (filters.activeTab === 'em_curso' ||
            filters.activeTab === 'concluidos')
        ) {
          const jobIds = filteredJobs.map((job) => job.id)

          // Get all items for these jobs
          const { data: itemsData, error: itemsError } = await supabase
            .from('items_base')
            .select('id, folha_obra_id')
            .in('folha_obra_id', jobIds)

          if (!itemsError && itemsData && itemsData.length > 0) {
            const itemIds = itemsData.map((item) => item.id)

            // Get logistics entries for these items
            const { data: logisticsData, error: logisticsError } =
              await supabase
                .from('logistica_entregas')
                .select('item_id, concluido')
                .in('item_id', itemIds)

            if (!logisticsError && logisticsData) {
              // Calculate completion status for each job
              const jobCompletionMap = new Map<string, boolean>()

              jobIds.forEach((jobId) => {
                const jobItems = itemsData.filter(
                  (item) => item.folha_obra_id === jobId,
                )

                if (jobItems.length === 0) {
                  // Jobs with no items are considered incomplete
                  jobCompletionMap.set(jobId, false)
                  return
                }

                // Check if ALL items have logistics entries with concluido=true
                const allItemsCompleted = jobItems.every((item) => {
                  const logisticsEntries = logisticsData.filter(
                    (l) => l.item_id === item.id,
                  )

                  // If no logistics entries exist for this item, it's not completed
                  if (logisticsEntries.length === 0) {
                    return false
                  }

                  // ALL logistics entries for this item must have concluido=true
                  return logisticsEntries.every(
                    (entry) => entry.concluido === true,
                  )
                })

                jobCompletionMap.set(jobId, allItemsCompleted)

                // Debug logging
                if (process.env.NODE_ENV === 'development') {
                  const job = filteredJobs.find((j) => j.id === jobId)
                  console.log(
                    `🔍 Job ${job?.numero_fo}: ${jobItems.length} items, all completed: ${allItemsCompleted}`,
                  )
                }
              })

              // Filter jobs based on tab and completion status
              if (filters.activeTab === 'em_curso') {
                // Show jobs that are NOT fully completed (incomplete logistics)
                filteredJobs = filteredJobs.filter(
                  (job) => !jobCompletionMap.get(job.id),
                )
              } else if (filters.activeTab === 'concluidos') {
                // Show jobs that are fully completed (all logistics entries have concluido=true)
                filteredJobs = filteredJobs.filter((job) =>
                  jobCompletionMap.get(job.id),
                )
              }
            }
          }
        }

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
          `Failed to load production jobs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      } finally {
        setLoading((prev) => ({ ...prev, jobs: false }))
      }
    },
    [supabase],
  )

  // Fetch saiu status for jobs by checking if ALL items have saiu=true in logistica_entregas
  const fetchJobsSaiuStatus = useCallback(
    async (jobIds: string[]) => {
      if (jobIds.length === 0) return

      try {
        // First get all items for these jobs
        const { data: itemsData, error: itemsError } = await supabase
          .from('items_base')
          .select('id, folha_obra_id')
          .in('folha_obra_id', jobIds)

        if (itemsError) throw itemsError

        if (itemsData && itemsData.length > 0) {
          const itemIds = itemsData.map((item) => item.id)

          // Get logistics entries for these items
          const { data: logisticsData, error: logisticsError } = await supabase
            .from('logistica_entregas')
            .select('item_id, saiu')
            .in('item_id', itemIds)

          if (logisticsError) throw logisticsError

          // Calculate saiu status for each job
          const jobSaiuStatus: Record<string, boolean> = {}

          jobIds.forEach((jobId) => {
            const jobItems = itemsData.filter(
              (item) => item.folha_obra_id === jobId,
            )

            if (jobItems.length === 0) {
              jobSaiuStatus[jobId] = false
              return
            }

            // Check if all items have logistics entries with saiu=true
            const allItemsSaiu = jobItems.every((item) => {
              const logisticsEntry = logisticsData?.find(
                (l) => l.item_id === item.id,
              )
              return logisticsEntry && logisticsEntry.saiu === true
            })

            jobSaiuStatus[jobId] = allItemsSaiu
          })

          setJobsSaiuStatus(jobSaiuStatus)
        }
      } catch (error) {
        console.error('Error fetching jobs saiu status:', error)
      }
    },
    [supabase],
  )

  // Fetch completion status for jobs by checking logistics entries
  const fetchJobsCompletionStatus = useCallback(
    async (jobIds: string[]) => {
      if (jobIds.length === 0) return

      try {
        // First get all items for these jobs
        const { data: itemsData, error: itemsError } = await supabase
          .from('items_base')
          .select('id, folha_obra_id')
          .in('folha_obra_id', jobIds)

        if (itemsError) throw itemsError

        if (itemsData && itemsData.length > 0) {
          const itemIds = itemsData.map((item) => item.id)

          // Get logistics entries for these items
          const { data: logisticsData, error: logisticsError } = await supabase
            .from('logistica_entregas')
            .select('item_id, concluido, data_saida')
            .in('item_id', itemIds)

          if (logisticsError) throw logisticsError

          // Calculate completion status for each job
          const jobCompletionStatus: Record<
            string,
            { completed: boolean; percentage: number }
          > = {}

          jobIds.forEach((jobId) => {
            const jobItems = itemsData.filter(
              (item) => item.folha_obra_id === jobId,
            )

            if (jobItems.length === 0) {
              jobCompletionStatus[jobId] = { completed: false, percentage: 0 }
              return
            }

            // Calculate completion percentage based on logistics entries with data_saida
            const completedItems = jobItems.filter((item) => {
              const logisticsEntry = logisticsData?.find(
                (l) => l.item_id === item.id,
              )
              return (
                logisticsEntry &&
                logisticsEntry.concluido === true &&
                logisticsEntry.data_saida !== null
              )
            })

            const percentage = Math.round(
              (completedItems.length / jobItems.length) * 100,
            )
            const allCompleted = completedItems.length === jobItems.length

            jobCompletionStatus[jobId] = { completed: allCompleted, percentage }
          })

          setJobsCompletionStatus(jobCompletionStatus)
        }
      } catch (error) {
        console.error('Error fetching jobs completion status:', error)
      }
    },
    [supabase],
  )

  // Fetch items for loaded jobs only
  const fetchItems = useCallback(
    async (jobIds: string[]) => {
      if (jobIds.length === 0) return

      setLoading((prev) => ({ ...prev, items: true }))
      try {
        // Optimized query: only fetch items for loaded jobs
        const { data: itemsData, error } = await supabase
          .from('items_base')
          .select(
            `
          id, folha_obra_id, descricao, codigo, 
          quantidade, brindes
        `,
          )
          .in('folha_obra_id', jobIds)
          .limit(ITEMS_FETCH_LIMIT)

        if (error) throw error

        // Fetch designer items data separately for better performance
        const { data: designerData, error: designerError } = await supabase
          .from('designer_items')
          .select('item_id, paginacao')
          .in('item_id', itemsData?.map((item) => item.id) || [])

        if (designerError) throw designerError

        // Fetch logistics data for completion status
        const { data: logisticsData, error: logisticsError } = await supabase
          .from('logistica_entregas')
          .select('item_id, concluido, data_saida')
          .in('item_id', itemsData?.map((item) => item.id) || [])

        if (logisticsError) throw logisticsError

        if (itemsData) {
          // Merge designer data and logistics data with items data
          const itemsWithDesigner = itemsData.map((item: any) => {
            const designer = designerData?.find((d) => d.item_id === item.id)
            const logistics = logisticsData?.find((l) => l.item_id === item.id)
            return {
              id: item.id,
              folha_obra_id: item.folha_obra_id,
              descricao: item.descricao ?? '',
              codigo: item.codigo ?? '',
              quantidade: item.quantidade ?? null,
              paginacao: designer?.paginacao ?? false,
              brindes: item.brindes ?? false,
              concluido: logistics?.concluido ?? false,
            }
          })

          setAllItems((prev) => {
            // Replace items for these jobs to avoid duplicates
            const filtered = prev.filter(
              (item) => !jobIds.includes(item.folha_obra_id),
            )
            return [...filtered, ...itemsWithDesigner]
          })
        }
      } catch (error) {
        console.error('Error fetching items:', error)
        setError('Failed to load production items')
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

      // Load clientes first (can run in parallel with jobs)
      const clientesPromise = fetchClientes()

      // Load first page of jobs with current tab
      await fetchJobs(0, true, { activeTab })

      // Wait for clientes to finish loading
      await clientesPromise
    }

    loadInitialData()
  }, [fetchClientes, fetchJobs, activeTab])

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
      // Reset pagination and search with filters
      setHasMoreJobs(true)
      setCurrentPage(0)
      fetchJobs(0, true, {
        foF: debouncedFoF,
        campF: debouncedCampF,
        itemF: debouncedItemF,
        codeF: debouncedCodeF,
        clientF: debouncedClientF,
        showFatura,
        activeTab,
      })
    } else {
      // No filters, reset to load all jobs for current tab
      setHasMoreJobs(true)
      setCurrentPage(0)
      fetchJobs(0, true, { activeTab })
    }
  }, [
    debouncedFoF,
    debouncedCampF,
    debouncedItemF,
    debouncedCodeF,
    debouncedClientF,
    showFatura,
    activeTab,
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
        fetchJobsSaiuStatus(jobIds)
        fetchJobsCompletionStatus(jobIds)
      }
    }
  }, [jobs, fetchItems, fetchJobsSaiuStatus, fetchJobsCompletionStatus])

  // Auto-complete jobs when all logistics entries are completed (DISABLED to prevent interference with manual control)
  // useEffect(() => {
  //   const checkJobCompletion = async () => {
  //     for (const job of jobs) {
  //       if (job.id.startsWith('temp-') || job.concluido) continue; // Skip temp jobs and already completed jobs
  //
  //       const completionStatus = jobsCompletionStatus[job.id];
  //
  //       // If job has logistics entries and all are completed, mark job as completed
  //       if (completionStatus && completionStatus.completed) {
  //         // Update local state
  //         setJobs(prevJobs =>
  //           prevJobs.map(j =>
  //             j.id === job.id ? { ...j, concluido: true } : j
  //           )
  //         );
  //
  //         // Update database
  //         await supabase.from("folhas_obras").update({ concluido: true }).eq("id", job.id);
  //       }
  //     }
  //   };

  //   if (jobs.length > 0 && Object.keys(jobsCompletionStatus).length > 0) {
  //     checkJobCompletion();
  //   }
  // }, [jobsCompletionStatus, jobs, supabase]);

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
        activeTab,
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
    activeTab,
  ])

  // Retry function for error recovery
  const retryFetch = useCallback(() => {
    setError(null)
    fetchJobs(0, true, { activeTab })
    fetchClientes()
  }, [fetchJobs, fetchClientes, activeTab])

  /* jobs are now pre-filtered by database, so we just use them directly */
  const filtered = jobs

  /* sort */
  const sorted = useMemo(() => {
    const arr = [...filtered]
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
        case 'prioridade':
          A = a.prioridade ?? false
          B = b.prioridade ?? false
          break
        case 'data_concluido':
          // Date completion is now handled by logistics data
          A = 0
          B = 0
          break
        case 'concluido':
          A = a.concluido ?? false
          B = b.concluido ?? false
          break
        case 'saiu':
          A = a.saiu ?? false
          B = b.saiu ?? false
          break
        case 'fatura':
          A = a.fatura ?? false
          B = b.fatura ?? false
          break
        case 'artwork':
          // Sort by artwork status (paginacao)
          const aItems = allItems.filter((i) => i.folha_obra_id === a.id)
          const bItems = allItems.filter((i) => i.folha_obra_id === b.id)
          const aHasArtwork = aItems.some((i) => i.paginacao)
          const bHasArtwork = bItems.some((i) => i.paginacao)
          A = aHasArtwork
          B = bHasArtwork
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
  }, [filtered, sortCol, sortDir])

  /* ---------- render ---------- */
  return (
    <PermissionGuard>
      <div className="w-full space-y-6">
        {/* filter bar */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Gestão de Produção</h1>
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
                      // Refresh all data
                      setError(null)
                      setJobs([])
                      setAllItems([])
                      setJobsSaiuStatus({})
                      setCurrentPage(0)
                      setHasMoreJobs(true)
                      await fetchJobs(0, true, {
                        foF: debouncedFoF,
                        campF: debouncedCampF,
                        itemF: debouncedItemF,
                        codeF: debouncedCodeF,
                        clientF: debouncedClientF,
                        showFatura,
                        activeTab,
                      })
                    }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={async () => {
                      if (sorted.length === 0) {
                        alert('Não há dados para exportar.')
                        return
                      }

                      try {
                        // Fetch detailed data for export including logistics information
                        const jobIds = sorted
                          .map((job) => job.id)
                          .filter((id) => !id.startsWith('temp-'))

                        if (jobIds.length === 0) {
                          alert('Não há trabalhos válidos para exportar.')
                          return
                        }

                        console.log(
                          `Exporting data for ${jobIds.length} jobs with incomplete logistics...`,
                        )

                        // First fetch transportadoras for name resolution
                        const {
                          data: transportadorasData,
                          error: transportadorasError,
                        } = await supabase
                          .from('transportadora')
                          .select('id, name')

                        if (transportadorasError) {
                          console.error(
                            'Error fetching transportadoras:',
                            transportadorasError,
                          )
                        }

                        const transportadorasMap = new Map(
                          (transportadorasData || []).map((t: any) => [
                            t.id,
                            t.name,
                          ]),
                        )

                        // Fetch clientes with address information for location lookups
                        const { data: clientesData, error: clientesError } =
                          await supabase
                            .from('clientes')
                            .select('id, nome_cl, morada, codigo_pos')

                        if (clientesError) {
                          console.error(
                            'Error fetching clientes:',
                            clientesError,
                          )
                        }

                        const clientesForExport = (clientesData || []).map(
                          (c: any) => ({
                            value: c.id,
                            label: c.nome_cl,
                            morada: c.morada,
                            codigo_pos: c.codigo_pos,
                          }),
                        )

                        // Fetch items with logistics data for these jobs (only incomplete logistics)
                        const { data: itemsWithLogistics, error } =
                          await supabase
                            .from('items_base')
                            .select(
                              `
                          id,
                          folha_obra_id,
                          descricao,
                          quantidade,
                          folhas_obras!inner (
                            id,
                            numero_orc,
                            numero_fo,
                            nome_campanha,
                            id_cliente,
                            data_in
                          ),
                          logistica_entregas!inner (
                            data_concluido,
                            transportadora,
                            local_entrega,
                            local_recolha,
                            id_local_entrega,
                            id_local_recolha,
                            concluido
                          )
                        `,
                            )
                            .in('folha_obra_id', jobIds)
                            .eq('logistica_entregas.concluido', false)

                        if (error) {
                          console.error('Error fetching export data:', error)
                          alert('Erro ao buscar dados para exportação.')
                          return
                        }

                        if (
                          !itemsWithLogistics ||
                          itemsWithLogistics.length === 0
                        ) {
                          alert(
                            'Não há itens com logística incompleta (concluído=false) para exportar.',
                          )
                          return
                        }

                        // Transform data for export
                        const exportRows = (itemsWithLogistics || []).map(
                          (item: any) => {
                            // Get the latest logistics entry for this item (if multiple exist)
                            const latestLogistics =
                              item.logistica_entregas &&
                              item.logistica_entregas.length > 0
                                ? item.logistica_entregas.reduce(
                                    (latest: any, current: any) => {
                                      if (!latest) return current
                                      if (!current.data_concluido) return latest
                                      if (!latest.data_concluido) return current
                                      return new Date(current.data_concluido) >
                                        new Date(latest.data_concluido)
                                        ? current
                                        : latest
                                    },
                                    null,
                                  )
                                : null

                            // Resolve transportadora ID to name
                            const transportadoraName =
                              latestLogistics?.transportadora
                                ? transportadorasMap.get(
                                    latestLogistics.transportadora,
                                  ) || latestLogistics.transportadora
                                : ''

                            return {
                              numero_orc: item.folhas_obras?.numero_orc || null,
                              numero_fo: item.folhas_obras?.numero_fo || '',
                              id_cliente: item.folhas_obras?.id_cliente || '',
                              quantidade: item.quantidade || null,
                              nome_campanha:
                                item.folhas_obras?.nome_campanha || '',
                              descricao: item.descricao || '',
                              data_in: item.folhas_obras?.data_in || null,
                              data_concluido:
                                latestLogistics?.data_concluido || null,
                              transportadora: transportadoraName,
                              local_entrega:
                                latestLogistics?.local_entrega || '',
                              local_recolha:
                                latestLogistics?.local_recolha || '',
                              id_local_entrega:
                                latestLogistics?.id_local_entrega || '',
                              id_local_recolha:
                                latestLogistics?.id_local_recolha || '',
                            }
                          },
                        )

                        // Call the export function
                        exportProducaoToExcel({
                          filteredRecords: exportRows,
                          activeTab,
                          clientes: clientesForExport,
                        })
                      } catch (error) {
                        console.error('Error during export:', error)
                        alert('Erro ao exportar dados.')
                      }
                    }}
                    title="Exportar para Excel"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar Excel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {activeTab === 'em_curso' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="default"
                      onClick={() => {
                        // Add a new empty row to the table for inline editing
                        const tempId = `temp-${Date.now()}`
                        const newJob: Job = {
                          id: tempId,
                          numero_fo: '',
                          numero_orc: null,
                          nome_campanha: '',
                          data_saida: null,
                          prioridade: false,
                          notas: null,
                          concluido: false,
                          saiu: false,
                          fatura: false,
                          created_at: null,
                          cliente: '',
                          id_cliente: null,
                          data_concluido: null,
                          updated_at: null,
                        }

                        // Add the new empty job to the beginning of the list
                        setJobs((prevJobs) => [newJob, ...prevJobs])
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Adicionar FO</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Error handling */}
        {error && <ErrorMessage message={error} onRetry={retryFetch} />}

        {/* Main Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as 'em_curso' | 'concluidos')
          }
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="em_curso">
              Em Curso ({activeTab === 'em_curso' ? jobs.length : '...'})
            </TabsTrigger>
            <TabsTrigger value="concluidos">
              Logística Concluída (
              {activeTab === 'concluidos' ? jobs.length : '...'})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="em_curso">
            {/* Loading state */}
            {loading.jobs && jobs.length === 0 ? (
              <JobsTableSkeleton />
            ) : (
              <>
                {/* jobs table */}
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
                            onClick={() => toggleSort('prioridade')}
                            className="border-border sticky top-0 z-10 w-[210px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] font-bold text-black uppercase select-none"
                          >
                            Status{' '}
                            {sortCol === 'prioridade' &&
                              (sortDir === 'asc' ? (
                                <ArrowUp className="ml-1 inline h-3 w-3" />
                              ) : (
                                <ArrowDown className="ml-1 inline h-3 w-3" />
                              ))}
                          </TableHead>

                          <TableHead
                            onClick={() => toggleSort('prioridade')}
                            className="border-border sticky top-0 z-10 w-[36px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] p-0 text-center font-bold text-black uppercase select-none"
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
                          <TableHead
                            onClick={() => toggleSort('artwork')}
                            className="border-border sticky top-0 z-10 w-[36px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] p-0 text-center font-bold text-black uppercase select-none"
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    A{' '}
                                    {sortCol === 'artwork' &&
                                      (sortDir === 'asc' ? (
                                        <ArrowUp className="ml-1 inline h-3 w-3" />
                                      ) : (
                                        <ArrowDown className="ml-1 inline h-3 w-3" />
                                      ))}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Tem AF&apos;s</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>

                          <TableHead className="border-border sticky top-0 z-10 w-[100px] rounded-none border-b-2 bg-[var(--orange)] text-center font-bold text-black uppercase">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sorted.map((job) => {
                          const its = allItems.filter(
                            (i) => i.folha_obra_id === job.id,
                          )
                          const pct =
                            jobsCompletionStatus[job.id]?.percentage || 0

                          return (
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
                                    const inputValue = e.target.value.trim()
                                    const value =
                                      inputValue === ''
                                        ? null
                                        : Number(inputValue)

                                    // Skip validation for empty values or invalid numbers
                                    if (
                                      !inputValue ||
                                      isNaN(Number(inputValue))
                                    ) {
                                      if (!job.id.startsWith('temp-')) {
                                        await supabase
                                          .from('folhas_obras')
                                          .update({ numero_orc: value })
                                          .eq('id', job.id)
                                      }
                                      return
                                    }

                                    // Check for duplicates
                                    const numericValue = Number(inputValue)
                                    const existingJob = await checkOrcDuplicate(
                                      numericValue,
                                      job.id,
                                    )

                                    if (existingJob) {
                                      // Show duplicate warning dialog
                                      setDuplicateDialog({
                                        isOpen: true,
                                        type: 'orc',
                                        value: numericValue,
                                        existingJob,
                                        currentJobId: job.id,
                                        originalValue: job.numero_orc,
                                        onConfirm: async () => {
                                          // User confirmed to proceed with duplicate
                                          if (job.id.startsWith('temp-')) {
                                            // For temp jobs, create new record
                                            try {
                                              const insertData = {
                                                numero_orc: numericValue,
                                                numero_fo:
                                                  job.numero_fo || '0000',
                                                nome_campanha:
                                                  job.nome_campanha ||
                                                  'Nova Campanha',
                                                prioridade:
                                                  job.prioridade || false,
                                                concluido:
                                                  job.concluido || false,
                                                saiu: job.saiu || false,
                                                fatura: job.fatura || false,
                                                cliente: job.cliente || '',
                                                id_cliente:
                                                  job.id_cliente || null,
                                                notas: job.notas || null,
                                                data_saida:
                                                  job.data_saida || null,
                                              }
                                              console.log(
                                                'Inserting ORC job (no duplicate) with data:',
                                                insertData,
                                              )

                                              const { data: newJob, error } =
                                                await supabase
                                                  .from('folhas_obras')
                                                  .insert(insertData)
                                                  .select('*')
                                                  .single()

                                              if (error) {
                                                console.error(
                                                  'Insert error details (no duplicate):',
                                                  error,
                                                )
                                                throw error
                                              }

                                              if (!error && newJob) {
                                                setJobs((prevJobs) =>
                                                  prevJobs.map((j) =>
                                                    j.id === job.id
                                                      ? (newJob as Job)
                                                      : j,
                                                  ),
                                                )
                                              }
                                            } catch (error) {
                                              console.error(
                                                'Error creating job:',
                                                error,
                                              )
                                            }
                                          } else {
                                            // For existing jobs, update
                                            await supabase
                                              .from('folhas_obras')
                                              .update({
                                                numero_orc: numericValue,
                                              })
                                              .eq('id', job.id)
                                          }
                                          setDuplicateDialog({
                                            isOpen: false,
                                            type: 'orc',
                                            value: '',
                                            currentJobId: '',
                                          })
                                        },
                                        onCancel: () => {
                                          // Revert the input value
                                          setJobs((prevJobs) =>
                                            prevJobs.map((j) =>
                                              j.id === job.id
                                                ? {
                                                    ...j,
                                                    numero_orc: job.numero_orc,
                                                  }
                                                : j,
                                            ),
                                          )
                                          setDuplicateDialog({
                                            isOpen: false,
                                            type: 'orc',
                                            value: '',
                                            currentJobId: '',
                                          })
                                        },
                                      })
                                    } else {
                                      // No duplicate found, proceed with update/insert
                                      if (job.id.startsWith('temp-')) {
                                        // For temp jobs, create new record
                                        try {
                                          const insertData = {
                                            numero_orc: numericValue,
                                            numero_fo: job.numero_fo || '0000',
                                            nome_campanha:
                                              job.nome_campanha ||
                                              'Nova Campanha',
                                            prioridade: job.prioridade || false,
                                            concluido: job.concluido || false,
                                            saiu: job.saiu || false,
                                            fatura: job.fatura || false,
                                            cliente: job.cliente || '',
                                            id_cliente: job.id_cliente || null,
                                            notas: job.notas || null,
                                            data_saida: job.data_saida || null,
                                          }
                                          console.log(
                                            'Inserting ORC job with data:',
                                            insertData,
                                          )

                                          const { data: newJob, error } =
                                            await supabase
                                              .from('folhas_obras')
                                              .insert(insertData)
                                              .select('*')
                                              .single()

                                          if (error) {
                                            console.error(
                                              'Insert error details:',
                                              error,
                                            )
                                            throw error
                                          }

                                          if (!error && newJob) {
                                            setJobs((prevJobs) =>
                                              prevJobs.map((j) =>
                                                j.id === job.id
                                                  ? (newJob as Job)
                                                  : j,
                                              ),
                                            )
                                          }
                                        } catch (error) {
                                          console.error(
                                            'Error creating job:',
                                            error,
                                          )
                                        }
                                      } else {
                                        // For existing jobs, update
                                        await supabase
                                          .from('folhas_obras')
                                          .update({ numero_orc: numericValue })
                                          .eq('id', job.id)
                                      }
                                    }
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
                                    const value = e.target.value.trim()

                                    if (job.id.startsWith('temp-') && value) {
                                      // Check for duplicates before creating new job
                                      const existingJob =
                                        await checkFoDuplicate(value, '')

                                      if (existingJob) {
                                        // Show duplicate warning dialog
                                        setDuplicateDialog({
                                          isOpen: true,
                                          type: 'fo',
                                          value: value,
                                          existingJob,
                                          currentJobId: job.id,
                                          originalValue: '',
                                          onConfirm: async () => {
                                            // User confirmed to proceed with duplicate
                                            try {
                                              const { data: newJob, error } =
                                                await supabase
                                                  .from('folhas_obras')
                                                  .insert({
                                                    numero_fo: value,
                                                    nome_campanha:
                                                      job.nome_campanha || '',
                                                    prioridade:
                                                      job.prioridade || false,
                                                    concluido:
                                                      job.concluido || false,
                                                    saiu: job.saiu || false,
                                                    fatura: job.fatura || false,
                                                    cliente: job.cliente || '',
                                                    numero_orc: job.numero_orc,
                                                    notas: job.notas,
                                                    data_saida: job.data_saida,
                                                  })
                                                  .select('*')
                                                  .single()

                                              if (!error && newJob) {
                                                setJobs((prevJobs) =>
                                                  prevJobs.map((j) =>
                                                    j.id === job.id
                                                      ? (newJob as Job)
                                                      : j,
                                                  ),
                                                )
                                              }
                                            } catch (error) {
                                              console.error(
                                                'Error creating job:',
                                                error,
                                              )
                                            }
                                            setDuplicateDialog({
                                              isOpen: false,
                                              type: 'fo',
                                              value: '',
                                              currentJobId: '',
                                            })
                                          },
                                          onCancel: () => {
                                            // Clear the input value
                                            setJobs((prevJobs) =>
                                              prevJobs.map((j) =>
                                                j.id === job.id
                                                  ? { ...j, numero_fo: '' }
                                                  : j,
                                              ),
                                            )
                                            setDuplicateDialog({
                                              isOpen: false,
                                              type: 'fo',
                                              value: '',
                                              currentJobId: '',
                                            })
                                          },
                                        })
                                      } else {
                                        // No duplicate found, proceed with creation
                                        try {
                                          const { data: newJob, error } =
                                            await supabase
                                              .from('folhas_obras')
                                              .insert({
                                                numero_fo: value,
                                                nome_campanha:
                                                  job.nome_campanha || '',
                                                prioridade:
                                                  job.prioridade || false,
                                                concluido:
                                                  job.concluido || false,
                                                saiu: job.saiu || false,
                                                fatura: job.fatura || false,
                                                cliente: job.cliente || '',
                                                numero_orc: job.numero_orc,
                                                notas: job.notas,
                                                data_saida: job.data_saida,
                                              })
                                              .select('*')
                                              .single()

                                          if (!error && newJob) {
                                            setJobs((prevJobs) =>
                                              prevJobs.map((j) =>
                                                j.id === job.id
                                                  ? (newJob as Job)
                                                  : j,
                                              ),
                                            )
                                          }
                                        } catch (error) {
                                          console.error(
                                            'Error creating job:',
                                            error,
                                          )
                                        }
                                      }
                                    } else if (!job.id.startsWith('temp-')) {
                                      // Check for duplicates before updating existing job
                                      if (value) {
                                        const existingJob =
                                          await checkFoDuplicate(value, job.id)

                                        if (existingJob) {
                                          // Show duplicate warning dialog
                                          setDuplicateDialog({
                                            isOpen: true,
                                            type: 'fo',
                                            value: value,
                                            existingJob,
                                            currentJobId: job.id,
                                            originalValue: job.numero_fo,
                                            onConfirm: async () => {
                                              // User confirmed to proceed with duplicate
                                              await supabase
                                                .from('folhas_obras')
                                                .update({ numero_fo: value })
                                                .eq('id', job.id)
                                              setDuplicateDialog({
                                                isOpen: false,
                                                type: 'fo',
                                                value: '',
                                                currentJobId: '',
                                              })
                                            },
                                            onCancel: () => {
                                              // Revert the input value to original
                                              setJobs((prevJobs) =>
                                                prevJobs.map((j) =>
                                                  j.id === job.id
                                                    ? {
                                                        ...j,
                                                        numero_fo:
                                                          job.numero_fo,
                                                      }
                                                    : j,
                                                ),
                                              )
                                              setDuplicateDialog({
                                                isOpen: false,
                                                type: 'fo',
                                                value: '',
                                                currentJobId: '',
                                              })
                                            },
                                          })
                                        } else {
                                          // No duplicate found, proceed with update
                                          await supabase
                                            .from('folhas_obras')
                                            .update({ numero_fo: value })
                                            .eq('id', job.id)
                                        }
                                      } else {
                                        // Empty value, just update
                                        await supabase
                                          .from('folhas_obras')
                                          .update({ numero_fo: value })
                                          .eq('id', job.id)
                                      }
                                    }
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
                                    // Debug logging
                                    console.log(
                                      `Job ${job.numero_fo} - selecting cliente: ${selectedId} -> ${selected?.label}`,
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
                                    // Persist to Supabase if not a temp job
                                    if (!job.id.startsWith('temp-')) {
                                      await supabase
                                        .from('folhas_obras')
                                        .update({
                                          id_cliente: selectedId,
                                          cliente: selected?.label || '',
                                        })
                                        .eq('id', job.id)
                                    }
                                  }}
                                  options={clientes}
                                  onOptionsUpdate={(
                                    newClientes: ClienteOption[],
                                  ) => {
                                    setClientes(newClientes) // Update the clientes list when a new one is created
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
                                    // Update the job if it exists in database
                                    if (!job.id.startsWith('temp-')) {
                                      await supabase
                                        .from('folhas_obras')
                                        .update({ nome_campanha: value })
                                        .eq('id', job.id)
                                    }
                                  }}
                                  className="h-10 w-full rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                                  placeholder="Nome da Campanha"
                                />
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
                                      <TooltipContent>
                                        {job.notas}
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="w-[210px]">
                                <div className="flex w-full items-center gap-2">
                                  <Progress value={pct} className="w-full" />
                                  <span className="w-10 text-right font-mono text-xs">
                                    {pct}%
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="w-[36px] p-0 text-center">
                                <button
                                  className={`focus:ring-primary mx-auto flex h-3 w-3 items-center justify-center rounded-full transition-colors focus:ring-2 focus:outline-none ${getPColor(job)}`}
                                  title={
                                    job.prioridade
                                      ? 'Prioritário'
                                      : job.created_at &&
                                          (Date.now() -
                                            new Date(
                                              job.created_at,
                                            ).getTime()) /
                                            (1000 * 60 * 60 * 24) >
                                            3
                                        ? 'Aguardando há mais de 3 dias'
                                        : 'Normal'
                                  }
                                  onClick={async () => {
                                    const newPrioridade = !job.prioridade
                                    setJobs((prevJobs) =>
                                      prevJobs.map((j) =>
                                        j.id === job.id
                                          ? { ...j, prioridade: newPrioridade }
                                          : j,
                                      ),
                                    )
                                    // Persist to Supabase
                                    await supabase
                                      .from('folhas_obras')
                                      .update({ prioridade: newPrioridade })
                                      .eq('id', job.id)
                                  }}
                                />
                              </TableCell>
                              <TableCell className="w-[36px] p-0 text-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <span
                                          className={`focus:ring-primary mx-auto flex h-3 w-3 items-center justify-center rounded-full transition-colors focus:ring-2 focus:outline-none ${getAColor(job.id, allItems)}`}
                                          title="Tem AF's"
                                        />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Tem AF&apos;s
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
                                                `Tem certeza que deseja eliminar a Folha de Obra ${job.numero_fo}? Esta ação irá eliminar todos os itens e dados logísticos associados.`,
                                              )
                                            ) {
                                              return
                                            }

                                            try {
                                              // 1. Get all items for this job
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

                                                // 2. Delete logistics entries for these items
                                                await supabase
                                                  .from('logistica_entregas')
                                                  .delete()
                                                  .in('item_id', itemIds)

                                                // 3. Delete designer items
                                                await supabase
                                                  .from('designer_items')
                                                  .delete()
                                                  .in('item_id', itemIds)

                                                // 4. Delete items_base
                                                await supabase
                                                  .from('items_base')
                                                  .delete()
                                                  .in('id', itemIds)
                                              }

                                              // 5. Delete the job itself
                                              await supabase
                                                .from('folhas_obras')
                                                .delete()
                                                .eq('id', job.id)

                                              // 6. Update local state
                                              setJobs((prevJobs) =>
                                                prevJobs.filter(
                                                  (j) => j.id !== job.id,
                                                ),
                                              )
                                              setAllItems((prevItems) =>
                                                prevItems.filter(
                                                  (item) =>
                                                    item.folha_obra_id !==
                                                    job.id,
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
                          )
                        })}
                        {sorted.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={10}
                              className="py-8 text-center"
                            >
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
          </TabsContent>

          <TabsContent value="concluidos">
            {/* Loading state */}
            {loading.jobs && jobs.length === 0 ? (
              <JobsTableSkeleton />
            ) : (
              <>
                {/* jobs table - exact same as em_curso */}
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
                            onClick={() => toggleSort('prioridade')}
                            className="border-border sticky top-0 z-10 w-[210px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] font-bold text-black uppercase select-none"
                          >
                            Status{' '}
                            {sortCol === 'prioridade' &&
                              (sortDir === 'asc' ? (
                                <ArrowUp className="ml-1 inline h-3 w-3" />
                              ) : (
                                <ArrowDown className="ml-1 inline h-3 w-3" />
                              ))}
                          </TableHead>

                          <TableHead
                            onClick={() => toggleSort('prioridade')}
                            className="border-border sticky top-0 z-10 w-[36px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] p-0 text-center font-bold text-black uppercase select-none"
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
                          <TableHead
                            onClick={() => toggleSort('artwork')}
                            className="border-border sticky top-0 z-10 w-[36px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] p-0 text-center font-bold text-black uppercase select-none"
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    A{' '}
                                    {sortCol === 'artwork' &&
                                      (sortDir === 'asc' ? (
                                        <ArrowUp className="ml-1 inline h-3 w-3" />
                                      ) : (
                                        <ArrowDown className="ml-1 inline h-3 w-3" />
                                      ))}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Tem AF&apos;s</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                          <TableHead className="border-border sticky top-0 z-10 w-[100px] rounded-none border-b-2 bg-[var(--orange)] text-center font-bold text-black uppercase">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sorted.map((job) => {
                          const its = allItems.filter(
                            (i) => i.folha_obra_id === job.id,
                          )
                          const pct =
                            jobsCompletionStatus[job.id]?.percentage || 0

                          return (
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
                                    const inputValue = e.target.value.trim()
                                    const value =
                                      inputValue === ''
                                        ? null
                                        : Number(inputValue)

                                    // Skip validation for empty values or invalid numbers
                                    if (
                                      !inputValue ||
                                      isNaN(Number(inputValue))
                                    ) {
                                      if (!job.id.startsWith('temp-')) {
                                        await supabase
                                          .from('folhas_obras')
                                          .update({ numero_orc: value })
                                          .eq('id', job.id)
                                      }
                                      return
                                    }

                                    // Check for duplicates
                                    const numericValue = Number(inputValue)
                                    const existingJob = await checkOrcDuplicate(
                                      numericValue,
                                      job.id,
                                    )

                                    if (existingJob) {
                                      // Show duplicate warning dialog
                                      setDuplicateDialog({
                                        isOpen: true,
                                        type: 'orc',
                                        value: numericValue,
                                        existingJob,
                                        currentJobId: job.id,
                                        originalValue: job.numero_orc,
                                        onConfirm: async () => {
                                          // User confirmed to proceed with duplicate
                                          if (job.id.startsWith('temp-')) {
                                            // For temp jobs, create new record
                                            try {
                                              const insertData = {
                                                numero_orc: numericValue,
                                                numero_fo:
                                                  job.numero_fo || '0000',
                                                nome_campanha:
                                                  job.nome_campanha ||
                                                  'Nova Campanha',
                                                prioridade:
                                                  job.prioridade || false,
                                                concluido:
                                                  job.concluido || false,
                                                saiu: job.saiu || false,
                                                fatura: job.fatura || false,
                                                cliente: job.cliente || '',
                                                id_cliente:
                                                  job.id_cliente || null,
                                                notas: job.notas || null,
                                                data_saida:
                                                  job.data_saida || null,
                                              }
                                              console.log(
                                                'Inserting ORC job (no duplicate) with data:',
                                                insertData,
                                              )

                                              const { data: newJob, error } =
                                                await supabase
                                                  .from('folhas_obras')
                                                  .insert(insertData)
                                                  .select('*')
                                                  .single()

                                              if (error) {
                                                console.error(
                                                  'Insert error details (no duplicate):',
                                                  error,
                                                )
                                                throw error
                                              }

                                              if (!error && newJob) {
                                                setJobs((prevJobs) =>
                                                  prevJobs.map((j) =>
                                                    j.id === job.id
                                                      ? (newJob as Job)
                                                      : j,
                                                  ),
                                                )
                                              }
                                            } catch (error) {
                                              console.error(
                                                'Error creating job:',
                                                error,
                                              )
                                            }
                                          } else {
                                            // For existing jobs, update
                                            await supabase
                                              .from('folhas_obras')
                                              .update({
                                                numero_orc: numericValue,
                                              })
                                              .eq('id', job.id)
                                          }
                                          setDuplicateDialog({
                                            isOpen: false,
                                            type: 'orc',
                                            value: '',
                                            currentJobId: '',
                                          })
                                        },
                                        onCancel: () => {
                                          // Revert the input value
                                          setJobs((prevJobs) =>
                                            prevJobs.map((j) =>
                                              j.id === job.id
                                                ? {
                                                    ...j,
                                                    numero_orc: job.numero_orc,
                                                  }
                                                : j,
                                            ),
                                          )
                                          setDuplicateDialog({
                                            isOpen: false,
                                            type: 'orc',
                                            value: '',
                                            currentJobId: '',
                                          })
                                        },
                                      })
                                    } else {
                                      // No duplicate found, proceed with update/insert
                                      if (job.id.startsWith('temp-')) {
                                        // For temp jobs, create new record
                                        try {
                                          const insertData = {
                                            numero_orc: numericValue,
                                            numero_fo: job.numero_fo || '0000',
                                            nome_campanha:
                                              job.nome_campanha ||
                                              'Nova Campanha',
                                            prioridade: job.prioridade || false,
                                            concluido: job.concluido || false,
                                            saiu: job.saiu || false,
                                            fatura: job.fatura || false,
                                            cliente: job.cliente || '',
                                            id_cliente: job.id_cliente || null,
                                            notas: job.notas || null,
                                            data_saida: job.data_saida || null,
                                          }
                                          console.log(
                                            'Inserting ORC job with data:',
                                            insertData,
                                          )

                                          const { data: newJob, error } =
                                            await supabase
                                              .from('folhas_obras')
                                              .insert(insertData)
                                              .select('*')
                                              .single()

                                          if (error) {
                                            console.error(
                                              'Insert error details:',
                                              error,
                                            )
                                            throw error
                                          }

                                          if (!error && newJob) {
                                            setJobs((prevJobs) =>
                                              prevJobs.map((j) =>
                                                j.id === job.id
                                                  ? (newJob as Job)
                                                  : j,
                                              ),
                                            )
                                          }
                                        } catch (error) {
                                          console.error(
                                            'Error creating job:',
                                            error,
                                          )
                                        }
                                      } else {
                                        // For existing jobs, update
                                        await supabase
                                          .from('folhas_obras')
                                          .update({ numero_orc: numericValue })
                                          .eq('id', job.id)
                                      }
                                    }
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
                                    const value = e.target.value.trim()

                                    if (job.id.startsWith('temp-') && value) {
                                      // Check for duplicates before creating new job
                                      const existingJob =
                                        await checkFoDuplicate(value, '')

                                      if (existingJob) {
                                        // Show duplicate warning dialog
                                        setDuplicateDialog({
                                          isOpen: true,
                                          type: 'fo',
                                          value: value,
                                          existingJob,
                                          currentJobId: job.id,
                                          originalValue: '',
                                          onConfirm: async () => {
                                            // User confirmed to proceed with duplicate
                                            try {
                                              const { data: newJob, error } =
                                                await supabase
                                                  .from('folhas_obras')
                                                  .insert({
                                                    numero_fo: value,
                                                    nome_campanha:
                                                      job.nome_campanha || '',
                                                    prioridade:
                                                      job.prioridade || false,
                                                    concluido:
                                                      job.concluido || false,
                                                    saiu: job.saiu || false,
                                                    fatura: job.fatura || false,
                                                    cliente: job.cliente || '',
                                                    numero_orc: job.numero_orc,
                                                    notas: job.notas,
                                                    data_saida: job.data_saida,
                                                  })
                                                  .select('*')
                                                  .single()

                                              if (!error && newJob) {
                                                setJobs((prevJobs) =>
                                                  prevJobs.map((j) =>
                                                    j.id === job.id
                                                      ? (newJob as Job)
                                                      : j,
                                                  ),
                                                )
                                              }
                                            } catch (error) {
                                              console.error(
                                                'Error creating job:',
                                                error,
                                              )
                                            }
                                            setDuplicateDialog({
                                              isOpen: false,
                                              type: 'fo',
                                              value: '',
                                              currentJobId: '',
                                            })
                                          },
                                          onCancel: () => {
                                            // Clear the input value
                                            setJobs((prevJobs) =>
                                              prevJobs.map((j) =>
                                                j.id === job.id
                                                  ? { ...j, numero_fo: '' }
                                                  : j,
                                              ),
                                            )
                                            setDuplicateDialog({
                                              isOpen: false,
                                              type: 'fo',
                                              value: '',
                                              currentJobId: '',
                                            })
                                          },
                                        })
                                      } else {
                                        // No duplicate found, proceed with creation
                                        try {
                                          const { data: newJob, error } =
                                            await supabase
                                              .from('folhas_obras')
                                              .insert({
                                                numero_fo: value,
                                                nome_campanha:
                                                  job.nome_campanha || '',
                                                prioridade:
                                                  job.prioridade || false,
                                                concluido:
                                                  job.concluido || false,
                                                saiu: job.saiu || false,
                                                fatura: job.fatura || false,
                                                cliente: job.cliente || '',
                                                numero_orc: job.numero_orc,
                                                notas: job.notas,
                                                data_saida: job.data_saida,
                                              })
                                              .select('*')
                                              .single()

                                          if (!error && newJob) {
                                            setJobs((prevJobs) =>
                                              prevJobs.map((j) =>
                                                j.id === job.id
                                                  ? (newJob as Job)
                                                  : j,
                                              ),
                                            )
                                          }
                                        } catch (error) {
                                          console.error(
                                            'Error creating job:',
                                            error,
                                          )
                                        }
                                      }
                                    } else if (!job.id.startsWith('temp-')) {
                                      // Check for duplicates before updating existing job
                                      if (value) {
                                        const existingJob =
                                          await checkFoDuplicate(value, job.id)

                                        if (existingJob) {
                                          // Show duplicate warning dialog
                                          setDuplicateDialog({
                                            isOpen: true,
                                            type: 'fo',
                                            value: value,
                                            existingJob,
                                            currentJobId: job.id,
                                            originalValue: job.numero_fo,
                                            onConfirm: async () => {
                                              // User confirmed to proceed with duplicate
                                              await supabase
                                                .from('folhas_obras')
                                                .update({ numero_fo: value })
                                                .eq('id', job.id)
                                              setDuplicateDialog({
                                                isOpen: false,
                                                type: 'fo',
                                                value: '',
                                                currentJobId: '',
                                              })
                                            },
                                            onCancel: () => {
                                              // Revert the input value to original
                                              setJobs((prevJobs) =>
                                                prevJobs.map((j) =>
                                                  j.id === job.id
                                                    ? {
                                                        ...j,
                                                        numero_fo:
                                                          job.numero_fo,
                                                      }
                                                    : j,
                                                ),
                                              )
                                              setDuplicateDialog({
                                                isOpen: false,
                                                type: 'fo',
                                                value: '',
                                                currentJobId: '',
                                              })
                                            },
                                          })
                                        } else {
                                          // No duplicate found, proceed with update
                                          await supabase
                                            .from('folhas_obras')
                                            .update({ numero_fo: value })
                                            .eq('id', job.id)
                                        }
                                      } else {
                                        // Empty value, just update
                                        await supabase
                                          .from('folhas_obras')
                                          .update({ numero_fo: value })
                                          .eq('id', job.id)
                                      }
                                    }
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
                                    // Debug logging
                                    console.log(
                                      `Job ${job.numero_fo} - selecting cliente: ${selectedId} -> ${selected?.label}`,
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
                                    // Persist to Supabase if not a temp job
                                    if (!job.id.startsWith('temp-')) {
                                      await supabase
                                        .from('folhas_obras')
                                        .update({
                                          id_cliente: selectedId,
                                          cliente: selected?.label || '',
                                        })
                                        .eq('id', job.id)
                                    }
                                  }}
                                  options={clientes}
                                  onOptionsUpdate={(
                                    newClientes: ClienteOption[],
                                  ) => {
                                    setClientes(newClientes) // Update the clientes list when a new one is created
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
                                    // Update the job if it exists in database
                                    if (!job.id.startsWith('temp-')) {
                                      await supabase
                                        .from('folhas_obras')
                                        .update({ nome_campanha: value })
                                        .eq('id', job.id)
                                    }
                                  }}
                                  className="h-10 w-full rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                                  placeholder="Nome da Campanha"
                                />
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
                                      <TooltipContent>
                                        {job.notas}
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="w-[210px]">
                                <div className="flex w-full items-center gap-2">
                                  <Progress value={pct} className="w-full" />
                                  <span className="w-10 text-right font-mono text-xs">
                                    {pct}%
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="w-[36px] p-0 text-center">
                                <button
                                  className={`focus:ring-primary mx-auto flex h-3 w-3 items-center justify-center rounded-full transition-colors focus:ring-2 focus:outline-none ${getPColor(job)}`}
                                  title={
                                    job.prioridade
                                      ? 'Prioritário'
                                      : job.created_at &&
                                          (Date.now() -
                                            new Date(
                                              job.created_at,
                                            ).getTime()) /
                                            (1000 * 60 * 60 * 24) >
                                            3
                                        ? 'Aguardando há mais de 3 dias'
                                        : 'Normal'
                                  }
                                  onClick={async () => {
                                    const newPrioridade = !job.prioridade
                                    setJobs((prevJobs) =>
                                      prevJobs.map((j) =>
                                        j.id === job.id
                                          ? { ...j, prioridade: newPrioridade }
                                          : j,
                                      ),
                                    )
                                    // Persist to Supabase
                                    await supabase
                                      .from('folhas_obras')
                                      .update({ prioridade: newPrioridade })
                                      .eq('id', job.id)
                                  }}
                                />
                              </TableCell>
                              <TableCell className="w-[36px] p-0 text-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <span
                                          className={`focus:ring-primary mx-auto flex h-3 w-3 items-center justify-center rounded-full transition-colors focus:ring-2 focus:outline-none ${getAColor(job.id, allItems)}`}
                                          title="Tem AF's"
                                        />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Tem AF&apos;s
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
                                                `Tem certeza que deseja eliminar a Folha de Obra ${job.numero_fo}? Esta ação irá eliminar todos os itens e dados logísticos associados.`,
                                              )
                                            ) {
                                              return
                                            }

                                            try {
                                              // 1. Get all items for this job
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

                                                // 2. Delete logistics entries for these items
                                                await supabase
                                                  .from('logistica_entregas')
                                                  .delete()
                                                  .in('item_id', itemIds)

                                                // 3. Delete designer items
                                                await supabase
                                                  .from('designer_items')
                                                  .delete()
                                                  .in('item_id', itemIds)

                                                // 4. Delete items_base
                                                await supabase
                                                  .from('items_base')
                                                  .delete()
                                                  .in('id', itemIds)
                                              }

                                              // 5. Delete the job itself
                                              await supabase
                                                .from('folhas_obras')
                                                .delete()
                                                .eq('id', job.id)

                                              // 6. Update local state
                                              setJobs((prevJobs) =>
                                                prevJobs.filter(
                                                  (j) => j.id !== job.id,
                                                ),
                                              )
                                              setAllItems((prevItems) =>
                                                prevItems.filter(
                                                  (item) =>
                                                    item.folha_obra_id !==
                                                    job.id,
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
                          )
                        })}
                        {sorted.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={10}
                              className="py-8 text-center"
                            >
                              Nenhum trabalho com logística concluída
                              encontrado.
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
          </TabsContent>
        </Tabs>

        {/* drawer (single level) */}
        <Drawer
          open={!!openId}
          onOpenChange={(o) => !o && setOpenId(null)}
          shouldScaleBackground={false}
        >
          <DrawerContent
            className="!top-0 h-[98vh] max-h-[98vh] min-h-[98vh] !transform-none overflow-y-auto !filter-none !backdrop-filter-none will-change-auto"
            style={{
              transform: 'none',
              filter: 'none',
              backfaceVisibility: 'hidden',
              perspective: '1000px',
            }}
          >
            <DrawerHeader className="sr-only">
              <DrawerTitle>
                {openId && jobs.find((j) => j.id === openId)
                  ? `${jobs.find((j) => j.id === openId)?.concluido ? 'Trabalho' : 'Novo Trabalho'} (FO: ${jobs.find((j) => j.id === openId)?.numero_fo})`
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
                <JobDrawerContent
                  jobId={openId}
                  jobs={jobs}
                  items={allItems}
                  onClose={() => setOpenId(null)}
                  supabase={supabase}
                  setJobs={setJobs}
                  setAllItems={setAllItems}
                  fetchJobsSaiuStatus={fetchJobsSaiuStatus}
                />
              </Suspense>
            )}
          </DrawerContent>
        </Drawer>

        {/* Duplicate Warning Dialog */}
        <Dialog
          open={duplicateDialog.isOpen}
          onOpenChange={(open) => {
            if (!open) {
              if (duplicateDialog.onCancel) {
                duplicateDialog.onCancel()
              } else {
                setDuplicateDialog({
                  isOpen: false,
                  type: 'orc',
                  value: '',
                  currentJobId: '',
                })
              }
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {duplicateDialog.type === 'orc'
                  ? 'ORC Duplicado'
                  : 'FO Duplicada'}
              </DialogTitle>
              <DialogDescription>
                {duplicateDialog.type === 'orc'
                  ? `O número de ORC "${duplicateDialog.value}" já existe numa folha de obra.`
                  : `O número de FO "${duplicateDialog.value}" já existe.`}
              </DialogDescription>
            </DialogHeader>

            {duplicateDialog.existingJob && (
              <div className="my-4 rounded-md border border-orange-200 bg-orange-50 p-4">
                <h4 className="mb-2 font-semibold text-orange-800">
                  Trabalho Existente:
                </h4>
                <div className="space-y-1 text-sm text-orange-700">
                  <div>
                    <strong>FO:</strong> {duplicateDialog.existingJob.numero_fo}
                  </div>
                  <div>
                    <strong>ORC:</strong>{' '}
                    {duplicateDialog.existingJob.numero_orc || 'N/A'}
                  </div>
                  <div>
                    <strong>Campanha:</strong>{' '}
                    {duplicateDialog.existingJob.nome_campanha}
                  </div>
                  <div>
                    <strong>Cliente:</strong>{' '}
                    {duplicateDialog.existingJob.cliente || 'N/A'}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={duplicateDialog.onCancel}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={duplicateDialog.onConfirm}>
                Continuar Mesmo Assim
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  )
}

/* ---------- Drawer component ---------- */
interface JobDrawerProps {
  jobId: string
  jobs: Job[]
  items: Item[]
  onClose(): void
  supabase: any
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>
  setAllItems: React.Dispatch<React.SetStateAction<Item[]>>
  fetchJobsSaiuStatus: (jobIds: string[]) => Promise<void>
}

function JobDrawerContent({
  jobId,
  jobs,
  items,
  onClose,
  supabase,
  setJobs,
  setAllItems,
  fetchJobsSaiuStatus,
}: JobDrawerProps) {
  // Sorting state for drawer table - MUST be called before any early returns
  type SortKey =
    | 'bulk'
    | 'descricao'
    | 'codigo'
    | 'quantidade'
    | 'concluido'
    | 'acoes'
  const [sortCol, setSortCol] = useState<SortKey | ''>('') // Start with no sorting
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Logistica Tab State/Logic - MUST be called before any early returns
  const [logisticaRows, setLogisticaRows] = useState<any[]>([])
  const [logisticaLoading, setLogisticaLoading] = useState(false)
  const [sourceRowId, setSourceRowId] = useState<string | null>(null)
  const {
    clientes: logisticaClientes,
    transportadoras: logisticaTransportadoras,
    armazens: logisticaArmazens,
    fetchReferenceData,
    updateLogisticaField,
    updateFolhaObraField,
    updateItemBaseField,
    deleteLogisticaRow,
  } = useLogisticaData()

  // Find job and items AFTER all hooks are declared
  const job = jobs.find((j) => j.id === jobId)
  const jobItems = job ? items.filter((i) => i.folha_obra_id === jobId) : []

  console.log('🏭 Production items for job', jobId, ':', jobItems)
  console.log('🏭 All items available:', items.length)
  const toggleSort = (col: SortKey) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }
  const sortedItems = useMemo(() => {
    // Only sort if a sort column is explicitly set, otherwise return items in original order
    if (!sortCol) return jobItems

    const arr = [...jobItems]
    arr.sort((a, b) => {
      let A: any, B: any
      switch (sortCol) {
        case 'bulk':
          A = a.id
          B = b.id
          break
        case 'descricao':
          A = a.descricao
          B = b.descricao
          break
        case 'codigo':
          A = a.codigo || ''
          B = b.codigo || ''
          break
        case 'quantidade':
          A = a.quantidade ?? 0
          B = b.quantidade ?? 0
          break
        case 'concluido':
          A = a.concluido ?? false
          B = b.concluido ?? false
          break
        case 'acoes':
          A = a.id
          B = b.id
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
  }, [jobItems, sortCol, sortDir])

  // Fetch logistics records for job items
  const fetchLogisticaRows = async () => {
    setLogisticaLoading(true)
    console.log('🔍 Fetching logistics for job items:', jobItems)

    if (jobItems.length === 0) {
      console.log('📦 No job items, clearing logistics table')
      setLogisticaRows([])
      setLogisticaLoading(false)
      return
    }

    const itemIds = jobItems.map((item) => item.id)
    // 2. Fetch all logistics records for those items
    let logisticsData: any[] = []
    if (itemIds.length > 0) {
      const { data: logistics, error: logisticsError } = await supabase
        .from('logistica_entregas')
        .select(
          `
          *,
          items_base!inner (
            id,
            descricao,
            codigo,
            quantidade,
            brindes,
            folha_obra_id,
            folhas_obras!inner (
              id,
              numero_orc,
              numero_fo,
              cliente,
              id_cliente,
              saiu
            )
          )
        `,
        )
        .in('item_id', itemIds)
      if (!logisticsError && logistics) {
        console.log('Fetched logistics data:', logistics)
        logisticsData = logistics
      } else if (logisticsError) {
        console.error('Error fetching logistics:', logisticsError)
      }
    }
    // 3. Create rows: show all logistics records + items without logistics records
    const mergedRows: any[] = []

    // Add all existing logistics records
    logisticsData.forEach((logistics) => {
      mergedRows.push(logistics)
    })

    // Create logistics entries for job items that don't have them yet
    const itemsWithoutLogistics = jobItems.filter(
      (item) => !logisticsData.some((l) => l.item_id === item.id),
    )

    if (itemsWithoutLogistics.length > 0) {
      // Create logistics entries for all items without them
      const newLogisticsEntries = itemsWithoutLogistics.map((item) => ({
        item_id: item.id,
        descricao: item.descricao || '', // Store item description directly
        data: new Date().toISOString().split('T')[0],
        is_entrega: true,
      }))

      const { data: newLogisticsData, error: logisticsInsertError } =
        await supabase.from('logistica_entregas').insert(newLogisticsEntries)
          .select(`
          *,
          items_base!inner (
            id,
            descricao,
            codigo,
            quantidade,
            brindes,
            folha_obra_id,
            folhas_obras!inner (
              id,
              numero_orc,
              numero_fo,
              cliente,
              id_cliente,
              saiu
            )
          )
        `)

      if (logisticsInsertError) {
        console.error('Error creating logistics entries:', logisticsInsertError)
      } else if (newLogisticsData) {
        console.log('Created logistics entries:', newLogisticsData)
        // Add the newly created logistics entries to our data
        logisticsData.push(...newLogisticsData)
        mergedRows.push(...newLogisticsData)
      }
    }

    setLogisticaRows(mergedRows)

    // Auto-select the first row with complete delivery data as source
    if (!sourceRowId && mergedRows.length > 0) {
      const firstCompleteRow = mergedRows.find(
        (row) => row.local_recolha && row.local_entrega && row.transportadora,
      )
      if (firstCompleteRow?.id) {
        setSourceRowId(firstCompleteRow.id)
      }
    }

    setLogisticaLoading(false)
  }

  useEffect(() => {
    fetchReferenceData()
    fetchLogisticaRows()
  }, [jobItems.length]) // Run when job items change

  // Guard clause AFTER all hooks are called
  if (!job) {
    return (
      <div className="flex items-center justify-center p-6">
        <p>Job not found</p>
      </div>
    )
  }

  // --- Job Info Header ---
  return (
    <div className="relative space-y-6 p-6">
      {/* Close button - top right */}
      <Button
        size="icon"
        variant="outline"
        onClick={onClose}
        className="absolute top-6 right-6 z-10"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Job Info Header */}
      <div className="mb-6 p-4 uppercase">
        <div className="mb-2 flex items-center gap-8">
          <div>
            <div className="text-xs font-bold">ORC</div>
            <div className="font-mono">{job.numero_orc ?? '-'}</div>
          </div>
          <div>
            <div className="text-xs font-bold">FO</div>
            <div className="font-mono">{job.numero_fo}</div>
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold">Nome Campanha</div>
            <div className="truncate font-mono">{job.nome_campanha}</div>
          </div>
        </div>
      </div>
      {/* Tabs below job info */}
      <Tabs
        defaultValue="producao"
        className="w-full pl-4"
        onValueChange={async (value) => {
          if (value === 'logistica') {
            // Refresh logistics data when switching to logistics tab
            await fetchLogisticaRows()
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="producao">Produção</TabsTrigger>
          <TabsTrigger value="logistica">Logística</TabsTrigger>
        </TabsList>
        <TabsContent value="producao">
          {/* --- Existing Produção Drawer Content --- */}
          <div className="mt-6">
            {/* header & toolbar */}
            <div className="mb-6 flex items-start justify-between">
              <div className="p-0">
                <h2 className="text-lg font-semibold">
                  {job.concluido ? 'Trabalho' : 'Novo Trabalho'} (FO:{' '}
                  {job.numero_fo})
                </h2>
                <p className="text-muted-foreground text-sm">
                  Detalhes Produção Folha de Obra
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={async () => {
                    // 1. Create a new item in items_base
                    const { data: baseData, error: baseError } = await supabase
                      .from('items_base')
                      .insert({
                        folha_obra_id: job.id,
                        descricao: '',
                        codigo: '',
                      })
                      .select('*')
                      .single()
                    if (baseError || !baseData) {
                      // Optionally show an error message
                      return
                    }
                    // 2. Create a new designer_items row linked to the new item
                    const { error: designerError } = await supabase
                      .from('designer_items')
                      .insert({
                        item_id: baseData.id,
                        em_curso: true,
                        duvidas: false,
                        maquete_enviada: false,
                        paginacao: false,
                      })
                    if (designerError) {
                      // Optionally show an error message
                      return
                    }
                    // 3. Automatically create a logistics entry for this new item
                    await supabase.from('logistica_entregas').insert({
                      item_id: baseData.id,
                      descricao: baseData.descricao || '', // Store item description directly
                      data: new Date().toISOString().split('T')[0],
                      is_entrega: true,
                    })

                    // 4. Add the new item to global state
                    const newItem: Item = {
                      id: baseData.id,
                      folha_obra_id: baseData.folha_obra_id,
                      descricao: baseData.descricao ?? '',
                      codigo: baseData.codigo ?? '',
                      quantidade: baseData.quantidade ?? null,
                      paginacao: false, // from designer_items
                      brindes: baseData.brindes ?? false,
                      concluido: false, // new items start as not completed
                    }

                    console.log('🏭 Adding new item:', newItem)

                    // Update global allItems state
                    setAllItems((prev) => [...prev, newItem])

                    // 5. Refresh logistics data to show the new item
                    await fetchLogisticaRows()

                    console.log('✅ Item added successfully!')
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Item
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      // Refresh job data first
                      const { data: jobData, error: jobError } = await supabase
                        .from('folhas_obras')
                        .select(
                          `
                        id, numero_fo, numero_orc, nome_campanha, data_saida, 
                        prioridade, notas, concluido, saiu, fatura, created_at, 
                        cliente, id_cliente
                      `,
                        )
                        .eq('id', job.id)
                        .single()

                      if (!jobError && jobData) {
                        // Update job in parent state
                        setJobs((prevJobs) =>
                          prevJobs.map((j) =>
                            j.id === job.id ? (jobData as Job) : j,
                          ),
                        )
                      }

                      // Refresh items for this job from database
                      const { data: itemsData, error: itemsError } =
                        await supabase
                          .from('designer_items')
                          .select(
                            'item_id, paginacao, items_base(folha_obra_id, descricao, codigo, quantidade, brindes)',
                          )
                          .eq('items_base.folha_obra_id', job.id)

                      if (!itemsError && itemsData) {
                        const refreshedItems: Item[] = itemsData.map(
                          (d: any) => ({
                            id: d.item_id,
                            folha_obra_id: d.items_base?.folha_obra_id,
                            descricao: d.items_base?.descricao ?? '',
                            codigo: d.items_base?.codigo ?? '',
                            quantidade: d.items_base?.quantidade ?? null,
                            paginacao: d.paginacao,
                            brindes: d.items_base?.brindes ?? false,
                            concluido: false, // will be updated when logistics data is loaded
                          }),
                        )

                        // Update global state with fresh data from database
                        setAllItems((prev) => {
                          const filtered = prev.filter(
                            (item) => item.folha_obra_id !== job.id,
                          )
                          return [...filtered, ...refreshedItems]
                        })

                        // Refresh logistics data too
                        await fetchLogisticaRows()
                      }
                    } catch (error) {
                      console.error('Error refreshing production data:', error)
                      alert('Erro ao actualizar dados. Tente novamente.')
                    }
                  }}
                  title="Refresh data from database"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <div className="flex h-9 items-center">
                  <SimpleNotasPopover
                    value={job.notas ?? ''}
                    onSave={async (newNotas) => {
                      await supabase
                        .from('folhas_obras')
                        .update({ notas: newNotas })
                        .eq('id', job.id)
                      setJobs((prev: Job[]) =>
                        prev.map((j: Job) =>
                          j.id === job.id ? { ...j, notas: newNotas } : j,
                        ),
                      )
                    }}
                    placeholder="Adicionar notas..."
                    label="Notas"
                    buttonSize="icon"
                    className="h-9 w-9"
                    disabled={false}
                  />
                </div>
              </div>
            </div>
            {/* items table (unchanged from canvas) */}
            <div className="bg-background border-border mt-6 w-full rounded-none border-2">
              <div className="w-full rounded-none">
                <Table className="w-full border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                  <TableHeader>
                    <TableRow className="rounded-none">
                      <TableHead
                        className="border-border sticky top-0 z-10 w-10 cursor-pointer rounded-none border-b-2 bg-[var(--orange)] text-center font-bold uppercase select-none"
                        onClick={() => toggleSort('bulk')}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                B{' '}
                                {sortCol === 'bulk' &&
                                  (sortDir === 'asc' ? (
                                    <ArrowUp className="ml-1 inline h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 inline h-3 w-3" />
                                  ))}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Brindes</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 cursor-pointer rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => toggleSort('descricao')}
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
                        className="border-border sticky top-0 z-10 w-72 cursor-pointer rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => toggleSort('codigo')}
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
                        className="border-border sticky top-0 z-10 w-24 cursor-pointer rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => toggleSort('quantidade')}
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
                        className="border-border sticky top-0 z-10 w-[100px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] text-center font-bold uppercase select-none"
                        onClick={() => toggleSort('concluido')}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                Concluído{' '}
                                {sortCol === 'concluido' &&
                                  (sortDir === 'asc' ? (
                                    <ArrowUp className="ml-1 inline h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 inline h-3 w-3" />
                                  ))}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Estado de Conclusão</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>

                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] text-center font-bold uppercase select-none"
                        onClick={() => toggleSort('acoes')}
                      >
                        Ações{' '}
                        {sortCol === 'acoes' &&
                          (sortDir === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedItems.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={!!it.brindes}
                            onCheckedChange={async (checked) => {
                              const value =
                                checked === 'indeterminate' ? false : checked
                              // Update global state
                              setAllItems((prevItems) =>
                                prevItems.map((item) =>
                                  item.id === it.id
                                    ? { ...item, brindes: value }
                                    : item,
                                ),
                              )
                              // Persist to Supabase
                              await supabase
                                .from('items_base')
                                .update({ brindes: value })
                                .eq('id', it.id)
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={it.descricao}
                            onChange={(e) => {
                              const value = e.target.value
                              // Update global state
                              setAllItems((prevItems) =>
                                prevItems.map((item) =>
                                  item.id === it.id
                                    ? { ...item, descricao: value }
                                    : item,
                                ),
                              )
                            }}
                            onBlur={async (e) => {
                              const newDescricao = e.target.value
                              // Update items_base
                              await supabase
                                .from('items_base')
                                .update({ descricao: newDescricao })
                                .eq('id', it.id)
                              // Also update logistica_entregas with the same description
                              await supabase
                                .from('logistica_entregas')
                                .update({ descricao: newDescricao })
                                .eq('item_id', it.id)
                            }}
                            className="h-10 w-full rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                          />
                        </TableCell>
                        <TableCell className="w-72">
                          <Input
                            value={it.codigo ?? ''}
                            onChange={(e) => {
                              const value = e.target.value
                              // Update global state
                              setAllItems((prevItems) =>
                                prevItems.map((item) =>
                                  item.id === it.id
                                    ? { ...item, codigo: value }
                                    : item,
                                ),
                              )
                            }}
                            onBlur={async (e) => {
                              await supabase
                                .from('items_base')
                                .update({ codigo: e.target.value })
                                .eq('id', it.id)
                            }}
                            className="h-10 w-full rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="text"
                            value={it.quantidade ?? ''}
                            onChange={(e) => {
                              const value = e.target.value
                              const numValue =
                                value === '' ? null : Number(value)
                              // Update global state
                              setAllItems((prevItems) =>
                                prevItems.map((item) =>
                                  item.id === it.id
                                    ? { ...item, quantidade: numValue }
                                    : item,
                                ),
                              )
                            }}
                            onBlur={async (e) => {
                              await supabase
                                .from('items_base')
                                .update({
                                  quantidade:
                                    e.target.value === ''
                                      ? null
                                      : Number(e.target.value),
                                })
                                .eq('id', it.id)
                            }}
                            className="h-10 w-20 rounded-none border-0 text-right text-sm outline-0 focus:border-0 focus:ring-0"
                          />
                        </TableCell>

                        <TableCell className="text-center">
                          <Checkbox
                            checked={!!it.concluido}
                            onCheckedChange={async (checked) => {
                              const value =
                                checked === 'indeterminate' ? false : checked
                              const today = new Date()
                                .toISOString()
                                .split('T')[0]

                              // Update global state
                              setAllItems((prevItems) =>
                                prevItems.map((item) =>
                                  item.id === it.id
                                    ? { ...item, concluido: value }
                                    : item,
                                ),
                              )

                              // Update or create logistics entry
                              const { data: existingLogistics } = await supabase
                                .from('logistica_entregas')
                                .select('id')
                                .eq('item_id', it.id)
                                .single()

                              if (existingLogistics) {
                                // Update existing logistics entry
                                if (value) {
                                  // When checking, set both data_concluido and data_saida to today
                                  await supabase
                                    .from('logistica_entregas')
                                    .update({
                                      concluido: value,
                                      data_concluido: today,
                                      data_saida: today,
                                    })
                                    .eq('item_id', it.id)
                                } else {
                                  // When unchecking, clear both dates
                                  await supabase
                                    .from('logistica_entregas')
                                    .update({
                                      concluido: value,
                                      data_concluido: null,
                                      data_saida: null,
                                    })
                                    .eq('item_id', it.id)
                                }
                              } else {
                                // Create new logistics entry if it doesn't exist
                                await supabase
                                  .from('logistica_entregas')
                                  .insert({
                                    item_id: it.id,
                                    descricao: it.descricao || '',
                                    concluido: value,
                                    data_concluido: value ? today : null,
                                    data_saida: value ? today : null,
                                    data: today,
                                    is_entrega: true,
                                  })
                              }
                            }}
                          />
                        </TableCell>

                        <TableCell className="flex w-[120px] justify-center gap-2 pr-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="flex aspect-square size-10 items-center justify-center !p-0"
                                  onClick={async () => {
                                    // Duplicate item: insert into items_base, then designer_items, then refresh
                                    const { data: newBase, error: baseError } =
                                      await supabase
                                        .from('items_base')
                                        .insert({
                                          folha_obra_id: it.folha_obra_id,
                                          descricao: it.descricao,
                                          codigo: it.codigo,
                                          quantidade: it.quantidade,
                                          brindes: it.brindes,
                                        })
                                        .select('*')
                                        .single()
                                    if (baseError || !newBase) return
                                    await supabase
                                      .from('designer_items')
                                      .insert({
                                        item_id: newBase.id,
                                        em_curso: true,
                                        duvidas: false,
                                        maquete_enviada: false,
                                        paginacao: it.paginacao || false,
                                      })

                                    // Create logistics entry for the duplicated item
                                    await supabase
                                      .from('logistica_entregas')
                                      .insert({
                                        item_id: newBase.id,
                                        descricao: newBase.descricao || '', // Store item description directly
                                        data: new Date()
                                          .toISOString()
                                          .split('T')[0],
                                        is_entrega: true,
                                      })

                                    // Add duplicated item to global state
                                    const duplicatedItem: Item = {
                                      id: newBase.id,
                                      folha_obra_id: newBase.folha_obra_id,
                                      descricao: newBase.descricao ?? '',
                                      codigo: newBase.codigo ?? '',
                                      quantidade: newBase.quantidade ?? null,
                                      paginacao: it.paginacao || false,
                                      brindes: newBase.brindes ?? false,
                                      concluido: false, // duplicated items start as not completed
                                    }

                                    // Update global state
                                    setAllItems((prev) => [
                                      ...prev,
                                      duplicatedItem,
                                    ])

                                    // Refresh logistics data
                                    await fetchLogisticaRows()
                                  }}
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
                                  variant="destructive"
                                  className="flex aspect-square size-10 items-center justify-center !p-0"
                                  onClick={async () => {
                                    // Delete item: remove from logistics, designer_items, then items_base
                                    await supabase
                                      .from('logistica_entregas')
                                      .delete()
                                      .eq('item_id', it.id)
                                    await supabase
                                      .from('designer_items')
                                      .delete()
                                      .eq('item_id', it.id)
                                    await supabase
                                      .from('items_base')
                                      .delete()
                                      .eq('id', it.id)

                                    // Remove from global state
                                    setAllItems((prev) =>
                                      prev.filter((item) => item.id !== it.id),
                                    )

                                    // Refresh logistics data
                                    await fetchLogisticaRows()
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                    {jobItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-6 text-center">
                          Sem items.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="logistica">
          <div className="mt-6">
            <div className="mb-6 flex items-start justify-between">
              <div className="p-0">
                <h2 className="text-xl font-bold">
                  Listagem Recolhas Entregas
                </h2>
                <p className="text-muted-foreground text-sm">
                  Listagem de recolhas e entregas para esta folha de obra.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={logisticaLoading}
                  onClick={async () => {
                    try {
                      setLogisticaLoading(true)

                      // 1. Create a new item in items_base
                      const { data: baseData, error: baseError } =
                        await supabase
                          .from('items_base')
                          .insert({
                            folha_obra_id: job.id,
                            descricao: 'Novo Item',
                            codigo: '',
                            quantidade: 1,
                          })
                          .select('*')
                          .single()

                      if (baseError) {
                        console.error('Error creating item:', baseError)
                        alert(`Erro ao criar item: ${baseError.message}`)
                        setLogisticaLoading(false)
                        return
                      }

                      if (!baseData) {
                        alert('Erro: Nenhum dado retornado ao criar item')
                        setLogisticaLoading(false)
                        return
                      }

                      // 2. Create a new designer_items row linked to the new item
                      const { error: designerError } = await supabase
                        .from('designer_items')
                        .insert({
                          item_id: baseData.id,
                          em_curso: true,
                          duvidas: false,
                          maquete_enviada: false,
                          paginacao: false,
                        })

                      if (designerError) {
                        console.error(
                          'Error creating designer item:',
                          designerError,
                        )
                        alert(
                          `Erro ao criar entrada de design: ${designerError.message}`,
                        )
                        setLogisticaLoading(false)
                        return
                      }

                      // 3. Automatically create a logistics entry for this new item
                      const { error: logisticsError } = await supabase
                        .from('logistica_entregas')
                        .insert({
                          item_id: baseData.id,
                          descricao: baseData.descricao || 'Novo Item',
                          data: new Date().toISOString().split('T')[0],
                          is_entrega: true,
                          concluido: false,
                        })

                      if (logisticsError) {
                        console.error(
                          'Error creating logistics entry:',
                          logisticsError,
                        )
                        alert(
                          `Erro ao criar entrada de logística: ${logisticsError.message}`,
                        )
                        setLogisticaLoading(false)
                        return
                      }

                      // 4. Update local items state
                      const newItem = {
                        id: baseData.id,
                        folha_obra_id: baseData.folha_obra_id,
                        descricao: baseData.descricao,
                        codigo: baseData.codigo,
                        quantidade: baseData.quantidade,
                        brindes: baseData.brindes,
                        paginacao: false,
                        concluido: false,
                      }
                      setAllItems((prevItems) => [...prevItems, newItem])

                      // 5. Refresh logistica data to include the new item
                      await fetchLogisticaRows()

                      alert('Item adicionado com sucesso!')
                    } catch (error) {
                      console.error('Unexpected error adding item:', error)
                      alert(`Erro inesperado: ${error}`)
                    } finally {
                      setLogisticaLoading(false)
                    }
                  }}
                >
                  {logisticaLoading ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Item
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    // Copy original item quantities to logistica_entregas
                    if (logisticaRows.length === 0) {
                      alert('Não há itens na tabela de logística.')
                      return
                    }

                    const confirmed = confirm(
                      'Copiar quantidades originais dos itens para a tabela de logística? Isto irá substituir as quantidades existentes.',
                    )
                    if (!confirmed) return

                    try {
                      // Get original quantities from items_base for all items in this FO
                      const { data: itemsData, error: itemsError } =
                        await supabase
                          .from('items_base')
                          .select('id, quantidade')
                          .eq('folha_obra_id', job.id)

                      if (itemsError || !itemsData) {
                        alert('Erro ao buscar quantidades dos itens.')
                        return
                      }

                      // Create a map of item_id -> quantidade
                      const quantityMap = new Map(
                        itemsData.map((item: any) => [
                          item.id,
                          item.quantidade,
                        ]),
                      )

                      // Update all logistica_entregas records with original quantities
                      const updatePromises = logisticaRows
                        .filter(
                          (row) => row.item_id && quantityMap.has(row.item_id),
                        )
                        .map((row) => {
                          const originalQuantity = quantityMap.get(row.item_id)
                          return supabase
                            .from('logistica_entregas')
                            .update({ quantidade: originalQuantity })
                            .eq('id', row.id)
                        })

                      await Promise.all(updatePromises)

                      // Refresh logistica data to show the updates
                      await fetchLogisticaRows()

                      alert('Quantidades copiadas com sucesso!')
                    } catch (error) {
                      console.error('Error copying quantities:', error)
                      alert('Erro ao copiar quantidades. Tente novamente.')
                    }
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copiar Quantidades
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    // Refresh logistics data
                    await fetchLogisticaRows()
                  }}
                  title="Refresh logistics data"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button
                  size="sm"
                  variant={sourceRowId ? 'default' : 'outline'}
                  disabled={!sourceRowId}
                  title={
                    !sourceRowId
                      ? 'Selecione uma linha como fonte primeiro'
                      : `Copiar dados da linha selecionada para todas as outras`
                  }
                  onClick={async () => {
                    if (logisticaRows.length < 2) {
                      alert(
                        'É necessário pelo menos 2 itens para copiar a entrega.',
                      )
                      return
                    }

                    if (!sourceRowId) {
                      alert(
                        'Por favor, selecione uma linha como fonte clicando no botão de rádio na coluna "Fonte".',
                      )
                      return
                    }

                    // Find the source record
                    const sourceRecord = logisticaRows.find(
                      (r) => r.id === sourceRowId,
                    )
                    if (!sourceRecord) {
                      alert('Linha fonte não encontrada.')
                      return
                    }

                    // Extract delivery information from the source record
                    const deliveryInfo = {
                      local_recolha: sourceRecord.local_recolha || undefined,
                      transportadora: sourceRecord.transportadora || undefined,
                      contacto: sourceRecord.contacto || undefined,
                      telefone: sourceRecord.telefone || undefined,
                      local_entrega: sourceRecord.local_entrega || undefined,
                      contacto_entrega:
                        sourceRecord.contacto_entrega || undefined,
                      telefone_entrega:
                        sourceRecord.telefone_entrega || undefined,
                      notas: sourceRecord.notas || undefined, // Include popover notes
                      data:
                        sourceRecord.data ||
                        new Date().toISOString().split('T')[0],
                      is_recolha: sourceRecord.is_recolha || false,
                      is_entrega: sourceRecord.is_entrega !== false, // default to true
                      id_local_entrega: sourceRecord.id_local_entrega,
                      id_local_recolha: sourceRecord.id_local_recolha,
                    }

                    // Show confirmation with details
                    const confirmed = confirm(
                      `Copiar dados da linha "${sourceRecord.items_base?.descricao || 'Sem descrição'}" para todas as outras linhas?`,
                    )

                    if (!confirmed) return

                    // Update all other logistics records (skip the source one)
                    const updatePromises = logisticaRows
                      .filter((record) => record.id !== sourceRowId)
                      .map(async (record) => {
                        if (record.id) {
                          // Update existing logistics record
                          return supabase
                            .from('logistica_entregas')
                            .update(deliveryInfo)
                            .eq('id', record.id)
                        } else if (record.item_id) {
                          // Create new logistics record for items without one
                          return supabase.from('logistica_entregas').insert({
                            item_id: record.item_id,
                            ...deliveryInfo,
                          })
                        }
                      })

                    try {
                      await Promise.all(updatePromises.filter(Boolean))
                      // Refresh logistica data to show the updates
                      await fetchLogisticaRows()

                      // Update local state to reflect the changes in comboboxes
                      setLogisticaRows((prevRows) =>
                        prevRows.map((record) => {
                          if (record.id !== sourceRowId) {
                            return { ...record, ...deliveryInfo }
                          }
                          return record
                        }),
                      )

                      alert('Informações de entrega copiadas com sucesso!')
                    } catch (error) {
                      console.error(
                        'Error copying delivery information:',
                        error,
                      )
                      alert(
                        'Erro ao copiar informações de entrega. Tente novamente.',
                      )
                    }
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Entrega
                  {sourceRowId && (
                    <span className="bg-primary/20 ml-2 rounded px-2 py-1 text-xs">
                      Fonte:{' '}
                      {logisticaRows.find((r) => r.id === sourceRowId)
                        ?.items_base?.descricao || 'Selecionada'}
                    </span>
                  )}
                </Button>
              </div>
            </div>
            {logisticaLoading ? (
              <div className="mt-6 flex h-40 items-center justify-center">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="bg-background border-border mt-6 w-full rounded-none border-2">
                <div className="w-full rounded-none">
                  <LogisticaTableWithCreatable
                    records={logisticaRows}
                    clientes={logisticaClientes || []}
                    transportadoras={logisticaTransportadoras || []}
                    armazens={logisticaArmazens || []}
                    hideColumns={['cliente', 'saiu']}
                    showSourceSelection={true}
                    sourceRowId={sourceRowId}
                    onSourceRowChange={setSourceRowId}
                    onItemSave={async (row: any, value) => {
                      // Update ONLY the logistics entry description, NOT the original item description
                      if (row.id) {
                        // Update existing logistics record
                        await updateLogisticaField(
                          row.id,
                          'descricao',
                          value,
                          null,
                        )
                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === row.id ? { ...r, descricao: value } : r,
                          ),
                        )
                      } else if (row.item_id) {
                        // Create new logistics record with description
                        const { data, error } = await supabase
                          .from('logistica_entregas')
                          .insert({
                            item_id: row.item_id,
                            descricao: value,
                            data: new Date().toISOString().split('T')[0],
                            is_entrega: true,
                          })
                          .select(
                            `
                              *,
                              items_base!inner (
                                id,
                                descricao,
                                codigo,
                                quantidade,
                                brindes,
                                folha_obra_id,
                                folhas_obras!inner (
                                  id,
                                  numero_orc,
                                  numero_fo,
                                  cliente,
                                  id_cliente,
                                  saiu
                                )
                              )
                            `,
                          )
                          .single()
                        if (!error && data) {
                          setLogisticaRows((prevRows) =>
                            prevRows.map((r) =>
                              r.item_id === row.item_id && !r.id ? data : r,
                            ),
                          )
                        }
                      }
                    }}
                    onConcluidoSave={async (row: any, value) => {
                      const today = new Date().toISOString().split('T')[0]

                      if (!row.id && row.item_id) {
                        // When creating a new entry
                        const { data, error } = await supabase
                          .from('logistica_entregas')
                          .insert({
                            item_id: row.item_id,
                            concluido: value,
                            data_concluido: value ? today : null,
                            data_saida: value ? today : null,
                            data: today,
                            is_entrega: true,
                          })
                          .select(
                            `
                              *,
                              items_base!inner (
                                id,
                                descricao,
                                codigo,
                                quantidade,
                                brindes,
                                folha_obra_id,
                                folhas_obras!inner (
                                  id,
                                  numero_orc,
                                  numero_fo,
                                  cliente,
                                  id_cliente,
                                  saiu
                                )
                              )
                            `,
                          )
                          .single()
                        if (!error && data) {
                          // Update local state instead of refetching
                          setLogisticaRows((prevRows) =>
                            prevRows.map((r) =>
                              r.item_id === row.item_id && !r.id ? data : r,
                            ),
                          )
                        }
                      } else if (row.id) {
                        if (value) {
                          // When checking concluido, always set both dates to today
                          await Promise.all([
                            updateLogisticaField(
                              row.id,
                              'concluido',
                              value,
                              null,
                            ),
                            updateLogisticaField(
                              row.id,
                              'data_concluido',
                              today,
                              null,
                            ),
                            updateLogisticaField(
                              row.id,
                              'data_saida',
                              today,
                              null,
                            ),
                          ])

                          // Update local state
                          setLogisticaRows((prevRows) =>
                            prevRows.map((r) =>
                              r.id === row.id
                                ? {
                                    ...r,
                                    concluido: value,
                                    data_concluido: today,
                                    data_saida: today,
                                  }
                                : r,
                            ),
                          )
                        } else {
                          // When unchecking concluido, clear both dates
                          await Promise.all([
                            updateLogisticaField(
                              row.id,
                              'concluido',
                              value,
                              null,
                            ),
                            updateLogisticaField(
                              row.id,
                              'data_concluido',
                              null,
                              null,
                            ),
                            updateLogisticaField(
                              row.id,
                              'data_saida',
                              null,
                              null,
                            ),
                          ])

                          // Update local state
                          setLogisticaRows((prevRows) =>
                            prevRows.map((r) =>
                              r.id === row.id
                                ? {
                                    ...r,
                                    concluido: value,
                                    data_concluido: null,
                                    data_saida: null,
                                  }
                                : r,
                            ),
                          )
                        }
                      }
                    }}
                    onDataConcluidoSave={async (row: any, value) => {
                      if (!row.id && row.item_id) {
                        const { data, error } = await supabase
                          .from('logistica_entregas')
                          .insert({
                            item_id: row.item_id,
                            data_concluido: value,
                            data_saida: value, // Automatically set data_saida to the same date
                            data: new Date().toISOString().split('T')[0],
                            is_entrega: true,
                          })
                          .select(
                            `
                              *,
                              items_base!inner (
                                id,
                                descricao,
                                codigo,
                                quantidade,
                                brindes,
                                folha_obra_id,
                                folhas_obras!inner (
                                  id,
                                  numero_orc,
                                  numero_fo,
                                  cliente,
                                  id_cliente,
                                  saiu
                                )
                              )
                            `,
                          )
                          .single()
                        if (!error && data) {
                          // Update local state instead of refetching
                          setLogisticaRows((prevRows) =>
                            prevRows.map((r) =>
                              r.item_id === row.item_id && !r.id ? data : r,
                            ),
                          )
                        }
                      } else if (row.id) {
                        // Update both data_concluido and data_saida fields
                        await Promise.all([
                          updateLogisticaField(
                            row.id,
                            'data_concluido',
                            value,
                            null,
                          ),
                          updateLogisticaField(
                            row.id,
                            'data_saida',
                            value,
                            null,
                          ),
                        ])
                        // Update local state instead of refetching
                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === row.id
                              ? {
                                  ...r,
                                  data_concluido: value,
                                  data_saida: value,
                                }
                              : r,
                          ),
                        )
                      }
                    }}
                    onSaiuSave={async (row: any, value) => {
                      if (!row.id && row.item_id) {
                        const { data, error } = await supabase
                          .from('logistica_entregas')
                          .insert({
                            item_id: row.item_id,
                            saiu: value,
                            data: new Date().toISOString().split('T')[0],
                            is_entrega: true,
                          })
                          .select(
                            `
                              *,
                              items_base!inner (
                                id,
                                descricao,
                                codigo,
                                quantidade,
                                brindes,
                                folha_obra_id,
                                folhas_obras!inner (
                                  id,
                                  numero_orc,
                                  numero_fo,
                                  cliente,
                                  id_cliente,
                                  saiu
                                )
                              )
                            `,
                          )
                          .single()
                        if (!error && data) {
                          // Update local state instead of refetching
                          setLogisticaRows((prevRows) =>
                            prevRows.map((r) =>
                              r.item_id === row.item_id && !r.id ? data : r,
                            ),
                          )
                          // Refresh saiu status for this job
                          await fetchJobsSaiuStatus([job.id])
                        }
                      } else if (row.id) {
                        await updateLogisticaField(row.id, 'saiu', value, null)
                        // Update local state instead of refetching
                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === row.id ? { ...r, saiu: value } : r,
                          ),
                        )
                        // Refresh saiu status for this job
                        await fetchJobsSaiuStatus([job.id])
                      }
                    }}
                    onGuiaSave={async (row: any, value) => {
                      if (!row.id && row.item_id) {
                        const { data, error } = await supabase
                          .from('logistica_entregas')
                          .insert({
                            item_id: row.item_id,
                            guia: value,
                            data: new Date().toISOString().split('T')[0],
                            is_entrega: true,
                          })
                          .select(
                            `
                              *,
                              items_base!inner (
                                id,
                                descricao,
                                codigo,
                                quantidade,
                                brindes,
                                folha_obra_id,
                                folhas_obras!inner (
                                  id,
                                  numero_orc,
                                  numero_fo,
                                  cliente,
                                  id_cliente,
                                  saiu
                                )
                              )
                            `,
                          )
                          .single()
                        if (!error && data) {
                          // Update local state instead of refetching
                          setLogisticaRows((prevRows) =>
                            prevRows.map((r) =>
                              r.item_id === row.item_id && !r.id ? data : r,
                            ),
                          )
                        }
                      } else if (row.id) {
                        await updateLogisticaField(row.id, 'guia', value, null)
                        // Update local state instead of refetching
                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === row.id ? { ...r, guia: value } : r,
                          ),
                        )
                      }
                    }}
                    onBrindesSave={async (row, value) => {
                      if (row.items_base?.id) {
                        // Defensive: Only update if value is not undefined/null
                        if (value !== undefined && value !== null) {
                          await updateItemBaseField(
                            row.items_base.id,
                            'brindes',
                            value,
                            null,
                          )
                          setLogisticaRows((prevRows) =>
                            prevRows.map((r) =>
                              r.items_base?.id === row.items_base?.id
                                ? {
                                    ...r,
                                    items_base: {
                                      ...r.items_base,
                                      brindes: value,
                                    },
                                  }
                                : r,
                            ),
                          )
                        } else {
                          console.warn(
                            'Attempted to update items_base.brindes with empty value, skipping.',
                          )
                        }
                      }
                    }}
                    onClienteChange={async (row, value) => {
                      if (row.items_base?.folhas_obras?.id) {
                        await updateFolhaObraField(
                          row.items_base.folhas_obras.id,
                          'id_cliente',
                          value,
                          null,
                        )
                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.items_base?.folhas_obras?.id ===
                            row.items_base?.folhas_obras?.id
                              ? {
                                  ...r,
                                  items_base: {
                                    ...r.items_base,
                                    folhas_obras: {
                                      ...r.items_base.folhas_obras,
                                      id_cliente: value,
                                    },
                                  },
                                }
                              : r,
                          ),
                        )
                      }
                    }}
                    onRecolhaChange={async (rowId, value) => {
                      if (rowId) {
                        const armazem = logisticaArmazens?.find(
                          (a: any) => a.value === value,
                        )
                        const armazemName = armazem ? armazem.label : ''
                        await Promise.all([
                          updateLogisticaField(
                            rowId,
                            'id_local_recolha',
                            value,
                            null,
                          ),
                          updateLogisticaField(
                            rowId,
                            'local_recolha',
                            armazemName,
                            null,
                          ),
                        ])
                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === rowId
                              ? {
                                  ...r,
                                  id_local_recolha: value,
                                  local_recolha: armazemName,
                                }
                              : r,
                          ),
                        )
                      } else {
                        console.error('No rowId provided for onRecolhaChange')
                      }
                    }}
                    onEntregaChange={async (rowId, value) => {
                      if (rowId) {
                        const armazem = logisticaArmazens?.find(
                          (a: any) => a.value === value,
                        )
                        const armazemName = armazem ? armazem.label : ''
                        await Promise.all([
                          updateLogisticaField(
                            rowId,
                            'id_local_entrega',
                            value,
                            null,
                          ),
                          updateLogisticaField(
                            rowId,
                            'local_entrega',
                            armazemName,
                            null,
                          ),
                        ])
                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === rowId
                              ? {
                                  ...r,
                                  id_local_entrega: value,
                                  local_entrega: armazemName,
                                }
                              : r,
                          ),
                        )
                      } else {
                        console.error('No rowId provided for onEntregaChange')
                      }
                    }}
                    onTransportadoraChange={async (row: any, value) => {
                      if (!row.id && row.item_id) {
                        const { data, error } = await supabase
                          .from('logistica_entregas')
                          .insert({
                            item_id: row.item_id,
                            transportadora: value,
                            data: new Date().toISOString().split('T')[0],
                            is_entrega: true,
                          })
                          .select(
                            `
                              *,
                              items_base!inner (
                                id,
                                descricao,
                                codigo,
                                quantidade,
                                brindes,
                                folha_obra_id,
                                folhas_obras!inner (
                                  id,
                                  numero_orc,
                                  numero_fo,
                                  cliente,
                                  id_cliente,
                                  saiu
                                )
                              )
                            `,
                          )
                          .single()
                        if (!error && data) {
                          // Update local state instead of refetching
                          setLogisticaRows((prevRows) =>
                            prevRows.map((r) =>
                              r.item_id === row.item_id && !r.id ? data : r,
                            ),
                          )
                        }
                      } else if (row.id) {
                        await updateLogisticaField(
                          row.id,
                          'transportadora',
                          value,
                          null,
                        )
                        // Update local state instead of refetching
                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === row.id
                              ? { ...r, transportadora: value }
                              : r,
                          ),
                        )
                      }
                    }}
                    onQuantidadeSave={async (row: any, value) => {
                      // If row doesn't have an id, we need to create the logistics record first
                      if (!row.id && row.item_id) {
                        const { data, error } = await supabase
                          .from('logistica_entregas')
                          .insert({
                            item_id: row.item_id,
                            descricao: row.items_base?.descricao || '', // Store item description directly
                            quantidade: value,
                            data: new Date().toISOString().split('T')[0],
                            is_entrega: true,
                          })
                          .select(
                            `
                              *,
                              items_base!inner (
                                id,
                                descricao,
                                codigo,
                                quantidade,
                                brindes,
                                folha_obra_id,
                                folhas_obras!inner (
                                  id,
                                  numero_orc,
                                  numero_fo,
                                  cliente,
                                  id_cliente,
                                  saiu
                                )
                              )
                            `,
                          )
                          .single()

                        if (!error && data) {
                          // Update local state instead of refetching
                          setLogisticaRows((prevRows) =>
                            prevRows.map((r) =>
                              r.item_id === row.item_id && !r.id ? data : r,
                            ),
                          )
                        }
                      } else if (row.id) {
                        // Update existing record
                        await updateLogisticaField(
                          row.id,
                          'quantidade',
                          value,
                          null,
                        )
                        // Update local state instead of refetching
                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === row.id ? { ...r, quantidade: value } : r,
                          ),
                        )
                      }
                    }}
                    onDuplicateRow={async (row: any) => {
                      // Defensive: ensure we have a valid item_id
                      const itemId = row.item_id || row.items_base?.id
                      if (!itemId) {
                        alert('Não foi possível duplicar: item_id em falta.')
                        return
                      }

                      // Count existing logistics entries for this item to generate a unique suffix
                      const existingEntriesForItem = logisticaRows.filter(
                        (r) => (r.item_id || r.items_base?.id) === itemId,
                      )
                      const copyNumber = existingEntriesForItem.length

                      // Create a differentiated description for the duplicate
                      const originalDescription =
                        row.items_base?.descricao || ''
                      const duplicatedDescription = `${originalDescription} - Entrega ${copyNumber + 1}`

                      // Defensive: copy all relevant fields, fallback to empty or null if missing
                      const payload = {
                        item_id: itemId,
                        descricao: duplicatedDescription, // Use the differentiated description
                        local_recolha: row.local_recolha || '',
                        guia: row.guia || '',
                        transportadora: row.transportadora || '',
                        contacto: row.contacto || '',
                        telefone: row.telefone || '',
                        quantidade: row.quantidade ?? null,
                        notas: row.notas || '',
                        local_entrega: row.local_entrega || '',
                        contacto_entrega: row.contacto_entrega || '',
                        telefone_entrega: row.telefone_entrega || '',
                        data:
                          row.data || new Date().toISOString().split('T')[0],
                        id_local_entrega: row.id_local_entrega || null,
                        id_local_recolha: row.id_local_recolha || null,
                        is_entrega: true,
                      }
                      // Insert and fetch with joins
                      const { data: newLogisticsEntry, error } = await supabase
                        .from('logistica_entregas')
                        .insert(payload)
                        .select(
                          `
                            *,
                            items_base!inner (
                              id,
                              descricao,
                              codigo,
                              quantidade,
                              brindes,
                              folha_obra_id,
                              folhas_obras!inner (
                                id,
                                numero_orc,
                                numero_fo,
                                cliente,
                                id_cliente,
                                saiu
                              )
                            )
                          `,
                        )
                        .single()
                      if (error || !newLogisticsEntry) {
                        alert('Erro ao duplicar entrega. Tente novamente.')
                        await fetchLogisticaRows()
                        return
                      }
                      setLogisticaRows((prevRows) => [
                        ...prevRows,
                        newLogisticsEntry,
                      ])
                    }}
                    onNotasSave={async (
                      row: any,
                      outras: string,
                      contacto?: string,
                      telefone?: string,
                      contacto_entrega?: string,
                      telefone_entrega?: string,
                      data?: string | null,
                    ) => {
                      if (!row.id && row.item_id) {
                        const { data: newData, error } = await supabase
                          .from('logistica_entregas')
                          .insert({
                            item_id: row.item_id,
                            notas: outras,
                            contacto: contacto || undefined,
                            telefone: telefone || undefined,
                            contacto_entrega: contacto_entrega || undefined,
                            telefone_entrega: telefone_entrega || undefined,
                            data:
                              data || new Date().toISOString().split('T')[0],
                            is_entrega: true,
                          })
                          .select(
                            `
                              *,
                              items_base!inner (
                                id,
                                descricao,
                                codigo,
                                quantidade,
                                brindes,
                                folha_obra_id,
                                folhas_obras!inner (
                                  id,
                                  numero_orc,
                                  numero_fo,
                                  cliente,
                                  id_cliente,
                                  saiu
                                )
                              )
                            `,
                          )
                          .single()
                        if (!error && newData) {
                          // Update local state instead of refetching
                          setLogisticaRows((prevRows) =>
                            prevRows.map((r) =>
                              r.item_id === row.item_id && !r.id ? newData : r,
                            ),
                          )
                        }
                      } else if (row.id) {
                        // Update all fields
                        await Promise.all([
                          updateLogisticaField(row.id, 'notas', outras, null),
                          updateLogisticaField(
                            row.id,
                            'contacto',
                            contacto || undefined,
                            null,
                          ),
                          updateLogisticaField(
                            row.id,
                            'telefone',
                            telefone || undefined,
                            null,
                          ),
                          updateLogisticaField(
                            row.id,
                            'contacto_entrega',
                            contacto_entrega || undefined,
                            null,
                          ),
                          updateLogisticaField(
                            row.id,
                            'telefone_entrega',
                            telefone_entrega || undefined,
                            null,
                          ),
                          updateLogisticaField(
                            row.id,
                            'data',
                            data || row.data,
                            null,
                          ),
                        ])
                        // Update local state instead of refetching
                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === row.id
                              ? {
                                  ...r,
                                  notas: outras,
                                  contacto: contacto || undefined,
                                  telefone: telefone || undefined,
                                  contacto_entrega:
                                    contacto_entrega || undefined,
                                  telefone_entrega:
                                    telefone_entrega || undefined,
                                  data: data || row.data,
                                }
                              : r,
                          ),
                        )
                      }
                    }}
                    onDeleteRow={async (rowId) => {
                      try {
                        // Find the row to be deleted
                        const rowToDelete = logisticaRows.find(
                          (row) => row.id === rowId,
                        )
                        if (!rowToDelete) {
                          alert('Linha não encontrada.')
                          return
                        }

                        // Check how many logistics entries exist for the same item
                        const itemId =
                          rowToDelete.item_id || rowToDelete.items_base?.id
                        const entriesForSameItem = logisticaRows.filter(
                          (row) =>
                            (row.item_id || row.items_base?.id) === itemId,
                        )

                        // If this is the only entry for this item, prevent deletion
                        if (entriesForSameItem.length <= 1) {
                          alert(
                            'Não pode eliminar esta entrega, pois não existe outra para o item',
                          )
                          return
                        }

                        // Proceed with deletion if there are other entries for the same item
                        await deleteLogisticaRow(rowId, null)
                        // Remove the deleted row from local state
                        setLogisticaRows((prevRows) =>
                          prevRows.filter((row) => row.id !== rowId),
                        )
                        // Refresh saiu status for this job
                        await fetchJobsSaiuStatus([job.id])
                      } catch (error) {
                        console.error('Error deleting logistics row:', error)
                        // Optionally show user feedback
                        alert('Erro ao eliminar linha. Tente novamente.')
                      }
                    }}
                    onArmazensUpdate={async (newArmazens) => {
                      // Refresh reference data to get the updated armazens list
                      await fetchReferenceData()
                    }}
                    onTransportadorasUpdate={async (newTransportadoras) => {
                      // Refresh reference data to get the updated transportadoras list
                      await fetchReferenceData()
                    }}
                    tableDate={job.numero_fo || ''}
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

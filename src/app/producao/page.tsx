'use client'

/**
 * Producao – full refactor (single-drawer, production-parity UI)
 * --------------------------------------------------------------
 * Optimized version with improved queries and loading states
 * NO caching - preserves real-time data accuracy
 *
 * FILTERING RULES:
 * - Only shows jobs that have ORC (numero_orc) values
 * - Jobs missing ORC are filtered out on both tabs
 * - FO (numero_fo) values are optional and not required for display
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
  operacoes: boolean
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

/**
 * Format date to Portuguese short format (DD/MM/YY)
 */
function formatDatePortuguese(dateString: string | null | undefined): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return format(date, 'dd/MM/yy')
  } catch {
    return ''
  }
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

const getAColor = (
  jobId: string,
  items: Item[],
  designerItems: any[],
): string => {
  // Get all items for this job
  const jobItems = items.filter((item) => item.folha_obra_id === jobId)
  if (jobItems.length === 0) return 'bg-red-600' // No items = red

  // Get designer items for these job items
  const jobItemIds = jobItems.map((item) => item.id)
  const jobDesignerItems = designerItems.filter((designer) =>
    jobItemIds.includes(designer.item_id),
  )

  if (jobDesignerItems.length === 0) return 'bg-red-600' // No designer items = red

  // Check paginacao status
  const completedCount = jobDesignerItems.filter(
    (designer) => designer.paginacao === true,
  ).length
  const totalCount = jobDesignerItems.length

  if (completedCount === 0) return 'bg-red-600' // None completed = red
  if (completedCount === totalCount) return 'bg-green-600' // All completed = green
  return 'bg-orange-500' // Some completed = orange
}

const getCColor = (jobId: string, operacoes: any[]): string => {
  const jobOperacoes = operacoes.filter((op) => op.folha_obra_id === jobId)
  if (jobOperacoes.length === 0) return 'bg-red-600'
  return jobOperacoes.some((op) => op.concluido) ? 'bg-green-600' : 'bg-red-600'
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
  const [allOperacoes, setAllOperacoes] = useState<any[]>([])
  const [allDesignerItems, setAllDesignerItems] = useState<any[]>([])
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
    operacoes: true,
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

  // Debug: Track when codeF and debounced value changes
  useEffect(() => {
    console.log(
      '🔤 codeF state changed to:',
      `"${codeF}"`,
      'length:',
      codeF.length,
    )
    // Log stack trace to see what's causing the change
    if (codeF === '' && debouncedCodeF !== '') {
      console.warn(
        '⚠️ CodeF was unexpectedly cleared! Previous value was:',
        debouncedCodeF,
      )
      console.trace('Stack trace for codeF clear:')
    }
  }, [codeF, debouncedCodeF])

  useEffect(() => {
    console.log(
      '⏱️ debouncedCodeF changed to:',
      `"${debouncedCodeF}"`,
      'length:',
      debouncedCodeF.length,
    )
  }, [debouncedCodeF])
  const debouncedClientF = useDebounce(clientF, 300)

  /* sorting */
  type SortableJobKey =
    | 'created_at'
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
    | 'corte'
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

        // STEP 1: Handle item/codigo filters FIRST (search globally)
        let jobIds: string[] | null = null
        const itemFiltersActive = !!(
          filters.itemF?.trim() || filters.codeF?.trim()
        )

        if (itemFiltersActive) {
          console.log(
            '🔍 Item/codigo filter detected - searching ALL items in database',
          )

          const itemFilter = filters.itemF?.trim()
          const codeFilter = filters.codeF?.trim()

          // Combine all search terms
          const searchTerms = []
          if (itemFilter) searchTerms.push(itemFilter)
          if (codeFilter) searchTerms.push(codeFilter)

          let allJobIds: string[] = []

          // Search for each term in both codigo and descricao fields
          for (const term of searchTerms) {
            console.log('🔍 Global search for term:', term)

            const { data: itemData, error: itemErr } = await supabase
              .from('items_base')
              .select('folha_obra_id')
              .or(`descricao.ilike.%${term}%,codigo.ilike.%${term}%`)

            console.log(
              '🔍 Items found for term',
              term,
              ':',
              itemData?.length || 0,
            )

            if (!itemErr && itemData) {
              const jobIdsForTerm = itemData.map(
                (item: any) => item.folha_obra_id,
              )
              allJobIds = [...allJobIds, ...jobIdsForTerm]
            }
          }

          if (allJobIds.length > 0) {
            // Keep ALL job IDs, including duplicates if same item appears multiple times
            const uniqueJobIds = Array.from(new Set(allJobIds))
            console.log(
              '🎯 Found',
              allJobIds.length,
              'item matches in',
              uniqueJobIds.length,
              'unique jobs',
            )
            console.log('🎯 Job IDs to retrieve:', uniqueJobIds)

            jobIds = uniqueJobIds
          } else {
            console.log('❌ No items found matching search criteria')
            setJobs((prev: Job[]) => (reset ? [] : prev))
            setHasMoreJobs(false)
            setCurrentPage(page)
            return
          }
        }

        // STEP 2: Build the base query
        let query = supabase.from('folhas_obras').select(
          `
          id, numero_fo, numero_orc, nome_campanha, data_saida, 
          prioridade, notas, concluido, saiu, fatura, created_at, 
          cliente, id_cliente, data_concluido, updated_at
        `,
          { count: 'exact' },
        )

        // ALWAYS filter to require ORC values (FO is optional)
        query = query.not('numero_orc', 'is', null)
        query = query.neq('numero_orc', 0)

        // If we have job IDs from item search, filter by those ONLY
        if (jobIds) {
          console.log(
            '🎯 Item search active - filtering to specific job IDs:',
            jobIds,
          )
          query = query.in('id', jobIds)
          console.log('🎯 Bypassing all other filters due to item search')
        }

        // STEP 3: Apply other filters (only if no item search is active)
        if (!jobIds) {
          console.log('🔄 Applying standard filters (no item search active)')

          // Tab-based filtering (completion status)
          if (filters.activeTab === 'concluidos') {
            console.log(
              '🔄 Applying date filter for concluidos tab:',
              twoMonthsAgoString,
            )
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
        } else {
          console.log('🔄 Skipping all standard filters due to item search')
        }

        // Order and pagination
        query = query.order('created_at', { ascending: false })

        // Only apply pagination if we're not filtering by specific job IDs
        if (!jobIds) {
          query = query.range(startRange, endRange)
        }

        // Debug: Log the full query conditions before execution
        if (jobIds) {
          console.log('🔍 DEBUGGING QUERY CONDITIONS:')
          console.log('- Job IDs to find:', jobIds)
          console.log('- Active tab:', filters.activeTab)
          console.log('- FO filter:', filters.foF)
          console.log('- Campaign filter:', filters.campF)
          console.log('- Client filter:', filters.clientF)
          console.log('- Show fatura:', filters.showFatura)
        }

        // Execute the main query
        const { data: jobsData, error, count } = await query

        if (error) {
          console.error('Supabase error details:', error)
          throw error
        }

        let filteredJobs = (jobsData as Job[]) || []
        console.log('📊 Query result: jobs found:', filteredJobs.length)

        // Apply logistics-based filtering for tabs (only if no item filter was used)
        // Skip this entirely when item/codigo filters are active
        const itemFiltersPresent = !!(
          filters.itemF?.trim() || filters.codeF?.trim()
        )
        console.log('🔄 Logistics filtering check:', {
          hasJobIds: !!jobIds,
          hasItemFilters: itemFiltersPresent,
          activeTab: filters.activeTab,
          shouldSkipLogisticsFilter: !!jobIds || itemFiltersPresent,
        })

        if (
          !jobIds && // Only apply tab filtering if we didn't already filter by items
          !filters.itemF?.trim() && // Skip if item description filter is active
          !filters.codeF?.trim() && // Skip if codigo filter is active
          filteredJobs.length > 0 &&
          (filters.activeTab === 'em_curso' ||
            filters.activeTab === 'concluidos')
        ) {
          console.log('🔄 Applying logistics-based tab filtering')
          const currentJobIds = filteredJobs.map((job) => job.id)

          // Get all items for these jobs
          const { data: itemsData, error: itemsError } = await supabase
            .from('items_base')
            .select('id, folha_obra_id')
            .in('folha_obra_id', currentJobIds)

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

              currentJobIds.forEach((jobId: string) => {
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

        // Item/codigo filtering is now handled at the beginning of the function

        // Final filter: Only show jobs that have ORC values (FO is optional)
        filteredJobs = filteredJobs.filter(
          (job) => job.numero_orc && job.numero_orc !== 0,
        )

        if (filteredJobs) {
          console.log('📊 Final jobs to display:', filteredJobs.length, 'jobs')
          console.log(
            '📊 Sample job IDs:',
            filteredJobs.slice(0, 3).map((j) => j.numero_fo),
          )
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
            .select('item_id, concluido')
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

            // Calculate completion percentage based on logistics entries with concluido=true
            const completedItems = jobItems.filter((item) => {
              const logisticsEntry = logisticsData?.find(
                (l) => l.item_id === item.id,
              )
              return logisticsEntry && logisticsEntry.concluido === true
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
          .select('item_id, concluido')
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

  // Fetch operacoes for loaded jobs
  const fetchOperacoes = useCallback(
    async (jobIds: string[]) => {
      if (jobIds.length === 0) return

      setLoading((prev) => ({ ...prev, operacoes: true }))
      try {
        const { data: operacoesData, error } = await supabase
          .from('producao_operacoes')
          .select('id, folha_obra_id, concluido')
          .in('folha_obra_id', jobIds)

        if (error) throw error

        if (operacoesData) {
          setAllOperacoes((prev) => {
            // Replace operacoes for these jobs to avoid duplicates
            const filtered = prev.filter(
              (op) => !jobIds.includes(op.folha_obra_id),
            )
            return [...filtered, ...operacoesData]
          })
        }
      } catch (error) {
        console.error('Error fetching operacoes:', error)
        setError('Failed to load production operations')
      } finally {
        setLoading((prev) => ({ ...prev, operacoes: false }))
      }
    },
    [supabase],
  )

  const fetchDesignerItems = useCallback(
    async (jobIds: string[]) => {
      if (jobIds.length === 0) return

      setLoading((prev) => ({ ...prev, operacoes: true })) // Reuse loading state
      try {
        const { data: designerData, error } = await supabase
          .from('designer_items')
          .select('id, item_id, paginacao')
          .in(
            'item_id',
            // Need to get item IDs for these jobs first
            allItems
              .filter((item) => jobIds.includes(item.folha_obra_id))
              .map((item) => item.id),
          )

        if (error) throw error

        if (designerData) {
          setAllDesignerItems((prev) => {
            // Replace designer items for these jobs to avoid duplicates
            const jobItemIds = allItems
              .filter((item) => jobIds.includes(item.folha_obra_id))
              .map((item) => item.id)
            const filtered = prev.filter(
              (designer) => !jobItemIds.includes(designer.item_id),
            )
            return [...filtered, ...designerData]
          })
        }
      } catch (error) {
        console.error('Error fetching designer items:', error)
        setError('Failed to load designer items')
      } finally {
        setLoading((prev) => ({ ...prev, operacoes: false }))
      }
    },
    [supabase, allItems],
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
    console.log('🔍 Filter change detected:', {
      debouncedCodeF,
      debouncedItemF,
      debouncedFoF,
      debouncedCampF,
      debouncedClientF,
      showFatura,
      activeTab,
    })

    if (
      debouncedFoF ||
      debouncedCampF ||
      debouncedItemF ||
      debouncedCodeF ||
      debouncedClientF ||
      showFatura
    ) {
      // Reset pagination and search with filters
      console.log('🎯 Triggering filtered search')
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
      console.log('🔄 Resetting to default search')
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

  // Load items and operacoes when jobs change
  useEffect(() => {
    if (jobs.length > 0) {
      const jobIds = jobs
        .map((job) => job.id)
        .filter((id) => !id.startsWith('temp-'))
      if (jobIds.length > 0) {
        fetchItems(jobIds)
        fetchOperacoes(jobIds)
        fetchDesignerItems(jobIds)
        fetchJobsSaiuStatus(jobIds)
        fetchJobsCompletionStatus(jobIds)
      }
    }
  }, [
    jobs,
    fetchItems,
    fetchOperacoes,
    fetchDesignerItems,
    fetchJobsSaiuStatus,
    fetchJobsCompletionStatus,
  ])

  // Auto-complete jobs when all logistics entries are completed
  useEffect(() => {
    const checkJobCompletion = async () => {
      for (const job of jobs) {
        if (job.id.startsWith('temp-') || job.concluido) continue // Skip temp jobs and already completed jobs

        const completionStatus = jobsCompletionStatus[job.id]

        // If job has logistics entries and all are completed, mark job as completed
        if (completionStatus && completionStatus.completed) {
          console.log(
            `🎯 Auto-completing job ${job.numero_fo} - all logistics entries completed`,
          )

          // Update local state
          setJobs((prevJobs) =>
            prevJobs.map((j) =>
              j.id === job.id
                ? {
                    ...j,
                    concluido: true,
                    data_concluido: new Date().toISOString(),
                  }
                : j,
            ),
          )

          // Update database
          await supabase
            .from('folhas_obras')
            .update({
              concluido: true,
              data_concluido: new Date().toISOString(),
            })
            .eq('id', job.id)
        }
      }
    }

    if (jobs.length > 0 && Object.keys(jobsCompletionStatus).length > 0) {
      checkJobCompletion()
    }
  }, [jobsCompletionStatus, jobs, supabase])

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
          // Sort by operacoes completion status
          const aOperacoes = allOperacoes.filter(
            (op) => op.folha_obra_id === a.id,
          )
          const bOperacoes = allOperacoes.filter(
            (op) => op.folha_obra_id === b.id,
          )
          const aHasCompleted = aOperacoes.some((op) => op.concluido)
          const bHasCompleted = bOperacoes.some((op) => op.concluido)
          A = aHasCompleted
          B = bHasCompleted
          break
        case 'corte':
          // Sort by operacoes completion status
          const aCorteOps = allOperacoes.filter(
            (op) => op.folha_obra_id === a.id,
          )
          const bCorteOps = allOperacoes.filter(
            (op) => op.folha_obra_id === b.id,
          )
          const aCorteCompleted = aCorteOps.some((op) => op.concluido)
          const bCorteCompleted = bCorteOps.some((op) => op.concluido)
          A = aCorteCompleted
          B = bCorteCompleted
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
  }, [filtered, sortCol, sortDir, allItems, allOperacoes])

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
              onChange={(e) => {
                console.log('🔤 Code input changed:', e.target.value)
                setCodeF(e.target.value)
              }}
              onBlur={(e) => {
                // Prevent accidental clearing on blur
                console.log(
                  '🔤 Code field blur, keeping value:',
                  e.target.value,
                )
              }}
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
              Produção Concluída (
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
                            onClick={() => toggleSort('created_at')}
                            className="border-border sticky top-0 z-10 w-[140px] cursor-pointer overflow-hidden rounded-none border-b-2 bg-[var(--orange)] text-center font-bold text-ellipsis whitespace-nowrap text-black uppercase select-none"
                          >
                            Data{' '}
                            {sortCol === 'created_at' &&
                              (sortDir === 'asc' ? (
                                <ArrowUp className="ml-1 inline h-3 w-3" />
                              ) : (
                                <ArrowDown className="ml-1 inline h-3 w-3" />
                              ))}
                          </TableHead>
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
                                <TooltipContent>Artes Finais</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                          <TableHead
                            onClick={() => toggleSort('corte')}
                            className="border-border sticky top-0 z-10 w-[36px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] p-0 text-center font-bold text-black uppercase select-none"
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    C{' '}
                                    {sortCol === 'corte' &&
                                      (sortDir === 'asc' ? (
                                        <ArrowUp className="ml-1 inline h-3 w-3" />
                                      ) : (
                                        <ArrowDown className="ml-1 inline h-3 w-3" />
                                      ))}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Corte</TooltipContent>
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
                              <TableCell className="w-[140px] text-center text-xs">
                                {formatDatePortuguese(job.created_at)}
                              </TableCell>
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
                                          className={`focus:ring-primary mx-auto flex h-3 w-3 items-center justify-center rounded-full transition-colors focus:ring-2 focus:outline-none ${getAColor(job.id, allItems, allDesignerItems)}`}
                                          title="Artes Finais"
                                        />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Artes Finais
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="w-[36px] p-0 text-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <span
                                          className={`focus:ring-primary mx-auto flex h-3 w-3 items-center justify-center rounded-full transition-colors focus:ring-2 focus:outline-none ${getCColor(job.id, allOperacoes)}`}
                                          title="Corte"
                                        />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>Corte</TooltipContent>
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
                              colSpan={11}
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
                {/* jobs table - exact same as em_curso - with P, A, C columns hidden */}
                <div className="bg-background border-border w-full rounded-none border-2">
                  <div className="w-full rounded-none">
                    <Table className="w-full border-0 [&_td]:px-3 [&_td]:py-2 [&_td:nth-last-child(2)]:hidden [&_td:nth-last-child(3)]:hidden [&_td:nth-last-child(4)]:hidden [&_th]:px-3 [&_th]:py-2">
                      <TableHeader>
                        <TableRow className="rounded-none">
                          <TableHead
                            onClick={() => toggleSort('created_at')}
                            className="border-border sticky top-0 z-10 w-[140px] cursor-pointer overflow-hidden rounded-none border-b-2 bg-[var(--orange)] text-center font-bold text-ellipsis whitespace-nowrap text-black uppercase select-none"
                          >
                            Data{' '}
                            {sortCol === 'created_at' &&
                              (sortDir === 'asc' ? (
                                <ArrowUp className="ml-1 inline h-3 w-3" />
                              ) : (
                                <ArrowDown className="ml-1 inline h-3 w-3" />
                              ))}
                          </TableHead>
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
                            className="border-border sticky top-0 z-10 hidden w-[36px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] p-0 text-center font-bold text-black uppercase select-none"
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
                            className="border-border sticky top-0 z-10 hidden w-[36px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] p-0 text-center font-bold text-black uppercase select-none"
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
                                <TooltipContent>Artes Finais</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                          <TableHead
                            onClick={() => toggleSort('corte')}
                            className="border-border sticky top-0 z-10 hidden w-[36px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] p-0 text-center font-bold text-black uppercase select-none"
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    C{' '}
                                    {sortCol === 'corte' &&
                                      (sortDir === 'asc' ? (
                                        <ArrowUp className="ml-1 inline h-3 w-3" />
                                      ) : (
                                        <ArrowDown className="ml-1 inline h-3 w-3" />
                                      ))}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Corte</TooltipContent>
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
                              <TableCell className="w-[140px] text-center text-xs">
                                {formatDatePortuguese(job.created_at)}
                              </TableCell>
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
                                          className={`focus:ring-primary mx-auto flex h-3 w-3 items-center justify-center rounded-full transition-colors focus:ring-2 focus:outline-none ${getAColor(job.id, allItems, allDesignerItems)}`}
                                          title="Artes Finais"
                                        />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Artes Finais
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="w-[36px] p-0 text-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <span
                                          className={`focus:ring-primary mx-auto flex h-3 w-3 items-center justify-center rounded-full transition-colors focus:ring-2 focus:outline-none ${getCColor(job.id, allOperacoes)}`}
                                          title="Corte"
                                        />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>Corte</TooltipContent>
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
                              colSpan={11}
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
                  fetchJobsCompletionStatus={fetchJobsCompletionStatus}
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
  fetchJobsCompletionStatus: (jobIds: string[]) => Promise<void>
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
  fetchJobsCompletionStatus,
}: JobDrawerProps) {
  // Sorting state for drawer table - MUST be called before any early returns
  type SortKey = 'bulk' | 'descricao' | 'codigo' | 'quantidade' | 'acoes'
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
  const jobItems = useMemo(() => {
    return job ? items.filter((i) => i.folha_obra_id === jobId) : []
  }, [job, items, jobId])

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
      console.log(
        '📦 Creating logistics entries for items without them:',
        itemsWithoutLogistics.length,
      )
      // Create logistics entries for all items without them
      const newLogisticsEntries = itemsWithoutLogistics.map((item) => {
        const description = item.descricao || 'Novo Item'
        console.log('📦 Creating logistics entry for item:', {
          itemId: item.id,
          description,
        })
        return {
          item_id: item.id,
          descricao: description, // Store item description directly
          data: new Date().toISOString().split('T')[0],
          is_entrega: true,
        }
      })

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    console.log('➕ Creating new item in items_base...')
                    const { data: baseData, error: baseError } = await supabase
                      .from('items_base')
                      .insert({
                        folha_obra_id: job.id,
                        descricao: '',
                        codigo: '',
                        quantidade: 1, // 🔧 FIX: Add default quantity
                      })
                      .select('*')
                      .single()

                    console.log('➕ Created item result:', {
                      data: baseData,
                      error: baseError,
                    })
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
                      paginacao: false,
                      brindes: baseData.brindes ?? false,
                      concluido: false,
                    }

                    // Update global state
                    setAllItems((prev) => [...prev, newItem])

                    // Refresh logistics data
                    await fetchLogisticaRows()
                  }}
                >
                  Adicionar Item
                </Button>
              </div>
            </div>

            {/* Production Items table */}
            <div className="bg-background border-border w-full rounded-none border-2">
              <div className="w-full rounded-none">
                <Table className="w-full border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                  <TableHeader>
                    <TableRow className="border-border border-0 border-b-2 bg-transparent">
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
                    {sortedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center">
                          Nenhum item encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedItems.map((it, index) => (
                        <TableRow
                          key={it.id || `item-${index}`}
                          className="hover:bg-[var(--main)]"
                        >
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
                              defaultValue={it.descricao}
                              onChange={(e) => {
                                const newValue = e.target.value
                                console.log('📝 onChange descricao:', {
                                  itemId: it.id,
                                  newValue,
                                })
                              }}
                              onBlur={async (e) => {
                                const newValue = e.target.value
                                console.log('📝 onBlur start descricao:', {
                                  itemId: it.id,
                                  newValue,
                                  originalDescricao: it.descricao,
                                })

                                // Skip if no change
                                if (newValue === it.descricao) {
                                  console.log(
                                    '📝 No change detected, skipping update',
                                  )
                                  return
                                }

                                try {
                                  console.log(
                                    '📝 Updating descricao in database...',
                                  )

                                  // Update the items_base table
                                  const { error } = await supabase
                                    .from('items_base')
                                    .update({ descricao: newValue })
                                    .eq('id', it.id)

                                  if (error) {
                                    console.error(
                                      '❌ Failed to update descricao:',
                                      error,
                                    )
                                    alert(
                                      `Erro ao atualizar descrição: ${error.message}`,
                                    )
                                  } else {
                                    console.log(
                                      '✅ Successfully updated descricao',
                                    )

                                    // Update global state
                                    setAllItems((prev) =>
                                      prev.map((item) =>
                                        item.id === it.id
                                          ? { ...item, descricao: newValue }
                                          : item,
                                      ),
                                    )

                                    // 🔄 SYNC: Also update all logistics entries for this item
                                    console.log(
                                      '🔄 Syncing description to logistics entries...',
                                    )
                                    const { error: logisticsError } =
                                      await supabase
                                        .from('logistica_entregas')
                                        .update({ descricao: newValue })
                                        .eq('item_id', it.id)

                                    if (logisticsError) {
                                      console.error(
                                        '❌ Failed to sync description to logistics:',
                                        logisticsError,
                                      )
                                    } else {
                                      console.log(
                                        '✅ Successfully synced description to logistics entries',
                                      )
                                    }
                                  }
                                } catch (error: any) {
                                  console.error(
                                    '❌ Exception updating descricao:',
                                    error,
                                  )
                                  alert(
                                    `Erro ao atualizar descrição: ${error?.message || error}`,
                                  )
                                }
                              }}
                              className="h-10 border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              defaultValue={it.codigo || ''}
                              onChange={(e) => {
                                const newValue = e.target.value
                                console.log('🔤 onChange codigo:', {
                                  itemId: it.id,
                                  newValue,
                                })
                              }}
                              onBlur={async (e) => {
                                const newValue = e.target.value || null
                                console.log('🔤 onBlur start codigo:', {
                                  itemId: it.id,
                                  newValue,
                                  originalCodigo: it.codigo,
                                })

                                // Skip if no change
                                if (newValue === it.codigo) {
                                  console.log(
                                    '🔤 No change detected, skipping update',
                                  )
                                  return
                                }

                                try {
                                  console.log(
                                    '🔤 Updating codigo in database...',
                                  )

                                  const { error } = await supabase
                                    .from('items_base')
                                    .update({ codigo: newValue })
                                    .eq('id', it.id)

                                  if (error) {
                                    console.error(
                                      '❌ Failed to update codigo:',
                                      error,
                                    )
                                    alert(
                                      `Erro ao atualizar código: ${error.message}`,
                                    )
                                  } else {
                                    console.log(
                                      '✅ Successfully updated codigo',
                                    )

                                    setAllItems((prev) =>
                                      prev.map((item) =>
                                        item.id === it.id
                                          ? { ...item, codigo: newValue }
                                          : item,
                                      ),
                                    )
                                  }
                                } catch (error: any) {
                                  console.error(
                                    '❌ Exception updating codigo:',
                                    error,
                                  )
                                  alert(
                                    `Erro ao atualizar código: ${error?.message || error}`,
                                  )
                                }
                              }}
                              className="h-10 border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="text"
                              defaultValue={it.quantidade ?? ''}
                              onChange={(e) => {
                                // Just log for now, don't update state during typing
                                const value = e.target.value
                                console.log('🔢 onChange:', {
                                  value,
                                  itemId: it.id,
                                })
                              }}
                              onBlur={async (e) => {
                                const value = e.target.value.trim()
                                const numValue =
                                  value === '' ? null : Number(value)
                                const originalValue = it.quantidade

                                console.log('🔢 onBlur start:', {
                                  value,
                                  numValue,
                                  itemId: it.id,
                                  originalQuantidade: originalValue,
                                })

                                // Skip if no change
                                if (numValue === originalValue) {
                                  console.log(
                                    '🔢 No change detected, skipping update',
                                  )
                                  return
                                }

                                try {
                                  console.log(
                                    '🔢 Updating quantidade in database...',
                                    {
                                      itemId: it.id,
                                      oldQuantidade: originalValue,
                                      newQuantidade: numValue,
                                    },
                                  )

                                  const { error } = await supabase
                                    .from('items_base')
                                    .update({ quantidade: numValue })
                                    .eq('id', it.id)

                                  if (error) {
                                    console.error(
                                      '❌ Failed to update quantidade:',
                                      error,
                                    )
                                    alert(
                                      `Erro ao atualizar quantidade: ${error.message}`,
                                    )

                                    // Revert to original value on error
                                    setAllItems((prevItems) =>
                                      prevItems.map((item) =>
                                        item.id === it.id
                                          ? {
                                              ...item,
                                              quantidade: originalValue,
                                            }
                                          : item,
                                      ),
                                    )
                                  } else {
                                    console.log(
                                      '✅ Successfully updated quantidade',
                                    )

                                    // Update parent state
                                    setAllItems((prevItems) =>
                                      prevItems.map((item) =>
                                        item.id === it.id
                                          ? { ...item, quantidade: numValue }
                                          : item,
                                      ),
                                    )

                                    // Sync to logistics entries
                                    const { error: logisticsError } =
                                      await supabase
                                        .from('logistica_entregas')
                                        .update({ quantidade: numValue })
                                        .eq('item_id', it.id)

                                    if (logisticsError) {
                                      console.error(
                                        '❌ Failed to sync quantidade to logistics:',
                                        logisticsError,
                                      )
                                    } else {
                                      console.log(
                                        '✅ Successfully synced quantidade to logistics entries',
                                      )
                                    }
                                  }
                                } catch (error: any) {
                                  console.error(
                                    '❌ Exception updating quantidade:',
                                    error,
                                  )
                                  alert(
                                    `Erro ao atualizar quantidade: ${error?.message || error}`,
                                  )

                                  // Revert to original value on exception
                                  setAllItems((prevItems) =>
                                    prevItems.map((item) =>
                                      item.id === it.id
                                        ? { ...item, quantidade: originalValue }
                                        : item,
                                    ),
                                  )
                                }
                              }}
                              className="h-10 w-20 rounded-none border-0 text-right text-sm outline-0 focus:border-0 focus:ring-0"
                            />
                          </TableCell>

                          <TableCell className="flex w-[100px] justify-center gap-2 pr-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="flex aspect-square size-10 items-center justify-center !p-0"
                                    onClick={async () => {
                                      // Duplicate item: insert into items_base, then designer_items, then refresh
                                      const {
                                        data: newBase,
                                        error: baseError,
                                      } = await supabase
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
                                        prev.filter(
                                          (item) => item.id !== it.id,
                                        ),
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
                      ))
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

                      // 1. Create a new folhas_obras entry
                      const { data: folhaObraData, error: folhaObraError } =
                        await supabase
                          .from('folhas_obras')
                          .insert({
                            numero_fo: '',
                            numero_orc: null,
                            nome_campanha: 'Entrega ou recolha especial',
                            cliente: '',
                            data_in: new Date().toISOString(),
                            saiu: false,
                          })
                          .select('*')
                          .single()

                      if (folhaObraError || !folhaObraData) {
                        alert(
                          `Erro ao criar folha obra: ${folhaObraError?.message}`,
                        )
                        return
                      }

                      // 2. Create items_base entry
                      const { data: itemData, error: itemError } =
                        await supabase
                          .from('items_base')
                          .insert({
                            folha_obra_id: folhaObraData.id,
                            descricao: '',
                            codigo: '',
                            quantidade: 1,
                            brindes: false,
                            concluido: false,
                          })
                          .select('*')
                          .single()

                      if (itemError || !itemData) {
                        alert(`Erro ao criar item: ${itemError?.message}`)
                        return
                      }

                      // 3. Create logistica_entregas entry
                      const { error: logisticsError } = await supabase
                        .from('logistica_entregas')
                        .insert({
                          item_id: itemData.id,
                          descricao: '',
                          data_saida: new Date().toISOString().split('T')[0],
                          is_entrega: true,
                        })

                      if (logisticsError) {
                        alert(
                          `Erro ao criar logística: ${logisticsError.message}`,
                        )
                        return
                      }

                      // 4. Update local state and refresh
                      setJobs((prev) => [...prev, folhaObraData])
                      setAllItems((prev) => [...prev, itemData])
                      await fetchLogisticaRows()

                      alert('Entrada criada com sucesso!')
                    } catch (error) {
                      alert(`Erro: ${error}`)
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
                    console.log('📊 Starting quantity copy process...')
                    console.log('📊 Current job ID:', job.id)
                    console.log(
                      '📊 Current logistics rows:',
                      logisticaRows.length,
                    )
                    console.log('📊 Current job items:', jobItems.length)

                    if (logisticaRows.length === 0) {
                      console.log('❌ No logistics items to copy quantities to')
                      alert('Não há itens na tabela de logística.')
                      return
                    }

                    if (jobItems.length === 0) {
                      console.log(
                        '❌ No job items found to copy quantities from',
                      )
                      alert(
                        'Não há itens base encontrados para esta folha de obra.',
                      )
                      return
                    }

                    const confirmed = confirm(
                      'Copiar quantidades originais dos itens para a tabela de logística? Isto irá substituir as quantidades existentes na logística.',
                    )
                    if (!confirmed) return

                    try {
                      // Use the jobItems that are already loaded instead of fetching again
                      console.log(
                        '📊 Using loaded job items:',
                        jobItems.map((item) => ({
                          id: item.id,
                          descricao: item.descricao,
                          quantidade: item.quantidade,
                        })),
                      )

                      // Create a map of item_id -> quantidade from jobItems
                      const quantityMap = new Map(
                        jobItems.map((item) => [item.id, item.quantidade]),
                      )

                      console.log(
                        '📊 Quantity map:',
                        Object.fromEntries(quantityMap),
                      )

                      // Filter logistics rows that belong to items in this job
                      const rowsToUpdate = logisticaRows.filter((row) => {
                        const hasItemId =
                          row.item_id && quantityMap.has(row.item_id)
                        const hasLogisticsId = row.id // Must have logistics ID to update
                        console.log(`📊 Checking row:`, {
                          logisticsId: row.id,
                          itemId: row.item_id,
                          hasItemId,
                          hasLogisticsId,
                          currentQuantity: row.quantidade,
                          newQuantity: quantityMap.get(row.item_id),
                        })
                        return hasItemId && hasLogisticsId
                      })

                      console.log(
                        '📊 Logistics rows to update:',
                        rowsToUpdate.length,
                      )

                      if (rowsToUpdate.length === 0) {
                        console.log(
                          '❌ No matching logistics rows found to update',
                        )
                        console.log('📊 Debug info:')
                        console.log(
                          '- Job items IDs:',
                          jobItems.map((i) => i.id),
                        )
                        console.log(
                          '- Logistics rows item_ids:',
                          logisticaRows.map((r) => r.item_id),
                        )
                        console.log(
                          '- Logistics rows with IDs:',
                          logisticaRows
                            .filter((r) => r.id)
                            .map((r) => ({ id: r.id, item_id: r.item_id })),
                        )

                        alert(
                          'Nenhuma linha de logística corresponde aos itens desta folha de obra. Verifique se os itens têm entradas de logística criadas.',
                        )
                        return
                      }

                      // Update each logistics row with the corresponding item quantity
                      const updatePromises = rowsToUpdate.map(
                        async (row, index) => {
                          const originalQuantity = quantityMap.get(row.item_id)
                          console.log(
                            `📊 Updating row ${index + 1}/${rowsToUpdate.length}:`,
                            {
                              logisticsId: row.id,
                              itemId: row.item_id,
                              itemDescription: jobItems.find(
                                (i) => i.id === row.item_id,
                              )?.descricao,
                              currentQuantity: row.quantidade,
                              newQuantity: originalQuantity,
                            },
                          )

                          try {
                            const { error } = await supabase
                              .from('logistica_entregas')
                              .update({ quantidade: originalQuantity })
                              .eq('id', row.id)

                            if (error) {
                              console.error(
                                `❌ Failed to update row ${row.id}:`,
                                error,
                              )
                              return { success: false, error, rowId: row.id }
                            }

                            console.log(`✅ Successfully updated row ${row.id}`)
                            return { success: true, rowId: row.id }
                          } catch (error) {
                            console.error(
                              `❌ Exception updating row ${row.id}:`,
                              error,
                            )
                            return { success: false, error, rowId: row.id }
                          }
                        },
                      )

                      console.log('📊 Executing all updates...')
                      const results = await Promise.all(updatePromises)

                      // Check results
                      const successful = results.filter((r) => r.success)
                      const failed = results.filter((r) => !r.success)

                      console.log(
                        `📊 Update results: ${successful.length} successful, ${failed.length} failed`,
                      )

                      if (failed.length > 0) {
                        console.error('❌ Some updates failed:', failed)
                        alert(
                          `Alguns updates falharam: ${failed.length}/${results.length}. Verifique o console para mais detalhes.`,
                        )
                        // Don't return here, still refresh to show partial updates
                      }

                      // Update local state to reflect the changes immediately
                      setLogisticaRows((prevRows) =>
                        prevRows.map((row) => {
                          const newQuantity = quantityMap.get(row.item_id)
                          const wasUpdated = rowsToUpdate.some(
                            (r) => r.id === row.id,
                          )

                          if (wasUpdated && newQuantity !== undefined) {
                            return { ...row, quantidade: newQuantity }
                          }
                          return row
                        }),
                      )

                      console.log('✅ Local state updated')

                      // Optionally refresh logistics data to ensure consistency
                      console.log(
                        '🔄 Refreshing logistics data to ensure consistency...',
                      )
                      await fetchLogisticaRows()

                      console.log(
                        '✅ Quantity copy process completed successfully',
                      )

                      if (failed.length === 0) {
                        alert(
                          `Quantidades copiadas com sucesso! ${successful.length} registros atualizados.`,
                        )
                      } else {
                        alert(
                          `Processo concluído com ${successful.length} sucessos e ${failed.length} falhas. Verifique o console para detalhes.`,
                        )
                      }
                    } catch (error: any) {
                      console.error(
                        '❌ Error in copy quantities process:',
                        error,
                      )
                      console.error('❌ Error details:', {
                        message: error?.message,
                        code: error?.code,
                        details: error?.details,
                        stack: error?.stack,
                      })
                      alert(
                        `Erro ao copiar quantidades: ${error?.message || error}`,
                      )
                    }
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Quantidades
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={async () => {
                    // Copy delivery information from source row to all other rows
                    if (!sourceRowId) {
                      alert(
                        'Selecione uma linha como fonte (usando o botão de opção) antes de copiar informações de entrega.',
                      )
                      return
                    }

                    const sourceRow = logisticaRows.find(
                      (row) => row.id === sourceRowId,
                    )
                    if (!sourceRow) {
                      alert('Linha fonte não encontrada.')
                      return
                    }

                    const confirmed = confirm(
                      `Copiar informações de entrega da linha "${sourceRow.items_base?.descricao || sourceRow.descricao}" para todas as outras linhas?`,
                    )
                    if (!confirmed) return

                    const deliveryInfo = {
                      local_recolha: sourceRow.local_recolha,
                      local_entrega: sourceRow.local_entrega,
                      transportadora: sourceRow.transportadora,
                      id_local_recolha: sourceRow.id_local_recolha,
                      id_local_entrega: sourceRow.id_local_entrega,
                      data_saida: sourceRow.data_saida, // Add data_saida field
                    }

                    // Update all other rows (excluding the source row)
                    const updatePromises = logisticaRows
                      .filter((row) => row.id && row.id !== sourceRowId)
                      .map((record) => {
                        if (record.id) {
                          return supabase
                            .from('logistica_entregas')
                            .update(deliveryInfo)
                            .eq('id', record.id)
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
                      console.log('📝 Updating item description:', {
                        rowId: row.id,
                        itemId: row.item_id,
                        value,
                      })
                      // Update ONLY the logistics entry description, NOT the original item description
                      if (row.id) {
                        // Update existing logistics record
                        try {
                          const success = await updateLogisticaField(
                            row.id,
                            'descricao',
                            value,
                            null,
                          )
                          if (success) {
                            console.log(
                              '✅ Successfully updated item description',
                            )
                            setLogisticaRows((prevRows) =>
                              prevRows.map((r) =>
                                r.id === row.id
                                  ? { ...r, descricao: value }
                                  : r,
                              ),
                            )
                          } else {
                            console.error(
                              '❌ Failed to update item description',
                            )
                            alert('Erro ao atualizar descrição do item')
                          }
                        } catch (error) {
                          console.error(
                            '❌ Error updating item description:',
                            error,
                          )
                          alert(`Erro ao atualizar descrição: ${error}`)
                        }
                      } else if (row.item_id) {
                        // Create new logistics record with description
                        console.log(
                          '🆕 Creating new logistics record with description:',
                          value,
                        )
                        try {
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
                            console.log(
                              '✅ Successfully created new logistics record',
                            )
                            setLogisticaRows((prevRows) =>
                              prevRows.map((r) =>
                                r.item_id === row.item_id && !r.id ? data : r,
                              ),
                            )
                          } else {
                            console.error(
                              '❌ Error creating new logistics record:',
                              error,
                            )
                            alert(
                              `Erro ao criar novo registo de logística: ${error?.message}`,
                            )
                          }
                        } catch (error) {
                          console.error(
                            '❌ Exception creating new logistics record:',
                            error,
                          )
                          alert(`Erro ao criar registo: ${error}`)
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
                    onDataConcluidoSave={async (row: any, value: string) => {
                      if (row.id) {
                        // Update only data_saida since this is now the DATA SAÍDA column
                        await updateLogisticaField(
                          row.id,
                          'data_saida',
                          value,
                          null,
                        )
                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === row.id
                              ? {
                                  ...r,
                                  data_saida: value,
                                }
                              : r,
                          ),
                        )
                      }
                    }}
                    onSaiuSave={async (row: any, value: boolean) => {
                      if (row.id) {
                        await updateLogisticaField(row.id, 'saiu', value, null)
                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === row.id ? { ...r, saiu: value } : r,
                          ),
                        )
                      }
                    }}
                    onGuiaSave={async (row: any, value: string) => {
                      console.log('📋 Updating guia:', {
                        rowId: row.id,
                        value,
                        valueType: typeof value,
                      })
                      if (row.id) {
                        try {
                          // Additional logging for guia field debugging
                          console.log('📋 Guia field details:', {
                            original: value,
                            trimmed: value?.trim(),
                            isEmpty:
                              value === '' ||
                              value === null ||
                              value === undefined,
                            isNumeric: !isNaN(parseInt(value?.trim() || '')),
                          })

                          const success = await updateLogisticaField(
                            row.id,
                            'guia',
                            value,
                            null,
                          )
                          if (success) {
                            console.log('✅ Successfully updated guia')
                            setLogisticaRows((prevRows) =>
                              prevRows.map((r) =>
                                r.id === row.id ? { ...r, guia: value } : r,
                              ),
                            )
                          } else {
                            console.error(
                              '❌ Failed to update guia - updateLogisticaField returned false',
                            )
                            alert('Erro ao atualizar guia - operação falhou')
                          }
                        } catch (error: any) {
                          console.error('❌ Error updating guia:', error)
                          console.error('❌ Error details:', {
                            message: error?.message,
                            code: error?.code,
                            details: error?.details,
                          })
                          alert(
                            `Erro ao atualizar guia: ${error?.message || error}`,
                          )
                        }
                      } else {
                        console.error('❌ Missing row.id for guia update')
                        alert('Erro: ID da linha não encontrado')
                      }
                    }}
                    onBrindesSave={async (row: any, value: boolean) => {
                      if (row.id) {
                        await updateLogisticaField(
                          row.id,
                          'brindes',
                          value,
                          null,
                        )
                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === row.id ? { ...r, brindes: value } : r,
                          ),
                        )
                      }
                    }}
                    onClienteChange={async (row: any, value: string) => {
                      // Update the associated job's client
                      if (row.items_base?.folhas_obras?.id) {
                        await updateFolhaObraField(
                          row.items_base.folhas_obras.id,
                          'id_cliente',
                          value,
                          new Date(),
                        )
                        // Optionally update local state or refresh
                      }
                    }}
                    onRecolhaChange={async (rowId: string, value: string) => {
                      console.log('🏠 Updating local_recolha:', {
                        rowId,
                        value,
                      })
                      try {
                        // Find the selected armazem to get the text label
                        const selectedArmazem = logisticaArmazens.find(
                          (a) => a.value === value,
                        )
                        const textValue = selectedArmazem
                          ? selectedArmazem.label
                          : ''

                        console.log('🏠 Armazem details:', {
                          id: value,
                          text: textValue,
                        })

                        // Update both ID and text fields
                        const success = await Promise.all([
                          updateLogisticaField(
                            rowId,
                            'id_local_recolha',
                            value,
                            null,
                          ),
                          updateLogisticaField(
                            rowId,
                            'local_recolha',
                            textValue,
                            null,
                          ),
                        ])

                        if (success.every((s) => s)) {
                          console.log(
                            '✅ Successfully updated both id_local_recolha and local_recolha',
                          )
                          setLogisticaRows((prevRows) =>
                            prevRows.map((r) =>
                              r.id === rowId
                                ? {
                                    ...r,
                                    id_local_recolha: value,
                                    local_recolha: textValue,
                                  }
                                : r,
                            ),
                          )
                        } else {
                          console.error(
                            '❌ Failed to update local_recolha fields',
                          )
                          alert('Erro ao atualizar local de recolha')
                        }
                      } catch (error) {
                        console.error('❌ Error updating local_recolha:', error)
                        alert(`Erro ao atualizar local de recolha: ${error}`)
                      }
                    }}
                    onEntregaChange={async (rowId: string, value: string) => {
                      console.log('🚚 Updating local_entrega:', {
                        rowId,
                        value,
                      })
                      try {
                        // Find the selected armazem to get the text label
                        const selectedArmazem = logisticaArmazens.find(
                          (a) => a.value === value,
                        )
                        const textValue = selectedArmazem
                          ? selectedArmazem.label
                          : ''

                        console.log('🚚 Armazem details:', {
                          id: value,
                          text: textValue,
                        })

                        // Update both ID and text fields
                        const success = await Promise.all([
                          updateLogisticaField(
                            rowId,
                            'id_local_entrega',
                            value,
                            null,
                          ),
                          updateLogisticaField(
                            rowId,
                            'local_entrega',
                            textValue,
                            null,
                          ),
                        ])

                        if (success.every((s) => s)) {
                          console.log(
                            '✅ Successfully updated both id_local_entrega and local_entrega',
                          )
                          setLogisticaRows((prevRows) =>
                            prevRows.map((r) =>
                              r.id === rowId
                                ? {
                                    ...r,
                                    id_local_entrega: value,
                                    local_entrega: textValue,
                                  }
                                : r,
                            ),
                          )
                        } else {
                          console.error(
                            '❌ Failed to update local_entrega fields',
                          )
                          alert('Erro ao atualizar local de entrega')
                        }
                      } catch (error) {
                        console.error('❌ Error updating local_entrega:', error)
                        alert(`Erro ao atualizar local de entrega: ${error}`)
                      }
                    }}
                    onTransportadoraChange={async (row: any, value: string) => {
                      console.log('🚛 Updating transportadora:', {
                        rowId: row.id,
                        value,
                      })
                      if (row.id) {
                        try {
                          // For transportadora, the field stores the ID directly (not separate ID/text fields)
                          // But let's log what transportadora name this ID represents
                          const selectedTransportadora =
                            logisticaTransportadoras.find(
                              (t) => t.value === value,
                            )
                          const textValue = selectedTransportadora
                            ? selectedTransportadora.label
                            : ''

                          console.log('🚛 Transportadora details:', {
                            id: value,
                            text: textValue,
                          })

                          const success = await updateLogisticaField(
                            row.id,
                            'transportadora',
                            value, // Store the ID in the transportadora field
                            null,
                          )
                          if (success) {
                            console.log(
                              '✅ Successfully updated transportadora',
                            )
                            setLogisticaRows((prevRows) =>
                              prevRows.map((r) =>
                                r.id === row.id
                                  ? { ...r, transportadora: value }
                                  : r,
                              ),
                            )
                          } else {
                            console.error('❌ Failed to update transportadora')
                            alert('Erro ao atualizar transportadora')
                          }
                        } catch (error) {
                          console.error(
                            '❌ Error updating transportadora:',
                            error,
                          )
                          alert(`Erro ao atualizar transportadora: ${error}`)
                        }
                      } else {
                        console.error(
                          '❌ Missing row.id for transportadora update',
                        )
                        alert('Erro: ID da linha não encontrado')
                      }
                    }}
                    onQuantidadeSave={async (
                      row: any,
                      value: number | null,
                    ) => {
                      console.log('🔢 Updating quantidade:', {
                        rowId: row.id,
                        value,
                        valueType: typeof value,
                      })
                      if (row.id) {
                        try {
                          const success = await updateLogisticaField(
                            row.id,
                            'quantidade',
                            value,
                            null,
                          )
                          if (success) {
                            console.log('✅ Successfully updated quantidade')
                            setLogisticaRows((prevRows) =>
                              prevRows.map((r) =>
                                r.id === row.id
                                  ? { ...r, quantidade: value }
                                  : r,
                              ),
                            )
                          } else {
                            console.error('❌ Failed to update quantidade')
                            alert('Erro ao atualizar quantidade')
                          }
                        } catch (error: any) {
                          console.error('❌ Error updating quantidade:', error)
                          alert(
                            `Erro ao atualizar quantidade: ${error?.message || error}`,
                          )
                        }
                      } else {
                        console.error('❌ Missing row.id for quantidade update')
                        alert('Erro: ID da linha não encontrado')
                      }
                    }}
                    onDuplicateRow={async (row: any) => {
                      if (row.id) {
                        // Create a duplicate logistics entry
                        const { data, error } = await supabase
                          .from('logistica_entregas')
                          .insert({
                            item_id: row.item_id,
                            descricao: row.descricao,
                            quantidade: row.quantidade,
                            local_recolha: row.local_recolha,
                            local_entrega: row.local_entrega,
                            transportadora: row.transportadora,
                            id_local_recolha: row.id_local_recolha,
                            id_local_entrega: row.id_local_entrega,
                            data: new Date().toISOString().split('T')[0],
                            is_entrega: row.is_entrega,
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
                          setLogisticaRows((prevRows) => [...prevRows, data])
                        }
                      }
                    }}
                    onNotasSave={async (
                      row: any,
                      outras: string,
                      contacto?: string, // This will be undefined from updated components
                      telefone?: string, // This will be undefined from updated components
                      contacto_entrega?: string,
                      telefone_entrega?: string,
                      data?: string | null,
                    ) => {
                      if (row.id) {
                        const updateData: any = {
                          notas: outras,
                          contacto_entrega: contacto_entrega || null,
                          telefone_entrega: telefone_entrega || null,
                          data: data || null,
                        }

                        // Only include pickup contact fields if they are provided (for backward compatibility)
                        if (contacto !== undefined) {
                          updateData.contacto = contacto || null
                        }
                        if (telefone !== undefined) {
                          updateData.telefone = telefone || null
                        }

                        await Promise.all(
                          Object.entries(updateData).map(([field, value]) =>
                            updateLogisticaField(row.id, field, value, null),
                          ),
                        )

                        setLogisticaRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === row.id ? { ...r, ...updateData } : r,
                          ),
                        )
                      }
                    }}
                    onDeleteRow={async (rowId: string) => {
                      if (rowId) {
                        await deleteLogisticaRow(rowId, new Date())
                        setLogisticaRows((prevRows) =>
                          prevRows.filter((r) => r.id !== rowId),
                        )
                      }
                    }}
                    tableDate={new Date().toISOString().split('T')[0]}
                    onArmazensUpdate={() => {
                      // Refresh reference data
                      fetchReferenceData()
                    }}
                    onTransportadorasUpdate={() => {
                      // Refresh reference data
                      fetchReferenceData()
                    }}
                    onClientesUpdate={() => {
                      // Refresh reference data
                      fetchReferenceData()
                    }}
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

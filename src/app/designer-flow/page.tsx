'use client'

/**
 * Designer Flow Management
 * ------------------------
 * Manages design workflow and designer assignments for production jobs
 *
 * FILTERING RULES:
 * - Only shows jobs that have BOTH FO (numero_fo) and ORC (numero_orc) values
 * - Jobs missing either FO or ORC are filtered out
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  memo,
} from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Eye,
  EyeOff,
  Trash2,
  X,
  RotateCw,
  Plus,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle,
  Copy,
  FileText,
  FilePlus,
  ReceiptText,
  Thermometer,
} from 'lucide-react'
import { createBrowserClient } from '@/utils/supabase'
import { debugLog } from '@/utils/devLogger'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { v4 as uuidv4 } from 'uuid'
import { createPortal } from 'react-dom'
import { useJobUpdater } from '@/hooks/useJobUpdater'
import { useDebounce } from '@/hooks/useDebounce'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import CheckboxColumn from '@/components/ui/CheckboxColumn'
import NotasPopover from '@/components/ui/NotasPopover'
import DatePicker from '@/components/ui/DatePicker'
import Combobox from '@/components/ui/Combobox'
import useDrawerFocus from '@/hooks/useDrawerFocus'
import debounce from 'lodash/debounce'
import { ComplexidadeCombobox } from '@/components/ui/ComplexidadeCombobox'
import { useComplexidades } from '@/hooks/useComplexidades'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DesignerAnalyticsCharts from '@/components/DesignerAnalyticsCharts'

interface Job {
  id: string
  data_in: string
  numero_fo: number
  profile_id: string
  nome_campanha: string
  cliente?: string
  data_saida: string | null
  prioridade: boolean | null
  notas?: string
  created_at?: string
}

interface Designer {
  value: string
  label: string
}

type DesignerItem = {
  id: string // designer_items.id
  item_id: string // designer_items.item_id
  em_curso: boolean | null
  duvidas: boolean | null
  maquete_enviada1: boolean | null
  aprovacao_recebida1: boolean | null
  maquete_enviada2: boolean | null
  aprovacao_recebida2: boolean | null
  maquete_enviada3: boolean | null
  aprovacao_recebida3: boolean | null
  maquete_enviada4: boolean | null
  aprovacao_recebida4: boolean | null
  maquete_enviada5: boolean | null
  aprovacao_recebida5: boolean | null
  maquete_enviada6?: boolean | null
  aprovacao_recebida6?: boolean | null
  paginacao: boolean | null
  data_in: string | null
  data_em_curso: string | null
  data_duvidas: string | null
  data_maquete_enviada1: string | null
  data_aprovacao_recebida1: string | null
  data_maquete_enviada2: string | null
  data_aprovacao_recebida2: string | null
  data_maquete_enviada3: string | null
  data_aprovacao_recebida3: string | null
  data_maquete_enviada4: string | null
  data_aprovacao_recebida4: string | null
  data_maquete_enviada5: string | null
  data_aprovacao_recebida5: string | null
  data_maquete_enviada6?: string | null
  data_aprovacao_recebida6?: string | null
  data_paginacao: string | null
  data_saida: string | null
  path_trabalho: string | null
  updated_at: string | null
  items_base:
    | {
        id: string
        folha_obra_id: string
        descricao: string
        codigo: string | null
        quantidade: number | null
        complexidade_id?: string | null
        complexidade?: string | null
      }
    | {
        id: string
        folha_obra_id: string
        descricao: string
        codigo: string | null
        quantidade: number | null
        complexidade_id?: string | null
        complexidade?: string | null
      }[]
}

interface Item {
  designer_item_id: string // designer_items.id
  id: string // items_base.id
  folha_obra_id: string
  descricao: string
  codigo: string | null
  quantidade: number | null
  complexidade_id?: string | null
  complexidade?: string | null
  notas?: string | null
  em_curso: boolean | null
  duvidas: boolean | null
  maquete_enviada1: boolean | null
  aprovacao_recebida1: boolean | null
  maquete_enviada2: boolean | null
  aprovacao_recebida2: boolean | null
  maquete_enviada3: boolean | null
  aprovacao_recebida3: boolean | null
  maquete_enviada4: boolean | null
  aprovacao_recebida4: boolean | null
  maquete_enviada5: boolean | null
  aprovacao_recebida5: boolean | null
  maquete_enviada6: boolean | null
  aprovacao_recebida6: boolean | null
  paginacao: boolean | null
  data_in: string | null
  data_em_curso: string | null
  data_duvidas: string | null
  data_maquete_enviada1: string | null
  data_aprovacao_recebida1: string | null
  data_maquete_enviada2: string | null
  data_aprovacao_recebida2: string | null
  data_maquete_enviada3: string | null
  data_aprovacao_recebida3: string | null
  data_maquete_enviada4: string | null
  data_aprovacao_recebida4: string | null
  data_maquete_enviada5: string | null
  data_aprovacao_recebida5: string | null
  data_maquete_enviada6: string | null
  data_aprovacao_recebida6: string | null
  data_paginacao: string | null
  data_saida: string | null
  path_trabalho: string | null
  updated_at: string | null
}

interface UpdateItemParams {
  designerItemId: string
  updates: Partial<Item>
}

const DESIGNER_ROLE_ID = '3132fced-ae83-4f56-9d15-c92c3ef6b6ae'

// Helper to determine P color
const getPColor = (job: Job): string => {
  if (job.prioridade) return 'bg-red-500'
  if (job.data_in) {
    const days =
      (Date.now() - new Date(job.data_in).getTime()) / (1000 * 60 * 60 * 24)
    if (days > 3) return 'bg-[var(--blue-light)]'
  }
  return 'bg-green-500'
}

// Helper functions for timeline report
const formatDate = (dateString: string | null): string => {
  if (!dateString) return ''
  const date = new Date(dateString)

  // Check if it's a timestamp (has time component)
  const hasTime = dateString.includes('T') || dateString.includes(' ')

  if (hasTime) {
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } else {
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
}

const calculateDaysBetween = (
  startDate: string | null,
  endDate: string | null,
): string => {
  if (!startDate || !endDate) return ''

  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays === 1 ? '1 dia' : `${diffDays} dias`
}

const findLastApprovalDate = (item: Item): string | null => {
  // Check approval dates in reverse order (6, 5, 4, 3, 2, 1, then main)
  if (item.aprovacao_recebida6 && item.data_aprovacao_recebida6) {
    return item.data_aprovacao_recebida6
  }
  if (item.aprovacao_recebida5 && item.data_aprovacao_recebida5) {
    return item.data_aprovacao_recebida5
  }
  if (item.aprovacao_recebida4 && item.data_aprovacao_recebida4) {
    return item.data_aprovacao_recebida4
  }
  if (item.aprovacao_recebida3 && item.data_aprovacao_recebida3) {
    return item.data_aprovacao_recebida3
  }
  if (item.aprovacao_recebida2 && item.data_aprovacao_recebida2) {
    return item.data_aprovacao_recebida2
  }
  if (item.aprovacao_recebida1 && item.data_aprovacao_recebida1) {
    return item.data_aprovacao_recebida1
  }

  return null
}

// Helper function for smart numeric sorting (handles mixed text/number fields)
const parseNumericField = (
  value: string | number | null | undefined,
): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value

  const strValue = String(value).trim()
  if (strValue === '') return 0

  // Try to parse as number
  const numValue = Number(strValue)
  if (!isNaN(numValue)) return numValue

  // For non-numeric values (letters), sort them after all numbers
  // Use a high number + character code for consistent ordering
  return 999999 + strValue.charCodeAt(0)
}

// 1. Extract fetchJobs and fetchAllItems to standalone functions
const fetchJobs = async (
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>,
  filters: {
    selectedDesigner?: string
    poFilter?: string
    campaignFilter?: string
    itemFilter?: string
    codigoFilter?: string
    showFechados?: boolean
  } = {},
) => {
  const supabase = createBrowserClient()

  try {
    debugLog('fetchJobs called with filters:', filters)

    let jobIds: string[] | null = null

    // STEP 1: Handle item/codigo filtering first (searches globally across all items)
    const hasItemFilters = !!(
      filters.itemFilter?.trim() || filters.codigoFilter?.trim()
    )

    if (hasItemFilters) {
      debugLog(
        '🔍 Item/codigo search active - searching globally in items_base',
      )

      let itemQuery = supabase.from('items_base').select('folha_obra_id')

      // Build OR conditions for item search
      const orConditions = []
      if (filters.itemFilter?.trim()) {
        orConditions.push(`descricao.ilike.%${filters.itemFilter.trim()}%`)
      }
      if (filters.codigoFilter?.trim()) {
        orConditions.push(`codigo.ilike.%${filters.codigoFilter.trim()}%`)
      }

      if (orConditions.length > 0) {
        itemQuery = itemQuery.or(orConditions.join(','))
      }

      const { data: itemData, error: itemError } = await itemQuery

      if (itemError) {
        console.error('Error searching items:', itemError)
        setJobs([])
        return
      }

      if (itemData && itemData.length > 0) {
        jobIds = Array.from(new Set(itemData.map((item) => item.folha_obra_id)))
        debugLog(`Found ${jobIds.length} jobs matching item/codigo search`)
      } else {
        debugLog('No items found matching search criteria')
        setJobs([])
        return
      }
    }

    // STEP 2: Build main jobs query
    let query = supabase
      .from('folhas_obras')
      .select(
        'id, data_in, numero_fo, numero_orc, profile_id, nome_campanha, cliente, data_saida, prioridade, notas, created_at',
      )
      .not('numero_fo', 'is', null)
      .not('numero_orc', 'is', null)
      .neq('numero_fo', '')
      .neq('numero_orc', 0)

    // Apply job ID filter if item search was performed
    if (jobIds) {
      query = query.in('id', jobIds)
    }

    // STEP 3: Apply other filters (only if no item search, or in combination with item search)
    if (filters.selectedDesigner && filters.selectedDesigner !== 'all') {
      query = query.eq('profile_id', filters.selectedDesigner)
    }

    if (filters.poFilter?.trim()) {
      query = query.ilike('numero_fo', `%${filters.poFilter.trim()}%`)
    }

    if (filters.campaignFilter?.trim()) {
      query = query.ilike('nome_campanha', `%${filters.campaignFilter.trim()}%`)
    }

    // STEP 4: Execute main query
    const { data: jobsData, error: jobsError } = await query.order(
      'created_at',
      { ascending: false },
    )

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
      setJobs([])
      return
    }

    if (!jobsData) {
      setJobs([])
      return
    }

    try {
      debugLog(
        'Sample clientes from folhas_obras:',
        (jobsData || []).slice(0, 5).map((j: any) => j?.cliente),
      )
    } catch {}

    // STEP 5: Handle showFechados filter (completion status)
    if (filters.showFechados !== undefined) {
      try {
        debugLog('🔍 Applying showFechados filter')

        // Get all designer items for these jobs to check completion status
        const jobIdsToCheck = jobsData.map((job) => job.id)

        const { data: designerItems, error: designerError } = await supabase
          .from('designer_items')
          .select(
            `
            id,
            item_id,
            paginacao,
            items_base!inner (
              id,
              folha_obra_id
            )
          `,
          )
          .in('items_base.folha_obra_id', jobIdsToCheck)

        if (designerError) {
          console.error(
            'Error fetching designer items for showFechados filter:',
            designerError,
          )
          setJobs(jobsData) // Fall back to unfiltered data
          return
        }

        // Group designer items by job ID
        const itemsByJob = (designerItems || []).reduce(
          (acc: Record<string, any[]>, item: any) => {
            const base = Array.isArray(item.items_base)
              ? item.items_base[0]
              : item.items_base
            const jobId = base?.folha_obra_id

            // Only include valid items with proper structure
            if (jobId && item.id && base?.id) {
              if (!acc[jobId]) acc[jobId] = []
              acc[jobId].push(item)
            }
            return acc
          },
          {},
        )

        // Filter jobs based on completion status
        const filteredJobs = jobsData.filter((job) => {
          const jobItems = itemsByJob[job.id] || []
          const itemCount = jobItems.length
          const completedItems = jobItems.filter(
            (item) => !!item.paginacao,
          ).length
          const allCompleted = itemCount > 0 && completedItems === itemCount

          if (filters.showFechados) {
            // Show "Fechados": jobs with at least one item and all items are completed
            return itemCount > 0 && allCompleted
          } else {
            // Show "Em Aberto": jobs with no items OR at least one incomplete item
            return itemCount === 0 || !allCompleted
          }
        })

        debugLog(
          `Filtered ${jobsData.length} jobs to ${filteredJobs.length} based on showFechados=${filters.showFechados}`,
        )
        setJobs(filteredJobs)
      } catch (error) {
        console.error('Error in showFechados filtering:', error)
        setJobs(jobsData) // Fall back to unfiltered data
      }
    } else {
      setJobs(jobsData)
    }
  } catch (error) {
    console.error('General error in fetchJobs:', error)
    setJobs([])
  }
}

const fetchAllItems = async (
  setAllItems: React.Dispatch<React.SetStateAction<Item[]>>,
  jobs: Job[],
) => {
  const supabase = createBrowserClient()

  // Only fetch items for current jobs to improve performance
  const jobIds = jobs.map((job) => job.id)

  if (jobIds.length === 0) {
    setAllItems([])
    return
  }

  try {
    const { data, error } = await supabase
      .from('designer_items')
      .select(
        `
        id,
        item_id,
            notas,
        em_curso,
        duvidas,
        maquete_enviada1,
        aprovacao_recebida1,
        maquete_enviada2,
        aprovacao_recebida2,
        maquete_enviada3,
        aprovacao_recebida3,
        maquete_enviada4,
        aprovacao_recebida4,
        maquete_enviada5,
        aprovacao_recebida5,
        paginacao,
        data_in,
        data_em_curso,
        data_duvidas,
        data_maquete_enviada1,
        data_aprovacao_recebida1,
        data_maquete_enviada2,
        data_aprovacao_recebida2,
        data_maquete_enviada3,
        data_aprovacao_recebida3,
        data_maquete_enviada4,
        data_aprovacao_recebida4,
        data_maquete_enviada5,
        data_aprovacao_recebida5,
        data_paginacao,
        data_saida,
        path_trabalho,
        updated_at,
        items_base!inner (
          id,
          folha_obra_id,
          descricao,
          codigo,
          quantidade,
          complexidade_id,
          complexidade
        )
      `,
      )
      .in('items_base.folha_obra_id', jobIds)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching all items:', error)
      setAllItems([])
      return
    }

    if (data) {
      const mapped: Item[] = data
        .map((d: DesignerItem) => {
          const base = Array.isArray(d.items_base)
            ? d.items_base[0]
            : d.items_base

          // Skip items with missing data
          if (!base || !base.id || !base.folha_obra_id) return null

          return {
            designer_item_id: d.id,
            id: base.id,
            folha_obra_id: base.folha_obra_id,
            descricao: base.descricao ?? '',
            codigo: base.codigo ?? null,
            quantidade: base.quantidade ?? null,
            complexidade_id: base.complexidade_id ?? null,
            complexidade: base.complexidade ?? null,
            em_curso: d.em_curso,
            duvidas: d.duvidas,
            maquete_enviada1: d.maquete_enviada1,
            aprovacao_recebida1: d.aprovacao_recebida1,
            maquete_enviada2: d.maquete_enviada2,
            aprovacao_recebida2: d.aprovacao_recebida2,
            maquete_enviada3: d.maquete_enviada3,
            aprovacao_recebida3: d.aprovacao_recebida3,
            maquete_enviada4: d.maquete_enviada4,
            aprovacao_recebida4: d.aprovacao_recebida4,
            maquete_enviada5: d.maquete_enviada5,
            aprovacao_recebida5: d.aprovacao_recebida5,
            maquete_enviada6: d.maquete_enviada6 ?? null,
            aprovacao_recebida6: d.aprovacao_recebida6 ?? null,
            paginacao: d.paginacao,
            data_in: d.data_in,
            data_em_curso: d.data_em_curso,
            data_duvidas: d.data_duvidas,
            data_maquete_enviada1: d.data_maquete_enviada1,
            data_aprovacao_recebida1: d.data_aprovacao_recebida1,
            data_maquete_enviada2: d.data_maquete_enviada2,
            data_aprovacao_recebida2: d.data_aprovacao_recebida2,
            data_maquete_enviada3: d.data_maquete_enviada3,
            data_aprovacao_recebida3: d.data_aprovacao_recebida3,
            data_maquete_enviada4: d.data_maquete_enviada4,
            data_aprovacao_recebida4: d.data_aprovacao_recebida4,
            data_maquete_enviada5: d.data_maquete_enviada5,
            data_aprovacao_recebida5: d.data_aprovacao_recebida5,
            data_maquete_enviada6: d.data_maquete_enviada6 ?? null,
            data_aprovacao_recebida6: d.data_aprovacao_recebida6 ?? null,
            data_paginacao: d.data_paginacao,
            data_saida: d.data_saida,
            path_trabalho: d.path_trabalho,
            updated_at: d.updated_at,
          }
        })
        .filter(Boolean) as Item[] // Remove null items

      setAllItems(mapped)
    } else {
      setAllItems([])
    }
  } catch (error) {
    console.error('Error in fetchAllItems:', error)
    setAllItems([])
  }
}

export default function DesignerFlow() {
  const [selectedDesigner, setSelectedDesigner] = useState('all')
  const [poFilter, setPoFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [designers, setDesigners] = useState<Designer[]>([])
  const [sortColumn, setSortColumn] = useState<string>('prioridade')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [hasUserSorted, setHasUserSorted] = useState(false) // Track if user has manually sorted
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null)
  const closeBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const triggerBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [drawerItems, setDrawerItems] = useState<Record<string, Item[]>>({})
  const [loadingItems, setLoadingItems] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    jobId: string
    itemId: string
    idx: number
  } | null>(null)
  const [focusRow, setFocusRow] = useState<{
    jobId: string
    itemId: string
  } | null>(null)
  const inputRefs = useRef<
    Record<string, HTMLInputElement | HTMLTextAreaElement | null>
  >({})
  const [pathDialog, setPathDialog] = useState<{
    jobId: string
    itemId: string
    idx: number
  } | null>(null)
  const [pathInput, setPathInput] = useState('')
  const pathInputRef = useRef<HTMLInputElement | null>(null)
  const [drawerSort, setDrawerSort] = useState<
    Record<string, { column: keyof Item; direction: 'asc' | 'desc' }>
  >({})
  const [showNewJobModal, setShowNewJobModal] = useState(false)
  const [newNumeroFo, setNewNumeroFo] = useState('')
  const [newNomeCampanha, setNewNomeCampanha] = useState('')
  const [newNotas, setNewNotas] = useState('')
  const [newFoError, setNewFoError] = useState<string | null>(null)
  const [creatingJob, setCreatingJob] = useState(false)
  const [showFechados, setShowFechados] = useState(false)
  const [allItems, setAllItems] = useState<Item[]>([])
  const [feriadosSet, setFeriadosSet] = useState<Set<string>>(new Set())
  const [entregaStatusByJob, setEntregaStatusByJob] = useState<
    Record<string, 'red' | 'yellow' | null>
  >({})
  const [nextEntregaDateByJob, setNextEntregaDateByJob] = useState<
    Record<string, string | null>
  >({})
  const [pendingNewJobId, setPendingNewJobId] = useState<string | null>(null)
  const foInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [itemFilter, setItemFilter] = useState('')
  const [codigoFilter, setCodigoFilter] = useState('')
  const {
    complexidades,
    isLoading: isLoadingComplexidades,
    error: complexidadeError,
  } = useComplexidades()

  // Debounced filter values for performance
  const [debouncedPoFilter, setDebouncedPoFilter] = useState('')
  const [debouncedCampaignFilter, setDebouncedCampaignFilter] = useState('')
  const [debouncedItemFilter, setDebouncedItemFilter] = useState('')
  const [debouncedCodigoFilter, setDebouncedCodigoFilter] = useState('')

  // Setup a safer implementation of createPortal for client components
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  )

  useEffect(() => {
    setPortalContainer(document.body)
  }, [])

  // Debounce filter values
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPoFilter(poFilter), 300)
    return () => clearTimeout(timer)
  }, [poFilter])

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedCampaignFilter(campaignFilter),
      300,
    )
    return () => clearTimeout(timer)
  }, [campaignFilter])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedItemFilter(itemFilter), 300)
    return () => clearTimeout(timer)
  }, [itemFilter])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCodigoFilter(codigoFilter), 300)
    return () => clearTimeout(timer)
  }, [codigoFilter])

  // Debounce hook
  const debouncedUpdateDescricao = useDebounce(
    async (itemId: string, value: string) => {
      if (!itemId) return // Don't make API calls with empty IDs
      const supabase = createBrowserClient()
      await supabase
        .from('items_base')
        .update({ descricao: value })
        .eq('id', itemId)
    },
    400,
  )
  const debouncedUpdateCodigo = useDebounce(
    async (itemId: string, value: string) => {
      if (!itemId) return // Don't make API calls with empty IDs
      try {
        const supabase = createBrowserClient()

        // Try to find the item in the current state
        const currentItem = Object.values(drawerItems)
          .flat()
          .find((item: any) => item.id === itemId) as Item | undefined

        if (!currentItem || !currentItem.folha_obra_id) {
          return
        }

        // Use upsert instead of update to create if it doesn't exist
        try {
          const { data, error } = await supabase
            .from('items_base')
            .upsert(
              {
                id: itemId,
                folha_obra_id: currentItem.folha_obra_id,
                descricao: currentItem.descricao || '',
                codigo: value || '', // Ensure non-null value
              },
              {
                onConflict: 'id',
                ignoreDuplicates: false,
              },
            )
            .select()

          if (error) {
            // Special handling for "logistica_items does not exist" server error
            if (
              error.message?.includes(
                'relation "logistica_items" does not exist',
              )
            ) {
              return
            }
          }
        } catch (updateErr) {}
      } catch (err) {}
    },
    400,
  )

  // Debounced update function for complexidade
  const debouncedUpdateComplexidade = useMemo(
    () =>
      debounce(async (itemId: string, complexidadeId: string | null) => {
        debugLog('debouncedUpdateComplexidade called with:', {
          itemId,
          complexidadeId,
        })
        const supabase = createBrowserClient()

        try {
          // Start a transaction by using single-query RPC
          const { data, error } = await supabase.rpc('update_item_complexity', {
            p_item_id: itemId,
            p_complexity_id: complexidadeId,
          })

          if (error) {
            console.error('Error updating complexity:', error)
            // Revert optimistic update on error
            setDrawerItems((prev: any) => {
              const newDrawerItems = { ...prev }
              for (const folhaId in newDrawerItems) {
                const items = newDrawerItems[folhaId]
                const itemIndex = items.findIndex(
                  (item: any) => item.id === itemId,
                )
                if (itemIndex !== -1) {
                  newDrawerItems[folhaId] = [
                    ...items.slice(0, itemIndex),
                    {
                      ...items[itemIndex],
                      complexidade_id: items[itemIndex].complexidade_id,
                    },
                    ...items.slice(itemIndex + 1),
                  ]
                  break
                }
              }
              return newDrawerItems
            })
            return
          }

          debugLog('Successfully updated complexidade:', data)
        } catch (error) {
          console.error('Error in debouncedUpdateComplexidade:', error)
        }
      }, 500),
    [],
  )

  useEffect(() => {
    if (openDrawerId && closeBtnRefs.current[openDrawerId]) {
      closeBtnRefs.current[openDrawerId]?.focus()
    }
  }, [openDrawerId])

  useEffect(() => {
    if (focusRow && inputRefs.current[`${focusRow.jobId}_${focusRow.itemId}`]) {
      inputRefs.current[`${focusRow.jobId}_${focusRow.itemId}`]?.focus()
      setFocusRow(null)
    }
  }, [drawerItems, focusRow])

  useLayoutEffect(() => {
    if (pathDialog) {
      setTimeout(() => {
        if (pathInputRef.current) {
          pathInputRef.current.focus()
        }
      }, 0)
    }
  }, [pathDialog])

  useEffect(() => {
    if (openDrawerId && foInputRefs.current[openDrawerId]) {
      foInputRefs.current[openDrawerId]?.focus()
    }
  }, [openDrawerId])

  // Fetch designers
  useEffect(() => {
    const fetchDesigners = async () => {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, role_id')
      if (!error && data) {
        const designersList = data
          .filter((d: { role_id: string }) => d.role_id === DESIGNER_ROLE_ID)
          .sort((a: { first_name: string }, b: { first_name: string }) =>
            a.first_name.localeCompare(b.first_name),
          )
          .map((d: { id: string; first_name: string }) => ({
            value: d.id,
            label: d.first_name,
          }))
        setDesigners([
          { value: 'all', label: 'Todos os Designers' },
          ...designersList,
        ])
      }
    }
    fetchDesigners()
  }, [])

  // Fetch jobs with filters for Em Aberto tab
  useEffect(() => {
    fetchJobs(setJobs, {
      selectedDesigner,
      poFilter: debouncedPoFilter,
      campaignFilter: debouncedCampaignFilter,
      itemFilter: debouncedItemFilter,
      codigoFilter: debouncedCodigoFilter,
      showFechados: false, // Em Aberto jobs
    })
  }, [
    selectedDesigner,
    debouncedPoFilter,
    debouncedCampaignFilter,
    debouncedItemFilter,
    debouncedCodigoFilter,
  ])

  // Separate state for Paginados jobs
  const [paginadosJobs, setPaginadosJobs] = useState<Job[]>([])

  // Fetch jobs for Paginados tab
  useEffect(() => {
    fetchJobs(setPaginadosJobs, {
      selectedDesigner,
      poFilter: debouncedPoFilter,
      campaignFilter: debouncedCampaignFilter,
      itemFilter: debouncedItemFilter,
      codigoFilter: debouncedCodigoFilter,
      showFechados: true, // Paginados jobs
    })
  }, [
    selectedDesigner,
    debouncedPoFilter,
    debouncedCampaignFilter,
    debouncedItemFilter,
    debouncedCodigoFilter,
  ])

  // Fetch all items for status calculations
  useEffect(() => {
    const allJobs = [...jobs, ...paginadosJobs]
    fetchAllItems(setAllItems, allJobs)
  }, [jobs, paginadosJobs])

  // Load holidays (feriados) once
  useEffect(() => {
    const loadFeriados = async () => {
      try {
        const supabase = createBrowserClient()
        const { data, error } = await supabase.from('feriados').select('*')
        if (!error && data) {
          const dates = new Set<string>()
          ;(data as any[]).forEach((row) => {
            const raw =
              row.data || row.data_feriado || row.date || row.dia || row.dta
            if (raw) {
              const d = new Date(raw)
              if (!isNaN(d.getTime())) {
                const y = d.getFullYear()
                const m = String(d.getMonth() + 1).padStart(2, '0')
                const da = String(d.getDate()).padStart(2, '0')
                dates.add(`${y}-${m}-${da}`)
              }
            }
          })
          setFeriadosSet(dates)
        }
      } catch {}
    }
    loadFeriados()
  }, [])

  // Business day utilities
  const isBusinessDay = (date: Date) => {
    const day = date.getDay()
    if (day === 0 || day === 6) return false
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return !feriadosSet.has(`${y}-${m}-${d}`)
  }

  const businessDaysDiffFromToday = (target: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = new Date(target)
    end.setHours(0, 0, 0, 0)
    if (end <= today) return Number.MAX_SAFE_INTEGER
    let count = 0
    const cursor = new Date(today)
    cursor.setDate(cursor.getDate() + 1)
    while (cursor <= end) {
      if (isBusinessDay(cursor)) count++
      cursor.setDate(cursor.getDate() + 1)
    }
    return count
  }

  // Compute entrega statuses per job (red: next business day, yellow: 2 business days)
  useEffect(() => {
    const computeEntregaStatuses = async () => {
      try {
        if (!allItems || allItems.length === 0) {
          setEntregaStatusByJob({})
          return
        }
        const supabase = createBrowserClient()
        const itemIdToJobId: Record<string, string> = {}
        const itemIdToPaginacao: Record<string, boolean> = {}
        const uniqueItemIds = new Set<string>()
        allItems.forEach((it) => {
          if (it.id && it.folha_obra_id) {
            itemIdToJobId[it.id] = it.folha_obra_id
            itemIdToPaginacao[it.id] = !!it.paginacao
            uniqueItemIds.add(it.id)
          }
        })
        const itemIds = Array.from(uniqueItemIds)
        if (itemIds.length === 0) {
          setEntregaStatusByJob({})
          return
        }

        const { data, error } = await supabase
          .from('logistica_entregas')
          .select('item_id, data_saida, saiu')
          .in('item_id', itemIds)
          .not('data_saida', 'is', null)
          .or('saiu.is.null,saiu.eq.false')

        if (error || !data) {
          setEntregaStatusByJob({})
          setNextEntregaDateByJob({})
          return
        }

        const statusByJob: Record<string, 'red' | 'yellow' | null> = {}
        const datesByJob: Record<string, Date[]> = {}
        ;(data as any[]).forEach((row) => {
          const itemId = row.item_id as string
          const jobId = itemIdToJobId[itemId]
          if (!jobId) return
          // Ignore items that are already paginated (designer_items.paginacao === true)
          if (itemIdToPaginacao[itemId] === true) return
          const d = new Date(row.data_saida)
          if (isNaN(d.getTime())) return
          // Collect all candidate dates per job for display column
          if (!datesByJob[jobId]) datesByJob[jobId] = []
          datesByJob[jobId].push(new Date(d))
          const diff = businessDaysDiffFromToday(d)
          if (diff === 1) {
            statusByJob[jobId] = 'red'
          } else if (diff === 2) {
            if (statusByJob[jobId] !== 'red') statusByJob[jobId] = 'yellow'
          }
        })

        setEntregaStatusByJob(statusByJob)
        // Compute earliest date per job among non-paginados
        const nextMap: Record<string, string | null> = {}
        Object.entries(datesByJob).forEach(([jobId, dates]) => {
          if (!dates || dates.length === 0) {
            nextMap[jobId] = null
            return
          }
          const normalized = dates.map((d) => {
            const dd = new Date(d)
            dd.setHours(0, 0, 0, 0)
            return dd
          })
          const chosen = normalized.reduce(
            (min, d) => (d < min ? d : min),
            new Date(8640000000000000),
          )
          if (isFinite(chosen.getTime())) {
            nextMap[jobId] = chosen.toISOString()
          } else {
            nextMap[jobId] = null
          }
        })
        setNextEntregaDateByJob(nextMap)
      } catch {
        setEntregaStatusByJob({})
        setNextEntregaDateByJob({})
      }
    }
    computeEntregaStatuses()
  }, [allItems, feriadosSet])

  // Jobs are now filtered at database level
  const filteredJobs = jobs

  // Sorting logic
  const handleSort = (column: string) => {
    setHasUserSorted(true) // Mark that user has manually sorted
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortedJobs = (jobs: Job[]) => {
    // Only apply sorting if user has manually sorted
    if (!hasUserSorted) {
      return [...jobs] // Return unsorted data
    }

    const sorted = [...jobs].sort((a, b) => {
      let aValue: any = a[sortColumn as keyof Job]
      let bValue: any = b[sortColumn as keyof Job]
      // Special cases
      if (sortColumn === 'data_in' || sortColumn === 'data_saida') {
        aValue = aValue ? new Date(aValue).getTime() : 0
        bValue = bValue ? new Date(bValue).getTime() : 0
      }
      if (sortColumn === 'numero_fo') {
        // Smart numeric sorting: numbers first, then letters
        aValue = parseNumericField(aValue)
        bValue = parseNumericField(bValue)
      }
      if (sortColumn === 'status') {
        const calcPercent = (job: Job): number => {
          const jobItems = allItems.filter(
            (item) =>
              item.folha_obra_id === job.id && item.id && item.designer_item_id,
          )
          const total = jobItems.length
          const done = jobItems.filter((item) => item.paginacao).length
          return total > 0 ? Math.round((done / total) * 100) : 0
        }
        const aPercent = calcPercent(a)
        const bPercent = calcPercent(b)
        return sortDirection === 'asc'
          ? aPercent - bPercent
          : bPercent - aPercent
      }
      if (sortColumn === 'profile_id') {
        const aName =
          designers.find((d) => d.value === a.profile_id)?.label || ''
        const bName =
          designers.find((d) => d.value === b.profile_id)?.label || ''
        return sortDirection === 'asc'
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName)
      }
      if (sortColumn === 'prioridade') {
        // Map P color states to numeric weights for sorting
        const weight = (job: Job): number => {
          if (job.prioridade) return 2 // red (highest)
          if (job.data_in) {
            const days =
              (Date.now() - new Date(job.data_in).getTime()) /
              (1000 * 60 * 60 * 24)
            if (days > 3) return 1 // blue (middle)
          }
          return 0 // green (lowest)
        }
        const wa = weight(a)
        const wb = weight(b)
        return sortDirection === 'asc' ? wa - wb : wb - wa
      }
      if (sortColumn === 'entrega') {
        // Map E thermometer status to weights: red > yellow > none
        const weight = (job: Job): number => {
          const status = entregaStatusByJob[job.id]
          if (status === 'red') return 2
          if (status === 'yellow') return 1
          return 0
        }
        const wa = weight(a)
        const wb = weight(b)
        return sortDirection === 'asc' ? wa - wb : wb - wa
      }
      if (sortColumn === 'data_saida') {
        // Sort by earliest nextEntregaDateByJob per job (from logistica_entregas)
        const aIso = nextEntregaDateByJob[a.id]
        const bIso = nextEntregaDateByJob[b.id]
        const at = aIso ? new Date(aIso).getTime() : 0
        const bt = bIso ? new Date(bIso).getTime() : 0
        return sortDirection === 'asc' ? at - bt : bt - at
      }
      if (sortColumn === 'cliente') {
        const aName = (a.cliente || '').toString()
        const bName = (b.cliente || '').toString()
        return sortDirection === 'asc'
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName)
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      return 0
    })
    return sorted
  }

  const sortedJobs = getSortedJobs(filteredJobs)

  // Handler to update designer for a job
  const handleDesignerChange = async (jobId: string, newDesigner: string) => {
    setJobs((prevJobs) =>
      prevJobs.map((job) =>
        job.id === jobId ? { ...job, profile_id: newDesigner } : job,
      ),
    )
    // Update in Supabase
    const supabase = createBrowserClient()
    await supabase
      .from('folhas_obras')
      .update({ profile_id: newDesigner })
      .eq('id', jobId)
  }

  // Add refreshItems helper function after your existing useEffects
  const refreshItems = async (jobId: string) => {
    const supabase = createBrowserClient()
    setLoadingItems(true)

    try {
      const { data, error } = await supabase
        .from('designer_items')
        .select(
          `
          id,
          item_id,
        notas,
          em_curso,
          duvidas,
          maquete_enviada1,
          aprovacao_recebida1,
          maquete_enviada2,
          aprovacao_recebida2,
          maquete_enviada3,
          aprovacao_recebida3,
          maquete_enviada4,
          aprovacao_recebida4,
          maquete_enviada5,
          aprovacao_recebida5,
          maquete_enviada6,
          aprovacao_recebida6,
          paginacao,
          data_in,
          data_em_curso,
          data_duvidas,
          data_maquete_enviada1,
          data_aprovacao_recebida1,
          data_maquete_enviada2,
          data_aprovacao_recebida2,
          data_maquete_enviada3,
          data_aprovacao_recebida3,
          data_maquete_enviada4,
          data_aprovacao_recebida4,
          data_maquete_enviada5,
          data_aprovacao_recebida5,
          data_maquete_enviada6,
          data_aprovacao_recebida6,
          data_paginacao,
          data_saida,
          path_trabalho,
          updated_at,
          items_base!inner (
            id,
            folha_obra_id,
            descricao,
            codigo,
            quantidade,
            complexidade_id,
            complexidade
          )
        `,
        )
        .eq('items_base.folha_obra_id', jobId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error refreshing items:', error)
        setLoadingItems(false)
        return
      }

      if (data) {
        const mapped: Item[] = data
          .map((d: DesignerItem) => {
            const base = Array.isArray(d.items_base)
              ? d.items_base[0]
              : d.items_base

            // Skip items with missing data
            if (!base || !base.id || !base.folha_obra_id) return null

            return {
              designer_item_id: d.id,
              id: base.id,
              folha_obra_id: base.folha_obra_id,
              descricao: base.descricao ?? '',
              codigo: base.codigo ?? null,
              quantidade: base.quantidade ?? null,
              complexidade_id: base.complexidade_id ?? null,
              complexidade: base.complexidade ?? null,
              em_curso: d.em_curso,
              duvidas: d.duvidas,
              maquete_enviada1: d.maquete_enviada1,
              aprovacao_recebida1: d.aprovacao_recebida1,
              maquete_enviada2: d.maquete_enviada2,
              aprovacao_recebida2: d.aprovacao_recebida2,
              maquete_enviada3: d.maquete_enviada3,
              aprovacao_recebida3: d.aprovacao_recebida3,
              maquete_enviada4: d.maquete_enviada4,
              aprovacao_recebida4: d.aprovacao_recebida4,
              maquete_enviada5: d.maquete_enviada5,
              aprovacao_recebida5: d.aprovacao_recebida5,
              maquete_enviada6: d.maquete_enviada6 ?? null,
              aprovacao_recebida6: d.aprovacao_recebida6 ?? null,
              paginacao: d.paginacao,
              data_in: d.data_in,
              data_em_curso: d.data_em_curso,
              data_duvidas: d.data_duvidas,
              data_maquete_enviada1: d.data_maquete_enviada1,
              data_aprovacao_recebida1: d.data_aprovacao_recebida1,
              data_maquete_enviada2: d.data_maquete_enviada2,
              data_aprovacao_recebida2: d.data_aprovacao_recebida2,
              data_maquete_enviada3: d.data_maquete_enviada3,
              data_aprovacao_recebida3: d.data_aprovacao_recebida3,
              data_maquete_enviada4: d.data_maquete_enviada4,
              data_aprovacao_recebida4: d.data_aprovacao_recebida4,
              data_maquete_enviada5: d.data_maquete_enviada5,
              data_aprovacao_recebida5: d.data_aprovacao_recebida5,
              data_maquete_enviada6: d.data_maquete_enviada6 ?? null,
              data_aprovacao_recebida6: d.data_aprovacao_recebida6 ?? null,
              data_paginacao: d.data_paginacao,
              data_saida: d.data_saida,
              path_trabalho: d.path_trabalho,
              updated_at: d.updated_at,
            }
          })
          .filter(Boolean) as Item[] // Remove null items

        setDrawerItems((prev) => ({ ...prev, [jobId]: mapped }))
      } else {
        setDrawerItems((prev) => ({ ...prev, [jobId]: [] }))
      }
    } catch (error) {
      console.error('Error in refreshItems:', error)
    } finally {
      setLoadingItems(false)
    }
  }

  // Update useEffect for fetching items when drawer opens
  useEffect(() => {
    if (!openDrawerId) return
    refreshItems(openDrawerId)
  }, [openDrawerId])

  // Helper to sort drawer items
  const getSortedDrawerItems = (jobId: string, items: Item[]) => {
    const sort = drawerSort[jobId]
    if (!sort) return items
    const { column, direction } = sort

    return [...items].sort((a, b) => {
      // Handle boolean columns (existing logic)
      if (
        column === 'em_curso' ||
        column === 'duvidas' ||
        column === 'maquete_enviada1' ||
        column === 'aprovacao_recebida1' ||
        column === 'maquete_enviada2' ||
        column === 'aprovacao_recebida2' ||
        column === 'maquete_enviada3' ||
        column === 'aprovacao_recebida3' ||
        column === 'maquete_enviada4' ||
        column === 'aprovacao_recebida4' ||
        column === 'maquete_enviada5' ||
        column === 'aprovacao_recebida5' ||
        column === 'maquete_enviada6' ||
        column === 'aprovacao_recebida6' ||
        column === 'paginacao'
      ) {
        const aValue = !!a[column]
        const bValue = !!b[column]
        if (aValue === bValue) return 0
        if (direction === 'asc') return aValue ? -1 : 1
        return aValue ? 1 : -1
      }

      // Handle string columns
      if (
        column === 'descricao' ||
        column === 'codigo' ||
        column === 'complexidade'
      ) {
        const aValue = (a[column] || '').toString().toLowerCase()
        const bValue = (b[column] || '').toString().toLowerCase()
        if (direction === 'asc') {
          return aValue.localeCompare(bValue)
        } else {
          return bValue.localeCompare(aValue)
        }
      }

      // Handle numeric columns
      if (column === 'quantidade') {
        const aValue = a[column] || 0
        const bValue = b[column] || 0
        if (direction === 'asc') {
          return aValue - bValue
        } else {
          return bValue - aValue
        }
      }

      return 0
    })
  }

  useEffect(() => {
    if (pendingNewJobId && sortedJobs.some((j) => j.id === pendingNewJobId)) {
      setOpenDrawerId(pendingNewJobId)
      setPendingNewJobId(null)
    }
  }, [pendingNewJobId, sortedJobs])

  const updateJob = (jobId: string, updates: Partial<Job>) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, ...updates } : job)),
    )
  }

  // Update item in state (optimistic update)
  const updateItemInState = useCallback(
    ({ designerItemId, updates }: UpdateItemParams) => {
      debugLog('updateItemInState called with:', { designerItemId, updates })

      setDrawerItems((prev) => {
        const newDrawerItems = { ...prev }
        let updated = false

        // Find the item in all folhas
        for (const folhaId in newDrawerItems) {
          const items = newDrawerItems[folhaId]
          const itemIndex = items.findIndex(
            (item) => item.designer_item_id === designerItemId,
          )

          if (itemIndex !== -1) {
            // Create new array with updated item
            newDrawerItems[folhaId] = [
              ...items.slice(0, itemIndex),
              { ...items[itemIndex], ...updates },
              ...items.slice(itemIndex + 1),
            ]
            updated = true
            break
          }
        }

        // Only return new state if we actually updated something
        return updated ? newDrawerItems : prev
      })
    },
    [],
  )

  // Simple update function with optimistic updates
  const updateComplexidade = useCallback(
    async (itemId: string, complexidadeGrau: string | null) => {
      // Store previous state for rollback
      const previousState = { ...drawerItems }

      try {
        // Get the complexidade ID if a grau is provided
        let complexidadeId = null
        if (complexidadeGrau && complexidadeGrau !== 'none') {
          const supabase = createBrowserClient()
          const { data, error } = await supabase
            .from('complexidade')
            .select('id')
            .eq('grau', complexidadeGrau)
            .single()

          if (error) throw error
          if (data) {
            complexidadeId = data.id
          }
        }

        // Optimistic update
        setDrawerItems((prev) => {
          const newDrawerItems = { ...prev }
          for (const folhaId in newDrawerItems) {
            const items = newDrawerItems[folhaId]
            const itemIndex = items.findIndex((item) => item.id === itemId)
            if (itemIndex !== -1) {
              newDrawerItems[folhaId] = [
                ...items.slice(0, itemIndex),
                {
                  ...items[itemIndex],
                  complexidade_id: complexidadeId,
                  complexidade:
                    complexidadeGrau === 'none' ? null : complexidadeGrau,
                },
                ...items.slice(itemIndex + 1),
              ]
              break
            }
          }
          return newDrawerItems
        })

        // Update database
        const supabase = createBrowserClient()
        const { error } = await supabase
          .from('items_base')
          .update({
            complexidade_id: complexidadeId,
            complexidade: complexidadeGrau === 'none' ? null : complexidadeGrau,
          })
          .eq('id', itemId)

        if (error) {
          throw error
        }
      } catch (error) {
        console.error('Error updating complexidade:', error)
        // Rollback on error
        setDrawerItems(previousState)
        throw error
      }
    },
    [drawerItems],
  )

  return (
    <>
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Designer Flow</h1>
        </div>

        {/* Filters Section */}
        <div className="flex w-full items-center gap-4">
          <div className="flex flex-1 gap-4">
            <Select
              value={selectedDesigner}
              onValueChange={setSelectedDesigner}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os Designers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Designers</SelectItem>
                {designers
                  .filter((d) => d.value !== 'all')
                  .map((designer) => (
                    <SelectItem key={designer.value} value={designer.value}>
                      {designer.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Filtra FO"
              value={poFilter}
              onChange={(e) => setPoFilter(e.target.value)}
              className="h-10 w-[120px] rounded-none"
            />
            <Input
              placeholder="Filtra Nome Campanha"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="h-10 flex-1 rounded-none"
            />
            <Input
              placeholder="Filtra Item"
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              className="h-10 flex-1 rounded-none"
            />
            <Input
              placeholder="Filtra Código"
              value={codigoFilter}
              maxLength={19}
              onChange={(e) => setCodigoFilter(e.target.value)}
              className="h-10 w-[140px] rounded-none"
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="h-10 w-10 rounded-none"
                  onClick={() => {
                    setSelectedDesigner('all')
                    setPoFilter('')
                    setCampaignFilter('')
                    setItemFilter('')
                    setCodigoFilter('')
                    setShowFechados(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Limpar Filtros</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="ml-auto flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-10 w-10 rounded-none"
                    onClick={async () => {
                      // Refresh jobs with current filters
                      await fetchJobs(setJobs, {
                        selectedDesigner,
                        poFilter: debouncedPoFilter,
                        campaignFilter: debouncedCampaignFilter,
                        itemFilter: debouncedItemFilter,
                        codigoFilter: debouncedCodigoFilter,
                        showFechados,
                      })
                      // If a drawer is open, refresh its items
                      if (openDrawerId) {
                        await refreshItems(openDrawerId)
                      }
                    }}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Tabs defaultValue="em-aberto" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-none border-2">
            <TabsTrigger value="em-aberto" className="rounded-none">
              Em Aberto
            </TabsTrigger>
            <TabsTrigger value="paginados" className="rounded-none">
              Paginados
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-none">
              Análises & Gráficos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="em-aberto" className="space-y-6">
            {/* Data Table */}
            <div className="bg-background border-border w-full rounded-none border-2">
              <div className="w-full rounded-none">
                <Table className="w-full rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[90px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSort('data_in')}
                      >
                        Data In
                        {sortColumn === 'data_in' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[90px] cursor-pointer border-b-2 bg-[var(--orange)] text-center font-bold uppercase select-none"
                        onClick={() => handleSort('numero_fo')}
                      >
                        FO
                        {sortColumn === 'numero_fo' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[140px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSort('profile_id')}
                      >
                        Designer
                        {sortColumn === 'profile_id' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 min-w-[200px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSort('cliente')}
                      >
                        Nome Cliente
                        {sortColumn === 'cliente' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 min-w-[200px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSort('cliente')}
                      >
                        Nome Cliente
                        {sortColumn === 'cliente' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 min-w-[200px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSort('nome_campanha')}
                      >
                        Nome Campanha
                        {sortColumn === 'nome_campanha' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[180px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSort('status')}
                      >
                        Status
                        {sortColumn === 'status' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[36px] cursor-pointer border-b-2 bg-[var(--orange)] text-center font-bold uppercase select-none"
                        onClick={() => handleSort('prioridade')}
                      >
                        P
                        {sortColumn === 'prioridade' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>

                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] text-center font-bold uppercase select-none"
                        onClick={() => handleSort('data_saida')}
                      >
                        Data Saída
                        {sortColumn === 'data_saida' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[90px] border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedJobs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="text-center text-gray-500"
                        >
                          Nenhum trabalho encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedJobs.map((job, index) => (
                        <TableRow key={job.id || `job-${index}`}>
                          <TableCell>
                            {job.data_in
                              ? new Date(job.data_in).toLocaleDateString()
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {job.numero_fo}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={job.profile_id || ''}
                              onValueChange={(val) =>
                                handleDesignerChange(job.id, val)
                              }
                            >
                              <SelectTrigger className="h-10 w-[120px] rounded-none">
                                <SelectValue>
                                  {designers.find(
                                    (d) => d.value === job.profile_id,
                                  )?.label || ''}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {designers
                                  .filter((d) => d.value !== 'all')
                                  .map((designer) => (
                                    <SelectItem
                                      key={designer.value}
                                      value={designer.value}
                                    >
                                      {designer.label}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const name = job.cliente || ''
                              if (!name) return '-'
                              return name.length > 24
                                ? `${name.slice(0, 24)}...`
                                : name
                            })()}
                          </TableCell>
                          <TableCell>{job.nome_campanha}</TableCell>
                          <TableCell>
                            {/* Status progress bar */}
                            {(() => {
                              // Get all items for this job from the new data structure
                              const jobItems = allItems.filter(
                                (item) =>
                                  item.folha_obra_id === job.id &&
                                  item.id && // Ensure valid items only
                                  item.designer_item_id, // Ensure it has a designer item association
                              )

                              // Calculate progress
                              const total = jobItems.length
                              const done = jobItems.filter(
                                (item) => item.paginacao,
                              ).length
                              const percent =
                                total > 0 ? Math.round((done / total) * 100) : 0

                              return (
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={percent}
                                    className="w-full"
                                  />
                                  <span className="w-10 text-right font-mono text-xs">
                                    {percent}%
                                  </span>
                                </div>
                              )
                            })()}
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              className={`focus:ring-primary mx-auto flex h-3 w-3 items-center justify-center rounded-full transition-colors focus:ring-2 focus:outline-none ${getPColor(job)}`}
                              title={
                                job.prioridade
                                  ? 'Prioritário'
                                  : job.data_in &&
                                      (Date.now() -
                                        new Date(job.data_in).getTime()) /
                                        (1000 * 60 * 60 * 24) >
                                        3
                                    ? 'Aguardando há mais de 3 dias'
                                    : 'Normal'
                              }
                              onClick={async () => {
                                const newPrioridade = !job.prioridade
                                updateJob(job.id, { prioridade: newPrioridade })
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {(() => {
                              const status = entregaStatusByJob[job.id]
                              const colorClass =
                                status === 'red'
                                  ? 'text-red-600'
                                  : status === 'yellow'
                                    ? 'text-orange-500'
                                    : 'text-muted-foreground'
                              return (
                                <Thermometer
                                  className={`mx-auto h-4 w-4 ${colorClass}`}
                                  strokeWidth={2}
                                  fill="currentColor"
                                />
                              )
                            })()}
                          </TableCell>
                          <TableCell className="text-center">
                            {(() => {
                              const iso = nextEntregaDateByJob[job.id]
                              if (!iso) return '-'
                              try {
                                const d = new Date(iso)
                                return d.toLocaleDateString('pt-PT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              } catch {
                                return '-'
                              }
                            })()}
                          </TableCell>
                          <TableCell className="flex justify-center gap-2">
                            <Button
                              variant="default"
                              size="icon"
                              aria-label="Ver"
                              className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              ref={(el) => {
                                triggerBtnRefs.current[job.id] = el
                              }}
                              onClick={() => setOpenDrawerId(job.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              aria-label="Excluir"
                              className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    'Tem certeza que deseja apagar este trabalho e todos os seus itens?',
                                  )
                                )
                                  return

                                try {
                                  const supabase = createBrowserClient()

                                  // Get all items_base for this job
                                  const { data: baseItems, error: fetchError } =
                                    await supabase
                                      .from('items_base')
                                      .select('id')
                                      .eq('folha_obra_id', job.id)

                                  if (fetchError) {
                                    console.error(
                                      'Error fetching items for deletion:',
                                      fetchError,
                                    )
                                    return
                                  }

                                  if (baseItems && baseItems.length > 0) {
                                    const itemIds = baseItems.map(
                                      (item) => item.id,
                                    )

                                    // Delete any designer_items linked to these items_base
                                    const { error: designerError } =
                                      await supabase
                                        .from('designer_items')
                                        .delete()
                                        .in('item_id', itemIds)

                                    if (designerError) {
                                      console.error(
                                        'Error deleting designer items:',
                                        designerError,
                                      )
                                    }

                                    // Delete any logistica_entregas linked to these items
                                    const { error: logisticaError } =
                                      await supabase
                                        .from('logistica_entregas')
                                        .delete()
                                        .in('item_id', itemIds)

                                    if (logisticaError) {
                                      console.error(
                                        'Error deleting logistica items:',
                                        logisticaError,
                                      )
                                    }

                                    // Delete all items_base for this job
                                    const { error: itemsError } = await supabase
                                      .from('items_base')
                                      .delete()
                                      .eq('folha_obra_id', job.id)

                                    if (itemsError) {
                                      console.error(
                                        'Error deleting base items:',
                                        itemsError,
                                      )
                                    }
                                  }

                                  // Delete the job
                                  const { error: jobError } = await supabase
                                    .from('folhas_obras')
                                    .delete()
                                    .eq('id', job.id)

                                  if (jobError) {
                                    console.error(
                                      'Error deleting job:',
                                      jobError,
                                    )
                                    return
                                  }

                                  // Remove from local state only if successful
                                  setJobs((prev) =>
                                    prev.filter((j) => j.id !== job.id),
                                  )
                                } catch (error) {
                                  console.error(
                                    'Error during delete operation:',
                                    error,
                                  )
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paginados" className="space-y-6">
            {/* Data Table */}
            <div className="bg-background border-border w-full rounded-none border-2">
              <div className="w-full rounded-none">
                <Table className="w-full rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[90px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSort('data_in')}
                      >
                        Data In
                        {sortColumn === 'data_in' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[90px] cursor-pointer border-b-2 bg-[var(--orange)] text-center font-bold uppercase select-none"
                        onClick={() => handleSort('numero_fo')}
                      >
                        FO
                        {sortColumn === 'numero_fo' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[140px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSort('profile_id')}
                      >
                        Designer
                        {sortColumn === 'profile_id' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 min-w-[200px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSort('nome_campanha')}
                      >
                        Nome Campanha
                        {sortColumn === 'nome_campanha' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[180px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSort('status')}
                      >
                        Status
                        {sortColumn === 'status' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[36px] cursor-pointer border-b-2 bg-[var(--orange)] text-center font-bold uppercase select-none"
                        onClick={() => handleSort('prioridade')}
                      >
                        P
                        {sortColumn === 'prioridade' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[36px] cursor-pointer border-b-2 bg-[var(--orange)] text-center font-bold uppercase select-none"
                        onClick={() => handleSort('entrega')}
                      >
                        E
                        {sortColumn === 'entrega' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[90px] border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginadosJobs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-gray-500"
                        >
                          Nenhum trabalho paginado encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      getSortedJobs(paginadosJobs).map((job, index) => (
                        <TableRow key={job.id || `job-${index}`}>
                          <TableCell>
                            {job.data_in
                              ? new Date(job.data_in).toLocaleDateString()
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {job.numero_fo}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={job.profile_id || ''}
                              onValueChange={(val) =>
                                handleDesignerChange(job.id, val)
                              }
                            >
                              <SelectTrigger className="h-10 w-[120px] rounded-none">
                                <SelectValue>
                                  {designers.find(
                                    (d) => d.value === job.profile_id,
                                  )?.label || ''}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {designers
                                  .filter((d) => d.value !== 'all')
                                  .map((designer) => (
                                    <SelectItem
                                      key={designer.value}
                                      value={designer.value}
                                    >
                                      {designer.label}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const name = job.cliente || ''
                              if (!name) return '-'
                              return name.length > 24
                                ? `${name.slice(0, 24)}...`
                                : name
                            })()}
                          </TableCell>
                          <TableCell>{job.nome_campanha}</TableCell>
                          <TableCell>
                            {/* Status progress bar */}
                            {(() => {
                              // Get all items for this job from the new data structure
                              const jobItems = allItems.filter(
                                (item) =>
                                  item.folha_obra_id === job.id &&
                                  item.id && // Ensure valid items only
                                  item.designer_item_id, // Ensure it has a designer item association
                              )

                              // Calculate progress
                              const total = jobItems.length
                              const done = jobItems.filter(
                                (item) => item.paginacao,
                              ).length
                              const percent =
                                total > 0 ? Math.round((done / total) * 100) : 0

                              return (
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={percent}
                                    className="w-full"
                                  />
                                  <span className="w-10 text-right font-mono text-xs">
                                    {percent}%
                                  </span>
                                </div>
                              )
                            })()}
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              className={`focus:ring-primary mx-auto flex h-3 w-3 items-center justify-center rounded-full transition-colors focus:ring-2 focus:outline-none ${getPColor(job)}`}
                              title={
                                job.prioridade
                                  ? 'Prioritário'
                                  : job.data_in &&
                                      (Date.now() -
                                        new Date(job.data_in).getTime()) /
                                        (1000 * 60 * 60 * 24) >
                                        3
                                    ? 'Aguardando há mais de 3 dias'
                                    : 'Normal'
                              }
                              onClick={async () => {
                                const newPrioridade = !job.prioridade
                                updateJob(job.id, { prioridade: newPrioridade })
                              }}
                            />
                          </TableCell>
                          <TableCell className="flex justify-center gap-2">
                            <Button
                              variant="default"
                              size="icon"
                              aria-label="Ver"
                              className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              ref={(el) => {
                                triggerBtnRefs.current[job.id] = el
                              }}
                              onClick={() => setOpenDrawerId(job.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              aria-label="Excluir"
                              className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    'Tem certeza que deseja apagar este trabalho e todos os seus itens?',
                                  )
                                )
                                  return

                                try {
                                  const supabase = createBrowserClient()

                                  // Get all items_base for this job
                                  const { data: baseItems, error: fetchError } =
                                    await supabase
                                      .from('items_base')
                                      .select('id')
                                      .eq('folha_obra_id', job.id)

                                  if (fetchError) {
                                    console.error(
                                      'Error fetching items for deletion:',
                                      fetchError,
                                    )
                                    return
                                  }

                                  if (baseItems && baseItems.length > 0) {
                                    const itemIds = baseItems.map(
                                      (item) => item.id,
                                    )

                                    // Delete any designer_items linked to these items_base
                                    const { error: designerError } =
                                      await supabase
                                        .from('designer_items')
                                        .delete()
                                        .in('item_id', itemIds)

                                    if (designerError) {
                                      console.error(
                                        'Error deleting designer items:',
                                        designerError,
                                      )
                                    }

                                    // Delete any logistica_entregas linked to these items
                                    const { error: logisticaError } =
                                      await supabase
                                        .from('logistica_entregas')
                                        .delete()
                                        .in('item_id', itemIds)

                                    if (logisticaError) {
                                      console.error(
                                        'Error deleting logistica items:',
                                        logisticaError,
                                      )
                                    }

                                    // Delete all items_base for this job
                                    const { error: itemsError } = await supabase
                                      .from('items_base')
                                      .delete()
                                      .eq('folha_obra_id', job.id)

                                    if (itemsError) {
                                      console.error(
                                        'Error deleting base items:',
                                        itemsError,
                                      )
                                    }
                                  }

                                  // Delete the job
                                  const { error: jobError } = await supabase
                                    .from('folhas_obras')
                                    .delete()
                                    .eq('id', job.id)

                                  if (jobError) {
                                    console.error(
                                      'Error deleting job:',
                                      jobError,
                                    )
                                    return
                                  }

                                  // Remove from local state only if successful
                                  setJobs((prev) =>
                                    prev.filter((j) => j.id !== job.id),
                                  )
                                } catch (error) {
                                  console.error(
                                    'Error during delete operation:',
                                    error,
                                  )
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mb-8 space-y-6">
            <DesignerAnalyticsCharts
              onRefresh={async () => {
                await fetchJobs(setJobs, {
                  selectedDesigner,
                  poFilter: debouncedPoFilter,
                  campaignFilter: debouncedCampaignFilter,
                  itemFilter: debouncedItemFilter,
                  codigoFilter: debouncedCodigoFilter,
                  showFechados,
                })
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Drawers rendered separately outside the table */}
        {[...jobs, ...paginadosJobs].map((job, index) => (
          <Drawer
            key={`drawer-${job.id || `job-${index}`}`}
            open={
              !!(
                openDrawerId === job.id ||
                (pathDialog && pathDialog.jobId === job.id)
              )
            }
            onOpenChange={async (open) => {
              // Don't close if path dialog is open
              if (!open && pathDialog && pathDialog.jobId === job.id) {
                return
              }

              // First, blur any focused elements to prevent focus being trapped
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
              }

              // When closing, return focus to trigger button
              if (
                !open &&
                openDrawerId &&
                triggerBtnRefs.current[openDrawerId]
              ) {
                triggerBtnRefs.current[openDrawerId]?.focus()
              }

              // Set the drawer state
              setOpenDrawerId(open ? job.id : null)
            }}
            autoFocus={false}
            modal={true}
          >
            <DrawerContent className="!top-12 !mt-0 h-[calc(100vh-3rem)] min-h-[calc(100vh-3rem)] overflow-hidden border-0 outline-none">
              <div className="flex h-full w-full flex-col px-4 md:px-8">
                <DrawerHeader className="flex-none">
                  <div className="mb-2 flex items-center justify-end gap-2">
                    <DrawerClose asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-none"
                        aria-label="Fechar"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </DrawerClose>
                  </div>
                  <DrawerTitle className="mb-1 text-xl font-bold">
                    Detalhes da Folha de Obra (FO: {job.numero_fo})
                  </DrawerTitle>
                  <DrawerDescription className="class:text-black dark:class:text-gray-300 mb-4 text-sm">
                    Visualize os detalhes desta folha de obra e seus itens.
                  </DrawerDescription>
                  <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-[6rem_1fr_2fr]">
                    <div>
                      <Label htmlFor="fo-numero" className="font-base text-sm">
                        FO
                      </Label>
                      <Input
                        id="fo-numero"
                        ref={(el) => {
                          foInputRefs.current[job.id] = el
                        }}
                        value={job.numero_fo ?? ''}
                        onChange={(e) => {
                          // Only allow numbers
                          const val = e.target.value.replace(/[^0-9]/g, '')
                          if (val === '') return // Prevent empty string in state
                          updateJob(job.id, { numero_fo: Number(val) })
                        }}
                        onBlur={async (e) => {
                          const newFo = e.target.value
                          if (!newFo) return
                          updateJob(job.id, { numero_fo: Number(newFo) })
                        }}
                        className="h-10 w-full rounded-none"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="fo-campanha"
                        className="font-base text-sm"
                      >
                        Nome Campanha
                      </Label>
                      <Input
                        id="fo-campanha"
                        value={job.nome_campanha ?? ''}
                        onChange={(e) => {
                          updateJob(job.id, { nome_campanha: e.target.value })
                        }}
                        onBlur={async (e) => {
                          const newNome = e.target.value
                          updateJob(job.id, { nome_campanha: newNome })
                        }}
                        className="h-10 w-full rounded-none"
                        placeholder="Nome da Campanha"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Label htmlFor="fo-notas" className="font-base text-sm">
                        Notas
                      </Label>
                      <Textarea
                        id="fo-notas"
                        value={job.notas ?? ''}
                        onChange={(e) => {
                          updateJob(job.id, { notas: e.target.value })
                        }}
                        onBlur={async (e) => {
                          const newNotas = e.target.value
                          updateJob(job.id, { notas: newNotas })
                          try {
                            const supabase = createBrowserClient()
                            await supabase
                              .from('folhas_obras')
                              .update({ notas: newNotas })
                              .eq('id', job.id)
                          } catch (error) {
                            console.error('Error updating notas:', error)
                          }
                        }}
                        className="h-24 min-h-[80px] w-full resize-none rounded-none"
                        placeholder="Notas (opcional)"
                      />
                    </div>
                  </div>
                </DrawerHeader>
                <div className="mb-4 flex-grow">
                  <div className="bg-background border-border w-full rounded-none border-2">
                    <div className="w-full rounded-none">
                      <Table className="w-full caption-bottom rounded-none border-0 text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                        <TableHeader>
                          <TableRow className="sticky top-0 z-10 bg-[var(--orange)]">
                            <TableHead
                              className="border-border w-[60%] cursor-pointer border-b-2 font-bold uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (current?.column === 'descricao') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'descricao',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'descricao',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              Item
                              {drawerSort[job.id]?.column === 'descricao' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-[30%] cursor-pointer border-b-2 font-bold uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (current?.column === 'codigo') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'codigo',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'codigo',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              Código
                              {drawerSort[job.id]?.column === 'codigo' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-[100px] cursor-pointer border-b-2 text-center font-bold uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (current?.column === 'quantidade') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'quantidade',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'quantidade',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              Quantidade
                              {drawerSort[job.id]?.column === 'quantidade' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-[140px] cursor-pointer border-b-2 font-bold uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (current?.column === 'complexidade') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'complexidade',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'complexidade',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              Complexidade
                              {drawerSort[job.id]?.column === 'complexidade' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>

                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (current?.column === 'duvidas') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'duvidas',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'duvidas',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              D
                              {drawerSort[job.id]?.column === 'duvidas' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (current?.column === 'maquete_enviada1') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'maquete_enviada1',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'maquete_enviada1',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              M1
                              {drawerSort[job.id]?.column ===
                                'maquete_enviada1' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (
                                    current?.column === 'aprovacao_recebida1'
                                  ) {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'aprovacao_recebida1',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'aprovacao_recebida1',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              A1
                              {drawerSort[job.id]?.column ===
                                'aprovacao_recebida1' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (current?.column === 'maquete_enviada2') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'maquete_enviada2',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'maquete_enviada2',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              M2
                              {drawerSort[job.id]?.column ===
                                'maquete_enviada2' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (
                                    current?.column === 'aprovacao_recebida2'
                                  ) {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'aprovacao_recebida2',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'aprovacao_recebida2',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              A2
                              {drawerSort[job.id]?.column ===
                                'aprovacao_recebida2' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (current?.column === 'maquete_enviada3') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'maquete_enviada3',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'maquete_enviada3',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              M3
                              {drawerSort[job.id]?.column ===
                                'maquete_enviada3' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (
                                    current?.column === 'aprovacao_recebida3'
                                  ) {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'aprovacao_recebida3',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'aprovacao_recebida3',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              A3
                              {drawerSort[job.id]?.column ===
                                'aprovacao_recebida3' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (current?.column === 'maquete_enviada4') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'maquete_enviada4',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'maquete_enviada4',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              M4
                              {drawerSort[job.id]?.column ===
                                'maquete_enviada4' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (
                                    current?.column === 'aprovacao_recebida4'
                                  ) {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'aprovacao_recebida4',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'aprovacao_recebida4',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              A4
                              {drawerSort[job.id]?.column ===
                                'aprovacao_recebida4' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (current?.column === 'maquete_enviada5') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'maquete_enviada5',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'maquete_enviada5',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              M5
                              {drawerSort[job.id]?.column ===
                                'maquete_enviada5' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (
                                    current?.column === 'aprovacao_recebida5'
                                  ) {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'aprovacao_recebida5',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'aprovacao_recebida5',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              A5
                              {drawerSort[job.id]?.column ===
                                'aprovacao_recebida5' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            {/* M6 - Maquete 6 */}
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (current?.column === 'maquete_enviada6') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'maquete_enviada6',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'maquete_enviada6',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              M6
                              {drawerSort[job.id]?.column ===
                                'maquete_enviada6' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            {/* A6 - Aprovação 6 */}
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (
                                    current?.column === 'aprovacao_recebida6'
                                  ) {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'aprovacao_recebida6',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'aprovacao_recebida6',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              A6
                              {drawerSort[job.id]?.column ===
                                'aprovacao_recebida6' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (current?.column === 'paginacao') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'paginacao',
                                        direction:
                                          current.direction === 'asc'
                                            ? 'desc'
                                            : 'asc',
                                      },
                                    }
                                  }
                                  return {
                                    ...prev,
                                    [job.id]: {
                                      column: 'paginacao',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              P
                              {drawerSort[job.id]?.column === 'paginacao' &&
                                (drawerSort[job.id]?.direction === 'asc' ? (
                                  <ArrowUp className="ml-1 inline h-3 w-3" />
                                ) : (
                                  <ArrowDown className="ml-1 inline h-3 w-3" />
                                ))}
                            </TableHead>
                            <TableHead className="border-border w-32 border-b-2 text-center font-bold uppercase">
                              Path
                            </TableHead>
                            <TableHead className="border-border w-auto border-b-2 text-center font-bold whitespace-nowrap uppercase">
                              Ações
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadingItems ? (
                            <TableRow>
                              <TableCell colSpan={20}>
                                Carregando itens...
                              </TableCell>
                            </TableRow>
                          ) : drawerItems[job.id]?.length ? (
                            getSortedDrawerItems(
                              job.id,
                              drawerItems[job.id] || [],
                            ).map((item, idx) => (
                              <TableRow key={item.id || `item-${idx}`}>
                                <TableCell className="font-base align-middle text-sm">
                                  <Textarea
                                    ref={(el) => {
                                      inputRefs.current[
                                        `${job.id}_${item.id}`
                                      ] = el
                                    }}
                                    value={item.descricao}
                                    onChange={(e) => {
                                      const newValue = e.target.value
                                      updateItemInState({
                                        designerItemId: item.designer_item_id,
                                        updates: { descricao: newValue },
                                      })
                                      debouncedUpdateDescricao(
                                        item.id,
                                        newValue,
                                      )
                                    }}
                                    className="h-10 resize-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                                    rows={1}
                                  />
                                </TableCell>
                                <TableCell className="font-base align-middle text-sm">
                                  <Input
                                    type="text"
                                    value={item.codigo || ''}
                                    onChange={(e) => {
                                      const newValue = e.target.value
                                      updateItemInState({
                                        designerItemId: item.designer_item_id,
                                        updates: { codigo: newValue },
                                      })
                                      debouncedUpdateCodigo(item.id, newValue)
                                    }}
                                    className="h-10 w-full border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                                  />
                                </TableCell>
                                <TableCell className="font-base align-middle text-sm">
                                  <Input
                                    type="number"
                                    value={item.quantidade || ''}
                                    onChange={(e) => {
                                      const newValue =
                                        e.target.value === ''
                                          ? null
                                          : Number(e.target.value)
                                      updateItemInState({
                                        designerItemId: item.designer_item_id,
                                        updates: { quantidade: newValue },
                                      })
                                    }}
                                    onBlur={async (e) => {
                                      const newValue =
                                        e.target.value === ''
                                          ? null
                                          : Number(e.target.value)
                                      const supabase = createBrowserClient()
                                      await supabase
                                        .from('items_base')
                                        .update({ quantidade: newValue })
                                        .eq('id', item.id)
                                    }}
                                    className="h-10 w-full border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                                    style={{ textAlign: 'right' }}
                                    placeholder="Qtd"
                                  />
                                </TableCell>
                                <TableCell className="font-base align-middle text-sm">
                                  <ComplexidadeCombobox
                                    value={item.complexidade || ''}
                                    onChange={async (value) => {
                                      try {
                                        await updateComplexidade(
                                          item.id,
                                          value || null,
                                        )

                                        // If OFFSET is selected, automatically set paginacao to true and path_trabalho to "P:"
                                        if (value === 'OFFSET') {
                                          const supabase = createBrowserClient()
                                          await supabase
                                            .from('designer_items')
                                            .update({
                                              paginacao: true,
                                              path_trabalho: 'P:',
                                              data_saida:
                                                new Date().toISOString(),
                                            })
                                            .eq('id', item.designer_item_id)

                                          // Update local state
                                          updateItemInState({
                                            designerItemId:
                                              item.designer_item_id,
                                            updates: {
                                              paginacao: true,
                                              path_trabalho: 'P:',
                                              data_saida:
                                                new Date().toISOString(),
                                            },
                                          })
                                        }
                                      } catch (error) {
                                        // Error handling is done in updateComplexidade
                                      }
                                    }}
                                    options={complexidades}
                                    disabled={isLoadingComplexidades}
                                    loading={isLoadingComplexidades}
                                  />
                                </TableCell>

                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--secondary-background)]"
                                          checked={!!item.duvidas}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            updateItemInState({
                                              designerItemId:
                                                item.designer_item_id,
                                              updates: {
                                                duvidas: !!checked,
                                                data_duvidas: !!checked
                                                  ? new Date().toISOString()
                                                  : null,
                                              },
                                            })

                                            // Update in database
                                            try {
                                              const supabase =
                                                createBrowserClient()
                                              await supabase
                                                .from('designer_items')
                                                .update({
                                                  duvidas: !!checked,
                                                  data_duvidas: !!checked
                                                    ? new Date().toISOString()
                                                    : null,
                                                })
                                                .eq('id', item.designer_item_id)
                                            } catch (err) {
                                              console.error(
                                                'Error updating item status:',
                                                err,
                                              )
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>Dúvidas</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--main-dark)] hover:bg-[oklch(73.44%_0.1224_84.2)]"
                                          checked={!!item.maquete_enviada1}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            updateItemInState({
                                              designerItemId:
                                                item.designer_item_id,
                                              updates: {
                                                maquete_enviada1: !!checked,
                                                data_maquete_enviada1: !!checked
                                                  ? new Date().toISOString()
                                                  : null,
                                              },
                                            })

                                            // Update in database
                                            try {
                                              const supabase =
                                                createBrowserClient()
                                              await supabase
                                                .from('designer_items')
                                                .update({
                                                  maquete_enviada1: !!checked,
                                                  data_maquete_enviada1:
                                                    !!checked
                                                      ? new Date().toISOString()
                                                      : null,
                                                })
                                                .eq('id', item.designer_item_id)
                                            } catch (err) {
                                              console.error(
                                                'Error updating item status:',
                                                err,
                                              )
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Maquete enviada 1
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--main-dark)] hover:bg-[oklch(73.44%_0.1224_84.2)]"
                                          checked={!!item.aprovacao_recebida1}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            updateItemInState({
                                              designerItemId:
                                                item.designer_item_id,
                                              updates: {
                                                aprovacao_recebida1: !!checked,
                                                data_aprovacao_recebida1:
                                                  !!checked
                                                    ? new Date().toISOString()
                                                    : null,
                                              },
                                            })

                                            // Update in database
                                            try {
                                              const supabase =
                                                createBrowserClient()
                                              await supabase
                                                .from('designer_items')
                                                .update({
                                                  aprovacao_recebida1:
                                                    !!checked,
                                                  data_aprovacao_recebida1:
                                                    !!checked
                                                      ? new Date().toISOString()
                                                      : null,
                                                })
                                                .eq('id', item.designer_item_id)
                                            } catch (err) {
                                              console.error(
                                                'Error updating item status:',
                                                err,
                                              )
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Aprovação recebida 1
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--secondary-background)]"
                                          checked={!!item.maquete_enviada2}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            updateItemInState({
                                              designerItemId:
                                                item.designer_item_id,
                                              updates: {
                                                maquete_enviada2: !!checked,
                                                data_maquete_enviada2: !!checked
                                                  ? new Date().toISOString()
                                                  : null,
                                              },
                                            })

                                            // Update in database
                                            try {
                                              const supabase =
                                                createBrowserClient()
                                              await supabase
                                                .from('designer_items')
                                                .update({
                                                  maquete_enviada2: !!checked,
                                                  data_maquete_enviada2:
                                                    !!checked
                                                      ? new Date().toISOString()
                                                      : null,
                                                })
                                                .eq('id', item.designer_item_id)
                                            } catch (err) {
                                              console.error(
                                                'Error updating item status:',
                                                err,
                                              )
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Maquete enviada 2
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--secondary-background)]"
                                          checked={!!item.aprovacao_recebida2}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            updateItemInState({
                                              designerItemId:
                                                item.designer_item_id,
                                              updates: {
                                                aprovacao_recebida2: !!checked,
                                                data_aprovacao_recebida2:
                                                  !!checked
                                                    ? new Date().toISOString()
                                                    : null,
                                              },
                                            })

                                            // Update in database
                                            try {
                                              const supabase =
                                                createBrowserClient()
                                              await supabase
                                                .from('designer_items')
                                                .update({
                                                  aprovacao_recebida2:
                                                    !!checked,
                                                  data_aprovacao_recebida2:
                                                    !!checked
                                                      ? new Date().toISOString()
                                                      : null,
                                                })
                                                .eq('id', item.designer_item_id)
                                            } catch (err) {
                                              console.error(
                                                'Error updating item status:',
                                                err,
                                              )
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Aprovação recebida 2
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--main-dark)] hover:bg-[oklch(73.44%_0.1224_84.2)]"
                                          checked={!!item.maquete_enviada3}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            updateItemInState({
                                              designerItemId:
                                                item.designer_item_id,
                                              updates: {
                                                maquete_enviada3: !!checked,
                                                data_maquete_enviada3: !!checked
                                                  ? new Date().toISOString()
                                                  : null,
                                              },
                                            })

                                            // Update in database
                                            try {
                                              const supabase =
                                                createBrowserClient()
                                              await supabase
                                                .from('designer_items')
                                                .update({
                                                  maquete_enviada3: !!checked,
                                                  data_maquete_enviada3:
                                                    !!checked
                                                      ? new Date().toISOString()
                                                      : null,
                                                })
                                                .eq('id', item.designer_item_id)
                                            } catch (err) {
                                              console.error(
                                                'Error updating item status:',
                                                err,
                                              )
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Maquete enviada 3
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--main-dark)] hover:bg-[oklch(73.44%_0.1224_84.2)]"
                                          checked={!!item.aprovacao_recebida3}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            updateItemInState({
                                              designerItemId:
                                                item.designer_item_id,
                                              updates: {
                                                aprovacao_recebida3: !!checked,
                                                data_aprovacao_recebida3:
                                                  !!checked
                                                    ? new Date().toISOString()
                                                    : null,
                                              },
                                            })

                                            // Update in database
                                            try {
                                              const supabase =
                                                createBrowserClient()
                                              await supabase
                                                .from('designer_items')
                                                .update({
                                                  aprovacao_recebida3:
                                                    !!checked,
                                                  data_aprovacao_recebida3:
                                                    !!checked
                                                      ? new Date().toISOString()
                                                      : null,
                                                })
                                                .eq('id', item.designer_item_id)
                                            } catch (err) {
                                              console.error(
                                                'Error updating item status:',
                                                err,
                                              )
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Aprovação recebida 3
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--secondary-background)]"
                                          checked={!!item.maquete_enviada4}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            updateItemInState({
                                              designerItemId:
                                                item.designer_item_id,
                                              updates: {
                                                maquete_enviada4: !!checked,
                                                data_maquete_enviada4: !!checked
                                                  ? new Date().toISOString()
                                                  : null,
                                              },
                                            })

                                            // Update in database
                                            try {
                                              const supabase =
                                                createBrowserClient()
                                              await supabase
                                                .from('designer_items')
                                                .update({
                                                  maquete_enviada4: !!checked,
                                                  data_maquete_enviada4:
                                                    !!checked
                                                      ? new Date().toISOString()
                                                      : null,
                                                })
                                                .eq('id', item.designer_item_id)
                                            } catch (err) {
                                              console.error(
                                                'Error updating item status:',
                                                err,
                                              )
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Maquete enviada 4
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--secondary-background)]"
                                          checked={!!item.aprovacao_recebida4}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            updateItemInState({
                                              designerItemId:
                                                item.designer_item_id,
                                              updates: {
                                                aprovacao_recebida4: !!checked,
                                                data_aprovacao_recebida4:
                                                  !!checked
                                                    ? new Date().toISOString()
                                                    : null,
                                              },
                                            })

                                            // Update in database
                                            try {
                                              const supabase =
                                                createBrowserClient()
                                              await supabase
                                                .from('designer_items')
                                                .update({
                                                  aprovacao_recebida4:
                                                    !!checked,
                                                  data_aprovacao_recebida4:
                                                    !!checked
                                                      ? new Date().toISOString()
                                                      : null,
                                                })
                                                .eq('id', item.designer_item_id)
                                            } catch (err) {
                                              console.error(
                                                'Error updating item status:',
                                                err,
                                              )
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Aprovação recebida 4
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--main-dark)] hover:bg-[oklch(73.44%_0.1224_84.2)]"
                                          checked={!!item.maquete_enviada5}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            updateItemInState({
                                              designerItemId:
                                                item.designer_item_id,
                                              updates: {
                                                maquete_enviada5: !!checked,
                                                data_maquete_enviada5: !!checked
                                                  ? new Date().toISOString()
                                                  : null,
                                              },
                                            })

                                            // Update in database
                                            try {
                                              const supabase =
                                                createBrowserClient()
                                              await supabase
                                                .from('designer_items')
                                                .update({
                                                  maquete_enviada5: !!checked,
                                                  data_maquete_enviada5:
                                                    !!checked
                                                      ? new Date().toISOString()
                                                      : null,
                                                })
                                                .eq('id', item.designer_item_id)
                                            } catch (err) {
                                              console.error(
                                                'Error updating item status:',
                                                err,
                                              )
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Maquete enviada 5
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--main-dark)] hover:bg-[oklch(73.44%_0.1224_84.2)]"
                                          checked={!!item.aprovacao_recebida5}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            updateItemInState({
                                              designerItemId:
                                                item.designer_item_id,
                                              updates: {
                                                aprovacao_recebida5: !!checked,
                                                data_aprovacao_recebida5:
                                                  !!checked
                                                    ? new Date().toISOString()
                                                    : null,
                                              },
                                            })

                                            // Update in database
                                            try {
                                              const supabase =
                                                createBrowserClient()
                                              await supabase
                                                .from('designer_items')
                                                .update({
                                                  aprovacao_recebida5:
                                                    !!checked,
                                                  data_aprovacao_recebida5:
                                                    !!checked
                                                      ? new Date().toISOString()
                                                      : null,
                                                })
                                                .eq('id', item.designer_item_id)
                                            } catch (err) {
                                              console.error(
                                                'Error updating item status:',
                                                err,
                                              )
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Aprovação recebida 5
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                {/* M6 - Maquete 6 */}
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--secondary-background)]"
                                          checked={!!item.maquete_enviada6}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            updateItemInState({
                                              designerItemId:
                                                item.designer_item_id,
                                              updates: {
                                                maquete_enviada6: !!checked,
                                                data_maquete_enviada6: !!checked
                                                  ? new Date().toISOString()
                                                  : null,
                                              },
                                            })

                                            // Update in database
                                            try {
                                              const supabase =
                                                createBrowserClient()
                                              await supabase
                                                .from('designer_items')
                                                .update({
                                                  maquete_enviada6: !!checked,
                                                  data_maquete_enviada6:
                                                    !!checked
                                                      ? new Date().toISOString()
                                                      : null,
                                                })
                                                .eq('id', item.designer_item_id)
                                            } catch (err) {
                                              console.error(
                                                'Error updating item status:',
                                                err,
                                              )
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Maquete enviada 6
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                {/* A6 - Aprovação 6 */}
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--secondary-background)]"
                                          checked={!!item.aprovacao_recebida6}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            updateItemInState({
                                              designerItemId:
                                                item.designer_item_id,
                                              updates: {
                                                aprovacao_recebida6: !!checked,
                                                data_aprovacao_recebida6:
                                                  !!checked
                                                    ? new Date().toISOString()
                                                    : null,
                                              },
                                            })

                                            // Update in database
                                            try {
                                              const supabase =
                                                createBrowserClient()
                                              await supabase
                                                .from('designer_items')
                                                .update({
                                                  aprovacao_recebida6:
                                                    !!checked,
                                                  data_aprovacao_recebida6:
                                                    !!checked
                                                      ? new Date().toISOString()
                                                      : null,
                                                })
                                                .eq('id', item.designer_item_id)
                                            } catch (err) {
                                              console.error(
                                                'Error updating item status:',
                                                err,
                                              )
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Aprovação recebida 6
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Checkbox
                                          className="bg-[var(--main-dark)] hover:bg-[oklch(73.44%_0.1224_84.2)]"
                                          checked={!!item.paginacao}
                                          onCheckedChange={async (checked) => {
                                            if (!item.designer_item_id) {
                                              return
                                            }
                                            if (checked) {
                                              // Always open the path dialog, do not set paginacao yet
                                              setPathInput(
                                                item.path_trabalho || '',
                                              )
                                              setPathDialog({
                                                jobId: job.id,
                                                itemId: item.id,
                                                idx,
                                              })
                                            } else {
                                              // If unchecked, allow immediate update
                                              updateItemInState({
                                                designerItemId:
                                                  item.designer_item_id,
                                                updates: {
                                                  paginacao: false,
                                                  data_paginacao: null,
                                                },
                                              })
                                              // Update paginacao and clear data_paginacao in DB, do NOT clear path_trabalho
                                              try {
                                                const supabase =
                                                  createBrowserClient()
                                                await supabase
                                                  .from('designer_items')
                                                  .update({
                                                    paginacao: false,
                                                    data_paginacao: null,
                                                  })
                                                  .eq(
                                                    'id',
                                                    item.designer_item_id,
                                                  )
                                              } catch (err) {
                                                console.error(
                                                  'Error updating paginacao status:',
                                                  err,
                                                )
                                              }
                                            }
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>Paginação</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <Popover modal={false}>
                                        <TooltipTrigger asChild>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant={
                                                item.path_trabalho &&
                                                item.path_trabalho.trim() !== ''
                                                  ? 'link'
                                                  : 'ghost'
                                              }
                                              size="icon"
                                              className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                              aria-label="Ver ou editar path"
                                              title="PATH (caminho do Trabalho)"
                                            >
                                              {item.path_trabalho ? (
                                                <FileText className="h-4 w-4" />
                                              ) : (
                                                <FilePlus className="h-4 w-4" />
                                              )}
                                            </Button>
                                          </PopoverTrigger>
                                        </TooltipTrigger>
                                        <PopoverContent className="bg-background border-border w-80 border-2 p-4">
                                          <div className="space-y-2">
                                            <h4 className="font-medium">
                                              Path
                                            </h4>
                                            <Input
                                              value={item.path_trabalho || ''}
                                              placeholder="Adicionar path..."
                                              className="min-h-[40px]"
                                              onChange={(e) => {
                                                const newValue = e.target.value
                                                updateItemInState({
                                                  designerItemId:
                                                    item.designer_item_id,
                                                  updates: {
                                                    path_trabalho: newValue,
                                                  },
                                                })
                                              }}
                                              onBlur={async (e) => {
                                                const newPath = e.target.value
                                                const supabase =
                                                  createBrowserClient()

                                                // If path is being set (not cleared), also set data_saida
                                                const updates: any = {
                                                  path_trabalho: newPath,
                                                }
                                                if (newPath.trim()) {
                                                  updates.data_saida =
                                                    new Date().toISOString()
                                                }

                                                await supabase
                                                  .from('designer_items')
                                                  .update(updates)
                                                  .eq(
                                                    'id',
                                                    item.designer_item_id,
                                                  )

                                                // Update local state if data_saida was set
                                                if (newPath.trim()) {
                                                  updateItemInState({
                                                    designerItemId:
                                                      item.designer_item_id,
                                                    updates: {
                                                      data_saida:
                                                        updates.data_saida,
                                                    },
                                                  })
                                                }
                                              }}
                                            />
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                      <TooltipContent>
                                        PATH (caminho do Trabalho)
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="flex justify-center gap-2">
                                  {/* Notas button (designer_items.notas) */}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <Popover>
                                        <TooltipTrigger asChild>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant={
                                                item?.notas &&
                                                item.notas.trim() !== ''
                                                  ? 'link'
                                                  : 'ghost'
                                              }
                                              size="icon"
                                              aria-label="Notas do item"
                                              className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                              title="NOTAS"
                                            >
                                              <FileText className="h-4 w-4" />
                                            </Button>
                                          </PopoverTrigger>
                                        </TooltipTrigger>
                                        <PopoverContent className="bg-background border-border w-80 border-2 p-4">
                                          <div className="space-y-3">
                                            <h4 className="font-medium">
                                              Notas
                                            </h4>
                                            <Textarea
                                              value={item?.notas || ''}
                                              placeholder="Adicionar notas..."
                                              className="min-h-[80px]"
                                              onChange={(e) => {
                                                updateItemInState({
                                                  designerItemId:
                                                    item.designer_item_id,
                                                  updates: {
                                                    notas: e.target
                                                      .value as any,
                                                  },
                                                })
                                              }}
                                            />
                                            <div className="flex justify-end gap-2">
                                              <Button
                                                variant="default"
                                                onClick={async () => {
                                                  try {
                                                    const supabase =
                                                      createBrowserClient()
                                                    const currentNotas =
                                                      (
                                                        drawerItems[job.id] ||
                                                        []
                                                      ).find(
                                                        (it) =>
                                                          it.id === item.id,
                                                      )?.notas || ''
                                                    await supabase
                                                      .from('designer_items')
                                                      .update({
                                                        notas: currentNotas,
                                                      })
                                                      .eq(
                                                        'id',
                                                        item.designer_item_id,
                                                      )
                                                    // close popover by dispatching Escape on active element
                                                    const active =
                                                      document.activeElement as HTMLElement | null
                                                    active?.dispatchEvent(
                                                      new KeyboardEvent(
                                                        'keydown',
                                                        {
                                                          key: 'Escape',
                                                          bubbles: true,
                                                        },
                                                      ),
                                                    )
                                                  } catch (err) {
                                                    console.error(
                                                      'Erro ao guardar notas:',
                                                      err,
                                                    )
                                                  }
                                                }}
                                              >
                                                Guardar
                                              </Button>
                                            </div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                      <TooltipContent>NOTAS</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  {/* <Button
                                    variant="outline"
                                    size="icon"
                                    aria-label="Copiar"
                                    className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                    onClick={async () => {
                                      const supabase = createBrowserClient()
                                      // 1. Duplicate items_base row
                                      const {
                                        data: baseData,
                                        error: baseError,
                                      } = await supabase
                                        .from('items_base')
                                        .insert({
                                          folha_obra_id: job.id,
                                          descricao: item.descricao || '',
                                          codigo: item.codigo || '',
                                          quantidade: item.quantidade || null,
                                        })
                                        .select('*')
                                        .single()
                                      if (baseError || !baseData) {
                                        return
                                      }
                                      // 2. Duplicate designer_items row for new item
                                      const { error: designerError } =
                                        await supabase
                                          .from('designer_items')
                                          .insert({
                                            item_id: baseData.id,
                                            em_curso: item.em_curso,
                                            duvidas: item.duvidas,
                                            maquete_enviada1:
                                              item.maquete_enviada1,
                                            paginacao: item.paginacao,
                                          })
                                      if (designerError) {
                                        console.error(
                                          'Erro ao criar designer item:',
                                          designerError,
                                        )
                                      }
                                      // 3. Refresh items for this job
                                      refreshItems(job.id)
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button> */}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <Popover>
                                        <TooltipTrigger asChild>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              aria-label="Relatório do item"
                                              className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                              title="RELATÓRIO"
                                            >
                                              <ReceiptText className="h-4 w-4" />
                                            </Button>
                                          </PopoverTrigger>
                                        </TooltipTrigger>
                                        <PopoverContent
                                          className="max-h-[80vh] w-80 overflow-y-auto border-0 bg-[var(--main)] outline outline-2"
                                          align="start"
                                          side="left"
                                          sideOffset={10}
                                          avoidCollisions={true}
                                          collisionPadding={20}
                                        >
                                          <div className="space-y-4">
                                            {/* Header */}
                                            <div className="border-b pb-2">
                                              <h4 className="text-sm font-semibold">
                                                {item.descricao ||
                                                  'Item sem descrição'}
                                              </h4>
                                              <p className="text-muted-foreground text-xs">
                                                Quantidade:{' '}
                                                {item.quantidade || 'N/A'}
                                              </p>
                                            </div>

                                            {/* Timeline */}
                                            <div className="space-y-2">
                                              <h5 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                                Timeline
                                              </h5>

                                              {/* Data In */}
                                              {job.data_in && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    📅 Data In:
                                                  </span>{' '}
                                                  {formatDate(job.data_in)}
                                                </div>
                                              )}

                                              {/* Dúvidas */}
                                              {item.duvidas && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    ❓ Dúvidas:
                                                  </span>{' '}
                                                  {item.data_duvidas
                                                    ? formatDate(
                                                        item.data_duvidas,
                                                      )
                                                    : 'Sem data'}
                                                </div>
                                              )}

                                              {/* Maquete Enviada 1 */}
                                              {item.maquete_enviada1 && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    📤 Maquete Enviada 1:
                                                  </span>{' '}
                                                  {item.data_maquete_enviada1
                                                    ? formatDate(
                                                        item.data_maquete_enviada1,
                                                      )
                                                    : 'Sem data'}
                                                </div>
                                              )}

                                              {/* Aprovação Recebida 1 */}
                                              {item.aprovacao_recebida1 && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    ✅ Aprovação/Feedback
                                                    Recebido 1:
                                                  </span>{' '}
                                                  {item.data_aprovacao_recebida1
                                                    ? formatDate(
                                                        item.data_aprovacao_recebida1,
                                                      )
                                                    : 'Sem data'}
                                                  {item.data_maquete_enviada1 &&
                                                    item.data_aprovacao_recebida1 && (
                                                      <span className="ml-1 text-green-600">
                                                        (
                                                        {calculateDaysBetween(
                                                          item.data_maquete_enviada1,
                                                          item.data_aprovacao_recebida1,
                                                        )}
                                                        )
                                                      </span>
                                                    )}
                                                </div>
                                              )}

                                              {/* Maquete Enviada 2 */}
                                              {item.maquete_enviada2 && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    📤 Maquete Enviada 2:
                                                  </span>{' '}
                                                  {item.data_maquete_enviada2
                                                    ? formatDate(
                                                        item.data_maquete_enviada2,
                                                      )
                                                    : 'Sem data'}
                                                </div>
                                              )}

                                              {/* Aprovação Recebida 2 */}
                                              {item.aprovacao_recebida2 && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    ✅ Aprovação/Feedback
                                                    Recebido 2:
                                                  </span>{' '}
                                                  {item.data_aprovacao_recebida2
                                                    ? formatDate(
                                                        item.data_aprovacao_recebida2,
                                                      )
                                                    : 'Sem data'}
                                                  {item.data_maquete_enviada2 &&
                                                    item.data_aprovacao_recebida2 && (
                                                      <span className="ml-1 text-green-600">
                                                        (
                                                        {calculateDaysBetween(
                                                          item.data_maquete_enviada2,
                                                          item.data_aprovacao_recebida2,
                                                        )}
                                                        )
                                                      </span>
                                                    )}
                                                </div>
                                              )}

                                              {/* Maquete Enviada 3 */}
                                              {item.maquete_enviada3 && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    📤 Maquete Enviada 3:
                                                  </span>{' '}
                                                  {item.data_maquete_enviada3
                                                    ? formatDate(
                                                        item.data_maquete_enviada3,
                                                      )
                                                    : 'Sem data'}
                                                </div>
                                              )}

                                              {/* Aprovação Recebida 3 */}
                                              {item.aprovacao_recebida3 && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    ✅ Aprovação/Feedback
                                                    Recebido 3:
                                                  </span>{' '}
                                                  {item.data_aprovacao_recebida3
                                                    ? formatDate(
                                                        item.data_aprovacao_recebida3,
                                                      )
                                                    : 'Sem data'}
                                                  {item.data_maquete_enviada3 &&
                                                    item.data_aprovacao_recebida3 && (
                                                      <span className="ml-1 text-green-600">
                                                        (
                                                        {calculateDaysBetween(
                                                          item.data_maquete_enviada3,
                                                          item.data_aprovacao_recebida3,
                                                        )}
                                                        )
                                                      </span>
                                                    )}
                                                </div>
                                              )}

                                              {/* Maquete Enviada 4 */}
                                              {item.maquete_enviada4 && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    📤 Maquete Enviada 4:
                                                  </span>{' '}
                                                  {item.data_maquete_enviada4
                                                    ? formatDate(
                                                        item.data_maquete_enviada4,
                                                      )
                                                    : 'Sem data'}
                                                </div>
                                              )}

                                              {/* Aprovação Recebida 4 */}
                                              {item.aprovacao_recebida4 && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    ✅ Aprovação/Feedback
                                                    Recebido 4:
                                                  </span>{' '}
                                                  {item.data_aprovacao_recebida4
                                                    ? formatDate(
                                                        item.data_aprovacao_recebida4,
                                                      )
                                                    : 'Sem data'}
                                                  {item.data_maquete_enviada4 &&
                                                    item.data_aprovacao_recebida4 && (
                                                      <span className="ml-1 text-green-600">
                                                        (
                                                        {calculateDaysBetween(
                                                          item.data_maquete_enviada4,
                                                          item.data_aprovacao_recebida4,
                                                        )}
                                                        )
                                                      </span>
                                                    )}
                                                </div>
                                              )}

                                              {/* Maquete Enviada 5 */}
                                              {item.maquete_enviada5 && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    📤 Maquete Enviada 5:
                                                  </span>{' '}
                                                  {item.data_maquete_enviada5
                                                    ? formatDate(
                                                        item.data_maquete_enviada5,
                                                      )
                                                    : 'Sem data'}
                                                </div>
                                              )}

                                              {/* Aprovação Recebida 5 */}
                                              {item.aprovacao_recebida5 && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    ✅ Aprovação/Feedback
                                                    Recebido 5:
                                                  </span>{' '}
                                                  {item.data_aprovacao_recebida5
                                                    ? formatDate(
                                                        item.data_aprovacao_recebida5,
                                                      )
                                                    : 'Sem data'}
                                                  {item.data_maquete_enviada5 &&
                                                    item.data_aprovacao_recebida5 && (
                                                      <span className="ml-1 text-green-600">
                                                        (
                                                        {calculateDaysBetween(
                                                          item.data_maquete_enviada5,
                                                          item.data_aprovacao_recebida5,
                                                        )}
                                                        )
                                                      </span>
                                                    )}
                                                </div>
                                              )}

                                              {/* Maquete Enviada 6 */}
                                              {item.maquete_enviada6 && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    📤 Maquete Enviada 6:
                                                  </span>{' '}
                                                  {item.data_maquete_enviada6
                                                    ? formatDate(
                                                        item.data_maquete_enviada6,
                                                      )
                                                    : 'Sem data'}
                                                </div>
                                              )}

                                              {/* Aprovação Recebida 6 */}
                                              {item.aprovacao_recebida6 && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    ✅ Aprovação/Feedback
                                                    Recebido 6:
                                                  </span>{' '}
                                                  {item.data_aprovacao_recebida6
                                                    ? formatDate(
                                                        item.data_aprovacao_recebida6,
                                                      )
                                                    : 'Sem data'}
                                                  {item.data_maquete_enviada6 &&
                                                    item.data_aprovacao_recebida6 && (
                                                      <span className="ml-1 text-green-600">
                                                        (
                                                        {calculateDaysBetween(
                                                          item.data_maquete_enviada6,
                                                          item.data_aprovacao_recebida6,
                                                        )}
                                                        )
                                                      </span>
                                                    )}
                                                </div>
                                              )}

                                              {/* Paginação */}
                                              {item.paginacao && (
                                                <div className="text-xs">
                                                  <span className="font-medium">
                                                    📄 Paginação:
                                                  </span>{' '}
                                                  {item.data_paginacao
                                                    ? formatDate(
                                                        item.data_paginacao,
                                                      )
                                                    : 'Sem data'}
                                                  {(() => {
                                                    const lastApprovalDate =
                                                      findLastApprovalDate(item)
                                                    return lastApprovalDate &&
                                                      item.data_paginacao ? (
                                                      <span className="ml-1 text-blue-600">
                                                        (
                                                        {calculateDaysBetween(
                                                          lastApprovalDate,
                                                          item.data_paginacao,
                                                        )}
                                                        )
                                                      </span>
                                                    ) : null
                                                  })()}
                                                </div>
                                              )}
                                            </div>

                                            {/* Duration */}
                                            {job.data_in &&
                                              item.data_paginacao && (
                                                <div className="mt-4 border-t pt-4">
                                                  <h5 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                                                    Duração
                                                  </h5>
                                                  <div className="text-xs">
                                                    <span className="font-medium">
                                                      ⏱️ Duração Total:
                                                    </span>{' '}
                                                    <span className="text-blue-600">
                                                      {calculateDaysBetween(
                                                        job.data_in,
                                                        item.data_paginacao,
                                                      )}
                                                    </span>
                                                  </div>
                                                  {item.data_duvidas &&
                                                    item.data_paginacao && (
                                                      <div className="mt-1 text-xs">
                                                        <span className="font-medium">
                                                          ⏱️ Dúvidas até
                                                          Paginação:
                                                        </span>{' '}
                                                        <span className="text-orange-600">
                                                          {calculateDaysBetween(
                                                            item.data_duvidas,
                                                            item.data_paginacao,
                                                          )}
                                                        </span>
                                                      </div>
                                                    )}
                                                </div>
                                              )}
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                      <TooltipContent>RELATÓRIO</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="icon"
                                          aria-label="Remover"
                                          className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                          onClick={() =>
                                            setDeleteDialog({
                                              jobId: job.id,
                                              itemId: item.id,
                                              idx,
                                            })
                                          }
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>DELETE</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={20}>
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
              {pathDialog && pathDialog.jobId === job.id && (
                <div
                  className="pointer-events-auto fixed inset-0 z-[9998] bg-black/40"
                  style={{ position: 'absolute' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="flex h-full w-full items-center justify-center"
                    aria-modal="true"
                    role="dialog"
                  >
                    <div className="bg-background border-border rounded-base pointer-events-auto w-full max-w-sm border-2 p-6 shadow-lg">
                      <div className="mb-4 text-lg font-bold">
                        {pathInput
                          ? 'Confirmar path?'
                          : 'Indique o caminho do trabalho'}
                      </div>
                      <input
                        ref={pathInputRef}
                        className="border-border rounded-base mb-4 w-full border-2 p-2"
                        value={pathInput}
                        onChange={(e) => {
                          setPathInput(e.target.value)
                        }}
                        placeholder="Caminho do trabalho"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          className="font-base border-border rounded-base border-2 shadow-sm"
                          onClick={() => {
                            setPathDialog(null)
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="default"
                          className="font-base border-primary rounded-base border-2 shadow-sm"
                          disabled={!pathInput.trim()}
                          onClick={async () => {
                            const { jobId, itemId, idx } = pathDialog
                            if (!itemId || !pathInput.trim()) {
                              return
                            }

                            // Get the designer_item_id from current drawerItems
                            const currentItems = drawerItems[jobId] || []
                            const currentItem = currentItems[idx]
                            if (!currentItem?.designer_item_id) {
                              console.error('Designer item ID not found')
                              return
                            }

                            const supabase = createBrowserClient()
                            await supabase
                              .from('designer_items')
                              .update({
                                paginacao: true,
                                path_trabalho: pathInput,
                                data_paginacao: new Date().toISOString(),
                                data_saida: new Date().toISOString(),
                              })
                              .eq('id', currentItem.designer_item_id)
                            updateItemInState({
                              designerItemId: currentItem.designer_item_id,
                              updates: {
                                paginacao: true,
                                path_trabalho: pathInput,
                                data_paginacao: new Date().toISOString(),
                                data_saida: new Date().toISOString(),
                              },
                            })
                            await fetchJobs(setJobs, {
                              selectedDesigner,
                              poFilter: debouncedPoFilter,
                              campaignFilter: debouncedCampaignFilter,
                              itemFilter: debouncedItemFilter,
                              codigoFilter: debouncedCodigoFilter,
                              showFechados,
                            })
                            setPathDialog(null)
                          }}
                        >
                          Guardar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DrawerContent>
          </Drawer>
        ))}
      </div>

      {/* Dialog components rendered with createPortal to avoid aria-hidden conflicts */}
      {portalContainer &&
        deleteDialog &&
        createPortal(
          <div className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
            <div className="bg-background border-border rounded-base w-full max-w-sm border-2 p-6 shadow-lg">
              <div className="mb-4 text-lg font-bold">
                Tem a certeza que quer apagar?
              </div>
              <div className="mb-6 text-sm text-gray-600 dark:text-gray-300">
                Não pode recuperar estes dados
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="font-base border-border rounded-base border-2 shadow-sm"
                  onClick={() => {
                    setDeleteDialog(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="btn-destructive rounded-none"
                  onClick={async () => {
                    const { jobId, itemId, idx } = deleteDialog

                    if (!itemId) {
                      setDeleteDialog(null)
                      return
                    }

                    // Get the designer_item_id from current drawerItems
                    const currentItems = drawerItems[jobId] || []
                    const currentItem = currentItems[idx]
                    if (!currentItem?.designer_item_id) {
                      console.error('Designer item ID not found')
                      setDeleteDialog(null)
                      return
                    }

                    const supabase = createBrowserClient()

                    // First delete from designer_items
                    await supabase
                      .from('designer_items')
                      .delete()
                      .eq('id', currentItem.designer_item_id)

                    // Then delete from items_base
                    await supabase.from('items_base').delete().eq('id', itemId)

                    // Update state
                    setDrawerItems((prev) => {
                      const updated = (prev[jobId] || []).filter(
                        (_, i) => i !== idx,
                      )
                      return { ...prev, [jobId]: updated }
                    })

                    setDeleteDialog(null)
                  }}
                >
                  Apagar
                </Button>
              </div>
            </div>
          </div>,
          portalContainer,
        )}
    </>
  )
}

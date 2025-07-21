'use client'

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
} from 'lucide-react'
import { createBrowserClient } from '@/utils/supabase'
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
  maquete_enviada: boolean | null
  paginacao: boolean | null
  data_in: string | null
  data_duvidas: string | null
  data_envio: string | null
  data_saida: string | null
  path_trabalho: string | null
  updated_at: string | null
  items_base:
    | {
        id: string
        folha_obra_id: string
        descricao: string
        codigo: string | null
        complexidade_id?: string | null
        complexidade?: string | null
      }
    | {
        id: string
        folha_obra_id: string
        descricao: string
        codigo: string | null
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
  complexidade_id?: string | null
  complexidade?: string | null
  em_curso: boolean | null
  duvidas: boolean | null
  maquete_enviada: boolean | null
  paginacao: boolean | null
  data_in: string | null
  data_duvidas: string | null
  data_envio: string | null
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
    console.log('fetchJobs called with filters:', filters)

    let jobIds: string[] | null = null

    // STEP 1: Handle item/codigo filtering first (searches globally across all items)
    const hasItemFilters = !!(
      filters.itemFilter?.trim() || filters.codigoFilter?.trim()
    )

    if (hasItemFilters) {
      console.log(
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
        console.log(`Found ${jobIds.length} jobs matching item/codigo search`)
      } else {
        console.log('No items found matching search criteria')
        setJobs([])
        return
      }
    }

    // STEP 2: Build main jobs query
    let query = supabase
      .from('folhas_obras')
      .select(
        'id, data_in, numero_fo, profile_id, nome_campanha, data_saida, prioridade, notas, created_at',
      )

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

    // STEP 5: Handle showFechados filter (completion status)
    if (filters.showFechados !== undefined) {
      try {
        console.log('🔍 Applying showFechados filter')

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

        console.log(
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
        em_curso,
        duvidas,
        maquete_enviada,
        paginacao,
        data_in,
        data_duvidas,
        data_envio,
        data_saida,
        path_trabalho,
        updated_at,
        items_base!inner (
          id,
          folha_obra_id,
          descricao,
          codigo,
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
            complexidade_id: base.complexidade_id ?? null,
            complexidade: base.complexidade ?? null,
            em_curso: d.em_curso,
            duvidas: d.duvidas,
            maquete_enviada: d.maquete_enviada,
            paginacao: d.paginacao,
            data_in: d.data_in,
            data_duvidas: d.data_duvidas,
            data_envio: d.data_envio,
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
        console.log('debouncedUpdateComplexidade called with:', {
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

          console.log('Successfully updated complexidade:', data)
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

  // Fetch jobs with filters
  useEffect(() => {
    fetchJobs(setJobs, {
      selectedDesigner,
      poFilter: debouncedPoFilter,
      campaignFilter: debouncedCampaignFilter,
      itemFilter: debouncedItemFilter,
      codigoFilter: debouncedCodigoFilter,
      showFechados,
    })
  }, [
    selectedDesigner,
    debouncedPoFilter,
    debouncedCampaignFilter,
    debouncedItemFilter,
    debouncedCodigoFilter,
    showFechados,
  ])

  // Fetch all items for status calculations
  useEffect(() => {
    fetchAllItems(setAllItems, jobs)
  }, [jobs])

  // Jobs are now filtered at database level
  const filteredJobs = jobs

  // Sorting logic
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortedJobs = (jobs: Job[]) => {
    const sorted = [...jobs].sort((a, b) => {
      let aValue: any = a[sortColumn as keyof Job]
      let bValue: any = b[sortColumn as keyof Job]
      // Special cases
      if (sortColumn === 'data_in' || sortColumn === 'data_saida') {
        aValue = aValue ? new Date(aValue).getTime() : 0
        bValue = bValue ? new Date(bValue).getTime() : 0
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
        // true > false
        return sortDirection === 'asc'
          ? aValue === bValue
            ? 0
            : aValue
              ? -1
              : 1
          : aValue === bValue
            ? 0
            : aValue
              ? 1
              : -1
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
          em_curso,
          duvidas,
          maquete_enviada,
          paginacao,
          data_in,
          data_duvidas,
          data_envio,
          data_saida,
          path_trabalho,
          updated_at,
          items_base!inner (
            id,
            folha_obra_id,
            descricao,
            codigo,
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
              complexidade_id: base.complexidade_id ?? null,
              complexidade: base.complexidade ?? null,
              em_curso: d.em_curso,
              duvidas: d.duvidas,
              maquete_enviada: d.maquete_enviada,
              paginacao: d.paginacao,
              data_in: d.data_in,
              data_duvidas: d.data_duvidas,
              data_envio: d.data_envio,
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
      const aValue = !!a[column]
      const bValue = !!b[column]
      if (aValue === bValue) return 0
      if (direction === 'asc') return aValue ? -1 : 1
      return aValue ? 1 : -1
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
      console.log('updateItemInState called with:', { designerItemId, updates })

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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showFechados ? 'default' : 'outline'}
                  size="icon"
                  className={`h-10 w-10 rounded-none ${showFechados ? 'bg-[var(--main)]' : ''}`}
                  onClick={() => {
                    setShowFechados((prevState) => !prevState)
                    // The filtering is now handled automatically by the useEffect that listens to showFechados
                  }}
                  aria-label={
                    showFechados ? 'Mostrar Em Aberto' : 'Mostrar Fechados'
                  }
                >
                  {showFechados ? (
                    <Eye className="h-5 w-5" />
                  ) : (
                    <EyeOff className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Trabalhos concluídos</TooltipContent>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    className="h-10 w-10 rounded-none"
                    onClick={async () => {
                      const supabase = createBrowserClient()
                      // Get next numero_fo (max + 1)
                      const { data: maxData } = await supabase
                        .from('folhas_obras')
                        .select('numero_fo')
                        .order('numero_fo', { ascending: false })
                        .limit(1)
                      const nextNumeroFo =
                        maxData && maxData[0]?.numero_fo
                          ? maxData[0].numero_fo + 1
                          : 1
                      const newJob = {
                        numero_fo: nextNumeroFo,
                        profile_id: null,
                        nome_campanha: '',
                        prioridade: false,
                        data_in: new Date().toISOString(),
                        data_saida: null,
                        notas: '',
                      }
                      const { data, error } = await supabase
                        .from('folhas_obras')
                        .insert([newJob])
                        .select('*')
                      if (!error && data && data[0]) {
                        // Reset all filters so the new job is visible
                        setSelectedDesigner('all')
                        setPoFilter('')
                        setCampaignFilter('')
                        setShowFechados(false)
                        // Directly add the new job to state
                        setJobs((prev) => [...prev, data[0]])
                        // Optionally refresh items if needed
                        setOpenDrawerId(data[0].id)
                      } else {
                        // Optionally handle error
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Novo Trabalho</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Tabs defaultValue="trabalhos" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-2">
            <TabsTrigger value="trabalhos" className="rounded-none">
              Trabalhos
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-none">
              Análises & Gráficos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trabalhos" className="space-y-6">
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
                      <TableHead className="border-border sticky top-0 z-10 w-[180px] border-b-2 bg-[var(--orange)] font-bold uppercase">
                        Status
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
                      <TableHead className="border-border sticky top-0 z-10 w-[90px] border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedJobs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
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
        {sortedJobs.map((job, index) => (
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
                    <Button
                      variant="outline"
                      className="h-10 rounded-none"
                      onClick={async () => {
                        if (
                          !(
                            job.numero_fo &&
                            job.nome_campanha &&
                            String(job.nome_campanha).trim().length > 0
                          )
                        )
                          return

                        const supabase = createBrowserClient()

                        // First create the base item
                        const { data: baseData, error: baseError } =
                          await supabase
                            .from('items_base')
                            .insert({
                              folha_obra_id: job.id,
                              descricao: '',
                              codigo: '',
                            })
                            .select('*')
                            .single()

                        if (baseError || !baseData) {
                          return
                        }

                        // Then create the designer item
                        const { data: designerData, error: designerError } =
                          await supabase
                            .from('designer_items')
                            .insert({
                              item_id: baseData.id,
                              em_curso: true,
                              duvidas: false,
                              maquete_enviada: false,
                              paginacao: false,
                            })
                            .select('*')
                            .single()

                        if (designerError) {
                          return
                        }

                        // Refresh items for this job
                        refreshItems(job.id)

                        // Focus the new item after refresh
                        setFocusRow({ jobId: job.id, itemId: baseData.id })
                      }}
                      disabled={
                        !(
                          job.numero_fo &&
                          job.nome_campanha &&
                          String(job.nome_campanha).trim().length > 0
                        )
                      }
                    >
                      Adicionar Item
                    </Button>
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
                            <TableHead className="border-border w-2/3 border-b-2 font-bold uppercase">
                              Item
                            </TableHead>
                            <TableHead className="border-border w-[29ch] border-b-2 font-bold uppercase">
                              Código
                            </TableHead>
                            <TableHead className="border-border w-[140px] border-b-2 font-bold uppercase">
                              Complexidade
                            </TableHead>
                            <TableHead
                              className="border-border w-auto cursor-pointer border-b-2 text-center font-bold whitespace-nowrap uppercase select-none"
                              onClick={() => {
                                setDrawerSort((prev) => {
                                  const current = prev[job.id]
                                  if (current?.column === 'em_curso') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'em_curso',
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
                                      column: 'em_curso',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              EC
                              {drawerSort[job.id]?.column === 'em_curso' &&
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
                                  if (current?.column === 'maquete_enviada') {
                                    return {
                                      ...prev,
                                      [job.id]: {
                                        column: 'maquete_enviada',
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
                                      column: 'maquete_enviada',
                                      direction: 'asc',
                                    },
                                  }
                                })
                              }}
                            >
                              M
                              {drawerSort[job.id]?.column ===
                                'maquete_enviada' &&
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
                              <TableCell colSpan={8}>
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
                                      setDrawerItems((prev) => {
                                        const updated = [
                                          ...(prev[job.id] || []),
                                        ]
                                        updated[idx] = {
                                          ...updated[idx],
                                          descricao: newValue,
                                        }
                                        return { ...prev, [job.id]: updated }
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
                                          setDrawerItems((prev) => {
                                            const updated = [
                                              ...(prev[job.id] || []),
                                            ]
                                            updated[idx] = {
                                              ...updated[idx],
                                              paginacao: true,
                                              path_trabalho: 'P:',
                                              data_saida:
                                                new Date().toISOString(),
                                            }
                                            return {
                                              ...prev,
                                              [job.id]: updated,
                                            }
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
                                  <Checkbox
                                    checked={!!item.em_curso}
                                    onCheckedChange={async (checked) => {
                                      if (!item.designer_item_id) {
                                        return
                                      }
                                      setDrawerItems((prev) => {
                                        const updated = [
                                          ...(prev[job.id] || []),
                                        ]
                                        updated[idx] = {
                                          ...updated[idx],
                                          em_curso: !!checked,
                                          duvidas: false,
                                          maquete_enviada: false,
                                          paginacao: false,
                                        }
                                        return { ...prev, [job.id]: updated }
                                      })

                                      // Update in database
                                      try {
                                        const supabase = createBrowserClient()
                                        await supabase
                                          .from('designer_items')
                                          .update({
                                            em_curso: !!checked,
                                            duvidas: false,
                                            maquete_enviada: false,
                                            paginacao: false,
                                            data_in: !!checked
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
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <Checkbox
                                    checked={!!item.duvidas}
                                    onCheckedChange={async (checked) => {
                                      if (!item.designer_item_id) {
                                        return
                                      }
                                      setDrawerItems((prev) => {
                                        const updated = [
                                          ...(prev[job.id] || []),
                                        ]
                                        updated[idx] = {
                                          ...updated[idx],
                                          em_curso: false,
                                          duvidas: !!checked,
                                          maquete_enviada: false,
                                          paginacao: false,
                                        }
                                        return { ...prev, [job.id]: updated }
                                      })

                                      // Update in database
                                      try {
                                        const supabase = createBrowserClient()
                                        await supabase
                                          .from('designer_items')
                                          .update({
                                            em_curso: false,
                                            duvidas: !!checked,
                                            maquete_enviada: false,
                                            paginacao: false,
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
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <Checkbox
                                    checked={!!item.maquete_enviada}
                                    onCheckedChange={async (checked) => {
                                      if (!item.designer_item_id) {
                                        return
                                      }
                                      setDrawerItems((prev) => {
                                        const updated = [
                                          ...(prev[job.id] || []),
                                        ]
                                        updated[idx] = {
                                          ...updated[idx],
                                          em_curso: false,
                                          duvidas: false,
                                          maquete_enviada: !!checked,
                                          paginacao: false,
                                        }
                                        return { ...prev, [job.id]: updated }
                                      })

                                      // Update in database
                                      try {
                                        const supabase = createBrowserClient()
                                        await supabase
                                          .from('designer_items')
                                          .update({
                                            em_curso: false,
                                            duvidas: false,
                                            maquete_enviada: !!checked,
                                            paginacao: false,
                                            data_envio: !!checked
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
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <Checkbox
                                    checked={!!item.paginacao}
                                    onCheckedChange={async (checked) => {
                                      if (!item.designer_item_id) {
                                        return
                                      }
                                      if (checked) {
                                        // Always open the path dialog, do not set paginacao yet
                                        setPathInput(item.path_trabalho || '')
                                        setPathDialog({
                                          jobId: job.id,
                                          itemId: item.id,
                                          idx,
                                        })
                                      } else {
                                        // If unchecked, allow immediate update
                                        setDrawerItems((prev) => {
                                          const updated = [
                                            ...(prev[job.id] || []),
                                          ]
                                          updated[idx] = {
                                            ...updated[idx],
                                            paginacao: false,
                                          }
                                          return { ...prev, [job.id]: updated }
                                        })
                                        // Update only paginacao in DB, do NOT clear path_trabalho
                                        const supabase = createBrowserClient()
                                        const { error } = await supabase
                                          .from('designer_items')
                                          .update({ paginacao: false })
                                          .eq('item_id', item.id)
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <Popover modal={false}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        aria-label="Ver ou editar path"
                                      >
                                        {item.path_trabalho ? (
                                          <FileText className="h-4 w-4" />
                                        ) : (
                                          <FilePlus className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="bg-background border-border w-80 border-2 p-4">
                                      <div className="space-y-2">
                                        <h4 className="font-medium">Path</h4>
                                        <Input
                                          value={item.path_trabalho || ''}
                                          placeholder="Adicionar path..."
                                          className="min-h-[40px]"
                                          onChange={(e) => {
                                            const newValue = e.target.value
                                            setDrawerItems((prev) => {
                                              const updated = [
                                                ...(prev[job.id] || []),
                                              ]
                                              updated[idx] = {
                                                ...updated[idx],
                                                path_trabalho: newValue,
                                              }
                                              return {
                                                ...prev,
                                                [job.id]: updated,
                                              }
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
                                              .eq('item_id', item.id)

                                            // Update local state if data_saida was set
                                            if (newPath.trim()) {
                                              setDrawerItems((prev) => {
                                                const updated = [
                                                  ...(prev[job.id] || []),
                                                ]
                                                updated[idx] = {
                                                  ...updated[idx],
                                                  data_saida:
                                                    updates.data_saida,
                                                }
                                                return {
                                                  ...prev,
                                                  [job.id]: updated,
                                                }
                                              })
                                            }
                                          }}
                                        />
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </TableCell>
                                <TableCell className="flex justify-center gap-2">
                                  <Button
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
                                            maquete_enviada:
                                              item.maquete_enviada,
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
                                  </Button>
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
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={8}>
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
                            const supabase = createBrowserClient()
                            await supabase
                              .from('designer_items')
                              .update({
                                em_curso: false,
                                duvidas: false,
                                maquete_enviada: false,
                                paginacao: true,
                                path_trabalho: pathInput,
                                data_saida: new Date().toISOString(),
                              })
                              .eq('item_id', itemId)
                            setDrawerItems((prev) => {
                              const updated = [...(prev[jobId] || [])]
                              if (updated[idx]) {
                                updated[idx] = {
                                  ...updated[idx],
                                  em_curso: false,
                                  duvidas: false,
                                  maquete_enviada: false,
                                  paginacao: true,
                                  path_trabalho: pathInput,
                                  data_saida: new Date().toISOString(),
                                }
                              }
                              return { ...prev, [jobId]: updated }
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
                  className="font-base border-destructive rounded-base border-2 shadow-sm"
                  onClick={async () => {
                    const { jobId, itemId, idx } = deleteDialog

                    if (!itemId) {
                      setDeleteDialog(null)
                      return
                    }

                    const supabase = createBrowserClient()

                    // First delete from designer_items
                    await supabase
                      .from('designer_items')
                      .delete()
                      .eq('item_id', itemId)

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

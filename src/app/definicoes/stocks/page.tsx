'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Textarea } from '@/components/ui/textarea'
import DatePicker from '@/components/ui/DatePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  UppercaseSelectValue,
  UppercaseSelectItem,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Eye,
  Trash2,
  X,
  Loader2,
  Edit,
  RotateCw,
  Package,
  ArrowUp,
  ArrowDown,
  Download,
} from 'lucide-react'
import PermissionGuard from '@/components/PermissionGuard'
import { StockEntryWithRelations } from '@/types/producao'
import Combobox from '@/components/ui/Combobox'
import StockAnalyticsCharts from '@/components/StockAnalyticsCharts'

interface Material {
  id: string
  material: string | null
  cor: string | null
  tipo: string | null
  carateristica: string | null
  fornecedor_id: string | null
  qt_palete: number | null
  valor_m2_custo: number | null
  valor_placa: number | null
  stock_minimo: number | null
  stock_critico: number | null
  referencia: string | null
}

interface Fornecedor {
  id: string
  nome_forn: string
}

interface CurrentStock {
  id: string
  material: string | null
  cor: string | null
  tipo: string | null
  carateristica: string | null
  total_recebido: number
  total_consumido: number
  stock_atual: number
  quantidade_disponivel: number
  stock_minimo: number | null
  stock_critico: number | null
  referencia?: string | null
  stock_correct?: number | null
  stock_correct_updated_at?: string | null
}

interface Palete {
  id: string
  no_palete: string
  fornecedor_id: string | null
  no_guia_forn: string | null
  ref_cartao: string | null
  qt_palete: number | null
  data: string
  author_id: string | null
  created_at: string
  updated_at: string
}

interface PaleteWithRelations extends Palete {
  fornecedores?: {
    id: string
    nome_forn: string
  } | null
  profiles?: {
    id: string
    first_name: string
    last_name: string
  } | null
}

interface Profile {
  id: string
  first_name: string
  last_name: string
  user_id: string
}

interface PaletesFilters {
  search?: string
  referencia?: string
  fornecedor?: string
  author?: string
  dateFrom?: string
  dateTo?: string
}

export default function StocksPage() {
  // Define formatMaterialName at the very top so it is available everywhere
  const formatMaterialName = (material: any) => {
    if (!material) return '-'
    if (typeof material === 'object') {
      return [
        material.material,
        material.cor,
        material.tipo,
        material.carateristica,
      ]
        .filter(Boolean)
        .join(' - ')
    }
    // For current stock data structure
    return [material].filter(Boolean).join(' - ')
  }

  const [stocks, setStocks] = useState<StockEntryWithRelations[]>([])
  const [currentStocks, setCurrentStocks] = useState<CurrentStock[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [currentStocksLoading, setCurrentStocksLoading] = useState(true)
  const [openDrawer, setOpenDrawer] = useState(false)
  const [editingStock, setEditingStock] =
    useState<StockEntryWithRelations | null>(null)
  const [activeTab, setActiveTab] = useState('entries')

  // Paletes state
  const [paletes, setPaletes] = useState<PaleteWithRelations[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [paletesLoading, setPaletesLoading] = useState(true)
  const [editingPaleteId, setEditingPaleteId] = useState<string | null>(null)
  const [paletesFilter, setPaletesFilter] = useState('')
  const [paletesReferenciaFilter, setPaletesReferenciaFilter] = useState('')

  // Enhanced filtering for paletes
  const [paletesDateFrom, setPaletesDateFrom] = useState('')
  const [paletesDateTo, setPaletesDateTo] = useState('')
  const [paletesFornecedorFilter, setPaletesFornecedorFilter] =
    useState('__all__')
  const [paletesAuthorFilter, setPaletesAuthorFilter] = useState('__all__')

  // Sorting state for paletes table
  const [sortColumnPaletes, setSortColumnPaletes] =
    useState<string>('no_palete')
  const [sortDirectionPaletes, setSortDirectionPaletes] = useState<
    'asc' | 'desc'
  >('asc')

  // Inline editing state for paletes
  const [showNewPaleteRow, setShowNewPaleteRow] = useState(false)
  const [newPaleteData, setNewPaleteData] = useState({
    no_palete: '',
    fornecedor_id: '',
    no_guia_forn: '',
    ref_cartao: '',
    qt_palete: '',
    data: new Date().toISOString().split('T')[0],
    author_id: '',
  })
  const [editingPaleteData, setEditingPaleteData] = useState<{
    [key: string]: any
  }>({})
  const [submittingPalete, setSubmittingPalete] = useState(false)

  const [formData, setFormData] = useState({
    material_id: '',
    material_referencia: '',
    fornecedor_id: '',
    no_guia_forn: '',
    quantidade: '',
    quantidade_disponivel: '',
    vl_m2: '',
    preco_unitario: '',
    valor_total: '',
    notas: '',
    n_palet: '',
    quantidade_palete: '',
    num_palettes: '',
  })
  const [materialFilter, setMaterialFilter] = useState('')
  const [referenciaFilter, setReferenciaFilter] = useState('')
  const [currentStockFilter, setCurrentStockFilter] = useState('')
  const [currentStockReferenciaFilter, setCurrentStockReferenciaFilter] =
    useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null)

  // Sorting state for entries table
  const [sortColumnEntries, setSortColumnEntries] = useState<string>('data')
  const [sortDirectionEntries, setSortDirectionEntries] = useState<
    'asc' | 'desc'
  >('desc')

  // Sorting state for current stocks table
  const [sortColumnCurrent, setSortColumnCurrent] = useState<string>('material')
  const [sortDirectionCurrent, setSortDirectionCurrent] = useState<
    'asc' | 'desc'
  >('asc')

  // Add state for editing stock_correct
  const [editingStockCorrectId, setEditingStockCorrectId] = useState<
    string | null
  >(null)
  const [stockCorrectValue, setStockCorrectValue] = useState<string>('')

  // Add state for per-row input values
  const [stockCorrectValueMap, setStockCorrectValueMap] = useState<{
    [id: string]: string
  }>({})

  // Add state for per-row input values for stock_minimo and stock_critico
  const [stockMinimoValueMap, setStockMinimoValueMap] = useState<{
    [id: string]: string
  }>({})
  const [stockCriticoValueMap, setStockCriticoValueMap] = useState<{
    [id: string]: string
  }>({})

  const supabase = createBrowserClient()

  // Add comprehensive accessibility fix
  useEffect(() => {
    const handleAriaHiddenFix = () => {
      // Ensure main content wrapper never gets aria-hidden when it contains focused elements
      const mainWrapper = document.getElementById('main-content-wrapper')
      if (mainWrapper) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (
              mutation.type === 'attributes' &&
              mutation.attributeName === 'aria-hidden'
            ) {
              const element = mutation.target as HTMLElement
              if (
                element === mainWrapper &&
                element.getAttribute('aria-hidden') === 'true'
              ) {
                // If any focusable element inside has focus, remove aria-hidden
                const focusableElements = element.querySelectorAll(
                  'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
                )
                const hasFocusedElement = Array.from(focusableElements).some(
                  (el) => el === document.activeElement,
                )

                if (hasFocusedElement) {
                  console.log(
                    'Preventing aria-hidden on main wrapper due to focused element',
                  )
                  element.removeAttribute('aria-hidden')
                }
              }
            }
          })
        })

        observer.observe(mainWrapper, {
          attributes: true,
          attributeFilter: ['aria-hidden'],
        })

        return () => observer.disconnect()
      }
    }

    const cleanup = handleAriaHiddenFix()
    return cleanup
  }, [])

  const fetchStocks = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select(
          `
          *,
          materiais(material, cor, tipo, carateristica, referencia),
          fornecedores(nome_forn)
        `,
        )
        .order('created_at', { ascending: false })

      if (!error && data) {
        setStocks(data)
      }
    } catch (error) {
      console.error('Error fetching stocks:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materiais')
        .select(
          'id, material, cor, tipo, carateristica, fornecedor_id, qt_palete, valor_m2_custo, valor_placa, stock_minimo, stock_critico, referencia',
        )
        .order('material', { ascending: true })

      if (!error && data) {
        setMaterials(data)
      }
    } catch (error) {
      console.error('Error fetching materials:', error)
    }
  }

  const fetchFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome_forn')
        .order('nome_forn', { ascending: true })

      if (!error && data) {
        setFornecedores(data)
      }
    } catch (error) {
      console.error('Error fetching fornecedores:', error)
    }
  }

  const fetchCurrentStocks = async () => {
    setCurrentStocksLoading(true)
    try {
      // Try to get from RPC, fallback to manual
      const { data, error } = await supabase.rpc('get_current_stocks')
      if (error || !data) {
        await fetchCurrentStocksManual()
      } else {
        // Fetch stock_correct for each material
        const { data: materiaisData } = await supabase
          .from('materiais')
          .select('id, stock_correct, stock_correct_updated_at')
        const materiaisMap = new Map(
          (materiaisData || []).map((m) => [m.id, m]),
        )
        setCurrentStocks(
          data.map((row: any) => ({
            ...row,
            stock_correct: materiaisMap.get(row.id)?.stock_correct ?? null,
            stock_correct_updated_at:
              materiaisMap.get(row.id)?.stock_correct_updated_at ?? null,
          })),
        )
      }
    } catch (error) {
      await fetchCurrentStocksManual()
    } finally {
      setCurrentStocksLoading(false)
    }
  }

  const fetchCurrentStocksManual = async () => {
    try {
      const { data: materialsData, error: materialsError } = await supabase
        .from('materiais')
        .select(
          'id, material, cor, tipo, carateristica, stock_minimo, stock_critico, referencia, stock_correct, stock_correct_updated_at',
        )
      if (materialsError) throw materialsError
      const currentStocksData: CurrentStock[] = []
      for (const material of materialsData || []) {
        // Get total received from stocks
        const { data: stocksData } = await supabase
          .from('stocks')
          .select('quantidade')
          .eq('material_id', material.id)

        const totalRecebido =
          stocksData?.reduce(
            (sum, stock) => sum + (stock.quantidade || 0),
            0,
          ) || 0

        // Get total consumed from producao_operacoes
        const { data: operacoesData } = await supabase
          .from('producao_operacoes')
          .select('num_placas_corte')
          .eq('material_id', material.id)

        const totalConsumido =
          operacoesData?.reduce(
            (sum, op) => sum + (op.num_placas_corte || 0),
            0,
          ) || 0

        const stockAtual = totalRecebido - totalConsumido

        // Get quantidade_disponivel from stocks table (sum of all quantidade_disponivel for this material)
        const { data: stocksDisponivelData } = await supabase
          .from('stocks')
          .select('quantidade_disponivel')
          .eq('material_id', material.id)

        const quantidadeDisponivel =
          stocksDisponivelData?.reduce(
            (sum, stock) => sum + (stock.quantidade_disponivel || 0),
            0,
          ) || 0

        currentStocksData.push({
          id: material.id,
          material: material.material,
          cor: material.cor,
          tipo: material.tipo,
          carateristica: material.carateristica,
          total_recebido: totalRecebido || 0,
          total_consumido: totalConsumido || 0,
          stock_atual: stockAtual || 0,
          quantidade_disponivel: quantidadeDisponivel || 0,
          stock_minimo: material.stock_minimo,
          stock_critico: material.stock_critico,
          referencia: material.referencia,
          stock_correct: material.stock_correct ?? null,
          stock_correct_updated_at: material.stock_correct_updated_at ?? null,
        })
      }
      currentStocksData.sort((a, b) => a.stock_atual - b.stock_atual)
      setCurrentStocks(currentStocksData)
    } catch (error) {
      console.error('Error in manual current stocks calculation:', error)
    }
  }

  const fetchPaletes = async (filters: PaletesFilters = {}) => {
    setPaletesLoading(true)
    try {
      let query = supabase.from('paletes').select(`
          *,
          fornecedores(id, nome_forn),
          profiles(id, first_name, last_name)
        `)

      // Apply filters at database level
      if (filters.search?.trim()) {
        const searchTerm = filters.search.trim()
        // Search in palette number, guide number, and reference
        query = query.or(
          `no_palete.ilike.%${searchTerm}%,no_guia_forn.ilike.%${searchTerm}%,ref_cartao.ilike.%${searchTerm}%`,
        )
      }

      if (filters.referencia?.trim()) {
        query = query.ilike('ref_cartao', `%${filters.referencia.trim()}%`)
      }

      if (filters.fornecedor && filters.fornecedor !== '__all__') {
        // First get the fornecedor ID if filtering by name
        const { data: fornecedorData } = await supabase
          .from('fornecedores')
          .select('id')
          .ilike('nome_forn', `%${filters.fornecedor}%`)

        if (fornecedorData && fornecedorData.length > 0) {
          const fornecedorIds = fornecedorData.map((f) => f.id)
          query = query.in('fornecedor_id', fornecedorIds)
        } else {
          // No matching suppliers found, return empty result
          setPaletes([])
          setPaletesLoading(false)
          return
        }
      }

      if (filters.author && filters.author !== '__all__') {
        // First get the profile ID if filtering by name
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .or(
            `first_name.ilike.%${filters.author}%,last_name.ilike.%${filters.author}%`,
          )

        if (profileData && profileData.length > 0) {
          const profileIds = profileData.map((p) => p.id)
          query = query.in('author_id', profileIds)
        } else {
          // No matching authors found, return empty result
          setPaletes([])
          setPaletesLoading(false)
          return
        }
      }

      // Apply user-provided date filters
      if (filters.dateFrom) {
        query = query.gte('data', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('data', filters.dateTo)
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      })

      if (!error && data) {
        setPaletes(data)
      }
    } catch (error) {
      console.error('Error fetching paletes:', error)
    } finally {
      setPaletesLoading(false)
    }
  }

  // Wrapper function for refresh button
  const refreshPaletes = () => {
    const currentFilters = {
      search: paletesFilter,
      referencia: paletesReferenciaFilter,
      fornecedor: paletesFornecedorFilter,
      author: paletesAuthorFilter,
      dateFrom: paletesDateFrom,
      dateTo: paletesDateTo,
    }
    fetchPaletes(currentFilters)
  }

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, user_id')
        .order('first_name', { ascending: true })

      if (!error && data) {
        setProfiles(data)
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchStocks(),
          fetchMaterials(),
          fetchFornecedores(),
          fetchCurrentStocks(),
          fetchPaletes(),
          fetchProfiles(),
        ])
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    }

    loadData()
  }, []) // Temporary fix for infinite loop - functions need useCallback wrapping

  // Effect to trigger filtering when paletes filters change
  useEffect(() => {
    const filters = {
      search: paletesFilter,
      referencia: paletesReferenciaFilter,
      fornecedor: paletesFornecedorFilter,
      author: paletesAuthorFilter,
      dateFrom: paletesDateFrom,
      dateTo: paletesDateTo,
    }
    fetchPaletes(filters)
  }, [
    paletesFilter,
    paletesReferenciaFilter,
    paletesFornecedorFilter,
    paletesAuthorFilter,
    paletesDateFrom,
    paletesDateTo,
    // fetchPaletes - temporarily removed to prevent infinite loop
  ])

  useEffect(() => {
    const handleFocus = () => {
      fetchMaterials()
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, []) // fetchMaterials - temporarily removed to prevent infinite loop

  // Helper to get reference for a material id - moved up to avoid hoisting issues
  const getReferenciaByMaterialId = (materialId: string) => {
    const found = materials.find((m) => m.id === materialId)
    return found?.referencia || '-'
  }

  const filteredStocks = stocks.filter((stock) => {
    const materialName = stock.materiais?.material || ''
    const materialCor = stock.materiais?.cor || ''
    const referencia = stock.materiais?.referencia || ''
    const materialSearchText = `${materialName} ${materialCor}`.toLowerCase()
    const referenciaSearchText = referencia.toLowerCase()

    const matchesMaterial = materialSearchText.includes(
      materialFilter.toLowerCase(),
    )
    const matchesReferencia = referenciaSearchText.includes(
      referenciaFilter.toLowerCase(),
    )

    return matchesMaterial && matchesReferencia
  })

  const filteredCurrentStocks = currentStocks.filter((stock) => {
    const materialName = stock.material || ''
    const materialCor = stock.cor || ''
    const referencia = getReferenciaByMaterialId(stock.id)
    const materialSearchText = `${materialName} ${materialCor}`.toLowerCase()
    const referenciaSearchText = referencia.toLowerCase()

    const matchesMaterial = materialSearchText.includes(
      currentStockFilter.toLowerCase(),
    )
    const matchesReferencia = referenciaSearchText.includes(
      currentStockReferenciaFilter.toLowerCase(),
    )

    return matchesMaterial && matchesReferencia
  })

  // Paletes are now filtered at database level, no need for client-side filtering
  const filteredPaletes = paletes

  // Sorting logic for entries table
  const handleSortEntries = (column: string) => {
    if (sortColumnEntries === column) {
      setSortDirectionEntries((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumnEntries(column)
      setSortDirectionEntries('asc')
    }
  }

  // Sorting logic for current stocks table
  const handleSortCurrent = (column: string) => {
    if (sortColumnCurrent === column) {
      setSortDirectionCurrent((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumnCurrent(column)
      setSortDirectionCurrent('asc')
    }
  }

  // Sorting logic for paletes table
  const handleSortPaletes = (column: string) => {
    if (sortColumnPaletes === column) {
      setSortDirectionPaletes((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumnPaletes(column)
      setSortDirectionPaletes('asc')
    }
  }

  // Sort helper for entries table
  const sortedStocks = [...filteredStocks].sort((a, b) => {
    const getValue = (stock: any, col: string) => {
      switch (col) {
        case 'data':
          return new Date(stock.data).getTime()
        case 'referencia':
          return stock.materiais?.referencia || ''
        case 'material':
          return formatMaterialName(stock.materiais)
        case 'fornecedor':
          return stock.fornecedores?.nome_forn || ''
        case 'quantidade':
          return stock.quantidade
        case 'vl_m2':
          return (stock as any).vl_m2 || 0
        case 'preco_unitario':
          return stock.preco_unitario || 0
        case 'valor_total':
          return stock.valor_total || 0
        case 'n_palet':
          return stock.n_palet || ''
        default:
          return ''
      }
    }
    const aValue = getValue(a, sortColumnEntries)
    const bValue = getValue(b, sortColumnEntries)
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirectionEntries === 'asc' ? aValue - bValue : bValue - aValue
    }
    return sortDirectionEntries === 'asc'
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue))
  })

  // Prepare materials and references for comboboxes using useMemo
  const materialOptions = useMemo(
    () =>
      materials.map((material) => ({
        value: material.id,
        label: formatMaterialName(material),
      })),
    [materials],
  )

  const referenciaOptions = useMemo(() => {
    const uniqueReferences = Array.from(
      new Set(
        materials.map((material) => material.referencia).filter(Boolean), // Remove null/undefined values
      ),
    ) as string[]

    return uniqueReferences.map((ref) => ({
      value: ref,
      label: ref,
    }))
  }, [materials])

  // Move this function up so it is defined before use in sortedCurrentStocks
  const formatCurrentStockMaterialName = (stock: CurrentStock) => {
    return [stock.material, stock.cor, stock.tipo, stock.carateristica]
      .filter(Boolean)
      .join(' - ')
  }

  // Sort helper for current stocks table
  const sortedCurrentStocks = [...filteredCurrentStocks].sort((a, b) => {
    const getValue = (stock: any, col: string) => {
      switch (col) {
        case 'referencia':
          return getReferenciaByMaterialId(stock.id)
        case 'material':
          return formatCurrentStockMaterialName(stock)
        case 'total_recebido':
          return stock.total_recebido
        case 'total_consumido':
          return stock.total_consumido
        case 'stock_atual':
          return stock.stock_atual
        case 'stock_minimo':
          return stock.stock_minimo ?? 0
        case 'stock_critico':
          return stock.stock_critico ?? 0
        default:
          return ''
      }
    }
    const aValue = getValue(a, sortColumnCurrent)
    const bValue = getValue(b, sortColumnCurrent)
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirectionCurrent === 'asc' ? aValue - bValue : bValue - aValue
    }
    return sortDirectionCurrent === 'asc'
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue))
  })

  // Sort helper for paletes table
  const sortedPaletes = [...filteredPaletes].sort((a, b) => {
    const getValue = (palete: any, col: string) => {
      switch (col) {
        case 'no_palete':
          return palete.no_palete || ''
        case 'fornecedor':
          return palete.fornecedores?.nome_forn || ''
        case 'no_guia_forn':
          return palete.no_guia_forn || ''
        case 'ref_cartao':
          return palete.ref_cartao || ''
        case 'qt_palete':
          return palete.qt_palete ?? 0
        case 'data':
          return new Date(palete.data).getTime()
        case 'author':
          return palete.profiles
            ? `${palete.profiles.first_name} ${palete.profiles.last_name}`
            : ''
        default:
          return ''
      }
    }
    const aValue = getValue(a, sortColumnPaletes)
    const bValue = getValue(b, sortColumnPaletes)
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirectionPaletes === 'asc' ? aValue - bValue : bValue - aValue
    }
    return sortDirectionPaletes === 'asc'
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue))
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.material_id) {
      alert('Por favor selecione um material')
      return
    }

    if (!formData.quantidade) {
      alert('Por favor insira uma quantidade')
      return
    }

    setSubmitting(true)
    try {
      const stockData = {
        material_id: formData.material_id,
        fornecedor_id: formData.fornecedor_id || null,
        no_guia_forn: formData.no_guia_forn || null,
        quantidade: parseFloat(formData.quantidade),
        quantidade_disponivel: parseFloat(
          formData.quantidade_disponivel || formData.quantidade,
        ),
        vl_m2: formData.vl_m2 || null,
        preco_unitario: formData.preco_unitario
          ? parseFloat(formData.preco_unitario)
          : null,
        valor_total: parseFloat(calculateTotalValue()),
        notas: formData.notas || null,
        n_palet: formData.num_palettes || null, // Store Nº Palettes value in n_palet column
        data: new Date().toISOString().split('T')[0],
      }

      if (editingStock) {
        // Update existing stock
        const { data, error } = await supabase
          .from('stocks')
          .update({
            ...stockData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingStock.id).select(`
            *,
            materiais(material, cor, tipo, carateristica),
            fornecedores(nome_forn)
          `)

        if (error) {
          console.error('Error updating stock:', error)
          alert(`Erro ao atualizar stock: ${error.message}`)
          return
        }

        if (data && data[0]) {
          setStocks((prev) =>
            prev.map((s) => (s.id === editingStock.id ? data[0] : s)),
          )
          // Refresh stocks, materials, and current stocks data
          await Promise.all([
            fetchStocks(),
            fetchMaterials(),
            fetchCurrentStocks(),
          ])
          resetForm()
          setOpenDrawer(false)
        }
      } else {
        // Create new stock entry
        const { data, error } = await supabase.from('stocks').insert(stockData)
          .select(`
            *,
            materiais(material, cor, tipo, carateristica),
            fornecedores(nome_forn)
          `)

        if (error) {
          console.error('Error creating stock:', error)
          alert(`Erro ao criar entrada de stock: ${error.message}`)
          return
        }

        if (data && data[0]) {
          setStocks((prev) => [data[0], ...prev])
          // Refresh stocks, materials, and current stocks data
          await Promise.all([
            fetchStocks(),
            fetchMaterials(),
            fetchCurrentStocks(),
          ])
          resetForm()
          setOpenDrawer(false)
        }
      }
    } catch (error) {
      console.error('Error saving stock:', error)
      alert(`Erro inesperado: ${error}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (stock: StockEntryWithRelations) => {
    setEditingStock(stock)
    const selectedMaterial = materials.find((m) => m.id === stock.material_id)
    setFormData({
      material_id: stock.material_id,
      material_referencia: selectedMaterial?.referencia || '',
      fornecedor_id: stock.fornecedor_id || '',
      no_guia_forn: stock.no_guia_forn || '',
      quantidade: stock.quantidade.toString(),
      quantidade_disponivel: stock.quantidade_disponivel.toString(),
      vl_m2: (stock as any).vl_m2 || '',
      preco_unitario: stock.preco_unitario?.toString() || '',
      valor_total: stock.valor_total?.toString() || '',
      notas: stock.notas || '',
      n_palet: '',
      quantidade_palete: '',
      num_palettes: stock.n_palet || '', // Show stored n_palet value in Nº Palettes field
    })
    setOpenDrawer(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que quer eliminar esta entrada de stock?'))
      return

    try {
      const { error } = await supabase.from('stocks').delete().eq('id', id)

      if (!error) {
        setStocks((prev) => prev.filter((s) => s.id !== id))
      }
    } catch (error) {
      console.error('Error deleting stock:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      material_id: '',
      material_referencia: '',
      fornecedor_id: '',
      no_guia_forn: '',
      quantidade: '',
      quantidade_disponivel: '',
      vl_m2: '',
      preco_unitario: '',
      valor_total: '',
      notas: '',
      n_palet: '',
      quantidade_palete: '',
      num_palettes: '',
    })
    setEditingStock(null)
    setOpenDrawer(false)
  }

  const handleMaterialChange = (materialId: string) => {
    const selectedMaterial = materials.find((m) => m.id === materialId)

    setFormData((prev) => ({
      ...prev,
      material_id: materialId,
      // Auto-fill reference from material
      material_referencia: selectedMaterial?.referencia || '',
      // Auto-fill supplier from material
      fornecedor_id: selectedMaterial?.fornecedor_id || '',
      // Auto-fill vl_m2 with valor_m2_custo from materiais table
      vl_m2: selectedMaterial?.valor_m2_custo?.toString() || '',
      // Auto-fill PREÇO UNITÁRIO with valor_placa from materiais table (default to 0 if null)
      preco_unitario: selectedMaterial?.valor_placa?.toString() || '0',
      // Auto-fill pallet quantity from material
      quantidade_palete: selectedMaterial?.qt_palete?.toString() || '',
      // Reset calculation fields when material changes
      quantidade: '',
      num_palettes: '',
    }))
  }

  const handleReferenciaChange = (referencia: string) => {
    const selectedMaterial = materials.find((m) => m.referencia === referencia)

    if (selectedMaterial) {
      setFormData((prev) => ({
        ...prev,
        material_id: selectedMaterial.id,
        material_referencia: referencia,
        // Auto-fill supplier from material
        fornecedor_id: selectedMaterial.fornecedor_id || '',
        // Auto-fill vl_m2 with valor_m2_custo from materiais table
        vl_m2: selectedMaterial.valor_m2_custo?.toString() || '',
        // Auto-fill PREÇO UNITÁRIO with valor_placa from materiais table (default to 0 if null)
        preco_unitario: selectedMaterial.valor_placa?.toString() || '0',
        // Auto-fill pallet quantity from material
        quantidade_palete: selectedMaterial.qt_palete?.toString() || '',
        // Reset calculation fields when material changes
        quantidade: '',
        num_palettes: '',
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        material_referencia: referencia,
      }))
    }
  }

  const openNewForm = () => {
    resetForm()
    setOpenDrawer(true)

    // Fix accessibility: ensure no main content elements retain focus when drawer opens
    setTimeout(() => {
      // Remove focus from any buttons in the main content area
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && !activeElement.closest('[data-vaul-drawer]')) {
        activeElement.blur()
      }

      // Focus the first focusable element in the drawer
      const drawerContent = document.querySelector(
        '[data-vaul-drawer] input, [data-vaul-drawer] button, [data-vaul-drawer] select',
      )
      if (drawerContent) {
        ;(drawerContent as HTMLElement).focus()
      }
    }, 100)
  }

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return '-'
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  const calculateTotalValue = () => {
    const quantidade = parseFloat(formData.quantidade) || 0
    const preco = parseFloat(formData.preco_unitario) || 0
    return (quantidade * preco).toFixed(2)
  }

  const handleQuantidadeChange = (newQuantidade: string) => {
    setFormData((prev) => ({
      ...prev,
      quantidade: newQuantidade,
      quantidade_disponivel: prev.quantidade_disponivel || newQuantidade,
      // Clear num_palettes when quantidade is manually changed
      num_palettes: '',
    }))
  }

  const handleNumPalettesChange = (newNumPalettes: string) => {
    const qtPalete = parseFloat(formData.quantidade_palete) || 0
    const numPalettes = parseFloat(newNumPalettes) || 0

    if (qtPalete > 0 && numPalettes > 0) {
      const calculatedQuantidade = (qtPalete * numPalettes).toString()
      setFormData((prev) => ({
        ...prev,
        num_palettes: newNumPalettes,
        quantidade: calculatedQuantidade,
        quantidade_disponivel:
          prev.quantidade_disponivel || calculatedQuantidade,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        num_palettes: newNumPalettes,
      }))
    }
  }

  const getStockStatusColor = (
    stockAtual: number,
    stockCritico: number | null = 0,
    stockMinimo: number | null = 10,
  ) => {
    const stock = stockAtual ?? 0
    const critico = stockCritico ?? 0
    const minimo = stockMinimo ?? 10

    if (stock <= critico) return 'text-red-600'
    if (stock <= minimo) return 'text-orange-500'
    return 'text-green-600'
  }

  const getStockStatusText = (
    stockAtual: number,
    stockCritico: number | null = 0,
    stockMinimo: number | null = 10,
  ) => {
    const stock = stockAtual ?? 0
    const critico = stockCritico ?? 0
    const minimo = stockMinimo ?? 10

    if (stock <= critico) return 'CRÍTICO'
    if (stock <= minimo) return 'BAIXO'
    return 'OK'
  }

  const getStockStatusDotColor = (
    stockAtual: number,
    stockCritico: number | null = 0,
    stockMinimo: number | null = 10,
  ) => {
    const stock = stockAtual ?? 0
    const critico = stockCritico ?? 0
    const minimo = stockMinimo ?? 10

    if (stock <= critico) return 'bg-red-500'
    if (stock <= minimo) return 'bg-[var(--blue-light)]'
    return 'bg-green-500'
  }

  const refreshCurrentStocks = () => {
    fetchCurrentStocks()
  }

  const updateMaterialThresholds = async (
    materialId: string,
    stockMinimo: number | null,
    stockCritico: number | null,
  ) => {
    try {
      const updateData: any = {}
      if (stockMinimo !== null) updateData.stock_minimo = stockMinimo
      if (stockCritico !== null) updateData.stock_critico = stockCritico

      if (Object.keys(updateData).length > 0) {
        await supabase.from('materiais').update(updateData).eq('id', materialId)

        // Refresh data
        await Promise.all([fetchMaterials(), fetchCurrentStocks()])
      }
    } catch (error) {
      console.error('Error updating material thresholds:', error)
    }
  }

  // Update handleSaveStockCorrect to use the map
  const handleSaveStockCorrect = async (materialId: string) => {
    const value = stockCorrectValueMap[materialId]
    const newValue = value && value.trim() !== '' ? parseFloat(value) : null
    if (value && value.trim() !== '' && isNaN(newValue as number)) {
      alert('Valor inválido')
      return
    }
    try {
      await supabase
        .from('materiais')
        .update({
          stock_correct: newValue,
          stock_correct_updated_at: new Date().toISOString(),
        })
        .eq('id', materialId)
      setStockCorrectValueMap((prev) => ({
        ...prev,
        [materialId]: value ?? '',
      }))
      fetchCurrentStocks()
    } catch (error) {
      alert('Erro ao guardar correção manual')
    }
  }

  // Add handlers to save stock_minimo and stock_critico
  const handleSaveStockMinimo = async (materialId: string) => {
    const value = stockMinimoValueMap[materialId]
    const newValue = value && value.trim() !== '' ? parseFloat(value) : null
    if (value && value.trim() !== '' && isNaN(newValue as number)) {
      alert('Valor inválido')
      return
    }
    try {
      await supabase
        .from('materiais')
        .update({ stock_minimo: newValue })
        .eq('id', materialId)
      setStockMinimoValueMap((prev) => ({ ...prev, [materialId]: value ?? '' }))
      fetchCurrentStocks()
    } catch (error) {
      alert('Erro ao guardar stock mínimo')
    }
  }

  const handleSaveStockCritico = async (materialId: string) => {
    const value = stockCriticoValueMap[materialId]
    const newValue = value && value.trim() !== '' ? parseFloat(value) : null
    if (value && value.trim() !== '' && isNaN(newValue as number)) {
      alert('Valor inválido')
      return
    }
    try {
      await supabase
        .from('materiais')
        .update({ stock_critico: newValue })
        .eq('id', materialId)
      setStockCriticoValueMap((prev) => ({
        ...prev,
        [materialId]: value ?? '',
      }))
      fetchCurrentStocks()
    } catch (error) {
      alert('Erro ao guardar stock crítico')
    }
  }

  const handleApplyCorrection = async (materialId: string) => {
    const correctionValue = stockCorrectValueMap[materialId] || '0'
    const correction = parseFloat(correctionValue)

    if (isNaN(correction) || correction === 0) {
      alert('Nenhuma correção para aplicar')
      return
    }

    if (
      !confirm(
        `Aplicar correção de ${correction} e reset? Esta ação criará um ajuste de stock.`,
      )
    ) {
      return
    }

    try {
      // Create a stock adjustment entry
      const { error: stockError } = await supabase.from('stocks').insert({
        material_id: materialId,
        quantidade: correction,
        quantidade_disponivel: correction > 0 ? correction : 0, // Only positive amounts are available
        data: new Date().toISOString().split('T')[0],
        notas: `AJUSTE MANUAL - Correção aplicada em ${new Date().toLocaleDateString('pt-PT')}`,
        fornecedor_id: null,
        preco_unitario: 0,
        valor_total: 0,
      })

      if (stockError) {
        console.error('Error creating stock adjustment:', stockError)
        alert('Erro ao criar ajuste de stock')
        return
      }

      // Reset stock_correct to 0
      const { error: resetError } = await supabase
        .from('materiais')
        .update({
          stock_correct: 0,
          stock_correct_updated_at: new Date().toISOString(),
        })
        .eq('id', materialId)

      if (resetError) {
        console.error('Error resetting stock_correct:', resetError)
        alert('Erro ao reset stock_correct')
        return
      }

      // Update local state
      setStockCorrectValueMap((prev) => ({ ...prev, [materialId]: '0' }))

      // Refresh data
      await Promise.all([fetchStocks(), fetchCurrentStocks()])

      alert('Correção aplicada com sucesso!')
    } catch (error) {
      console.error('Error applying correction:', error)
      alert('Erro inesperado ao aplicar correção')
    }
  }

  // Export entries to Excel
  const exportEntriesToExcel = () => {
    try {
      // Prepare data for export
      const exportData = sortedStocks.map((stock) => ({
        Data: stock.data
          ? new Date(stock.data).toLocaleDateString('pt-PT')
          : '',
        Referência: stock.materiais?.referencia || '',
        Material: formatMaterialName(stock.materiais),
        Fornecedor: stock.fornecedores?.nome_forn || '',
        Quantidade: stock.quantidade || 0,
        VL_m2: (stock as any).vl_m2 || '',
        'Preço Unitário': stock.preco_unitario || 0,
        'Valor Total': stock.valor_total || 0,
        'Nº Palete': stock.n_palet || '',
        'Nº Guia Fornecedor': stock.no_guia_forn || '',
        Notas: stock.notas || '',
        'Criado em': stock.created_at
          ? new Date(stock.created_at).toLocaleDateString('pt-PT')
          : '',
      }))

      // Create CSV content
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(';'),
        ...exportData.map((row) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row]
              // Wrap in quotes if contains comma, semicolon, or newline
              const stringValue = String(value)
              return stringValue.includes(';') ||
                stringValue.includes(',') ||
                stringValue.includes('\n')
                ? `"${stringValue.replace(/"/g, '""')}"`
                : stringValue
            })
            .join(';'),
        ),
      ].join('\n')

      // Create and download file
      const blob = new Blob(['\ufeff' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)

      // Generate filename with current date
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      link.setAttribute('download', `entradas_stock_${dateStr}.csv`)

      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      alert(`Exportadas ${exportData.length} entradas de stock para Excel`)
    } catch (error) {
      console.error('Error exporting entries:', error)
      alert('Erro ao exportar entradas de stock')
    }
  }

  // Export current stocks to Excel
  const exportCurrentStocksToExcel = () => {
    try {
      // Prepare data for export
      const exportData = sortedCurrentStocks.map((stock) => ({
        Referência: getReferenciaByMaterialId(stock.id),
        Material: formatCurrentStockMaterialName(stock),
        'Total Recebido': Math.round(stock.total_recebido),
        'Total Consumido': Math.round(stock.total_consumido),
        'Stock Atual': Math.round(stock.stock_atual),
        'Stock Mínimo': stock.stock_minimo ?? '',
        'Stock Crítico': stock.stock_critico ?? '',
        'Correção Manual': stock.stock_correct ?? '',
        'Stock Final':
          stock.stock_correct !== null && stock.stock_correct !== undefined
            ? stock.stock_correct
            : stock.stock_atual,
        Status: getStockStatusText(
          stock.stock_correct !== null && stock.stock_correct !== undefined
            ? stock.stock_correct
            : stock.stock_atual,
          stock.stock_critico,
          stock.stock_minimo,
        ),
        'Última Correção': stock.stock_correct_updated_at
          ? new Date(stock.stock_correct_updated_at).toLocaleDateString('pt-PT')
          : '',
      }))

      // Create CSV content
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(';'),
        ...exportData.map((row) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row]
              // Wrap in quotes if contains comma, semicolon, or newline
              const stringValue = String(value)
              return stringValue.includes(';') ||
                stringValue.includes(',') ||
                stringValue.includes('\n')
                ? `"${stringValue.replace(/"/g, '""')}"`
                : stringValue
            })
            .join(';'),
        ),
      ].join('\n')

      // Create and download file
      const blob = new Blob(['\ufeff' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)

      // Generate filename with current date
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      link.setAttribute('download', `stock_atual_${dateStr}.csv`)

      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      alert(
        `Exportados ${exportData.length} materiais de stock atual para Excel`,
      )
    } catch (error) {
      console.error('Error exporting current stocks:', error)
      alert('Erro ao exportar stock atual')
    }
  }

  // Export palettes to Excel
  const exportPaletesToExcel = () => {
    try {
      // Prepare data for export
      const exportData = sortedPaletes.map((palete) => ({
        'Nº Palete': palete.no_palete || '',
        Fornecedor: palete.fornecedores?.nome_forn || '',
        'Nº Guia': palete.no_guia_forn || '',
        'Ref. Cartão': palete.ref_cartao || '',
        'Qt. Palete': palete.qt_palete || 0,
        Data: palete.data
          ? new Date(palete.data).toLocaleDateString('pt-PT')
          : '',
        Autor: palete.profiles
          ? `${palete.profiles.first_name} ${palete.profiles.last_name}`
          : '',
        'Criado em': palete.created_at
          ? new Date(palete.created_at).toLocaleDateString('pt-PT')
          : '',
      }))

      // Create CSV content
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(';'),
        ...exportData.map((row) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row]
              // Wrap in quotes if contains comma, semicolon, or newline
              const stringValue = String(value)
              return stringValue.includes(';') ||
                stringValue.includes(',') ||
                stringValue.includes('\n')
                ? `"${stringValue.replace(/"/g, '""')}"`
                : stringValue
            })
            .join(';'),
        ),
      ].join('\n')

      // Create and download file
      const blob = new Blob(['\ufeff' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)

      // Generate filename with current date
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      link.setAttribute('download', `paletes_${dateStr}.csv`)

      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      alert(`Exportadas ${exportData.length} paletes para Excel`)
    } catch (error) {
      console.error('Error exporting palettes:', error)
      alert('Erro ao exportar paletes')
    }
  }

  // Helper functions for paletes management
  const getReferenciaOptions = () => {
    // Filter materials by material = 'Cartão' (case insensitive)
    const cartaoMaterials = materials.filter(
      (material) =>
        material.material && material.material.toLowerCase() === 'cartão',
    )

    const uniqueReferences = Array.from(
      new Set(
        cartaoMaterials.map((material) => material.referencia).filter(Boolean),
      ),
    ) as string[]
    return uniqueReferences.map((ref) => ({ value: ref, label: ref }))
  }

  // Check if palette number is duplicate
  const isPaleteNumberDuplicate = (
    paleteNumber: string,
    excludeId?: string,
  ) => {
    if (!paleteNumber.trim()) return false
    return paletes.some(
      (p) =>
        (!excludeId || p.id !== excludeId) &&
        p.no_palete.toLowerCase() === paleteNumber.toLowerCase(),
    )
  }

  const getProfileOptions = () => {
    return profiles.map((profile) => ({
      value: profile.id,
      label: `${profile.first_name} ${profile.last_name}`,
    }))
  }

  const getNextPaleteNumber = () => {
    if (paletes.length === 0) return 'P1'

    const numbers = paletes
      .map((p) => p.no_palete)
      .filter((num) => num.startsWith('P'))
      .map((num) => parseInt(num.substring(1)))
      .filter((num) => !isNaN(num))

    if (numbers.length === 0) return 'P1'

    const maxNumber = Math.max(...numbers)
    return `P${maxNumber + 1}`
  }

  const handleSaveNewPalete = async () => {
    if (!newPaleteData.fornecedor_id || !newPaleteData.author_id) {
      alert('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    // Validate palette number uniqueness
    const paleteNumber = newPaleteData.no_palete || getNextPaleteNumber()
    const isDuplicate = paletes.some(
      (p) => p.no_palete.toLowerCase() === paleteNumber.toLowerCase(),
    )
    if (isDuplicate) {
      alert(
        `Número de palete "${paleteNumber}" já existe. Por favor, escolha outro número.`,
      )
      return
    }

    // Validate quantity
    if (newPaleteData.qt_palete && parseInt(newPaleteData.qt_palete) <= 0) {
      alert('Quantidade da palete deve ser maior que zero.')
      return
    }

    setSubmittingPalete(true)
    try {
      const paleteData = {
        no_palete: newPaleteData.no_palete || getNextPaleteNumber(),
        fornecedor_id: newPaleteData.fornecedor_id,
        no_guia_forn: newPaleteData.no_guia_forn || null,
        ref_cartao: newPaleteData.ref_cartao || null,
        qt_palete: newPaleteData.qt_palete
          ? parseInt(newPaleteData.qt_palete)
          : null,
        data: newPaleteData.data,
        author_id: newPaleteData.author_id,
      }

      const { data, error } = await supabase.from('paletes').insert(paleteData)
        .select(`
          *,
          fornecedores(id, nome_forn),
          profiles(id, first_name, last_name)
        `)

      if (error) {
        console.error('Error creating palete:', error)
        alert(`Erro ao criar palete: ${error.message}`)
        return
      }

      if (data && data[0]) {
        setPaletes((prev) => [data[0], ...prev])
        handleCancelNewPalete()
      }
    } catch (error) {
      console.error('Error saving palete:', error)
      alert(`Erro inesperado: ${error}`)
    } finally {
      setSubmittingPalete(false)
    }
  }

  const handleCancelNewPalete = () => {
    setShowNewPaleteRow(false)
    setNewPaleteData({
      no_palete: '',
      fornecedor_id: '',
      no_guia_forn: '',
      ref_cartao: '',
      qt_palete: '',
      data: new Date().toISOString().split('T')[0],
      author_id: '',
    })
  }

  const handleEditPalete = (palete: PaleteWithRelations) => {
    setEditingPaleteId(palete.id)
    setEditingPaleteData({
      [palete.id]: {
        no_palete: palete.no_palete,
        fornecedor_id: palete.fornecedor_id || '',
        no_guia_forn: palete.no_guia_forn || '',
        ref_cartao: palete.ref_cartao || '',
        qt_palete: palete.qt_palete?.toString() || '',
        data: palete.data,
        author_id: palete.author_id || '',
      },
    })
  }

  const handleSaveEditPalete = async (paleteId: string) => {
    const editData = editingPaleteData[paleteId]
    if (!editData) return

    // Validate palette number uniqueness (excluding current palette)
    const paleteNumber = editData.no_palete
    const isDuplicate = paletes.some(
      (p) =>
        p.id !== paleteId &&
        p.no_palete.toLowerCase() === paleteNumber.toLowerCase(),
    )
    if (isDuplicate) {
      alert(
        `Número de palete "${paleteNumber}" já existe. Por favor, escolha outro número.`,
      )
      return
    }

    // Validate required fields
    if (!editData.fornecedor_id || !editData.author_id) {
      alert('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    // Validate quantity
    if (editData.qt_palete && parseInt(editData.qt_palete) <= 0) {
      alert('Quantidade da palete deve ser maior que zero.')
      return
    }

    setSubmittingPalete(true)
    try {
      const updateData = {
        no_palete: editData.no_palete,
        fornecedor_id: editData.fornecedor_id || null,
        no_guia_forn: editData.no_guia_forn || null,
        ref_cartao: editData.ref_cartao || null,
        qt_palete: editData.qt_palete ? parseInt(editData.qt_palete) : null,
        data: editData.data,
        author_id: editData.author_id || null,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('paletes')
        .update(updateData)
        .eq('id', paleteId).select(`
          *,
          fornecedores(id, nome_forn),
          profiles(id, first_name, last_name)
        `)

      if (error) {
        console.error('Error updating palete:', error)
        alert(`Erro ao atualizar palete: ${error.message}`)
        return
      }

      if (data && data[0]) {
        setPaletes((prev) => prev.map((p) => (p.id === paleteId ? data[0] : p)))
        handleCancelEditPalete()
      }
    } catch (error) {
      console.error('Error updating palete:', error)
      alert(`Erro inesperado: ${error}`)
    } finally {
      setSubmittingPalete(false)
    }
  }

  const handleCancelEditPalete = () => {
    setEditingPaleteId(null)
    setEditingPaleteData({})
  }

  const handleDeletePalete = async (paleteId: string) => {
    if (!confirm('Tem a certeza que quer eliminar esta palete?')) return

    try {
      const { error } = await supabase
        .from('paletes')
        .delete()
        .eq('id', paleteId)

      if (!error) {
        setPaletes((prev) => prev.filter((p) => p.id !== paleteId))
      } else {
        alert(`Erro ao eliminar palete: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting palete:', error)
      alert(`Erro inesperado: ${error}`)
    }
  }

  return (
    <PermissionGuard>
      <div className="w-full space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Gestão de Stocks</h1>
        </div>

        {/* Universal filter bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeTab === 'palettes' ? (
              <Combobox
                value={paletesFilter}
                onChange={setPaletesFilter}
                options={Array.from(
                  new Set(paletes.map((p) => p.no_palete).filter(Boolean)),
                ).map((palete) => ({
                  value: palete,
                  label: palete.toUpperCase(),
                }))}
                placeholder="FILTRAR PALETES..."
                searchPlaceholder="Pesquisar paletes..."
                emptyMessage="Nenhuma palete encontrada."
                className="h-10 w-[200px]"
                maxWidth="200px"
              />
            ) : (
              <Input
                placeholder="FILTRAR POR MATERIAL..."
                value={
                  activeTab === 'entries' ? materialFilter : currentStockFilter
                }
                onChange={(e) => {
                  if (activeTab === 'entries') {
                    setMaterialFilter(e.target.value)
                  } else {
                    setCurrentStockFilter(e.target.value)
                  }
                }}
                className="h-10 w-[200px] rounded-none"
              />
            )}
            <Input
              placeholder="FILTRAR POR REFERÊNCIA..."
              value={
                activeTab === 'entries'
                  ? referenciaFilter
                  : activeTab === 'current'
                    ? currentStockReferenciaFilter
                    : paletesReferenciaFilter
              }
              onChange={(e) => {
                if (activeTab === 'entries') {
                  setReferenciaFilter(e.target.value)
                } else if (activeTab === 'current') {
                  setCurrentStockReferenciaFilter(e.target.value)
                } else {
                  setPaletesReferenciaFilter(e.target.value)
                }
              }}
              className="h-10 w-[150px] rounded-none"
            />

            {/* Enhanced filters for palettes tab */}
            {activeTab === 'palettes' && (
              <>
                <Input
                  type="date"
                  placeholder="DATA INÍCIO"
                  value={paletesDateFrom}
                  onChange={(e) => setPaletesDateFrom(e.target.value)}
                  className="h-10 w-[130px] rounded-none"
                />
                <Input
                  type="date"
                  placeholder="DATA FIM"
                  value={paletesDateTo}
                  onChange={(e) => setPaletesDateTo(e.target.value)}
                  className="h-10 w-[130px] rounded-none"
                />
                <Select
                  value={paletesFornecedorFilter}
                  onValueChange={setPaletesFornecedorFilter}
                >
                  <SelectTrigger className="h-10 w-[160px] rounded-none">
                    <UppercaseSelectValue placeholder="FORNECEDORES" />
                  </SelectTrigger>
                  <SelectContent>
                    <UppercaseSelectItem value="__all__">
                      FORNECEDORES
                    </UppercaseSelectItem>
                    {fornecedores.map((fornecedor) => (
                      <UppercaseSelectItem
                        key={fornecedor.id}
                        value={fornecedor.nome_forn}
                      >
                        {fornecedor.nome_forn.toUpperCase()}
                      </UppercaseSelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={paletesAuthorFilter}
                  onValueChange={setPaletesAuthorFilter}
                >
                  <SelectTrigger className="h-10 w-[140px] rounded-none">
                    <UppercaseSelectValue placeholder="AUTORES" />
                  </SelectTrigger>
                  <SelectContent>
                    <UppercaseSelectItem value="__all__">
                      AUTORES
                    </UppercaseSelectItem>
                    {profiles.map((profile) => (
                      <UppercaseSelectItem
                        key={profile.id}
                        value={`${profile.first_name} ${profile.last_name}`}
                      >
                        {`${profile.first_name} ${profile.last_name}`.toUpperCase()}
                      </UppercaseSelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                    onClick={() => {
                      if (activeTab === 'entries') {
                        setMaterialFilter('')
                        setReferenciaFilter('')
                      } else if (activeTab === 'current') {
                        setCurrentStockFilter('')
                        setCurrentStockReferenciaFilter('')
                      } else {
                        setPaletesFilter('')
                        setPaletesReferenciaFilter('')
                        setPaletesDateFrom('')
                        setPaletesDateTo('')
                        setPaletesFornecedorFilter('__all__')
                        setPaletesAuthorFilter('__all__')
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Limpar filtros</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                    onClick={
                      activeTab === 'entries'
                        ? fetchStocks
                        : activeTab === 'current'
                          ? refreshCurrentStocks
                          : refreshPaletes
                    }
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {activeTab === 'entries' && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                        onClick={exportEntriesToExcel}
                        disabled={sortedStocks.length === 0}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Exportar para Excel</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                        onClick={openNewForm}
                        data-trigger="new-stock"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Nova Entrada</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
            {activeTab === 'current' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                      onClick={exportCurrentStocksToExcel}
                      disabled={sortedCurrentStocks.length === 0}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar para Excel</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {activeTab === 'palettes' && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                        onClick={exportPaletesToExcel}
                        disabled={sortedPaletes.length === 0}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Exportar para Excel</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                        onClick={() => {
                          setShowNewPaleteRow(true)
                          setNewPaleteData({
                            no_palete: '',
                            fornecedor_id: '',
                            no_guia_forn: '',
                            ref_cartao: '',
                            qt_palete: '',
                            data: new Date().toISOString().split('T')[0],
                            author_id: '',
                          })
                        }}
                        disabled={showNewPaleteRow || editingPaleteId !== null}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Nova Palete</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="entries">Entradas de Stock</TabsTrigger>
            <TabsTrigger value="current">Stock Atual</TabsTrigger>
            <TabsTrigger value="palettes">Gestão de Palettes</TabsTrigger>
            <TabsTrigger value="analytics">Análise & Gráficos</TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="space-y-4">
            {/* stocks table */}
            <div className="bg-background border-border w-full rounded-none border-2">
              <div className="w-full rounded-none">
                <Table className="w-full rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortEntries('data')}
                      >
                        Data
                        {sortColumnEntries === 'data' &&
                          (sortDirectionEntries === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortEntries('referencia')}
                      >
                        Referência
                        {sortColumnEntries === 'referencia' &&
                          (sortDirectionEntries === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortEntries('material')}
                      >
                        Material
                        {sortColumnEntries === 'material' &&
                          (sortDirectionEntries === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[150px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortEntries('fornecedor')}
                      >
                        Fornecedor
                        {sortColumnEntries === 'fornecedor' &&
                          (sortDirectionEntries === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortEntries('quantidade')}
                      >
                        Quantidade
                        {sortColumnEntries === 'quantidade' &&
                          (sortDirectionEntries === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[100px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortEntries('vl_m2')}
                      >
                        VL_m2
                        {sortColumnEntries === 'vl_m2' &&
                          (sortDirectionEntries === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortEntries('preco_unitario')}
                      >
                        Preço/Unidade
                        {sortColumnEntries === 'preco_unitario' &&
                          (sortDirectionEntries === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortEntries('valor_total')}
                      >
                        Valor Total
                        {sortColumnEntries === 'valor_total' &&
                          (sortDirectionEntries === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[100px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortEntries('n_palet')}
                      >
                        Palete
                        {sortColumnEntries === 'n_palet' &&
                          (sortDirectionEntries === 'asc' ? (
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
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="h-40 text-center uppercase"
                        >
                          <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : sortedStocks.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="text-center text-gray-500 uppercase"
                        >
                          Nenhuma entrada de stock encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedStocks.map((stock) => (
                        <TableRow
                          key={stock.id}
                          className="hover:bg-[var(--main)]"
                        >
                          <TableCell className="uppercase">
                            {new Date(stock.data).toLocaleDateString('pt-PT')}
                          </TableCell>
                          <TableCell className="uppercase">
                            {stock.materiais?.referencia || '-'}
                          </TableCell>
                          <TableCell className="font-medium uppercase">
                            {formatMaterialName(stock.materiais)}
                          </TableCell>
                          <TableCell className="uppercase">
                            {stock.fornecedores?.nome_forn || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {stock.quantidade}
                          </TableCell>
                          <TableCell className="text-right">
                            {(stock as any).vl_m2 || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPrice(stock.preco_unitario)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPrice(stock.valor_total)}
                          </TableCell>
                          <TableCell className="text-right">
                            {stock.n_palet || '-'}
                          </TableCell>
                          <TableCell className="flex justify-center gap-2">
                            <Button
                              variant="default"
                              size="icon"
                              className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              onClick={() => handleEdit(stock)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              onClick={() => handleDelete(stock.id)}
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

          <TabsContent value="current" className="space-y-4">
            {/* current stocks table */}
            <div className="bg-background border-border w-full rounded-none border-2">
              <div className="w-full rounded-none">
                <Table className="w-full rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortCurrent('referencia')}
                      >
                        Referência
                        {sortColumnCurrent === 'referencia' &&
                          (sortDirectionCurrent === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortCurrent('material')}
                      >
                        Material
                        {sortColumnCurrent === 'material' &&
                          (sortDirectionCurrent === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[150px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortCurrent('total_consumido')}
                      >
                        Total Consumido
                        {sortColumnCurrent === 'total_consumido' &&
                          (sortDirectionCurrent === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortCurrent('stock_minimo')}
                      >
                        Mín (Amarelo)
                        {sortColumnCurrent === 'stock_minimo' &&
                          (sortDirectionCurrent === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortCurrent('stock_critico')}
                      >
                        Crítico (Vermelho)
                        {sortColumnCurrent === 'stock_critico' &&
                          (sortDirectionCurrent === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortCurrent('stock_correct')}
                      >
                        CORREÇÃO MENSAL
                        {sortColumnCurrent === 'stock_correct' &&
                          (sortDirectionCurrent === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortCurrent('stock_atual')}
                      >
                        STOCK FINAL
                        {sortColumnCurrent === 'stock_atual' &&
                          (sortDirectionCurrent === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[60px] border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentStocksLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-40 text-center uppercase"
                        >
                          <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : sortedCurrentStocks.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-gray-500 uppercase"
                        >
                          Nenhum material encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedCurrentStocks.map((stock) => (
                        <TableRow
                          key={stock.id}
                          className="hover:bg-[var(--main)]"
                        >
                          <TableCell className="uppercase">
                            {getReferenciaByMaterialId(stock.id)}
                          </TableCell>
                          <TableCell className="font-medium uppercase">
                            {formatCurrentStockMaterialName(stock)}
                          </TableCell>
                          <TableCell className="text-right">
                            {Math.round(stock.total_consumido)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              value={
                                stockMinimoValueMap[stock.id] ??
                                (stock.stock_minimo !== null &&
                                stock.stock_minimo !== undefined
                                  ? stock.stock_minimo.toString()
                                  : '')
                              }
                              onChange={(e) => {
                                const val = e.target.value
                                if (/^\d*(\.|,)?\d*$/.test(val) || val === '') {
                                  setStockMinimoValueMap((prev) => ({
                                    ...prev,
                                    [stock.id]: val.replace(',', '.'),
                                  }))
                                }
                              }}
                              onBlur={() => handleSaveStockMinimo(stock.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')
                                  handleSaveStockMinimo(stock.id)
                              }}
                              className="h-10 w-full rounded-none border-0 text-right text-sm outline-0 focus:border-0 focus:ring-0"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              value={
                                stockCriticoValueMap[stock.id] ??
                                (stock.stock_critico !== null &&
                                stock.stock_critico !== undefined
                                  ? stock.stock_critico.toString()
                                  : '')
                              }
                              onChange={(e) => {
                                const val = e.target.value
                                if (/^\d*(\.|,)?\d*$/.test(val) || val === '') {
                                  setStockCriticoValueMap((prev) => ({
                                    ...prev,
                                    [stock.id]: val.replace(',', '.'),
                                  }))
                                }
                              }}
                              onBlur={() => handleSaveStockCritico(stock.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')
                                  handleSaveStockCritico(stock.id)
                              }}
                              className="h-10 w-full rounded-none border-0 text-right text-sm outline-0 focus:border-0 focus:ring-0"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1">
                              <Input
                                value={
                                  stockCorrectValueMap[stock.id] ??
                                  (stock.stock_correct !== null &&
                                  stock.stock_correct !== undefined
                                    ? stock.stock_correct.toString()
                                    : '')
                                }
                                onChange={(e) => {
                                  const val = e.target.value
                                  // Allow negative numbers, decimals, and empty values
                                  if (
                                    /^-?\d*(\.|,)?\d*$/.test(val) ||
                                    val === '' ||
                                    val === '-'
                                  ) {
                                    setStockCorrectValueMap((prev) => ({
                                      ...prev,
                                      [stock.id]: val.replace(',', '.'),
                                    }))
                                  }
                                }}
                                onBlur={() => handleSaveStockCorrect(stock.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter')
                                    handleSaveStockCorrect(stock.id)
                                }}
                                placeholder="Correção..."
                                className="h-10 w-full rounded-none border-0 text-right text-sm outline-0 focus:border-0 focus:ring-0"
                              />
                              {stock.stock_correct !== null &&
                                stock.stock_correct !== 0 && (
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() =>
                                      handleApplyCorrection(stock.id)
                                    }
                                    className="h-10 w-10"
                                    title="Aplicar correção e reset"
                                  >
                                    ✓
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const final =
                                stock.stock_correct !== null &&
                                stock.stock_correct !== undefined
                                  ? stock.stock_correct
                                  : stock.stock_atual
                              return (
                                <span
                                  className={`font-semibold ${getStockStatusColor(final, stock.stock_critico, stock.stock_minimo)}`}
                                >
                                  {final.toFixed(2)}
                                </span>
                              )
                            })()}
                          </TableCell>
                          <TableCell className="text-center">
                            {(() => {
                              const final =
                                stock.stock_correct !== null &&
                                stock.stock_correct !== undefined
                                  ? stock.stock_correct
                                  : stock.stock_atual
                              return (
                                <div
                                  className={`mx-auto h-3 w-3 rounded-full ${getStockStatusDotColor(final, stock.stock_critico, stock.stock_minimo)}`}
                                />
                              )
                            })()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="palettes" className="space-y-4">
            {/* Palettes table */}
            <div className="bg-background border-border w-full rounded-none border-2">
              <div className="w-full rounded-none">
                <Table className="w-full rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[100px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortPaletes('no_palete')}
                      >
                        Nº Palete
                        {sortColumnPaletes === 'no_palete' &&
                          (sortDirectionPaletes === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[150px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortPaletes('fornecedor')}
                      >
                        Fornecedor
                        {sortColumnPaletes === 'fornecedor' &&
                          (sortDirectionPaletes === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortPaletes('no_guia_forn')}
                      >
                        Nº Guia
                        {sortColumnPaletes === 'no_guia_forn' &&
                          (sortDirectionPaletes === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortPaletes('ref_cartao')}
                      >
                        Ref. Cartão
                        {sortColumnPaletes === 'ref_cartao' &&
                          (sortDirectionPaletes === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[100px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortPaletes('qt_palete')}
                      >
                        Qt. Palete
                        {sortColumnPaletes === 'qt_palete' &&
                          (sortDirectionPaletes === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortPaletes('data')}
                      >
                        Data
                        {sortColumnPaletes === 'data' &&
                          (sortDirectionPaletes === 'asc' ? (
                            <ArrowUp className="ml-1 inline h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 inline h-3 w-3" />
                          ))}
                      </TableHead>
                      <TableHead
                        className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleSortPaletes('author')}
                      >
                        Autor
                        {sortColumnPaletes === 'author' &&
                          (sortDirectionPaletes === 'asc' ? (
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
                    {/* New Palete Row */}
                    {showNewPaleteRow && (
                      <TableRow className="bg-blue-50 dark:bg-blue-950">
                        <TableCell>
                          <Input
                            value={newPaleteData.no_palete}
                            onChange={(e) =>
                              setNewPaleteData((prev) => ({
                                ...prev,
                                no_palete: e.target.value.toUpperCase(),
                              }))
                            }
                            className={`h-10 rounded-none border-0 font-mono outline-0 focus:border-0 focus:ring-0 ${
                              isPaleteNumberDuplicate(newPaleteData.no_palete)
                                ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                                : ''
                            }`}
                            placeholder={getNextPaleteNumber()}
                          />
                          {isPaleteNumberDuplicate(newPaleteData.no_palete) && (
                            <div className="mt-1 text-xs text-red-600">
                              Número já existe
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Combobox
                            value={newPaleteData.fornecedor_id}
                            onChange={(value) =>
                              setNewPaleteData((prev) => ({
                                ...prev,
                                fornecedor_id: value,
                              }))
                            }
                            options={fornecedores.map((f) => ({
                              value: f.id,
                              label: f.nome_forn.toUpperCase(),
                            }))}
                            placeholder="SELECIONE FORNECEDOR"
                            searchPlaceholder="Pesquisar..."
                            emptyMessage="Nenhum fornecedor encontrado."
                            className="w-full"
                            maxWidth="100%"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={newPaleteData.no_guia_forn}
                            onChange={(e) =>
                              setNewPaleteData((prev) => ({
                                ...prev,
                                no_guia_forn: e.target.value.toUpperCase(),
                              }))
                            }
                            className="h-10 rounded-none border-0 outline-0 focus:border-0 focus:ring-0"
                            placeholder="NÚM. GUIA"
                          />
                        </TableCell>
                        <TableCell>
                          <Combobox
                            value={newPaleteData.ref_cartao}
                            onChange={(value) => {
                              setNewPaleteData((prev) => ({
                                ...prev,
                                ref_cartao: value,
                              }))
                              // Auto-fill qt_palete based on selected Cartão material
                              const selectedMaterial = materials.find(
                                (m) =>
                                  m.referencia === value &&
                                  m.material &&
                                  m.material.toLowerCase() === 'cartão',
                              )

                              if (selectedMaterial?.qt_palete) {
                                setNewPaleteData((prev) => ({
                                  ...prev,
                                  qt_palete:
                                    selectedMaterial.qt_palete!.toString(),
                                }))
                              }
                            }}
                            options={getReferenciaOptions().map((opt) => ({
                              ...opt,
                              label: opt.label.toUpperCase(),
                            }))}
                            placeholder="SELECIONE REF."
                            searchPlaceholder="Pesquisar..."
                            emptyMessage="Nenhuma referência encontrada."
                            className="w-full"
                            maxWidth="100%"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={newPaleteData.qt_palete}
                            onChange={(e) =>
                              setNewPaleteData((prev) => ({
                                ...prev,
                                qt_palete: e.target.value,
                              }))
                            }
                            className="h-10 rounded-none border-0 text-right outline-0 focus:border-0 focus:ring-0"
                            placeholder="QT."
                          />
                        </TableCell>
                        <TableCell>
                          <DatePicker
                            selected={
                              newPaleteData.data
                                ? new Date(newPaleteData.data)
                                : undefined
                            }
                            onSelect={(date) =>
                              setNewPaleteData((prev) => ({
                                ...prev,
                                data: date
                                  ? date.toISOString().split('T')[0]
                                  : '',
                              }))
                            }
                            buttonClassName="w-full h-10 border-0 outline-0 focus:ring-0 focus:border-0 rounded-none"
                          />
                        </TableCell>
                        <TableCell>
                          <Combobox
                            value={newPaleteData.author_id}
                            onChange={(value) =>
                              setNewPaleteData((prev) => ({
                                ...prev,
                                author_id: value,
                              }))
                            }
                            options={getProfileOptions()}
                            placeholder="SELECIONE AUTOR"
                            searchPlaceholder="Pesquisar..."
                            emptyMessage="Nenhum perfil encontrado."
                            className="w-full"
                            maxWidth="100%"
                          />
                        </TableCell>
                        <TableCell className="flex justify-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                  onClick={handleSaveNewPalete}
                                  disabled={
                                    !newPaleteData.fornecedor_id ||
                                    !newPaleteData.author_id ||
                                    submittingPalete
                                  }
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
                                  className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                  onClick={handleCancelNewPalete}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancelar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    )}

                    {paletesLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-40 text-center uppercase"
                        >
                          <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : sortedPaletes.length === 0 && !showNewPaleteRow ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-gray-500 uppercase"
                        >
                          Nenhuma palete encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedPaletes.map((palete) => (
                        <TableRow
                          key={palete.id}
                          className="hover:bg-[var(--main)]"
                        >
                          <TableCell className="font-mono uppercase">
                            {editingPaleteId === palete.id ? (
                              <div>
                                <Input
                                  value={
                                    editingPaleteData[palete.id]?.no_palete ||
                                    ''
                                  }
                                  onChange={(e) =>
                                    setEditingPaleteData((prev) => ({
                                      ...prev,
                                      [palete.id]: {
                                        ...prev[palete.id],
                                        no_palete: e.target.value.toUpperCase(),
                                      },
                                    }))
                                  }
                                  className={`h-10 rounded-none border-0 font-mono outline-0 focus:border-0 focus:ring-0 ${
                                    isPaleteNumberDuplicate(
                                      editingPaleteData[palete.id]?.no_palete ||
                                        '',
                                      palete.id,
                                    )
                                      ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                                      : ''
                                  }`}
                                />
                                {isPaleteNumberDuplicate(
                                  editingPaleteData[palete.id]?.no_palete || '',
                                  palete.id,
                                ) && (
                                  <div className="mt-1 text-xs text-red-600">
                                    Número já existe
                                  </div>
                                )}
                              </div>
                            ) : (
                              palete.no_palete
                            )}
                          </TableCell>
                          <TableCell className="uppercase">
                            {editingPaleteId === palete.id ? (
                              <Combobox
                                value={
                                  editingPaleteData[palete.id]?.fornecedor_id ||
                                  ''
                                }
                                onChange={(value) =>
                                  setEditingPaleteData((prev) => ({
                                    ...prev,
                                    [palete.id]: {
                                      ...prev[palete.id],
                                      fornecedor_id: value,
                                    },
                                  }))
                                }
                                options={fornecedores.map((f) => ({
                                  value: f.id,
                                  label: f.nome_forn.toUpperCase(),
                                }))}
                                placeholder="SELECIONE FORNECEDOR"
                                searchPlaceholder="Pesquisar..."
                                emptyMessage="Nenhum fornecedor encontrado."
                                className="w-full"
                                maxWidth="100%"
                              />
                            ) : (
                              palete.fornecedores?.nome_forn || '-'
                            )}
                          </TableCell>
                          <TableCell className="uppercase">
                            {editingPaleteId === palete.id ? (
                              <Input
                                value={
                                  editingPaleteData[palete.id]?.no_guia_forn ||
                                  ''
                                }
                                onChange={(e) =>
                                  setEditingPaleteData((prev) => ({
                                    ...prev,
                                    [palete.id]: {
                                      ...prev[palete.id],
                                      no_guia_forn:
                                        e.target.value.toUpperCase(),
                                    },
                                  }))
                                }
                                className="h-10 rounded-none border-0 outline-0 focus:border-0 focus:ring-0"
                              />
                            ) : (
                              palete.no_guia_forn || '-'
                            )}
                          </TableCell>
                          <TableCell className="uppercase">
                            {editingPaleteId === palete.id ? (
                              <Combobox
                                value={
                                  editingPaleteData[palete.id]?.ref_cartao || ''
                                }
                                onChange={(value) => {
                                  setEditingPaleteData((prev) => ({
                                    ...prev,
                                    [palete.id]: {
                                      ...prev[palete.id],
                                      ref_cartao: value,
                                    },
                                  }))
                                  // Auto-fill qt_palete based on selected Cartão material
                                  const selectedMaterial = materials.find(
                                    (m) =>
                                      m.referencia === value &&
                                      m.material &&
                                      m.material.toLowerCase() === 'cartão',
                                  )

                                  if (selectedMaterial?.qt_palete) {
                                    setEditingPaleteData((prev) => ({
                                      ...prev,
                                      [palete.id]: {
                                        ...prev[palete.id],
                                        qt_palete:
                                          selectedMaterial.qt_palete!.toString(),
                                      },
                                    }))
                                  }
                                }}
                                options={getReferenciaOptions().map((opt) => ({
                                  ...opt,
                                  label: opt.label.toUpperCase(),
                                }))}
                                placeholder="SELECIONE REF."
                                searchPlaceholder="Pesquisar..."
                                emptyMessage="Nenhuma referência encontrada."
                                className="w-full"
                                maxWidth="100%"
                              />
                            ) : (
                              palete.ref_cartao || '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingPaleteId === palete.id ? (
                              <Input
                                type="number"
                                value={
                                  editingPaleteData[palete.id]?.qt_palete || ''
                                }
                                onChange={(e) =>
                                  setEditingPaleteData((prev) => ({
                                    ...prev,
                                    [palete.id]: {
                                      ...prev[palete.id],
                                      qt_palete: e.target.value,
                                    },
                                  }))
                                }
                                className="h-10 rounded-none border-0 text-right outline-0 focus:border-0 focus:ring-0"
                              />
                            ) : (
                              palete.qt_palete || '-'
                            )}
                          </TableCell>
                          <TableCell className="uppercase">
                            {editingPaleteId === palete.id ? (
                              <DatePicker
                                selected={
                                  editingPaleteData[palete.id]?.data
                                    ? new Date(
                                        editingPaleteData[palete.id].data,
                                      )
                                    : undefined
                                }
                                onSelect={(date) =>
                                  setEditingPaleteData((prev) => ({
                                    ...prev,
                                    [palete.id]: {
                                      ...prev[palete.id],
                                      data: date
                                        ? date.toISOString().split('T')[0]
                                        : '',
                                    },
                                  }))
                                }
                                buttonClassName="w-full h-10 border-0 outline-0 focus:ring-0 focus:border-0 rounded-none"
                              />
                            ) : palete.data ? (
                              new Date(palete.data).toLocaleDateString('pt-PT')
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="uppercase">
                            {editingPaleteId === palete.id ? (
                              <Combobox
                                value={
                                  editingPaleteData[palete.id]?.author_id || ''
                                }
                                onChange={(value) =>
                                  setEditingPaleteData((prev) => ({
                                    ...prev,
                                    [palete.id]: {
                                      ...prev[palete.id],
                                      author_id: value,
                                    },
                                  }))
                                }
                                options={getProfileOptions()}
                                placeholder="SELECIONE AUTOR"
                                searchPlaceholder="Pesquisar..."
                                emptyMessage="Nenhum perfil encontrado."
                                className="w-full"
                                maxWidth="100%"
                              />
                            ) : (
                              palete.profiles?.first_name || '-'
                            )}
                          </TableCell>
                          <TableCell className="flex justify-center gap-2">
                            {editingPaleteId === palete.id ? (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="default"
                                        size="icon"
                                        className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                        onClick={() =>
                                          handleSaveEditPalete(palete.id)
                                        }
                                        disabled={submittingPalete}
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
                                        className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                        onClick={handleCancelEditPalete}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Cancelar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            ) : (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="default"
                                        size="icon"
                                        className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                        onClick={() => handleEditPalete(palete)}
                                        disabled={
                                          editingPaleteId !== null ||
                                          showNewPaleteRow
                                        }
                                      >
                                        <Edit className="h-4 w-4" />
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
                                        className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                                        onClick={() =>
                                          handleDeletePalete(palete.id)
                                        }
                                        disabled={
                                          editingPaleteId !== null ||
                                          showNewPaleteRow
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Eliminar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mb-8 space-y-4">
            <StockAnalyticsCharts
              currentStocks={currentStocks}
              onRefresh={() => {
                fetchCurrentStocks()
                fetchStocks()
              }}
            />
          </TabsContent>
        </Tabs>

        <Drawer
          open={openDrawer}
          onOpenChange={(open) => {
            setOpenDrawer(open)
            if (!open) {
              // When drawer closes, ensure focus returns to trigger button
              setTimeout(() => {
                const triggerButton = document.querySelector(
                  '[data-trigger="new-stock"]',
                ) as HTMLElement
                if (triggerButton) {
                  triggerButton.focus()
                }
              }, 100)
            }
          }}
          shouldScaleBackground={false}
        >
          <DrawerContent className="!top-0 h-[98vh] max-h-[98vh] min-h-[98vh] !transform-none overflow-y-auto !filter-none !backdrop-filter-none will-change-auto">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2 uppercase">
                <Package className="h-5 w-5" />
                {editingStock ? 'Editar Stock' : 'Nova Entrada de Stock'}
              </DrawerTitle>
              <DrawerDescription>
                {editingStock
                  ? 'Edite os dados do stock.'
                  : 'Adicione uma nova entrada de stock.'}
              </DrawerDescription>
            </DrawerHeader>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <Label className="text-sm font-semibold uppercase">
                    Material
                  </Label>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="material_referencia"
                        className="text-muted-foreground text-xs uppercase"
                      >
                        Referência
                      </Label>
                      <div className="mt-1">
                        <Combobox
                          key={materials.length}
                          value={formData.material_referencia}
                          onChange={handleReferenciaChange}
                          options={referenciaOptions.map((opt) => ({
                            ...opt,
                            label: opt.label.toUpperCase(),
                          }))}
                          placeholder="SELECIONE UMA REFERÊNCIA"
                          searchPlaceholder="Pesquisar referência..."
                          emptyMessage="Nenhuma referência encontrada."
                          className="w-full"
                          maxWidth="100%"
                        />
                      </div>
                    </div>
                    <div>
                      <Label
                        htmlFor="material_id"
                        className="text-muted-foreground text-xs uppercase"
                      >
                        Material
                      </Label>
                      <div className="mt-1">
                        <Combobox
                          key={materials.length}
                          value={formData.material_id}
                          onChange={handleMaterialChange}
                          options={materialOptions.map((opt) => ({
                            ...opt,
                            label: opt.label.toUpperCase(),
                          }))}
                          placeholder="SELECIONE UM MATERIAL"
                          searchPlaceholder="Pesquisar material..."
                          emptyMessage="Nenhum material encontrado."
                          className="w-full"
                          maxWidth="100%"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="fornecedor_id"
                    className="text-sm font-semibold uppercase"
                  >
                    Fornecedor
                  </Label>
                  <Select
                    value={formData.fornecedor_id}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, fornecedor_id: value }))
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <UppercaseSelectValue placeholder="SELECIONE UM FORNECEDOR" />
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedores.map((fornecedor) => (
                        <UppercaseSelectItem
                          key={fornecedor.id}
                          value={fornecedor.id}
                        >
                          {fornecedor.nome_forn.toUpperCase()}
                        </UppercaseSelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label
                      htmlFor="num_palettes"
                      className="text-sm font-semibold uppercase"
                    >
                      Nº Palettes
                    </Label>
                    <Input
                      id="num_palettes"
                      type="number"
                      step="1"
                      value={formData.num_palettes}
                      onChange={(e) => handleNumPalettesChange(e.target.value)}
                      placeholder="0"
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Calcula quantidade automaticamente e é guardado como nº
                      palete
                    </p>
                  </div>
                  <div>
                    <Label
                      htmlFor="quantidade"
                      className="text-sm font-semibold uppercase"
                    >
                      Quantidade Recebida (obrigatório)
                    </Label>
                    <Input
                      id="quantidade"
                      type="number"
                      step="0.01"
                      value={formData.quantidade}
                      onChange={(e) => handleQuantidadeChange(e.target.value)}
                      placeholder="0.00"
                      className="mt-2"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Ou preencher Nº Palettes
                    </p>
                  </div>
                  <div>
                    <Label
                      htmlFor="quantidade_disponivel"
                      className="text-sm font-semibold uppercase"
                    >
                      Quantidade Disponível
                    </Label>
                    <Input
                      id="quantidade_disponivel"
                      type="number"
                      step="0.01"
                      value={formData.quantidade_disponivel}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantidade_disponivel: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="bg-background mt-2"
                      readOnly
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Quantidade ainda em stock
                    </p>
                  </div>
                </div>

                {/* Row for VL_m2, Quantidade por palete, Preço unitário, Valor total */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label
                      htmlFor="vl_m2"
                      className="text-sm font-semibold uppercase"
                    >
                      VL_m2
                    </Label>
                    <Input
                      id="vl_m2"
                      type="number"
                      step="0.01"
                      value={formData.vl_m2}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          vl_m2: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Preenchido automaticamente do material (valor_m2_custo)
                    </p>
                  </div>
                  <div>
                    <Label
                      htmlFor="quantidade_palete"
                      className="text-sm font-semibold uppercase"
                    >
                      QUANT. PALETE
                    </Label>
                    <Input
                      id="quantidade_palete"
                      type="number"
                      step="1"
                      value={formData.quantidade_palete}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantidade_palete: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Preenchido automaticamente do material
                    </p>
                  </div>
                  <div>
                    <Label
                      htmlFor="preco_unitario"
                      className="text-sm font-semibold uppercase"
                    >
                      PREÇO UNIT. €
                    </Label>
                    <Input
                      id="preco_unitario"
                      type="number"
                      step="0.01"
                      value={formData.preco_unitario}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          preco_unitario: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Preço por unidade de medida
                    </p>
                  </div>
                  <div>
                    <Label
                      htmlFor="valor_total"
                      className="text-sm font-semibold uppercase"
                    >
                      VL TOTAL €
                    </Label>
                    <Input
                      id="valor_total"
                      type="number"
                      step="0.01"
                      value={calculateTotalValue()}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          valor_total: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="bg-background mt-2"
                      readOnly
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Calculado automaticamente (Quantidade × Preço)
                    </p>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="notas"
                    className="text-sm font-semibold uppercase"
                  >
                    Notas
                  </Label>
                  <Textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) => {
                      const upperValue = e.target.value.toUpperCase()
                      setFormData((prev) => ({ ...prev, notas: upperValue }))
                    }}
                    placeholder="NOTAS ADICIONAIS..."
                    className="mt-2 resize-none uppercase"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-[300px_120px] gap-4">
                  <div className="w-[300px] min-w-[300px]">
                    <Label
                      htmlFor="no_guia_forn"
                      className="text-sm font-semibold uppercase"
                    >
                      Nº Guia do Fornecedor
                    </Label>
                    <Input
                      id="no_guia_forn"
                      value={formData.no_guia_forn}
                      onChange={(e) => {
                        const upperValue = e.target.value.toUpperCase()
                        setFormData((prev) => ({
                          ...prev,
                          no_guia_forn: upperValue,
                        }))
                      }}
                      placeholder="NÚMERO DA GUIA DO FORNECEDOR"
                      className="mt-2 uppercase"
                    />
                  </div>
                  <div className="w-[120px] min-w-[120px]">
                    <Label
                      htmlFor="n_palet"
                      className="text-sm font-semibold uppercase"
                    >
                      Nº Palete
                    </Label>
                    <Input
                      id="n_palet"
                      value={formData.n_palet}
                      onChange={(e) => {
                        const upperValue = e.target.value.toUpperCase()
                        setFormData((prev) => ({
                          ...prev,
                          n_palet: upperValue,
                        }))
                      }}
                      placeholder="NÚMERO DA PALETE"
                      className="mt-2 uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
                      guardar...
                    </>
                  ) : editingStock ? (
                    'Atualizar'
                  ) : (
                    'Criar'
                  )}
                </Button>
                <DrawerClose asChild>
                  <Button type="button" variant="outline">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </form>
          </DrawerContent>
        </Drawer>
      </div>
    </PermissionGuard>
  )
}

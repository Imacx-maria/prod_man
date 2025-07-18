'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Trash2,
  X,
  Loader2,
  Pencil,
  Check,
  RotateCw,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import PermissionGuard from '@/components/PermissionGuard'
import { useDebounce } from '@/hooks/useDebounce'
import Combobox from '@/components/ui/Combobox'
import CreatableCombobox from '@/components/ui/CreatableCombobox'

interface Material {
  id: string
  tipo: string | null
  referencia: string | null
  ref_fornecedor: string | null
  material: string | null
  carateristica: string | null
  cor: string | null
  tipo_canal: string | null
  dimensoes: string | null
  valor_m2_custo: number | null
  valor_placa: number | null
  valor_m2: number | null
  qt_palete: number | null
  fornecedor_id: string | null
  ORC: boolean | null
  created_at: string
  updated_at: string
}

interface FornecedorOption {
  value: string
  label: string
}

export default function MateriaisPage() {
  const [materiais, setMateriais] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<{
    tipo?: string | null
    referencia?: string | null
    ref_fornecedor?: string | null
    material?: string | null
    carateristica?: string | null
    cor?: string | null
    tipo_canal?: string | null
    dimensoes?: string | null
    valor_m2_custo?: number | null
    valor_placa?: number | null
    valor_m2?: number | null | string
    qt_palete?: number | null
    fornecedor_id?: string | null
    ORC?: boolean | null
  }>({})
  const [materialFilter, setMaterialFilter] = useState('')
  const [caracteristicaFilter, setCaracteristicaFilter] = useState('')
  const [corFilter, setCorFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [creatingNew, setCreatingNew] = useState(false)
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([])
  const [fornecedoresLoading, setFornecedoresLoading] = useState(false)
  const [orcLoading, setOrcLoading] = useState<{ [id: string]: boolean }>({})
  const [openDrawer, setOpenDrawer] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [availableMaterials, setAvailableMaterials] = useState<string[]>([])
  const [availableCaracteristicas, setAvailableCaracteristicas] = useState<
    string[]
  >([])
  const [availableCores, setAvailableCores] = useState<string[]>([])
  const [availableTipos, setAvailableTipos] = useState<string[]>([])

  // Debounced filter values for performance
  const debouncedMaterialFilter = useDebounce(materialFilter, 300)
  const debouncedCaracteristicaFilter = useDebounce(caracteristicaFilter, 300)
  const debouncedCorFilter = useDebounce(corFilter, 300)

  const supabase = createBrowserClient()

  // Convert to database-level filtering
  const fetchMateriais = useCallback(
    async (
      filters: {
        materialFilter?: string
        caracteristicaFilter?: string
        corFilter?: string
      } = {},
    ) => {
      setLoading(true)
      try {
        let query = supabase.from('materiais').select('*')

        // Apply filters at database level
        if (filters.materialFilter?.trim()) {
          query = query.ilike('material', `%${filters.materialFilter.trim()}%`)
        }

        if (filters.caracteristicaFilter?.trim()) {
          query = query.ilike(
            'carateristica',
            `%${filters.caracteristicaFilter.trim()}%`,
          )
        }

        if (filters.corFilter?.trim()) {
          query = query.ilike('cor', `%${filters.corFilter.trim()}%`)
        }

        // Apply sorting at database level
        if (sortColumn) {
          const ascending = sortDirection === 'asc'
          if (
            sortColumn === 'valor_m2' ||
            sortColumn === 'valor_m2_custo' ||
            sortColumn === 'valor_placa' ||
            sortColumn === 'qt_palete'
          ) {
            query = query.order(sortColumn, { ascending, nullsFirst: false })
          } else if (sortColumn === 'ORC') {
            query = query.order(sortColumn, { ascending, nullsFirst: false })
          } else {
            query = query.order(sortColumn, { ascending, nullsFirst: false })
          }
        } else {
          query = query.order('material', { ascending: true })
        }

        const { data, error } = await query
        console.log('Materiais fetch result:', { data, error })

        if (error) {
          console.error('Supabase error fetching materiais:', error)
          alert(`Error fetching materiais: ${error.message}`)
        } else if (data) {
          console.log('Successfully fetched materiais:', data)
          setMateriais(data)
        }
      } catch (error) {
        console.error('JavaScript error fetching materiais:', error)
        alert(`JavaScript error: ${error}`)
      } finally {
        setLoading(false)
      }
    },
    [sortColumn, sortDirection, supabase],
  )

  // Initial load
  useEffect(() => {
    fetchMateriais()
  }, [fetchMateriais])

  // Trigger search when filters change (debounced)
  useEffect(() => {
    fetchMateriais({
      materialFilter: debouncedMaterialFilter,
      caracteristicaFilter: debouncedCaracteristicaFilter,
      corFilter: debouncedCorFilter,
    })
  }, [
    debouncedMaterialFilter,
    debouncedCaracteristicaFilter,
    debouncedCorFilter,
    fetchMateriais,
  ])

  // Trigger search when sorting changes
  useEffect(() => {
    if (sortColumn) {
      fetchMateriais({
        materialFilter: debouncedMaterialFilter,
        caracteristicaFilter: debouncedCaracteristicaFilter,
        corFilter: debouncedCorFilter,
      })
    }
  }, [
    sortColumn,
    sortDirection,
    debouncedMaterialFilter,
    debouncedCaracteristicaFilter,
    debouncedCorFilter,
    fetchMateriais,
  ])

  useEffect(() => {
    const fetchFornecedores = async () => {
      setFornecedoresLoading(true)
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome_forn')
        .order('nome_forn', { ascending: true })
      if (!error && data) {
        const mappedFornecedores = data.map((f: any) => ({
          value: String(f.id),
          label: f.nome_forn,
        }))
        setFornecedores(mappedFornecedores)
      }
      setFornecedoresLoading(false)
    }
    fetchFornecedores()
  }, [])

  useEffect(() => {
    const fetchCascadingData = async () => {
      // Fetch distinct materials
      const { data: materialData } = await supabase
        .from('materiais')
        .select('material')
        .not('material', 'is', null)

      if (materialData) {
        const materialSet = new Set(
          materialData
            .map((item) => item.material?.toUpperCase())
            .filter(Boolean),
        )
        setAvailableMaterials(Array.from(materialSet))
      }

      // Fetch all characteristics and colors for initial load
      const { data: caracteristicaData } = await supabase
        .from('materiais')
        .select('carateristica')
        .not('carateristica', 'is', null)

      if (caracteristicaData) {
        const caracteristicaSet = new Set(
          caracteristicaData
            .map((item) => item.carateristica?.toUpperCase())
            .filter(Boolean),
        )
        setAvailableCaracteristicas(Array.from(caracteristicaSet))
      }

      const { data: corData } = await supabase
        .from('materiais')
        .select('cor')
        .not('cor', 'is', null)

      if (corData) {
        const corSet = new Set(
          corData.map((item) => item.cor?.toUpperCase()).filter(Boolean),
        )
        setAvailableCores(Array.from(corSet))
      }
    }

    fetchCascadingData()
  }, [])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    )
  }

  const handleEdit = (material: Material) => {
    setEditingMaterial(material)
    setOpenDrawer(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return

    try {
      const { error } = await supabase.from('materiais').delete().eq('id', id)

      if (!error) {
        setMateriais((prev) => prev.filter((m) => m.id !== id))
      }
    } catch (error) {
      console.error('Error deleting material:', error)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditRow({})
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-'
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    if (
      e.target instanceof window.HTMLInputElement &&
      e.target.type === 'checkbox'
    ) {
      setEditRow((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }))
    } else {
      setEditRow((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleDrawerClose = () => {
    setOpenDrawer(false)
    setEditingId(null)
    setEditingMaterial(null)
    setEditRow({})
  }

  const handleSaveDrawer = async () => {
    if (!editingMaterial) return

    try {
      const { error } = await supabase
        .from('materiais')
        .update({
          tipo: editingMaterial.tipo,
          material: editingMaterial.material,
          carateristica: editingMaterial.carateristica,
          cor: editingMaterial.cor,
          valor_m2: editingMaterial.valor_m2,
          referencia: editingMaterial.referencia,
          ref_cliente: editingMaterial.ref_cliente,
          ref_fornecedor: editingMaterial.ref_fornecedor,
          fornecedor: editingMaterial.fornecedor,
          fornecedor_id: editingMaterial.fornecedor_id,
          tipo_canal: editingMaterial.tipo_canal,
          dimensoes: editingMaterial.dimensoes,
          valor_m2_custo: editingMaterial.valor_m2_custo,
          valor_placa: editingMaterial.valor_placa,
          qt_palete: editingMaterial.qt_palete,
          ORC: editingMaterial.ORC,
          stock_minimo: editingMaterial.stock_minimo,
          stock_critico: editingMaterial.stock_critico,
        })
        .eq('id', editingMaterial.id)

      if (!error) {
        // Update local state
        setMateriais((prev) =>
          prev.map((m) => (m.id === editingMaterial.id ? editingMaterial : m)),
        )
        setOpenDrawer(false)
        setEditingMaterial(null)
      }
    } catch (error) {
      console.error('Error updating material:', error)
    }
  }

  const handleDrawerInputChange = (
    field: keyof Material,
    value: string | number | boolean | null,
  ) => {
    if (!editingMaterial) return
    setEditingMaterial((prev) => (prev ? { ...prev, [field]: value } : null))
  }

  const handleFornecedorChange = async (
    materialId: string,
    fornecedorId: string,
  ) => {
    // Update in DB
    await supabase
      .from('materiais')
      .update({ fornecedor_id: fornecedorId })
      .eq('id', materialId)
    // Update in local state
    setMateriais((prev) =>
      prev.map((m) =>
        m.id === materialId ? { ...m, fornecedor_id: fornecedorId } : m,
      ),
    )
  }

  // Add a handler to update fornecedores when new ones are created
  const handleFornecedoresUpdate = (newFornecedores: FornecedorOption[]) => {
    setFornecedores(newFornecedores)
  }

  // Handler to toggle ORC value
  const handleOrcToggle = async (
    id: string,
    currentValue: boolean | null | undefined,
  ) => {
    setOrcLoading((prev) => ({ ...prev, [id]: true }))
    try {
      const { error } = await supabase
        .from('materiais')
        .update({ ORC: !currentValue })
        .eq('id', id)
      if (!error) {
        setMateriais((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ORC: !currentValue } : m)),
        )
      }
    } finally {
      setOrcLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleMaterialChange = async (selectedMaterial: string) => {
    handleDrawerInputChange('material', selectedMaterial.toUpperCase())

    // Reset dependent fields
    handleDrawerInputChange('carateristica', '')
    handleDrawerInputChange('cor', '')

    // Fetch characteristics for selected material
    const { data } = await supabase
      .from('materiais')
      .select('carateristica')
      .eq('material', selectedMaterial)
      .not('carateristica', 'is', null)

    if (data) {
      const caracteristicaSet = new Set(
        data.map((item) => item.carateristica?.toUpperCase()).filter(Boolean),
      )
      setAvailableCaracteristicas(Array.from(caracteristicaSet))
    }
  }

  const handleCaracteristicaChange = async (selectedCaracteristica: string) => {
    handleDrawerInputChange(
      'carateristica',
      selectedCaracteristica.toUpperCase(),
    )

    // Reset dependent field
    handleDrawerInputChange('cor', '')

    // Fetch colors for selected material + characteristic
    const { data } = await supabase
      .from('materiais')
      .select('cor')
      .eq('material', editingMaterial?.material)
      .eq('carateristica', selectedCaracteristica)
      .not('cor', 'is', null)

    if (data) {
      const corSet = new Set(
        data.map((item) => item.cor?.toUpperCase()).filter(Boolean),
      )
      setAvailableCores(Array.from(corSet))
    }
  }

  const handleCorChange = (selectedCor: string) => {
    handleDrawerInputChange('cor', selectedCor.toUpperCase())
  }

  // --- Cascading Combo Fetchers ---
  const fetchTipos = async () => {
    const { data } = await supabase
      .from('materiais')
      .select('tipo')
      .not('tipo', 'is', null)
    // Ensure unique, trimmed, uppercased values only
    const tipos = Array.from(
      new Set(
        data
          ?.map((item) => item.tipo && item.tipo.trim().toUpperCase())
          .filter(Boolean),
      ),
    )
    console.log('Fetched tipos from materiais:', tipos)
    setAvailableTipos(tipos)
  }

  const fetchMaterials = async (tipo: string) => {
    const { data } = await supabase
      .from('materiais')
      .select('material, tipo')
      .not('material', 'is', null)
      .not('tipo', 'is', null)
    // Only include materials with matching normalized tipo
    const filtered = data?.filter(
      (item) => item.tipo && item.tipo.trim().toUpperCase() === tipo,
    )
    setAvailableMaterials(
      Array.from(
        new Set(
          filtered
            ?.map((item) => item.material && item.material.trim().toUpperCase())
            .filter(Boolean),
        ),
      ),
    )
  }

  const fetchCaracteristicas = async (tipo: string, material: string) => {
    console.log(
      'Fetching características for tipo:',
      tipo,
      'material:',
      material,
    )
    const { data } = await supabase
      .from('materiais')
      .select('carateristica, tipo, material')
      .not('carateristica', 'is', null)
      .not('tipo', 'is', null)
      .not('material', 'is', null)
    console.log('Raw características data:', data)
    // Only include carateristicas with matching normalized tipo and material
    const filtered = data?.filter((item) => {
      const itemTipo = item.tipo && item.tipo.trim().toUpperCase()
      const itemMaterial = item.material && item.material.trim().toUpperCase()
      const match = itemTipo === tipo && itemMaterial === material
      if (!match) {
        console.log(
          'Skipping:',
          item.carateristica,
          'tipo:',
          itemTipo,
          'vs',
          tipo,
          'material:',
          itemMaterial,
          'vs',
          material,
        )
      }
      return match
    })
    console.log('Filtered características:', filtered)
    const caracteristicas = Array.from(
      new Set(
        filtered
          ?.map(
            (item) =>
              item.carateristica && item.carateristica.trim().toUpperCase(),
          )
          .filter(Boolean),
      ),
    )
    console.log('Final características options:', caracteristicas)
    setAvailableCaracteristicas(caracteristicas)
  }

  const fetchCores = async (
    tipo: string,
    material: string,
    carateristica: string,
  ) => {
    const { data } = await supabase
      .from('materiais')
      .select('cor, tipo, material, carateristica')
      .not('cor', 'is', null)
      .not('tipo', 'is', null)
      .not('material', 'is', null)
      .not('carateristica', 'is', null)
    // Only include cores with matching normalized tipo, material, and carateristica
    const filtered = data?.filter(
      (item) =>
        item.tipo &&
        typeof item.tipo === 'string' &&
        item.tipo.trim().toUpperCase() === tipo &&
        item.material &&
        typeof item.material === 'string' &&
        item.material.trim().toUpperCase() === material &&
        item.carateristica &&
        typeof item.carateristica === 'string' &&
        item.carateristica.trim().toUpperCase() === carateristica,
    )
    setAvailableCores(
      Array.from(
        new Set(
          filtered
            ?.map((item) => item.cor && item.cor.trim().toUpperCase())
            .filter(Boolean),
        ),
      ),
    )
  }

  // --- Drawer Combo Handlers ---
  const handleTipoChange = async (selectedTipo: string) => {
    const normalizedTipo = selectedTipo.trim().toUpperCase()
    handleDrawerInputChange('tipo', normalizedTipo)
    handleDrawerInputChange('material', '')
    handleDrawerInputChange('carateristica', '')
    handleDrawerInputChange('cor', '')
    await fetchMaterials(normalizedTipo)
    setAvailableCaracteristicas([])
    setAvailableCores([])
  }

  const handleMaterialComboChange = async (selectedMaterial: string) => {
    const normalizedMaterial = selectedMaterial.trim().toUpperCase()
    handleDrawerInputChange('material', normalizedMaterial)
    handleDrawerInputChange('carateristica', '')
    handleDrawerInputChange('cor', '')
    await fetchCaracteristicas(
      editingMaterial?.tipo?.trim().toUpperCase() ?? '',
      normalizedMaterial,
    )
    setAvailableCores([])
  }

  const handleCaracteristicaComboChange = async (
    selectedCaracteristica: string,
  ) => {
    const normalizedCaracteristica = selectedCaracteristica.trim().toUpperCase()
    handleDrawerInputChange('carateristica', normalizedCaracteristica)
    handleDrawerInputChange('cor', '')
    await fetchCores(
      editingMaterial?.tipo?.trim().toUpperCase() ?? '',
      editingMaterial?.material?.trim().toUpperCase() ?? '',
      normalizedCaracteristica,
    )
  }

  const handleCorComboChange = (selectedCor: string) => {
    const normalizedCor = selectedCor.trim().toUpperCase()
    handleDrawerInputChange('cor', normalizedCor)
  }

  // --- Open Drawer: fetch tipos and reset combos ---
  useEffect(() => {
    if (openDrawer) {
      fetchTipos()
      setAvailableMaterials([])
      setAvailableCaracteristicas([])
      setAvailableCores([])
      // If editing, prefetch next combos
      if (editingMaterial?.tipo) fetchMaterials(editingMaterial.tipo)
      if (editingMaterial?.tipo && editingMaterial?.material)
        fetchCaracteristicas(editingMaterial.tipo, editingMaterial.material)
      if (
        editingMaterial?.tipo &&
        editingMaterial?.material &&
        editingMaterial?.carateristica
      )
        fetchCores(
          editingMaterial.tipo,
          editingMaterial.material,
          editingMaterial.carateristica,
        )
    }
  }, [openDrawer])

  // Convert string arrays to MaterialOption arrays
  const materialOptions: FornecedorOption[] = availableMaterials.map(
    (material) => ({
      value: material,
      label: material,
    }),
  )

  const caracteristicaOptions: FornecedorOption[] =
    availableCaracteristicas.map((caracteristica) => ({
      value: caracteristica,
      label: caracteristica,
    }))

  const corOptions: FornecedorOption[] = availableCores.map((cor) => ({
    value: cor,
    label: cor,
  }))

  return (
    <PermissionGuard>
      <div className="w-full space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gestão de Materiais</h1>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setMaterialFilter('')
                      setCaracteristicaFilter('')
                      setCorFilter('')
                    }}
                    className="h-10 w-10 rounded-none"
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
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      fetchMateriais({
                        materialFilter: debouncedMaterialFilter,
                        caracteristicaFilter: debouncedCaracteristicaFilter,
                        corFilter: debouncedCorFilter,
                      })
                    }
                    className="h-10 w-10 rounded-none"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              onClick={() => {
                setCreatingNew(true)
                setEditingId('new')
                setEditRow({
                  tipo: '',
                  referencia: '',
                  ref_fornecedor: '',
                  material: '',
                  carateristica: '',
                  cor: '',
                  tipo_canal: '',
                  dimensoes: '',
                  valor_m2_custo: null,
                  valor_placa: null,
                  valor_m2: null,
                  qt_palete: null,
                  fornecedor_id: null,
                  ORC: false,
                })
              }}
              className="h-10 rounded-none"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Material
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
          <div className="flex items-center gap-2">
            <Label className="min-w-[80px] text-sm font-medium">
              Material:
            </Label>
            <Input
              placeholder="Filtrar por material..."
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
              className="flex-1 rounded-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="min-w-[100px] text-sm font-medium">
              Características:
            </Label>
            <Input
              placeholder="Filtrar por características..."
              value={caracteristicaFilter}
              onChange={(e) => setCaracteristicaFilter(e.target.value)}
              className="flex-1 rounded-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="min-w-[60px] text-sm font-medium">Cor:</Label>
            <Input
              placeholder="Filtrar por cor..."
              value={corFilter}
              onChange={(e) => setCorFilter(e.target.value)}
              className="flex-1 rounded-none"
            />
          </div>

          {/* Clear all filters button in same row */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setMaterialFilter('')
                setCaracteristicaFilter('')
                setCorFilter('')
              }}
              className="rounded-none text-sm whitespace-nowrap"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-background border-border w-full rounded-none border-2">
          <div className="w-full rounded-none">
            <Table className="w-full rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="border-border sticky top-0 z-10 cursor-pointer rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase"
                    onClick={() => handleSort('referencia')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Referência {getSortIcon('referencia')}
                    </span>
                  </TableHead>
                  <TableHead
                    className="border-border sticky top-0 z-10 w-[250px] min-w-[250px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase"
                    onClick={() => handleSort('material')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Material {getSortIcon('material')}
                    </span>
                  </TableHead>
                  <TableHead
                    className="border-border sticky top-0 z-10 w-[250px] min-w-[250px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase"
                    onClick={() => handleSort('carateristica')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Características {getSortIcon('carateristica')}
                    </span>
                  </TableHead>
                  <TableHead
                    className="border-border sticky top-0 z-10 cursor-pointer rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase"
                    onClick={() => handleSort('cor')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Cor {getSortIcon('cor')}
                    </span>
                  </TableHead>
                  <TableHead
                    className="border-border sticky top-0 z-10 w-[100px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] text-right font-bold uppercase"
                    onClick={() => handleSort('qt_palete')}
                  >
                    <span className="inline-flex items-center gap-1">
                      QT PAL {getSortIcon('qt_palete')}
                    </span>
                  </TableHead>
                  <TableHead
                    className="border-border sticky top-0 z-10 cursor-pointer rounded-none border-b-2 bg-[var(--orange)] text-right font-bold uppercase"
                    onClick={() => handleSort('valor_m2')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Valor/m² {getSortIcon('valor_m2')}
                    </span>
                  </TableHead>
                  <TableHead
                    className="border-border sticky top-0 z-10 w-[80px] cursor-pointer rounded-none border-b-2 bg-[var(--orange)] text-center font-bold uppercase"
                    onClick={() => handleSort('ORC')}
                  >
                    ORC {getSortIcon('ORC')}
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[90px] rounded-none border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creatingNew && editingId === 'new' && (
                  <TableRow key="new-material-row">
                    <TableCell className="uppercase">
                      <Input
                        name="referencia"
                        value={editRow.referencia ?? ''}
                        onChange={handleInputChange}
                        className="h-10 rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                      />
                    </TableCell>
                    <TableCell className="w-[250px] font-medium uppercase">
                      <Input
                        name="material"
                        value={editRow.material ?? ''}
                        onChange={handleInputChange}
                        required
                        className="h-10 w-full rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                      />
                    </TableCell>
                    <TableCell className="w-[250px] uppercase">
                      <Input
                        name="carateristica"
                        value={editRow.carateristica ?? ''}
                        onChange={handleInputChange}
                        className="h-10 rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                      />
                    </TableCell>
                    <TableCell className="uppercase">
                      <Input
                        name="cor"
                        value={editRow.cor ?? ''}
                        onChange={handleInputChange}
                        className="h-10 rounded-none border-0 text-sm outline-0 focus:border-0 focus:ring-0"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        name="qt_palete"
                        type="number"
                        value={editRow.qt_palete ?? ''}
                        onChange={handleInputChange}
                        className="h-10 rounded-none border-0 text-right text-sm outline-0 focus:border-0 focus:ring-0"
                      />
                    </TableCell>
                    <TableCell className="text-right uppercase">
                      <Input
                        name="valor_m2"
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9.,]*"
                        value={
                          typeof editRow.valor_m2 === 'number'
                            ? String(editRow.valor_m2)
                            : (editRow.valor_m2 ?? '')
                        }
                        onChange={handleInputChange}
                        className="h-10 rounded-none border-0 text-right text-sm outline-0 focus:border-0 focus:ring-0"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        name="ORC"
                        checked={!!editRow.ORC}
                        onCheckedChange={(val) =>
                          setEditRow((prev) => ({ ...prev, ORC: !!val }))
                        }
                        className="mx-auto"
                      />
                    </TableCell>
                    <TableCell className="flex justify-center gap-2">
                      <Button
                        onClick={async () => {
                          setSubmitting(true)
                          try {
                            let valorStr = String(editRow.valor_m2 ?? '')
                            valorStr = valorStr.replace(',', '.')
                            const valorM2 = valorStr
                              ? parseFloat(valorStr)
                              : null
                            const { data, error } = await supabase
                              .from('materiais')
                              .insert({
                                tipo: editRow.tipo || null,
                                referencia: editRow.referencia || null,
                                ref_fornecedor: editRow.ref_fornecedor || null,
                                material: editRow.material,
                                carateristica: editRow.carateristica || null,
                                cor: editRow.cor || null,
                                tipo_canal: editRow.tipo_canal || null,
                                dimensoes: editRow.dimensoes || null,
                                valor_m2_custo: editRow.valor_m2_custo || null,
                                valor_placa: editRow.valor_placa || null,
                                valor_m2: valorM2,
                                qt_palete: editRow.qt_palete || null,
                                fornecedor_id: editRow.fornecedor_id || null,
                                ORC: editRow.ORC ?? false,
                              })
                              .select('*')
                            if (!error && data && data[0]) {
                              setMateriais((prev) => [data[0], ...prev])
                              setCreatingNew(false)
                              setEditingId(null)
                              setEditRow({})
                            }
                          } catch (error) {
                            console.error('Error creating material:', error)
                          } finally {
                            setSubmitting(false)
                          }
                        }}
                        disabled={submitting}
                        className="h-10 rounded-none"
                      >
                        Guardar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCreatingNew(false)
                          setEditingId(null)
                          setEditRow({})
                        }}
                        className="h-10 rounded-none"
                      >
                        Cancelar
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-40 text-center uppercase"
                    >
                      <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : materiais.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-gray-500 uppercase"
                    >
                      Nenhum material encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  materiais.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>{material.referencia ?? '-'}</TableCell>
                      <TableCell className="w-[250px]">
                        {material.material
                          ? material.material.length > 25
                            ? material.material.slice(0, 25) + '...'
                            : material.material
                          : '-'}
                      </TableCell>
                      <TableCell className="w-[250px]">
                        {material.carateristica
                          ? material.carateristica.length > 25
                            ? material.carateristica.slice(0, 25) + '...'
                            : material.carateristica
                          : '-'}
                      </TableCell>
                      <TableCell>{material.cor ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        {material.qt_palete ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof material.valor_m2 === 'number'
                          ? formatCurrency(material.valor_m2)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={!!material.ORC}
                          onCheckedChange={() =>
                            handleOrcToggle(material.id, material.ORC)
                          }
                          className="mx-auto"
                          disabled={!!orcLoading[material.id]}
                        />
                      </TableCell>
                      <TableCell className="flex justify-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => handleEdit(material)}
                                className="h-10 w-10 rounded-none"
                              >
                                <Pencil className="h-4 w-4" />
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
                                onClick={() => handleDelete(material.id)}
                                className="h-10 w-10 rounded-none"
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

        <Drawer
          open={openDrawer}
          onOpenChange={setOpenDrawer}
          shouldScaleBackground={false}
        >
          <DrawerContent className="!top-0 h-[98vh] max-h-[98vh] min-h-[98vh] !transform-none overflow-y-auto rounded-none !filter-none !backdrop-filter-none will-change-auto">
            <DrawerHeader className="relative">
              <Button
                size="icon"
                variant="outline"
                onClick={handleDrawerClose}
                className="absolute top-6 right-6 z-10 h-10 w-10 rounded-none"
              >
                <X className="h-4 w-4" />
              </Button>
              <DrawerTitle className="flex items-center gap-2 uppercase">
                <Pencil className="h-5 w-5" />
                Editar Material
              </DrawerTitle>
              <DrawerDescription>
                Edite todos os campos do material.
              </DrawerDescription>
            </DrawerHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveDrawer()
              }}
              className="space-y-6 p-6"
            >
              <div className="grid grid-cols-1 gap-6">
                {/* Fornecedor and Tipo - side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="fornecedor_id"
                      className="text-sm font-semibold uppercase"
                    >
                      Fornecedor
                    </Label>
                    <CreatableCombobox
                      value={
                        editingMaterial?.fornecedor_id
                          ? String(editingMaterial.fornecedor_id).toUpperCase()
                          : ''
                      }
                      onChange={(val) =>
                        handleDrawerInputChange(
                          'fornecedor_id',
                          val ? val.toUpperCase() : '',
                        )
                      }
                      options={fornecedores.map((f) => ({
                        ...f,
                        label: f.label.toUpperCase(),
                      }))}
                      onOptionsUpdate={handleFornecedoresUpdate}
                      loading={fornecedoresLoading}
                      className="mt-2 w-full"
                      placeholder="FORNECEDOR"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="tipo"
                      className="text-sm font-semibold uppercase"
                    >
                      Tipo
                    </Label>
                    <Combobox
                      value={editingMaterial?.tipo?.toUpperCase() ?? ''}
                      onValueChange={handleTipoChange}
                    >
                      <Combobox.Trigger className="mt-2 rounded-none">
                        <Combobox.Value placeholder="SELECIONE O TIPO" />
                      </Combobox.Trigger>
                      <Combobox.Content className="rounded-none">
                        {availableTipos.map((tipo) => (
                          <Combobox.Item key={tipo} value={tipo}>
                            {tipo}
                          </Combobox.Item>
                        ))}
                      </Combobox.Content>
                    </Combobox>
                  </div>
                </div>

                {/* Material Info - Input Fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label
                      htmlFor="material"
                      className="text-sm font-semibold uppercase"
                    >
                      Material
                    </Label>
                    <CreatableCombobox
                      value={editingMaterial?.material?.toUpperCase() ?? ''}
                      onChange={handleMaterialComboChange}
                      options={materialOptions}
                      disabled={!editingMaterial?.tipo}
                      className="mt-2"
                      placeholder="SELECIONE OU CRIE MATERIAL"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="carateristica"
                      className="text-sm font-semibold uppercase"
                    >
                      Características
                    </Label>
                    <CreatableCombobox
                      value={
                        editingMaterial?.carateristica?.toUpperCase() ?? ''
                      }
                      onChange={handleCaracteristicaComboChange}
                      options={caracteristicaOptions}
                      disabled={!editingMaterial?.material}
                      className="mt-2"
                      placeholder="SELECIONE OU CRIE CARACTERÍSTICA"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="cor"
                      className="text-sm font-semibold uppercase"
                    >
                      Cor
                    </Label>
                    <CreatableCombobox
                      value={editingMaterial?.cor?.toUpperCase() ?? ''}
                      onChange={handleCorComboChange}
                      options={corOptions}
                      disabled={!editingMaterial?.carateristica}
                      className="mt-2"
                      placeholder="SELECIONE OU CRIE COR"
                    />
                  </div>
                </div>

                {/* References - 3 columns */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label
                      htmlFor="referencia"
                      className="text-sm font-semibold uppercase"
                    >
                      Referência
                    </Label>
                    <Input
                      id="referencia"
                      value={editingMaterial?.referencia ?? ''}
                      onChange={(e) =>
                        handleDrawerInputChange('referencia', e.target.value)
                      }
                      className="mt-2 h-10 rounded-none"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="ref_cliente"
                      className="text-sm font-semibold uppercase"
                    >
                      Ref. Cliente
                    </Label>
                    <Input
                      id="ref_cliente"
                      value={editingMaterial?.ref_cliente ?? ''}
                      onChange={(e) =>
                        handleDrawerInputChange('ref_cliente', e.target.value)
                      }
                      className="mt-2 h-10 rounded-none"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="ref_fornecedor"
                      className="text-sm font-semibold uppercase"
                    >
                      Ref. Fornecedor
                    </Label>
                    <Input
                      id="ref_fornecedor"
                      value={editingMaterial?.ref_fornecedor ?? ''}
                      onChange={(e) =>
                        handleDrawerInputChange(
                          'ref_fornecedor',
                          e.target.value,
                        )
                      }
                      className="mt-2 h-10 rounded-none"
                    />
                  </div>
                </div>

                {/* Channel and Dimensions - 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="tipo_canal"
                      className="text-sm font-semibold uppercase"
                    >
                      Tipo Canal
                    </Label>
                    <Input
                      id="tipo_canal"
                      value={editingMaterial?.tipo_canal ?? ''}
                      onChange={(e) =>
                        handleDrawerInputChange('tipo_canal', e.target.value)
                      }
                      className="mt-2 h-10 rounded-none"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="dimensoes"
                      className="text-sm font-semibold uppercase"
                    >
                      Dimensões
                    </Label>
                    <Input
                      id="dimensoes"
                      value={editingMaterial?.dimensoes ?? ''}
                      onChange={(e) =>
                        handleDrawerInputChange('dimensoes', e.target.value)
                      }
                      className="mt-2 h-10 rounded-none"
                    />
                  </div>
                </div>

                {/* Pricing - 3 columns */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label
                      htmlFor="valor_m2_custo"
                      className="text-sm font-semibold uppercase"
                    >
                      VL/M² NET
                    </Label>
                    <Input
                      id="valor_m2_custo"
                      type="number"
                      step="0.01"
                      value={editingMaterial?.valor_m2_custo ?? ''}
                      onChange={(e) =>
                        handleDrawerInputChange(
                          'valor_m2_custo',
                          parseFloat(e.target.value) || null,
                        )
                      }
                      className="mt-2 h-10 rounded-none text-right"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="valor_placa"
                      className="text-sm font-semibold uppercase"
                    >
                      VL PLACA
                    </Label>
                    <Input
                      id="valor_placa"
                      type="number"
                      step="0.01"
                      value={editingMaterial?.valor_placa ?? ''}
                      onChange={(e) =>
                        handleDrawerInputChange(
                          'valor_placa',
                          parseFloat(e.target.value) || null,
                        )
                      }
                      className="mt-2 h-10 rounded-none text-right"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="valor_m2"
                      className="text-sm font-semibold uppercase"
                    >
                      Valor/m²
                    </Label>
                    <Input
                      id="valor_m2"
                      type="number"
                      step="0.01"
                      value={editingMaterial?.valor_m2 ?? ''}
                      onChange={(e) =>
                        handleDrawerInputChange(
                          'valor_m2',
                          parseFloat(e.target.value) || null,
                        )
                      }
                      className="mt-2 h-10 rounded-none text-right"
                    />
                  </div>
                </div>

                {/* Quantity, Stock levels and ORC - 4 columns */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label
                      htmlFor="qt_palete"
                      className="text-sm font-semibold uppercase"
                    >
                      QT PAL
                    </Label>
                    <Input
                      id="qt_palete"
                      type="number"
                      value={editingMaterial?.qt_palete ?? ''}
                      onChange={(e) =>
                        handleDrawerInputChange(
                          'qt_palete',
                          parseInt(e.target.value) || null,
                        )
                      }
                      className="mt-2 h-10 rounded-none text-right"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="stock_minimo"
                      className="text-sm font-semibold uppercase"
                    >
                      Stock Mínimo
                    </Label>
                    <Input
                      id="stock_minimo"
                      type="number"
                      step="0.01"
                      value={editingMaterial?.stock_minimo ?? ''}
                      onChange={(e) =>
                        handleDrawerInputChange(
                          'stock_minimo',
                          parseFloat(e.target.value) || null,
                        )
                      }
                      className="mt-2 h-10 rounded-none text-right"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="stock_critico"
                      className="text-sm font-semibold uppercase"
                    >
                      Stock Crítico
                    </Label>
                    <Input
                      id="stock_critico"
                      type="number"
                      step="0.01"
                      value={editingMaterial?.stock_critico ?? ''}
                      onChange={(e) =>
                        handleDrawerInputChange(
                          'stock_critico',
                          parseFloat(e.target.value) || null,
                        )
                      }
                      className="mt-2 h-10 rounded-none text-right"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="ORC"
                      className="text-sm font-semibold uppercase"
                    >
                      ORC
                    </Label>
                    <div className="mt-2 flex items-center">
                      <Checkbox
                        id="ORC"
                        checked={!!editingMaterial?.ORC}
                        onCheckedChange={(val) =>
                          handleDrawerInputChange('ORC', val as boolean)
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">
                        {editingMaterial?.ORC ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <Button type="submit" className="h-10 flex-1 rounded-none">
                  Atualizar
                </Button>
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-none"
                  >
                    Cancelar
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

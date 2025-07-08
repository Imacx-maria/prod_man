'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Trash2, X, Loader2, Edit, RotateCw, ArrowUp, ArrowDown } from 'lucide-react'
import CreatableFornecedorCombobox, { FornecedorOption } from '@/components/CreatableFornecedorCombobox'
import CreatableMaterialCombobox, { MaterialOption } from '@/components/CreatableMaterialCombobox'
import { Checkbox } from '@/components/ui/checkbox'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerDescription } from '@/components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Material {
  id: string
  tipo: string | null
  material: string | null
  carateristica: string | null
  cor: string | null
  valor_m2: number | null
  referencia: string | null
  ref_cliente: string | null
  ref_fornecedor: string | null
  fornecedor: string | null
  fornecedor_id: string | null
  tipo_canal: string | null
  dimensoes: string | null
  valor_m2_custo: number | null
  valor_placa: number | null
  qt_palete: number | null
  ORC: boolean | null
  stock_minimo: number | null
  stock_critico: number | null
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
  const [availableCaracteristicas, setAvailableCaracteristicas] = useState<string[]>([])
  const [availableCores, setAvailableCores] = useState<string[]>([])
  const [availableTipos, setAvailableTipos] = useState<string[]>([])

  const supabase = createBrowserClient()

  const fetchMateriais = async () => {
    setLoading(true)
    try {
      console.log('Fetching materiais...')
      const { data, error } = await supabase
        .from('materiais')
        .select('id, tipo, material, carateristica, cor, valor_m2, referencia, ref_cliente, ref_fornecedor, fornecedor, fornecedor_id, tipo_canal, dimensoes, valor_m2_custo, valor_placa, qt_palete, ORC, stock_minimo, stock_critico')
        .order('material', { ascending: true })

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
  }

  useEffect(() => {
    fetchMateriais()
  }, [])

  useEffect(() => {
    const fetchFornecedores = async () => {
      setFornecedoresLoading(true)
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome_forn')
        .order('nome_forn', { ascending: true })
      if (!error && data) {
        const mappedFornecedores = data.map((f: any) => ({ value: String(f.id), label: f.nome_forn }))
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
        const materialSet = new Set(materialData.map(item => item.material?.toUpperCase()).filter(Boolean))
        setAvailableMaterials(Array.from(materialSet))
      }

      // Fetch all characteristics and colors for initial load
      const { data: caracteristicaData } = await supabase
        .from('materiais')
        .select('carateristica')
        .not('carateristica', 'is', null)
      
      if (caracteristicaData) {
        const caracteristicaSet = new Set(caracteristicaData.map(item => item.carateristica?.toUpperCase()).filter(Boolean))
        setAvailableCaracteristicas(Array.from(caracteristicaSet))
      }

      const { data: corData } = await supabase
        .from('materiais')
        .select('cor')
        .not('cor', 'is', null)
      
      if (corData) {
        const corSet = new Set(corData.map(item => item.cor?.toUpperCase()).filter(Boolean))
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
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1" /> : 
      <ArrowDown className="w-4 h-4 ml-1" />
  }

  const filteredAndSortedMateriais = materiais
    .filter(material => {
      // Specific filters
      const materialMatch = !materialFilter || 
        (material.material && material.material.toLowerCase().includes(materialFilter.toLowerCase()))
      
      const caracteristicaMatch = !caracteristicaFilter || 
        (material.carateristica && material.carateristica.toLowerCase().includes(caracteristicaFilter.toLowerCase()))
      
      const corMatch = !corFilter || 
        (material.cor && material.cor.toLowerCase().includes(corFilter.toLowerCase()))

      return materialMatch && caracteristicaMatch && corMatch
    })
    .sort((a, b) => {
      if (!sortColumn) return 0
      
      const aValue = a[sortColumn as keyof Material] ?? ''
      const bValue = b[sortColumn as keyof Material] ?? ''
      
      // Handle numeric sorting for valor_m2
      if (sortColumn === 'valor_m2') {
        const aNum = Number(aValue) || 0
        const bNum = Number(bValue) || 0
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
      }
      
      // Handle boolean sorting for ORC
      if (sortColumn === 'ORC') {
        return sortDirection === 'asc'
          ? (aValue === bValue ? 0 : aValue ? -1 : 1)
          : (aValue === bValue ? 0 : aValue ? 1 : -1)
      }
      
      // Handle string sorting
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  const handleEdit = (material: Material) => {
    setEditingMaterial(material)
    setOpenDrawer(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return

    try {
      const { error } = await supabase
        .from('materiais')
        .delete()
        .eq('id', id)

      if (!error) {
        setMateriais(prev => prev.filter(m => m.id !== id))
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
      currency: 'EUR'
    }).format(value)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (e.target instanceof window.HTMLInputElement && e.target.type === 'checkbox') {
      setEditRow(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }))
    } else {
      setEditRow(prev => ({
        ...prev,
        [name]: value
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
          stock_critico: editingMaterial.stock_critico
        })
        .eq('id', editingMaterial.id)
      
      if (!error) {
        // Update local state
        setMateriais(prev => prev.map(m => 
          m.id === editingMaterial.id ? editingMaterial : m
        ))
        setOpenDrawer(false)
        setEditingMaterial(null)
      }
    } catch (error) {
      console.error('Error updating material:', error)
    }
  }

  const handleDrawerInputChange = (field: keyof Material, value: string | number | boolean | null) => {
    if (!editingMaterial) return
    setEditingMaterial(prev => prev ? { ...prev, [field]: value } : null)
  }

  const handleFornecedorChange = async (materialId: string, fornecedorId: string) => {
    // Update in DB
    await supabase.from('materiais').update({ fornecedor_id: fornecedorId }).eq('id', materialId)
    // Update in local state
    setMateriais(prev => prev.map(m => m.id === materialId ? { ...m, fornecedor_id: fornecedorId } : m))
  }

  // Add a handler to update fornecedores when new ones are created
  const handleFornecedoresUpdate = (newFornecedores: FornecedorOption[]) => {
    setFornecedores(newFornecedores)
  }

  // Handler to toggle ORC value
  const handleOrcToggle = async (id: string, currentValue: boolean | null | undefined) => {
    setOrcLoading(prev => ({ ...prev, [id]: true }))
    try {
      const { error } = await supabase
        .from('materiais')
        .update({ ORC: !currentValue })
        .eq('id', id)
      if (!error) {
        setMateriais(prev => prev.map(m => m.id === id ? { ...m, ORC: !currentValue } : m))
      }
    } finally {
      setOrcLoading(prev => ({ ...prev, [id]: false }))
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
      const caracteristicaSet = new Set(data.map(item => item.carateristica?.toUpperCase()).filter(Boolean))
      setAvailableCaracteristicas(Array.from(caracteristicaSet))
    }
  }

  const handleCaracteristicaChange = async (selectedCaracteristica: string) => {
    handleDrawerInputChange('carateristica', selectedCaracteristica.toUpperCase())
    
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
      const corSet = new Set(data.map(item => item.cor?.toUpperCase()).filter(Boolean))
      setAvailableCores(Array.from(corSet))
    }
  }

  const handleCorChange = (selectedCor: string) => {
    handleDrawerInputChange('cor', selectedCor.toUpperCase())
  }

  // --- Cascading Combo Fetchers ---
  const fetchTipos = async () => {
    const { data } = await supabase.from('materiais').select('tipo').not('tipo', 'is', null)
    // Ensure unique, trimmed, uppercased values only
    const tipos = Array.from(
      new Set(
        data?.map(item => item.tipo && item.tipo.trim().toUpperCase()).filter(Boolean)
      )
    )
    console.log('Fetched tipos from materiais:', tipos)
    setAvailableTipos(tipos)
  }

  const fetchMaterials = async (tipo: string) => {
    const { data } = await supabase
      .from('materiais')
      .select('material, tipo')
      .not('material', 'is', null)
      .not('tipo', 'is', null);
    // Only include materials with matching normalized tipo
    const filtered = data?.filter(item => item.tipo && item.tipo.trim().toUpperCase() === tipo);
    setAvailableMaterials(Array.from(new Set(filtered?.map(item => item.material && item.material.trim().toUpperCase()).filter(Boolean))));
  }

  const fetchCaracteristicas = async (tipo: string, material: string) => {
    console.log('Fetching características for tipo:', tipo, 'material:', material)
    const { data } = await supabase
      .from('materiais')
      .select('carateristica, tipo, material')
      .not('carateristica', 'is', null)
      .not('tipo', 'is', null)
      .not('material', 'is', null);
    console.log('Raw características data:', data)
    // Only include carateristicas with matching normalized tipo and material
    const filtered = data?.filter(item => {
      const itemTipo = item.tipo && item.tipo.trim().toUpperCase()
      const itemMaterial = item.material && item.material.trim().toUpperCase()
      const match = itemTipo === tipo && itemMaterial === material
      if (!match) {
        console.log('Skipping:', item.carateristica, 'tipo:', itemTipo, 'vs', tipo, 'material:', itemMaterial, 'vs', material)
      }
      return match
    });
    console.log('Filtered características:', filtered)
    const caracteristicas = Array.from(new Set(filtered?.map(item => item.carateristica && item.carateristica.trim().toUpperCase()).filter(Boolean)))
    console.log('Final características options:', caracteristicas)
    setAvailableCaracteristicas(caracteristicas);
  }

  const fetchCores = async (tipo: string, material: string, carateristica: string) => {
    const { data } = await supabase
      .from('materiais')
      .select('cor, tipo, material, carateristica')
      .not('cor', 'is', null)
      .not('tipo', 'is', null)
      .not('material', 'is', null)
      .not('carateristica', 'is', null);
    // Only include cores with matching normalized tipo, material, and carateristica
    const filtered = data?.filter(item =>
      item.tipo && item.tipo.trim().toUpperCase() === tipo &&
      item.material && item.material.trim().toUpperCase() === material &&
      item.carateristica && item.carateristica.trim().toUpperCase() === carateristica
    );
    setAvailableCores(Array.from(new Set(filtered?.map(item => item.cor && item.cor.trim().toUpperCase()).filter(Boolean))));
  }

  // --- Drawer Combo Handlers ---
  const handleTipoChange = async (selectedTipo: string) => {
    const normalizedTipo = selectedTipo.trim().toUpperCase();
    handleDrawerInputChange('tipo', normalizedTipo);
    handleDrawerInputChange('material', '');
    handleDrawerInputChange('carateristica', '');
    handleDrawerInputChange('cor', '');
    await fetchMaterials(normalizedTipo);
    setAvailableCaracteristicas([]);
    setAvailableCores([]);
  }

  const handleMaterialComboChange = async (selectedMaterial: string) => {
    const normalizedMaterial = selectedMaterial.trim().toUpperCase();
    handleDrawerInputChange('material', normalizedMaterial);
    handleDrawerInputChange('carateristica', '');
    handleDrawerInputChange('cor', '');
    await fetchCaracteristicas(editingMaterial?.tipo?.trim().toUpperCase() ?? '', normalizedMaterial);
    setAvailableCores([]);
  }

  const handleCaracteristicaComboChange = async (selectedCaracteristica: string) => {
    const normalizedCaracteristica = selectedCaracteristica.trim().toUpperCase();
    handleDrawerInputChange('carateristica', normalizedCaracteristica);
    handleDrawerInputChange('cor', '');
    await fetchCores(
      editingMaterial?.tipo?.trim().toUpperCase() ?? '',
      editingMaterial?.material?.trim().toUpperCase() ?? '',
      normalizedCaracteristica
    );
  }

  const handleCorComboChange = (selectedCor: string) => {
    const normalizedCor = selectedCor.trim().toUpperCase();
    handleDrawerInputChange('cor', normalizedCor);
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
      if (editingMaterial?.tipo && editingMaterial?.material) fetchCaracteristicas(editingMaterial.tipo, editingMaterial.material)
      if (editingMaterial?.tipo && editingMaterial?.material && editingMaterial?.carateristica) fetchCores(editingMaterial.tipo, editingMaterial.material, editingMaterial.carateristica)
    }
  }, [openDrawer])

  // Convert string arrays to MaterialOption arrays
  const materialOptions: MaterialOption[] = availableMaterials.map(material => ({ 
    value: material, 
    label: material 
  }))

  const caracteristicaOptions: MaterialOption[] = availableCaracteristicas.map(caracteristica => ({ 
    value: caracteristica, 
    label: caracteristica 
  }))

  const corOptions: MaterialOption[] = availableCores.map(cor => ({ 
    value: cor, 
    label: cor 
  }))

  return (
    <div className="w-full space-y-6 p-4 md:p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão de Materiais</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={fetchMateriais}>
                  <RotateCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar lista</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={() => {
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
              ORC: false
            })
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Material
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="flex items-center gap-2">
          <Label className="min-w-[80px] text-sm font-medium">Material:</Label>
          <Input
            placeholder="Filtrar por material..."
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={() => setMaterialFilter('')}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Label className="min-w-[100px] text-sm font-medium">Características:</Label>
          <Input
            placeholder="Filtrar por características..."
            value={caracteristicaFilter}
            onChange={(e) => setCaracteristicaFilter(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={() => setCaracteristicaFilter('')}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Label className="min-w-[60px] text-sm font-medium">Cor:</Label>
          <Input
            placeholder="Filtrar por cor..."
            value={corFilter}
            onChange={(e) => setCorFilter(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={() => setCorFilter('')}>
            <X className="w-4 h-4" />
          </Button>
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
            className="text-sm whitespace-nowrap"
          >
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-none bg-background w-full border-2 border-border">
        <div className="max-h-[70vh] overflow-y-auto w-full rounded-none">
          <Table className="w-full border-0 rounded-none">
            <TableHeader>
              <TableRow>
                <TableHead className="p-1 min-w-[80px] sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border uppercase cursor-pointer rounded-none" onClick={() => handleSort('referencia')}>
                  <span className="inline-flex items-center gap-1">Referência {getSortIcon('referencia')}</span>
                </TableHead>
                <TableHead className="p-1 w-[250px] min-w-[250px] sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border uppercase cursor-pointer rounded-none" onClick={() => handleSort('material')}>
                  <span className="inline-flex items-center gap-1">Material {getSortIcon('material')}</span>
                </TableHead>
                <TableHead className="p-1 w-[250px] min-w-[250px] sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border uppercase cursor-pointer rounded-none" onClick={() => handleSort('carateristica')}>
                  <span className="inline-flex items-center gap-1">Características {getSortIcon('carateristica')}</span>
                </TableHead>
                <TableHead className="p-1 min-w-[80px] sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border uppercase cursor-pointer rounded-none" onClick={() => handleSort('cor')}>
                  <span className="inline-flex items-center gap-1">Cor {getSortIcon('cor')}</span>
                </TableHead>
                <TableHead className="p-1 w-[100px] min-w-[100px] sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border uppercase cursor-pointer rounded-none" onClick={() => handleSort('qt_palete')}>
                  <span className="inline-flex items-center gap-1">QT PAL {getSortIcon('qt_palete')}</span>
                </TableHead>
                <TableHead className="p-1 min-w-[100px] sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border uppercase cursor-pointer rounded-none" onClick={() => handleSort('valor_m2')}>
                  <span className="inline-flex items-center gap-1">Valor/m² {getSortIcon('valor_m2')}</span>
                </TableHead>
                <TableHead className="p-1 w-[80px] sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border uppercase cursor-pointer rounded-none" onClick={() => handleSort('ORC')}>ORC {getSortIcon('ORC')}</TableHead>
                <TableHead className="p-1 w-[80px] sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border uppercase">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creatingNew && editingId === 'new' && (
                <TableRow key="new-material-row">
                  <TableCell className="p-1 px-1 uppercase">
                    <Input name="referencia" value={editRow.referencia ?? ''} onChange={handleInputChange} />
                  </TableCell>
                  <TableCell className="p-1 font-medium px-1 uppercase w-[250px]">
                    <Input name="material" value={editRow.material ?? ''} onChange={handleInputChange} required className="w-full" />
                  </TableCell>
                  <TableCell className="p-1 px-1 uppercase w-[250px]">
                    <Textarea name="carateristica" value={editRow.carateristica ?? ''} onChange={handleInputChange} className="min-h-[40px] h-10 resize-none w-full" />
                  </TableCell>
                  <TableCell className="p-1 px-1 uppercase">
                    <Input name="cor" value={editRow.cor ?? ''} onChange={handleInputChange} />
                  </TableCell>
                  <TableCell className="p-1 w-[100px]">
                    <Input name="qt_palete" type="number" value={editRow.qt_palete ?? ''} onChange={handleInputChange} className="w-[100px]" />
                  </TableCell>
                  <TableCell className="p-1 px-1 uppercase">
                    <Input name="valor_m2" type="text" inputMode="decimal" pattern="[0-9.,]*" value={typeof editRow.valor_m2 === 'number' ? String(editRow.valor_m2) : (editRow.valor_m2 ?? '')} onChange={handleInputChange} />
                  </TableCell>
                  <TableCell className="p-1 text-center">
                    <Checkbox
                      name="ORC"
                      checked={!!editRow.ORC}
                      onCheckedChange={val => setEditRow(prev => ({ ...prev, ORC: !!val }))}
                      className="mx-auto"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={async () => {
                        setSubmitting(true)
                        try {
                          let valorStr = String(editRow.valor_m2 ?? '')
                          valorStr = valorStr.replace(',', '.')
                          const valorM2 = valorStr ? parseFloat(valorStr) : null
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
                              ORC: editRow.ORC ?? false
                            })
                            .select('*')
                          if (!error && data && data[0]) {
                            setMateriais(prev => [data[0], ...prev])
                            setCreatingNew(false)
                            setEditingId(null)
                            setEditRow({})
                          }
                        } catch (error) {
                          console.error('Error creating material:', error)
                        } finally {
                          setSubmitting(false)
                        }
                      }} disabled={submitting}>
                        Guardar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setCreatingNew(false)
                        setEditingId(null)
                        setEditRow({})
                      }}>
                        Cancelar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-40 uppercase">
                    <Loader2 className="animate-spin w-8 h-8 text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedMateriais.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 uppercase">
                    Nenhum material encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedMateriais.map((material) => (
                  <TableRow key={material.id}>
                    {editingId === material.id ? (
                      <>
                        <TableCell className="p-1 px-1">{material.referencia ?? '-'}</TableCell>
                        <TableCell className="p-1 font-medium px-1 uppercase w-[250px]">
                          <Input name="material" value={editRow.material ?? ''} onChange={handleInputChange} required className="w-full" />
                        </TableCell>
                        <TableCell className="p-1 px-1 uppercase w-[250px]">
                          <Textarea name="carateristica" value={editRow.carateristica ?? ''} onChange={handleInputChange} className="min-h-[40px] h-10 resize-none w-full" />
                        </TableCell>
                        <TableCell className="p-1 px-1">{material.cor ?? '-'}</TableCell>
                        <TableCell className="p-1 px-1">{material.qt_palete ?? '-'}</TableCell>
                        <TableCell className="p-1 px-1">{typeof material.valor_m2 === 'number' ? formatCurrency(material.valor_m2) : '-'}</TableCell>
                        <TableCell className="p-1 text-center">
                          <Checkbox
                            name="ORC"
                            checked={!!editRow.ORC}
                            onCheckedChange={val => setEditRow(prev => ({ ...prev, ORC: !!val }))}
                            className="mx-auto"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => handleSaveDrawer()}>
                              Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleDrawerClose}>
                              Cancelar
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="p-1 px-1">{material.referencia ?? '-'}</TableCell>
                        <TableCell className="p-1 px-1 w-[250px]">
                          {material.material 
                            ? (material.material.length > 25 ? material.material.slice(0, 25) + '...' : material.material)
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="p-1 px-1 w-[250px]">
                          {material.carateristica 
                            ? (material.carateristica.length > 25 ? material.carateristica.slice(0, 25) + '...' : material.carateristica)
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="p-1 px-1">{material.cor ?? '-'}</TableCell>
                        <TableCell className="p-1 px-1">{material.qt_palete ?? '-'}</TableCell>
                        <TableCell className="p-1 px-1">{typeof material.valor_m2 === 'number' ? formatCurrency(material.valor_m2) : '-'}</TableCell>
                        <TableCell className="p-1 text-center">
                          <Checkbox
                            checked={!!material.ORC}
                            onCheckedChange={() => handleOrcToggle(material.id, material.ORC)}
                            className="mx-auto"
                            disabled={!!orcLoading[material.id]}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="icon" onClick={() => handleEdit(material)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDelete(material.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Drawer open={openDrawer} onOpenChange={setOpenDrawer} shouldScaleBackground={false}>
        <DrawerContent className="h-[98vh] min-h-[98vh] max-h-[98vh] !top-0 overflow-y-auto !transform-none !filter-none !backdrop-filter-none will-change-auto">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 uppercase">
              <Edit className="w-5 h-5" />
              Editar Material
            </DrawerTitle>
            <DrawerDescription>
              Edite todos os campos do material.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={e => { e.preventDefault(); handleSaveDrawer(); }} className="space-y-6 p-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Fornecedor and Tipo - side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fornecedor_id" className="uppercase text-sm font-semibold">Fornecedor</Label>
                  <CreatableFornecedorCombobox
                    value={editingMaterial?.fornecedor_id ? String(editingMaterial.fornecedor_id).toUpperCase() : ''}
                    onChange={val => handleDrawerInputChange('fornecedor_id', val ? val.toUpperCase() : '')}
                    options={fornecedores.map(f => ({ ...f, label: f.label.toUpperCase() }))}
                    onOptionsUpdate={handleFornecedoresUpdate}
                    loading={fornecedoresLoading}
                    className="mt-2 w-full"
                    placeholder="FORNECEDOR"
                  />
                </div>
                <div>
                  <Label htmlFor="tipo" className="uppercase text-sm font-semibold">Tipo</Label>
                  <Select
                    value={editingMaterial?.tipo?.toUpperCase() ?? ''}
                    onValueChange={handleTipoChange}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="SELECIONE O TIPO" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTipos.map(tipo => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Material Info - Input Fields */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="material" className="uppercase text-sm font-semibold">Material</Label>
                  <CreatableMaterialCombobox
                    value={editingMaterial?.material?.toUpperCase() ?? ''}
                    onChange={handleMaterialComboChange}
                    options={materialOptions}
                    disabled={!editingMaterial?.tipo}
                    className="mt-2"
                    placeholder="SELECIONE OU CRIE MATERIAL"
                  />
                </div>
                <div>
                  <Label htmlFor="carateristica" className="uppercase text-sm font-semibold">Características</Label>
                  <CreatableMaterialCombobox
                    value={editingMaterial?.carateristica?.toUpperCase() ?? ''}
                    onChange={handleCaracteristicaComboChange}
                    options={caracteristicaOptions}
                    disabled={!editingMaterial?.material}
                    className="mt-2"
                    placeholder="SELECIONE OU CRIE CARACTERÍSTICA"
                  />
                </div>
                <div>
                  <Label htmlFor="cor" className="uppercase text-sm font-semibold">Cor</Label>
                  <CreatableMaterialCombobox
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
                  <Label htmlFor="referencia" className="uppercase text-sm font-semibold">Referência</Label>
                  <Input 
                    id="referencia" 
                    value={editingMaterial?.referencia ?? ''} 
                    onChange={(e) => handleDrawerInputChange('referencia', e.target.value)} 
                    className="mt-2" 
                  />
                </div>
                <div>
                  <Label htmlFor="ref_cliente" className="uppercase text-sm font-semibold">Ref. Cliente</Label>
                  <Input 
                    id="ref_cliente" 
                    value={editingMaterial?.ref_cliente ?? ''} 
                    onChange={(e) => handleDrawerInputChange('ref_cliente', e.target.value)} 
                    className="mt-2" 
                  />
                </div>
                <div>
                  <Label htmlFor="ref_fornecedor" className="uppercase text-sm font-semibold">Ref. Fornecedor</Label>
                  <Input 
                    id="ref_fornecedor" 
                    value={editingMaterial?.ref_fornecedor ?? ''} 
                    onChange={(e) => handleDrawerInputChange('ref_fornecedor', e.target.value)} 
                    className="mt-2" 
                  />
                </div>
              </div>

              {/* Channel and Dimensions - 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo_canal" className="uppercase text-sm font-semibold">Tipo Canal</Label>
                  <Input 
                    id="tipo_canal" 
                    value={editingMaterial?.tipo_canal ?? ''} 
                    onChange={(e) => handleDrawerInputChange('tipo_canal', e.target.value)} 
                    className="mt-2" 
                  />
                </div>
                <div>
                  <Label htmlFor="dimensoes" className="uppercase text-sm font-semibold">Dimensões</Label>
                  <Textarea 
                    id="dimensoes" 
                    value={editingMaterial?.dimensoes ?? ''} 
                    onChange={(e) => handleDrawerInputChange('dimensoes', e.target.value)} 
                    className="mt-2" 
                    rows={1}
                  />
                </div>
              </div>

              {/* Pricing - 3 columns */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="valor_m2_custo" className="uppercase text-sm font-semibold">VL/M² NET</Label>
                  <Input 
                    id="valor_m2_custo" 
                    type="number" 
                    step="0.01" 
                    value={editingMaterial?.valor_m2_custo ?? ''} 
                    onChange={(e) => handleDrawerInputChange('valor_m2_custo', parseFloat(e.target.value) || null)} 
                    className="mt-2" 
                  />
                </div>
                <div>
                  <Label htmlFor="valor_placa" className="uppercase text-sm font-semibold">VL PLACA</Label>
                  <Input 
                    id="valor_placa" 
                    type="number" 
                    step="0.01" 
                    value={editingMaterial?.valor_placa ?? ''} 
                    onChange={(e) => handleDrawerInputChange('valor_placa', parseFloat(e.target.value) || null)} 
                    className="mt-2" 
                  />
                </div>
                <div>
                  <Label htmlFor="valor_m2" className="uppercase text-sm font-semibold">Valor/m²</Label>
                  <Input 
                    id="valor_m2" 
                    type="number" 
                    step="0.01" 
                    value={editingMaterial?.valor_m2 ?? ''} 
                    onChange={(e) => handleDrawerInputChange('valor_m2', parseFloat(e.target.value) || null)} 
                    className="mt-2" 
                  />
                </div>
              </div>

              {/* Quantity, Stock levels and ORC - 4 columns */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="qt_palete" className="uppercase text-sm font-semibold">QT PAL</Label>
                  <Input 
                    id="qt_palete" 
                    type="number" 
                    value={editingMaterial?.qt_palete ?? ''} 
                    onChange={(e) => handleDrawerInputChange('qt_palete', parseInt(e.target.value) || null)} 
                    className="mt-2" 
                  />
                </div>
                <div>
                  <Label htmlFor="stock_minimo" className="uppercase text-sm font-semibold">Stock Mínimo</Label>
                  <Input 
                    id="stock_minimo" 
                    type="number" 
                    step="0.01"
                    value={editingMaterial?.stock_minimo ?? ''} 
                    onChange={(e) => handleDrawerInputChange('stock_minimo', parseFloat(e.target.value) || null)} 
                    className="mt-2" 
                  />
                </div>
                <div>
                  <Label htmlFor="stock_critico" className="uppercase text-sm font-semibold">Stock Crítico</Label>
                  <Input 
                    id="stock_critico" 
                    type="number" 
                    step="0.01"
                    value={editingMaterial?.stock_critico ?? ''} 
                    onChange={(e) => handleDrawerInputChange('stock_critico', parseFloat(e.target.value) || null)} 
                    className="mt-2" 
                  />
                </div>
                <div>
                  <Label htmlFor="ORC" className="uppercase text-sm font-semibold">ORC</Label>
                  <div className="flex items-center mt-2">
                    <Checkbox
                      id="ORC"
                      checked={!!editingMaterial?.ORC}
                      onCheckedChange={val => handleDrawerInputChange('ORC', val as boolean)}
                      className="mr-2"
                    />
                    <span className="text-sm">{editingMaterial?.ORC ? 'Sim' : 'Não'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-6">
              <Button type="submit" className="flex-1">
                Atualizar
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DrawerClose>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
} 
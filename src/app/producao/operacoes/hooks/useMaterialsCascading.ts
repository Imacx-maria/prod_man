import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@/utils/supabase'

export interface MaterialOption {
  value: string
  label: string
}

export interface MaterialData {
  id: string
  material: string | null
  carateristica: string | null
  cor: string | null
}

export const useMaterialsCascading = () => {
  const [materialsData, setMaterialsData] = useState<MaterialData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient()

  // Fetch all materials data
  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('materiais')
        .select('id, material, carateristica, cor')
        .eq('tipo', 'Rígidos') // Filter to only show rigid materials
        .order('material', { ascending: true })

      if (error) throw error
      
      if (data) {
        setMaterialsData(data)
      }
    } catch (err) {
      console.error('Error fetching materials:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Fetch data on hook initialization
  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  // Get unique materials (first level)
  const materialOptions = useMemo((): MaterialOption[] => {
    const uniqueMaterials = new Set<string>()
    
    materialsData.forEach(item => {
      if (item.material) {
        uniqueMaterials.add(item.material)
      }
    })

    return Array.from(uniqueMaterials)
      .sort()
      .map(material => ({
        value: material,
        label: material
      }))
  }, [materialsData])

  // Get characteristics filtered by selected material (second level)
  const getCaracteristicaOptions = useCallback((selectedMaterial?: string): MaterialOption[] => {
    if (!selectedMaterial) return []

    const uniqueCaracteristicas = new Set<string>()
    
    materialsData
      .filter(item => item.material === selectedMaterial)
      .forEach(item => {
        if (item.carateristica) {
          uniqueCaracteristicas.add(item.carateristica)
        }
      })

    return Array.from(uniqueCaracteristicas)
      .sort()
      .map(caracteristica => ({
        value: caracteristica,
        label: caracteristica
      }))
  }, [materialsData])

  // Get colors filtered by selected material and characteristic (third level)
  const getCorOptions = useCallback((selectedMaterial?: string, selectedCaracteristica?: string): MaterialOption[] => {
    if (!selectedMaterial) return []

    const uniqueCores = new Set<string>()
    
    materialsData
      .filter(item => {
        const materialMatch = item.material === selectedMaterial
        const caracteristicaMatch = selectedCaracteristica 
          ? item.carateristica === selectedCaracteristica 
          : true
        
        return materialMatch && caracteristicaMatch
      })
      .forEach(item => {
        if (item.cor) {
          uniqueCores.add(item.cor)
        }
      })

    return Array.from(uniqueCores)
      .sort()
      .map(cor => ({
        value: cor,
        label: cor
      }))
  }, [materialsData])

  // Get the material ID based on the complete selection
  const getMaterialId = useCallback((material?: string, caracteristica?: string, cor?: string): string | null => {
    if (!material) return null

    const foundMaterial = materialsData.find(item => {
      const materialMatch = item.material === material
      const caracteristicaMatch = caracteristica ? item.carateristica === caracteristica : true
      const corMatch = cor ? item.cor === cor : true

      return materialMatch && caracteristicaMatch && corMatch
    })

    return foundMaterial?.id || null
  }, [materialsData])

  return {
    materialOptions,
    getCaracteristicaOptions,
    getCorOptions,
    getMaterialId,
    materialsData, // Export the raw materials data
    loading,
    error,
    refetch: fetchMaterials
  }
} 
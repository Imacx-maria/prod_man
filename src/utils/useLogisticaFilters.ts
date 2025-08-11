import { useState, useMemo, useCallback, useRef } from 'react'
import type { LogisticaRecord } from '@/types/logistica'

// Debounce utility function
const debounce = <F extends (...args: unknown[]) => unknown>(
  func: F,
  waitFor: number,
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), waitFor)
  }
}

export function useLogisticaFilters(
  records: LogisticaRecord[],
  clienteLookup: Record<string, string> = {},
) {
  // Keep filters in state for rendering purposes
  const [filters, setFilters] = useState<Record<string, string>>({})

  // Keep track of the previous input for memoization comparison
  const prevInputsRef = useRef<{
    recordsLength: number
    filtersString: string
    clientsCount: number
    cachedResult?: LogisticaRecord[]
  }>({
    recordsLength: 0,
    filtersString: '',
    clientsCount: 0,
  })

  // Apply filters to records - optimized with early returns
  const applyFilters = useCallback(
    (
      records: LogisticaRecord[],
      filters: Record<string, string>,
      clienteLookup: Record<string, string>,
    ) => {
      // Early returns for common cases
      if (records.length === 0) return []
      if (!Object.values(filters).some((value) => value && value.trim()))
        return records

      // Cache field value lookups for case-insensitive filtering
      const filterEntries = Object.entries(filters).filter(
        ([_, value]) => value && value.trim(),
      )

      if (filterEntries.length === 0) return records

      // Preprocess the filter values once to avoid repeated toLowerCase calls
      const preparedFilters = filterEntries.map(([field, value]) => ({
        field,
        value: value.toLowerCase(),
      }))

      return records.filter((row) => {
        // Return true if all filters match
        return preparedFilters.every(({ field, value }) => {
          // Handle different fields differently
          switch (field) {
            case 'orc':
              return String(row.items_base?.folhas_obras?.numero_orc || '')
                .toLowerCase()
                .includes(value)
            case 'fo':
              return String(row.items_base?.folhas_obras?.numero_fo || '')
                .toLowerCase()
                .includes(value)
            case 'guia':
              return String(row.guia || '')
                .toLowerCase()
                .includes(value)
            case 'tipo':
              return (row.items_base?.brindes ? 'Brindes' : 'Print')
                .toLowerCase()
                .includes(value)
            case 'cliente': {
              const clientId = row.items_base?.folhas_obras?.id_cliente
              const clientName = clientId
                ? clienteLookup[clientId] ||
                  row.items_base?.folhas_obras?.cliente ||
                  ''
                : ''
              return clientName.toLowerCase().includes(value)
            }
            case 'item':
              return String(row.items_base?.descricao || '')
                .toLowerCase()
                .includes(value)
            case 'local_recolha': {
              const recolhaId = row.id_local_recolha
              const recolhaName = recolhaId
                ? clienteLookup[recolhaId] || row.local_recolha || ''
                : ''
              return recolhaName.toLowerCase().includes(value)
            }
            case 'local_entrega': {
              const entregaId = row.id_local_entrega
              const entregaName = entregaId
                ? clienteLookup[entregaId] || row.local_entrega || ''
                : ''
              return entregaName.toLowerCase().includes(value)
            }
            case 'transportadora':
              return String(row.transportadora || '')
                .toLowerCase()
                .includes(value)
            case 'notas':
              return String(row.notas || '')
                .toLowerCase()
                .includes(value)
            case 'saiu': {
              // For checkboxes, we filter by "sim" or "não"
              const isSaiu =
                row.items_base?.folhas_obras?.saiu || row.saiu || false
              if (value === 'sim' || value === 's') return isSaiu
              if (value === 'não' || value === 'nao' || value === 'n')
                return !isSaiu
              return true
            }
            default:
              return true
          }
        })
      })
    },
    [],
  )

  // Memoize filtered records
  const filteredRecords = useMemo(() => {
    // Generate a key based on relevant inputs for memoization
    const recordsLength = records.length
    const filtersString = JSON.stringify(filters)
    const clientsCount = Object.keys(clienteLookup).length

    // Only recompute if inputs have changed
    const currentInputs = {
      recordsLength,
      filtersString,
      clientsCount,
    }

    // Check if inputs have changed
    const inputsChanged =
      recordsLength !== prevInputsRef.current.recordsLength ||
      filtersString !== prevInputsRef.current.filtersString ||
      clientsCount !== prevInputsRef.current.clientsCount

    // Update reference for next comparison
    prevInputsRef.current = currentInputs

    // If nothing changed, skip filtering
    if (!inputsChanged && 'cachedResult' in prevInputsRef.current) {
      return prevInputsRef.current.cachedResult as LogisticaRecord[]
    }

    // Apply filters and cache result
    const result = applyFilters(records, filters, clienteLookup)
    prevInputsRef.current.cachedResult = result
    return result
  }, [records, filters, clienteLookup, applyFilters])

  // Optimize filter change to avoid unnecessary state updates
  const handleFilterChange = useMemo(() => {
    return debounce((field: string, value: string) => {
      setFilters((prev) => {
        // Skip update if value hasn't changed
        if (prev[field] === value) return prev
        return { ...prev, [field]: value }
      })
    }, 300) // 300ms debounce
  }, [])

  return {
    filters,
    filteredRecords,
    handleFilterChange,
    setFilters,
  }
}

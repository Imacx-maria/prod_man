'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { FullYearCalendar } from '@/components/FullYearCalendar'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAccessibilityFixes } from '@/utils/accessibility'
import { useLogisticaData } from '@/utils/useLogisticaData'
import { useLogisticaFilters } from '@/utils/useLogisticaFilters'
import LogisticaDrawer from '@/components/LogisticaDrawer'
import { LogisticaRecord } from '@/types/logistica'
import { formatDateToYYYYMMDD } from '@/utils/date'
import LogisticaTable from '@/components/LogisticaTable'
import DashboardLogisticaTable from '@/components/DashboardLogisticaTable'
import { createBrowserClient } from '@/utils/supabase'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { RefreshCcw, Loader2 } from 'lucide-react'

interface Holiday {
  id: string
  holiday_date: string
  description?: string
}

interface ClientIndexProps {
  holidays: Holiday[]
}

const ClientIndex: React.FC<ClientIndexProps> = ({ holidays }) => {
  // Apply accessibility fixes
  useAccessibilityFixes()

  // Create supabase client
  const supabase = createBrowserClient()

  // Component state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [records, setRecords] = useState<LogisticaRecord[]>([])
  const [sourceRowId, setSourceRowId] = useState<string | null>(null)
  // Dashboard table state
  const [dashboardRecords, setDashboardRecords] = useState<LogisticaRecord[]>(
    [],
  )
  const [dashboardLoading, setDashboardLoading] = useState(false)

  // Use our custom data hook
  const {
    loading,
    records: dataRecords,
    clientes,
    transportadoras,
    armazens,
    clienteLookup,
    fetchLogisticaData,
    fetchReferenceData,
    updateLogisticaField,
    updateFolhaObraField,
    updateItemBaseField,
    deleteLogisticaRow,
    duplicateLogisticaRow,
    refetchRow,
  } = useLogisticaData()

  // Sync records from hook to local state
  useEffect(() => {
    setRecords(dataRecords)
  }, [dataRecords])

  // Use our custom filters hook with local records state
  const { filteredRecords, handleFilterChange } = useLogisticaFilters(
    records,
    clienteLookup,
  )

  // Fetch recent logistics data for dashboard table
  const fetchDashboardData = useCallback(async () => {
    setDashboardLoading(true)
    try {
      // Get current date and 7 days ago for recent deliveries
      const today = new Date()
      const weekAgo = new Date()
      weekAgo.setDate(today.getDate() - 7)

      const { data, error } = await supabase
        .from('logistica_entregas')
        .select(
          `
          *,
          items_base!inner (
            id,
            descricao,
            brindes,
            folha_obra_id,
            data_saida,
            folhas_obras (
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
        .gte('data', format(weekAgo, 'yyyy-MM-dd'))
        .lte('data', format(today, 'yyyy-MM-dd'))
        .order('data', { ascending: false })
        .limit(50)

      if (error) throw error

      if (data) {
        // Process the data similar to fetchLogisticaData
        const processedRecords = data.map((record: any) => {
          const processedRecord = JSON.parse(JSON.stringify(record))
          if (!processedRecord.items_base) {
            processedRecord.items_base = {
              id: '',
              descricao: '',
              brindes: false,
            }
          }
          if (!processedRecord.items_base.folhas_obras) {
            processedRecord.items_base.folhas_obras = {
              id: '',
              numero_orc: '',
              numero_fo: '',
              cliente: '',
              id_cliente: '',
              saiu: false,
            }
          }
          if (
            !processedRecord.descricao &&
            processedRecord.items_base?.descricao
          ) {
            processedRecord.descricao = processedRecord.items_base.descricao
          }
          return processedRecord
        })

        setDashboardRecords(processedRecords)
      }
    } catch (error) {
      console.error('Error fetching dashboard logistics data:', error)
    } finally {
      setDashboardLoading(false)
    }
  }, [supabase])

  // Fetch reference data on mount and dashboard data
  useEffect(() => {
    fetchReferenceData()
    fetchDashboardData()
  }, [fetchReferenceData, fetchDashboardData])

  // Fetch data when drawer opens and selectedDate changes
  useEffect(() => {
    if (!drawerOpen || !selectedDate) return
    fetchLogisticaData(selectedDate)
  }, [drawerOpen, selectedDate, fetchLogisticaData])

  // Handle day click in calendar - memoized to prevent recreation on renders
  const handleDayClick = useCallback((date?: Date) => {
    if (date) {
      setSelectedDate(date)
      setDrawerOpen(true)
    }
  }, [])

  // Memoized event handlers to prevent unnecessary re-renders
  const handleOrcSave = useCallback(
    async (row: any, value: string) => {
      const folhaObraId =
        row.items_base?.folha_obra_id || row.items_base?.folhas_obras?.id
      if (!folhaObraId) {
        console.error('Cannot update ORC: missing folha_obra_id', row)
        return
      }
      await updateFolhaObraField(folhaObraId, 'numero_orc', value, selectedDate)
    },
    [updateFolhaObraField, selectedDate],
  )

  const handleFoSave = useCallback(
    async (row: any, value: string) => {
      const folhaObraId =
        row.items_base?.folha_obra_id || row.items_base?.folhas_obras?.id
      if (!folhaObraId) {
        console.error('Cannot update FO: missing folha_obra_id', row)
        return
      }

      const result = await updateFolhaObraField(
        folhaObraId,
        'numero_fo',
        value,
        selectedDate,
      )
      if (result && row.id) {
        // Refetch to ensure we preserve the item description
        await refetchRow(row.id, selectedDate)
      }
    },
    [updateFolhaObraField, refetchRow, selectedDate],
  )

  const handleItemSave = useCallback(
    async (row: any, value: string) => {
      console.log('handleItemSave called:', { rowId: row.id, value, row })

      const itemId = row.items_base?.id
      if (!itemId) {
        console.error('Cannot update item: missing items_base.id', row)
        return
      }

      // Update the items_base description (this affects all logistics entries for this item)
      const success = await updateItemBaseField(
        itemId,
        'descricao',
        value,
        selectedDate,
      )
      console.log('Item description update result:', success)

      if (success) {
        // Also update the logistica_entregas.descricao field to keep them in sync
        try {
          await supabase
            .from('logistica_entregas')
            .update({ descricao: value })
            .eq('item_id', itemId)
        } catch (error) {
          console.error('Error updating logistics descriptions:', error)
        }

        // Update local state immediately to prevent UI flicker
        setRecords((prevRecords) =>
          prevRecords.map((record) => {
            if (record.items_base?.id === itemId) {
              // Create a deep clone to avoid reference issues
              const updatedRecord = JSON.parse(JSON.stringify(record))

              // Ensure path exists
              if (updatedRecord.items_base) {
                updatedRecord.items_base.descricao = value
              }

              // Also update the direct descricao field
              updatedRecord.descricao = value

              return updatedRecord
            }
            return record
          }),
        )
      }
    },
    [updateItemBaseField, selectedDate, setRecords],
  )

  const handleSaiuSave = useCallback(
    async (row: any, value: boolean) => {
      if (!row.id) {
        console.error('Cannot update saiu: missing row.id', row)
        return
      }
      // Update logistica_entregas.saiu field instead of folhas_obras.saiu
      await updateLogisticaField(row.id, 'saiu', value, selectedDate)
      await refetchRow(row.id, selectedDate)
    },
    [updateLogisticaField, refetchRow, selectedDate],
  )

  const handleGuiaSave = useCallback(
    async (row: any, value: string) => {
      console.log('handleGuiaSave called:', {
        rowId: row.id,
        value,
        currentGuia: row.guia,
        itemId: row.items_base?.id,
        itemDescription: row.items_base?.descricao,
      })

      if (!row.id) {
        console.error('Cannot update GUIA: missing row.id', row)
        return
      }

      try {
        // First, attempt to update the GUIA field
        const success = await updateLogisticaField(
          row.id,
          'guia',
          value,
          selectedDate,
        )
        console.log('GUIA update result:', success)

        if (success) {
          // If update was successful, refetch to ensure UI is in sync with DB
          await refetchRow(row.id, selectedDate)
        }
      } catch (error) {
        console.error('Error updating GUIA field:', error)
      }
    },
    [updateLogisticaField, refetchRow, selectedDate],
  )

  const handleBrindesSave = useCallback(
    async (row: any, value: boolean) => {
      const itemId = row.items_base?.id
      if (itemId !== undefined) {
        await updateItemBaseField(itemId, 'brindes', value, selectedDate)
        await refetchRow(row.id, selectedDate)
      }
    },
    [updateItemBaseField, refetchRow, selectedDate],
  )

  const handleClienteChange = useCallback(
    async (row: any, value: string) => {
      if (!row.items_base?.folha_obra_id) {
        console.error('Cannot update client: missing folha_obra_id')
        return
      }

      await updateFolhaObraField(
        row.items_base.folha_obra_id,
        'id_cliente',
        value,
        selectedDate,
      )
    },
    [updateFolhaObraField, selectedDate],
  )

  const handleRecolhaChange = useCallback(
    async (rowId: string, value: string) => {
      console.log('🏠 Updating local_recolha:', {
        rowId,
        value,
      })
      try {
        // Find the selected armazem to get the text label
        const selectedArmazem = armazens.find((a) => a.value === value)
        const textValue = selectedArmazem ? selectedArmazem.label : ''

        console.log('🏠 Armazem details:', {
          id: value,
          text: textValue,
        })

        // Update both ID and text fields
        const success = await Promise.all([
          updateLogisticaField(rowId, 'id_local_recolha', value, selectedDate),
          updateLogisticaField(rowId, 'local_recolha', textValue, selectedDate),
        ])

        if (success.every((s) => s)) {
          console.log(
            '✅ Successfully updated both id_local_recolha and local_recolha',
          )
          await refetchRow(rowId, selectedDate)
        } else {
          console.error('❌ Failed to update local_recolha fields')
          alert('Erro ao atualizar local de recolha')
        }
      } catch (error) {
        console.error('❌ Error updating local_recolha:', error)
        alert(`Erro ao atualizar local de recolha: ${error}`)
      }
    },
    [updateLogisticaField, refetchRow, selectedDate, armazens],
  )

  const handleEntregaChange = useCallback(
    async (rowId: string, value: string) => {
      console.log('🚚 Updating local_entrega:', {
        rowId,
        value,
      })
      try {
        // Find the selected armazem to get the text label
        const selectedArmazem = armazens.find((a) => a.value === value)
        const textValue = selectedArmazem ? selectedArmazem.label : ''

        console.log('🚚 Armazem details:', {
          id: value,
          text: textValue,
        })

        // Update both ID and text fields
        const success = await Promise.all([
          updateLogisticaField(rowId, 'id_local_entrega', value, selectedDate),
          updateLogisticaField(rowId, 'local_entrega', textValue, selectedDate),
        ])

        if (success.every((s) => s)) {
          console.log(
            '✅ Successfully updated both id_local_entrega and local_entrega',
          )
          await refetchRow(rowId, selectedDate)
        } else {
          console.error('❌ Failed to update local_entrega fields')
          alert('Erro ao atualizar local de entrega')
        }
      } catch (error) {
        console.error('❌ Error updating local_entrega:', error)
        alert(`Erro ao atualizar local de entrega: ${error}`)
      }
    },
    [updateLogisticaField, refetchRow, selectedDate, armazens],
  )

  const handleTransportadoraChange = useCallback(
    async (row: any, value: string) => {
      await updateLogisticaField(row.id, 'transportadora', value, selectedDate)
      await refetchRow(row.id, selectedDate)
    },
    [updateLogisticaField, refetchRow, selectedDate],
  )

  const handleNotasSave = useCallback(
    async (
      row: any,
      outras: string,
      contacto?: string, // This will be undefined from updated components
      telefone?: string, // This will be undefined from updated components
      contacto_entrega?: string,
      telefone_entrega?: string,
      data?: string | null,
    ) => {
      // Save all fields if provided
      if (outras !== undefined)
        await updateLogisticaField(row.id, 'notas', outras, selectedDate)

      // Only save pickup contact fields if they are actually provided (for backward compatibility)
      if (contacto !== undefined)
        await updateLogisticaField(row.id, 'contacto', contacto, selectedDate)
      if (telefone !== undefined)
        await updateLogisticaField(row.id, 'telefone', telefone, selectedDate)

      // Save delivery contact fields
      if (contacto_entrega !== undefined)
        await updateLogisticaField(
          row.id,
          'contacto_entrega',
          contacto_entrega,
          selectedDate,
        )
      if (telefone_entrega !== undefined)
        await updateLogisticaField(
          row.id,
          'telefone_entrega',
          telefone_entrega,
          selectedDate,
        )

      // Handle date change - this updates logistica_entregas.data to move the logistics entry to a different day
      if (data !== undefined) {
        // Only update the logistica_entregas.data field (data handling is now in logistics table)
        await updateLogisticaField(row.id, 'data', data, selectedDate)

        // If the date changed and is different from the current selected date,
        // the item will disappear from the current view (which is expected behavior)
        if (
          data &&
          data !==
            (selectedDate ? selectedDate.toISOString().split('T')[0] : null)
        ) {
          console.log(`Logistics entry moved to date: ${data}`)
        }
      }

      // Always refresh the table for the current date after saving
      await fetchLogisticaData(selectedDate)
    },
    [
      updateLogisticaField,
      updateItemBaseField,
      fetchLogisticaData,
      selectedDate,
    ],
  )

  const handleDeleteRow = useCallback(
    async (rowId: string) => {
      try {
        // YOU DECIDE! No restrictions on deletion
        const confirmed = confirm('Tem certeza que deseja eliminar esta linha?')
        if (!confirmed) return

        await deleteLogisticaRow(rowId, selectedDate)
        // Remove the deleted row from local state
        setRecords((prevRecords) =>
          prevRecords.filter((row) => row.id !== rowId),
        )
      } catch (error) {
        console.error('Error deleting logistics row:', error)
        alert('Erro ao eliminar linha. Tente novamente.')
      }
    },
    [deleteLogisticaRow, selectedDate, records, setRecords],
  )

  const handleQuantidadeSave = useCallback(
    async (row: any, value: number | null) => {
      console.log('handleQuantidadeSave called:', {
        rowId: row.id,
        currentQuantidade: row.quantidade,
        itemsBaseQuantidade: row.items_base?.quantidade,
        newValue: value,
      })

      if (!row.id) {
        console.error('Cannot update quantidade: missing row.id', row)
        return
      }
      // Update the logistics-specific quantity (for partial deliveries)
      await updateLogisticaField(row.id, 'quantidade', value, selectedDate)
      await refetchRow(row.id, selectedDate)
    },
    [updateLogisticaField, refetchRow, selectedDate],
  )

  const handleConcluidoSave = useCallback(
    async (row: any, value: boolean) => {
      if (!row.id) {
        console.error('Cannot update concluido: missing row.id', row)
        return
      }

      if (value) {
        // When checking concluido, set data_saida to match data_concluido if it exists, otherwise use today's date
        const today = new Date().toISOString().split('T')[0]
        const dateToUse = row.data_concluido || today

        // Update concluido, data_concluido (if not set), and data_saida
        await Promise.all([
          updateLogisticaField(row.id, 'concluido', value, selectedDate),
          !row.data_concluido
            ? updateLogisticaField(
                row.id,
                'data_concluido',
                dateToUse,
                selectedDate,
              )
            : Promise.resolve(),
          updateLogisticaField(row.id, 'data_saida', dateToUse, selectedDate),
        ])
      } else {
        // When unchecking concluido, clear both dates
        await Promise.all([
          updateLogisticaField(row.id, 'concluido', value, selectedDate),
          updateLogisticaField(row.id, 'data_concluido', null, selectedDate),
          updateLogisticaField(row.id, 'data_saida', null, selectedDate),
        ])
      }

      await refetchRow(row.id, selectedDate)
    },
    [updateLogisticaField, refetchRow, selectedDate],
  )

  const handleDataSaidaSave = useCallback(
    async (row: any, value: string) => {
      if (!row.id) {
        console.error('Cannot update data_saida: missing row.id', row)
        return
      }
      // Update only data_saida field in logistica_entregas
      await updateLogisticaField(row.id, 'data_saida', value, selectedDate)
      await refetchRow(row.id, selectedDate)
    },
    [updateLogisticaField, refetchRow, selectedDate],
  )

  const handleDuplicateRow = useCallback(
    async (row: any) => {
      try {
        console.log('Duplicate row called for:', row)

        // Defensive: ensure we have a valid item_id
        const itemId = row.item_id || row.items_base?.id
        if (!itemId) {
          alert('Não foi possível duplicar: item_id em falta.')
          return
        }

        // Count existing logistics entries for this item to generate a unique suffix
        const existingEntriesForItem = records.filter(
          (r) => r.items_base?.id === itemId,
        )
        const copyNumber = existingEntriesForItem.length

        // Create a differentiated description for the duplicate
        const originalDescription = row.items_base?.descricao || ''
        const duplicatedDescription = `${originalDescription} - Entrega ${copyNumber + 1}`

        console.log(
          'Creating duplicate with description:',
          duplicatedDescription,
        )

        // Defensive: copy all relevant fields, fallback to empty or null if missing
        const payload = {
          item_id: itemId,
          descricao: duplicatedDescription, // Use the differentiated description
          local_recolha: row.local_recolha || '', // Copy warehouse text
          guia: row.guia || '',
          transportadora: row.transportadora || '',
          contacto: row.contacto || '',
          telefone: row.telefone || '',
          quantidade: row.quantidade ?? null,
          notas: row.notas || '',
          local_entrega: row.local_entrega || '', // Copy warehouse text
          contacto_entrega: row.contacto_entrega || '',
          telefone_entrega: row.telefone_entrega || '',
          data:
            row.data ||
            (selectedDate
              ? format(selectedDate, 'yyyy-MM-dd')
              : format(new Date(), 'yyyy-MM-dd')),
          id_local_entrega: row.id_local_entrega || null, // Copy warehouse ID
          id_local_recolha: row.id_local_recolha || null, // Copy warehouse ID
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
          if (selectedDate) {
            await fetchLogisticaData(selectedDate)
          }
          return
        }

        setRecords((prevRecords) => [...prevRecords, newLogisticsEntry])
        console.log('Row duplicated successfully:', newLogisticsEntry)
      } catch (error) {
        console.error('Error duplicating row:', error)
        alert(
          'Erro inesperado ao duplicar linha. Verifique o console para detalhes.',
        )
      }
    },
    [supabase, selectedDate, records, setRecords, fetchLogisticaData],
  )

  // Add item handler - this should be implemented based on your business logic
  const handleAddItem = useCallback(async () => {
    if (!selectedDate) {
      alert('Nenhuma data selecionada.')
      return
    }

    try {
      // Step 1: Create a minimal folha_obra (required for items_base)
      const { data: folhaObraData, error: folhaObraError } = await supabase
        .from('folhas_obras')
        .insert({
          numero_fo: '', // Empty - user can fill it if they want
          nome_campanha: '',
          cliente: '',
          data_in: new Date().toISOString(),
          saiu: false,
        })
        .select('*')
        .single()

      if (folhaObraError || !folhaObraData) {
        console.error('Error creating folha obra:', folhaObraError)
        alert(`Erro ao criar folha obra: ${folhaObraError?.message}`)
        return
      }

      // Step 2: Create a minimal items_base (required for logistica_entregas)
      const { data: itemBaseData, error: itemBaseError } = await supabase
        .from('items_base')
        .insert({
          folha_obra_id: folhaObraData.id,
          descricao: '',
          codigo: '',
          quantidade: 1,
        })
        .select('*')
        .single()

      if (itemBaseError || !itemBaseData) {
        console.error('Error creating item base:', itemBaseError)
        alert(`Erro ao criar item: ${itemBaseError?.message}`)
        return
      }

      // Step 3: Create the logistica_entregas entry
      const { error: logisticsError } = await supabase
        .from('logistica_entregas')
        .insert({
          item_id: itemBaseData.id,
          descricao: '',
          data_saida: format(selectedDate, 'yyyy-MM-dd'), // Use data_saida to match the query
          is_entrega: true,
          guia: '',
          local_recolha: '', // This will be populated when user selects from combobox
          local_entrega: '', // This will be populated when user selects from combobox
          id_local_recolha: null, // This will be populated when user selects from combobox
          id_local_entrega: null, // This will be populated when user selects from combobox
          transportadora: '',
          notas: '',
          quantidade: null,
        })

      if (logisticsError) {
        console.error('Error creating logistics entry:', logisticsError)
        alert(`Erro ao criar entrada de logística: ${logisticsError?.message}`)
        return
      }

      // Refresh the data for the selected date
      await fetchLogisticaData(selectedDate)
    } catch (error) {
      console.error('Unexpected error adding item:', error)
      alert(`Erro inesperado: ${error}`)
    }
  }, [selectedDate, supabase, fetchLogisticaData])

  // Copy quantities handler
  const handleCopyQuantities = useCallback(async () => {
    if (records.length === 0) {
      alert('Não há itens na tabela de logística.')
      return
    }

    const confirmed = confirm(
      'Copiar quantidades originais dos itens para a tabela de logística? Isto irá substituir as quantidades existentes.',
    )
    if (!confirmed) return

    try {
      // Update all logistics records with original quantities
      const updatePromises = records
        .filter((row) => row.items_base?.quantidade && row.id)
        .map((row) =>
          updateLogisticaField(
            row.id!,
            'quantidade',
            row.items_base!.quantidade!,
            selectedDate,
          ),
        )

      await Promise.all(updatePromises)

      // Refresh data to show the updates
      await fetchLogisticaData(selectedDate)

      alert('Quantidades copiadas com sucesso!')
    } catch (error) {
      console.error('Error copying quantities:', error)
      alert('Erro ao copiar quantidades. Tente novamente.')
    }
  }, [records, updateLogisticaField, selectedDate, fetchLogisticaData])

  // Copy delivery handler
  const handleCopyDelivery = useCallback(
    async (sourceRowId: string | null) => {
      if (records.length < 2) {
        alert('É necessário pelo menos 2 itens para copiar a entrega.')
        return
      }

      if (!sourceRowId) {
        alert(
          'Por favor, selecione uma linha como fonte clicando no botão de rádio na coluna "Fonte".',
        )
        return
      }

      // Find the source record
      const sourceRecord = records.find((r) => r.id === sourceRowId)
      if (!sourceRecord) {
        alert('Linha fonte não encontrada.')
        return
      }

      // Show confirmation with details
      const confirmed = confirm(
        `Copiar dados da linha "${sourceRecord.items_base?.descricao || 'Sem descrição'}" para todas as outras linhas?`,
      )

      if (!confirmed) return

      try {
        // Extract delivery information from the source record
        const deliveryInfo = {
          local_recolha: sourceRecord.local_recolha || '', // Warehouse text
          transportadora: sourceRecord.transportadora || '',
          contacto: sourceRecord.contacto || '',
          telefone: sourceRecord.telefone || '',
          local_entrega: sourceRecord.local_entrega || '', // Warehouse text
          contacto_entrega: sourceRecord.contacto_entrega || '',
          telefone_entrega: sourceRecord.telefone_entrega || '',
          notas: sourceRecord.notas || '',
          id_local_entrega: sourceRecord.id_local_entrega, // Warehouse ID
          id_local_recolha: sourceRecord.id_local_recolha, // Warehouse ID
        }

        // Update all other logistics records (skip the source one)
        const updatePromises = records
          .filter((record) => record.id !== sourceRowId && record.id)
          .map(async (record) => {
            const updates = []
            if (deliveryInfo.local_recolha)
              updates.push(
                updateLogisticaField(
                  record.id!,
                  'local_recolha',
                  deliveryInfo.local_recolha,
                  selectedDate,
                ),
              )
            if (deliveryInfo.transportadora)
              updates.push(
                updateLogisticaField(
                  record.id!,
                  'transportadora',
                  deliveryInfo.transportadora,
                  selectedDate,
                ),
              )
            if (deliveryInfo.contacto)
              updates.push(
                updateLogisticaField(
                  record.id!,
                  'contacto',
                  deliveryInfo.contacto,
                  selectedDate,
                ),
              )
            if (deliveryInfo.telefone)
              updates.push(
                updateLogisticaField(
                  record.id!,
                  'telefone',
                  deliveryInfo.telefone,
                  selectedDate,
                ),
              )
            if (deliveryInfo.local_entrega)
              updates.push(
                updateLogisticaField(
                  record.id!,
                  'local_entrega',
                  deliveryInfo.local_entrega,
                  selectedDate,
                ),
              )
            if (deliveryInfo.contacto_entrega)
              updates.push(
                updateLogisticaField(
                  record.id!,
                  'contacto_entrega',
                  deliveryInfo.contacto_entrega,
                  selectedDate,
                ),
              )
            if (deliveryInfo.telefone_entrega)
              updates.push(
                updateLogisticaField(
                  record.id!,
                  'telefone_entrega',
                  deliveryInfo.telefone_entrega,
                  selectedDate,
                ),
              )
            if (deliveryInfo.notas)
              updates.push(
                updateLogisticaField(
                  record.id!,
                  'notas',
                  deliveryInfo.notas,
                  selectedDate,
                ),
              )
            if (deliveryInfo.id_local_entrega)
              updates.push(
                updateLogisticaField(
                  record.id!,
                  'id_local_entrega',
                  deliveryInfo.id_local_entrega,
                  selectedDate,
                ),
              )
            if (deliveryInfo.id_local_recolha)
              updates.push(
                updateLogisticaField(
                  record.id!,
                  'id_local_recolha',
                  deliveryInfo.id_local_recolha,
                  selectedDate,
                ),
              )

            return Promise.all(updates)
          })

        await Promise.all(updatePromises)

        // Refresh data to show the updates
        await fetchLogisticaData(selectedDate)

        alert('Informações de entrega copiadas com sucesso!')
      } catch (error) {
        console.error('Error copying delivery information:', error)
        alert('Erro ao copiar informações de entrega. Tente novamente.')
      }
    },
    [records, updateLogisticaField, selectedDate, fetchLogisticaData],
  )

  // Handle refresh functionality for drawer
  const handleRefresh = useCallback(async () => {
    if (selectedDate) {
      try {
        await fetchLogisticaData(selectedDate)
        await fetchReferenceData() // Also refresh reference data (clients, transportadoras)
      } catch (error) {
        console.error('Error refreshing data:', error)
        alert('Erro ao actualizar dados. Tente novamente.')
      }
    }
  }, [selectedDate, fetchLogisticaData, fetchReferenceData])

  // Enhanced handlers that update both drawer and dashboard data
  const handleDashboardSaiuSave = useCallback(
    async (row: LogisticaRecord, value: boolean) => {
      await handleSaiuSave(row, value)
      // Refresh dashboard data to reflect changes
      await fetchDashboardData()
    },
    [handleSaiuSave, fetchDashboardData],
  )

  const handleDashboardDeleteRow = useCallback(
    async (rowId: string) => {
      await handleDeleteRow(rowId)
      // Refresh dashboard data to reflect changes
      await fetchDashboardData()
    },
    [handleDeleteRow, fetchDashboardData],
  )

  // Callbacks for creatable comboboxes
  const handleArmazensUpdate = useCallback(async () => {
    // Refresh reference data to get the updated armazens list
    await fetchReferenceData()
  }, [fetchReferenceData])

  const handleTransportadorasUpdate = useCallback(async () => {
    // Refresh reference data to get the updated transportadoras list
    await fetchReferenceData()
  }, [fetchReferenceData])

  const handleClientesUpdate = useCallback(async () => {
    // Refresh reference data to get the updated clientes list
    await fetchReferenceData()
  }, [fetchReferenceData])

  // Track previous drawer open state to detect close event
  const prevDrawerOpenRef = React.useRef(drawerOpen)

  useEffect(() => {
    // If the drawer was open and now is closed, refresh dashboard
    if (prevDrawerOpenRef.current && !drawerOpen) {
      fetchDashboardData()
    }
    prevDrawerOpenRef.current = drawerOpen
  }, [drawerOpen, fetchDashboardData])

  // Memoize drawer props to prevent unnecessary re-renders
  const drawerProps = useMemo(
    () => ({
      open: drawerOpen,
      onOpenChange: setDrawerOpen,
      selectedDate,
      loading,
      records: filteredRecords,
      clientes,
      transportadoras,
      armazens,
      onOrcSave: handleOrcSave,
      onFoSave: handleFoSave,
      onItemSave: handleItemSave,
      onSaiuSave: handleSaiuSave,
      onGuiaSave: handleGuiaSave,
      onBrindesSave: handleBrindesSave,
      onClienteChange: handleClienteChange,
      onRecolhaChange: handleRecolhaChange,
      onEntregaChange: handleEntregaChange,
      onTransportadoraChange: handleTransportadoraChange,
      onQuantidadeSave: handleQuantidadeSave,
      onConcluidoSave: handleConcluidoSave,
      onDataSaidaSave: handleDataSaidaSave,
      onDuplicateRow: handleDuplicateRow,
      onNotasSave: handleNotasSave,
      onDeleteRow: handleDeleteRow,
      onDateChange: (date: Date) => {
        setSelectedDate(date)
        if (drawerOpen) {
          fetchLogisticaData(date)
        }
      },
      holidays,
      tableDate: formatDateToYYYYMMDD(selectedDate) || '',
      // Enhanced functionality
      onAddItem: handleAddItem,
      onCopyQuantities: handleCopyQuantities,
      onCopyDelivery: handleCopyDelivery,
      sourceRowId,
      onSourceRowChange: setSourceRowId,
      onRefresh: handleRefresh,
      // Creatable combobox callbacks
      onArmazensUpdate: handleArmazensUpdate,
      onTransportadorasUpdate: handleTransportadorasUpdate,
      onClientesUpdate: handleClientesUpdate,
    }),
    [
      drawerOpen,
      selectedDate,
      loading,
      filteredRecords,
      clientes,
      transportadoras,
      armazens,
      handleOrcSave,
      handleFoSave,
      handleItemSave,
      handleSaiuSave,
      handleGuiaSave,
      handleBrindesSave,
      handleClienteChange,
      handleRecolhaChange,
      handleEntregaChange,
      handleTransportadoraChange,
      handleQuantidadeSave,
      handleConcluidoSave,
      handleDataSaidaSave,
      handleDuplicateRow,
      handleNotasSave,
      handleDeleteRow,
      fetchLogisticaData,
      holidays,
      handleAddItem,
      handleCopyQuantities,
      handleCopyDelivery,
      sourceRowId,
      handleRefresh,
      handleArmazensUpdate,
      handleTransportadorasUpdate,
      handleClientesUpdate,
    ],
  )

  return (
    <div
      className="flex w-full flex-1 flex-col items-center gap-20"
      data-no-aria-hidden="true"
    >
      <div
        className="flex w-full max-w-6xl flex-col items-center gap-10 px-3"
        data-no-aria-hidden="true"
      >
        <h1 className="mb-2 text-center text-4xl font-extrabold">
          Gestão Produção Imacx
        </h1>
        <FullYearCalendar holidays={holidays} onSelect={handleDayClick} />
      </div>

      <DashboardLogisticaTable onRefresh={fetchDashboardData} />

      <LogisticaDrawer {...drawerProps} />

      <footer className="border-t-foreground/10 w-full justify-center border-t p-8 text-center text-xs">
        <p className="mb-6">Powered by Imacx</p>
        <ThemeToggle />
      </footer>
    </div>
  )
}

export default ClientIndex

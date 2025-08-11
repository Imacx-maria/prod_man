'use client'

/**
 * Production Operations Page
 * -------------------------
 * FILTERING RULES:
 * - Only shows items from jobs that have both FO (numero_fo) and ORC (numero_orc) values
 * - Items from jobs missing either FO or ORC are filtered out
 * - Both numero_fo and numero_orc cannot be null, 0, or "0000"
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { debugLog, debugWarn } from '@/utils/devLogger'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import PermissionGuard from '@/components/PermissionGuard'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Combobox from '@/components/ui/Combobox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  X,
  RotateCw,
  Search,
  Filter,
  Download,
  AlertCircle,
  Calendar,
  User,
  Settings,
  Eye,
  ArrowUp,
  ArrowDown,
  Trash2,
  RefreshCcw,
  Loader2,
  Copy,
  Check,
} from 'lucide-react'
import DatePicker from '@/components/ui/DatePicker'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import SimpleNotasPopover from '@/components/ui/SimpleNotasPopover'
import { createBrowserClient } from '@/utils/supabase'
import ProductionAnalyticsCharts from '@/components/ProductionAnalyticsCharts'
import LogisticaTableWithCreatable from '@/components/LogisticaTableWithCreatable'
import { LogisticaRecord } from '@/types/logistica'
import { useLogisticaData } from '@/utils/useLogisticaData'
import {
  fetchEnhancedAuditLogs,
  resolveOperatorName,
} from '@/utils/auditLogging'

// Types
interface ProductionItem {
  id: string
  folha_obra_id: string
  descricao: string
  codigo?: string | null
  quantidade?: number | null
  concluido?: boolean
  concluido_maq?: boolean | null
  brindes?: boolean
  prioridade?: boolean | null
  complexidade?: string | null
  created_at?: string | null
  folhas_obras?: {
    numero_fo?: string
    nome_campanha?: string
    cliente?: string
  } | null
  designer_items?: {
    paginacao?: boolean
    path_trabalho?: string
  } | null
  logistica_entregas?:
    | {
        concluido?: boolean
      }[]
    | {
        concluido?: boolean
      }
    | null
}

interface ProductionOperation {
  id: string
  data_operacao: string
  operador_id?: string | null
  folha_obra_id: string
  item_id: string
  no_interno: string
  Tipo_Op?: string
  maquina?: string | null
  material_id?: string | null
  stock_consumido_id?: string | null
  num_placas_print?: number | null
  num_placas_corte?: number | null
  QT_print?: number | null
  observacoes?: string | null
  notas?: string | null
  notas_imp?: string | null
  status?: string
  concluido?: boolean
  data_conclusao?: string | null
  created_at?: string
  updated_at?: string
  N_Pal?: string | null
  profiles?: {
    first_name?: string
    last_name?: string
    roles?: {
      name?: string
    }
  }
  materiais?: {
    material?: string
    cor?: string
  }
}

interface Profile {
  id: string
  first_name: string
  last_name: string
  roles?: {
    name: string
  }
}

interface Machine {
  id: string
  nome_maquina: string
  tipo: string
  ativa?: boolean
}

interface Material {
  id: string
  material?: string
  cor?: string
  tipo?: string
  carateristica?: string
  referencia?: string
}

interface Palete {
  id: string
  no_palete: string
  ref_cartao?: string | null
  fornecedor_id?: string | null
  fornecedores?: {
    nome_forn: string
  } | null
}

type Holiday = {
  id: string
  holiday_date: string
  description: string
}

export default function OperacoesPage() {
  return (
    <PermissionGuard>
      <OperacoesPageContent />
    </PermissionGuard>
  )
}

// Helper function to get the authenticated user's profile ID
const getAuthenticatedUserProfileId = async (supabase: any) => {
  try {
    // Get the currently authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('No authenticated user found')
    }

    debugLog('👤 Authenticated user (auth.users.id):', user.id)

    // Find the profile in the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile not found for authenticated user:', user.id)
      throw new Error(`Profile not found for authenticated user ${user.id}`)
    }

    debugLog(
      '✅ Authenticated user profile:',
      profile.first_name,
      profile.last_name,
      `(ID: ${profile.id})`,
    )
    return profile.id
  } catch (error) {
    console.error('❌ Error getting authenticated user profile:', error)
    throw error
  }
}

// 1. Log operation creation (INSERT)
const logOperationCreation = async (
  supabase: any,
  operationId: string,
  operationData: any,
) => {
  try {
    debugLog('📝 AUDIT: Logging operation creation:', operationId)

    const changedByProfileId = await getAuthenticatedUserProfileId(supabase)

    const auditData = {
      operacao_id: operationId,
      action_type: 'INSERT',
      field_name: 'created',
      operador_novo: operationData.operador_id || null,
      quantidade_nova:
        operationData.num_placas_print ||
        operationData.num_placas_corte ||
        null,
      old_value: null,
      new_value: 'Operation created',
      changed_by: changedByProfileId,
      operation_details: operationData,
      notes: 'Operação criada',
    }

    const { error } = await supabase
      .from('producao_operacoes_audit')
      .insert(auditData)

    if (error) {
      console.error('❌ AUDIT: Failed to log operation creation:', error)
    } else {
      debugLog('✅ AUDIT: Operation creation logged successfully')
    }
  } catch (error) {
    console.error(
      '❌ AUDIT: Unexpected error logging operation creation:',
      error,
    )
  }
}

// 2. Log field updates (UPDATE)
const logFieldUpdate = async (
  supabase: any,
  operationId: string,
  fieldName: string,
  oldValue: any,
  newValue: any,
) => {
  try {
    debugLog(
      `📝 AUDIT: Logging field update - ${fieldName}: "${oldValue}" → "${newValue}"`,
    )

    const changedByProfileId = await getAuthenticatedUserProfileId(supabase)

    const oldValueStr =
      oldValue !== null && oldValue !== undefined ? String(oldValue) : null
    const newValueStr =
      newValue !== null && newValue !== undefined ? String(newValue) : null

    if (oldValueStr === newValueStr) {
      debugLog('📝 AUDIT: No change detected, skipping log')
      return
    }

    const auditData: any = {
      operacao_id: operationId,
      action_type: 'UPDATE',
      field_name: fieldName,
      old_value: oldValueStr,
      new_value: newValueStr,
      changed_by: changedByProfileId,
    }

    if (fieldName === 'operador_id') {
      auditData.operador_antigo = oldValue
      auditData.operador_novo = newValue
    } else if (
      fieldName === 'num_placas_print' ||
      fieldName === 'num_placas_corte'
    ) {
      auditData.quantidade_antiga = oldValue ? Number(oldValue) : null
      auditData.quantidade_nova = newValue ? Number(newValue) : null
    }

    const { error } = await supabase
      .from('producao_operacoes_audit')
      .insert(auditData)

    if (error) {
      console.error('❌ AUDIT: Failed to log field update:', error)
    } else {
      debugLog('✅ AUDIT: Field update logged successfully')
    }
  } catch (error) {
    console.error('❌ AUDIT: Unexpected error logging field update:', error)
  }
}

// 3. Log operation deletion (DELETE)
const logOperationDeletion = async (
  supabase: any,
  operationId: string,
  operationData: any,
) => {
  try {
    debugLog('📝 AUDIT: Logging operation deletion:', operationId)

    const changedByProfileId = await getAuthenticatedUserProfileId(supabase)

    const auditData = {
      operacao_id: operationId,
      action_type: 'DELETE',
      field_name: 'deleted',
      operador_antigo: operationData.operador_id || null,
      quantidade_antiga:
        operationData.num_placas_print ||
        operationData.num_placas_corte ||
        null,
      old_value: `Operation ${operationData.no_interno || operationId} existed`,
      new_value: 'Operation deleted',
      changed_by: changedByProfileId,
      operation_details: operationData,
      notes: 'Operação eliminada',
    }

    const { error } = await supabase
      .from('producao_operacoes_audit')
      .insert(auditData)

    if (error) {
      console.error('❌ AUDIT: Failed to log operation deletion:', error)
    } else {
      debugLog('✅ AUDIT: Operation deletion logged successfully')
    }
  } catch (error) {
    console.error(
      '❌ AUDIT: Unexpected error logging operation deletion:',
      error,
    )
  }
}

function OperacoesPageContent() {
  const supabase = useMemo(() => createBrowserClient(), [])

  // State
  const [items, setItems] = useState<ProductionItem[]>([])
  const [completedItems, setCompletedItems] = useState<ProductionItem[]>([])
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [currentTab, setCurrentTab] = useState<string>('operacoes')
  const [loading, setLoading] = useState(true)
  const [completedLoading, setCompletedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  // NEW: Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // NEW: Audit logs filters
  const [actionFilter, setActionFilter] = useState('all')
  const [fieldFilter, setFieldFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined)

  // Filters
  const [foFilter, setFoFilter] = useState('')
  const [itemFilter, setItemFilter] = useState('')

  // Sorting
  type SortKey =
    | 'numero_fo'
    | 'nome_campanha'
    | 'descricao'
    | 'quantidade'
    | 'prioridade'
  const [sortCol, setSortCol] = useState<SortKey>('numero_fo')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = useCallback(
    (col: SortKey) => {
      if (sortCol === col) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
      } else {
        setSortCol(col)
        setSortDir('asc')
      }
    },
    [sortCol, sortDir],
  )

  // Add the getPColor function for item priority
  const getPColor = (
    item: ProductionItem & { data_in?: string | null },
  ): string => {
    if (item.prioridade) return 'bg-red-500'
    if (item.data_in) {
      const days =
        (Date.now() - new Date(item.data_in).getTime()) / (1000 * 60 * 60 * 24)
      if (days > 3) return 'bg-[var(--blue-light)]'
    }
    return 'bg-green-500'
  }

  // Update item field function
  const updateItem = async (itemId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('items_base')
        .update({ [field]: value })
        .eq('id', itemId)

      if (error) {
        console.error(
          `Error updating item ${itemId} field ${field}:`,
          error?.message || error,
        )
        alert(
          `Erro ao atualizar ${field}: ${error?.message || JSON.stringify(error)}`,
        )
      } else {
        // Update local state
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId ? { ...item, [field]: value } : item,
          ),
        )
      }
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      debugLog('Starting to fetch production items...')

      // First, let's try a simple query to test basic access to items_base
      const { data: testData, error: testError } = await supabase
        .from('items_base')
        .select('id')
        .limit(1)

      if (testError) {
        console.error('Basic items_base access failed:', testError)
        throw new Error(`Database access error: ${testError.message}`)
      }

      debugLog(
        'Basic items_base access successful, found records:',
        testData?.length || 0,
      )

      // If there are no items at all, return empty result
      if (!testData || testData.length === 0) {
        debugLog('No items found in items_base table')
        setItems([])
        return
      }

      // Now try the complex query with better error handling
      const { data: itemsData, error: itemsError } = await supabase.from(
        'items_base',
      ).select(`
          id,
          folha_obra_id,
          descricao,
          codigo,
          quantidade,
          concluido,
          concluido_maq,
          brindes,
          prioridade,
          complexidade,
          created_at,
          folhas_obras (
            numero_fo,
            numero_orc,
            nome_campanha,
            cliente
          ),
          designer_items (
            paginacao,
            path_trabalho
          ),
          logistica_entregas (
            concluido
          )
        `)

      if (itemsError) {
        console.error('Complex query failed:', itemsError)
        throw new Error(
          `Failed to fetch items with relations: ${itemsError.message || JSON.stringify(itemsError)}`,
        )
      }

      debugLog('Items query result:', itemsData)
      debugLog('Number of items retrieved:', itemsData?.length || 0)

      // Check if we got any data
      if (!itemsData) {
        debugLog('Query returned null/undefined data')
        setItems([])
        return
      }

      // Transform the data to match our interface
      const transformedItems = itemsData.map((item) => ({
        ...item,
        folhas_obras: Array.isArray(item.folhas_obras)
          ? item.folhas_obras[0]
          : item.folhas_obras,
        designer_items: Array.isArray(item.designer_items)
          ? item.designer_items[0]
          : item.designer_items,
        logistica_entregas: Array.isArray(item.logistica_entregas)
          ? item.logistica_entregas
          : item.logistica_entregas,
      }))

      debugLog('Transformed items:', transformedItems.length)

      // Filter items that meet all conditions and don't have completed operations:
      const filteredItems = transformedItems.filter((item) => {
        let hasLogisticaEntregasNotConcluida = false

        if (item.logistica_entregas) {
          if (Array.isArray(item.logistica_entregas)) {
            hasLogisticaEntregasNotConcluida = item.logistica_entregas.some(
              (entrega: { concluido?: boolean | null }) =>
                entrega.concluido === false,
            )
          } else {
            hasLogisticaEntregasNotConcluida =
              (item.logistica_entregas as { concluido?: boolean | null })
                .concluido === false
          }
        }

        const hasPaginacaoTrue = item.designer_items?.paginacao === true
        const isNotBrinde = item.brindes !== true
        const isNotOffset = item.complexidade !== 'OFFSET'

        // Require both FO and ORC values (cannot be null, 0, or "0000")
        const hasFoValue =
          item.folhas_obras?.numero_fo &&
          item.folhas_obras?.numero_fo !== 0 &&
          item.folhas_obras?.numero_fo !== '0000'
        const hasOrcValue =
          item.folhas_obras?.numero_orc && item.folhas_obras?.numero_orc !== 0

        const includeItem =
          hasLogisticaEntregasNotConcluida &&
          hasPaginacaoTrue &&
          isNotBrinde &&
          isNotOffset &&
          hasFoValue &&
          hasOrcValue

        return includeItem
      })

      // Now filter out items that have completed production operations (both Corte and Impressao_Flexiveis)
      const itemsWithoutCompleted = []
      for (const item of filteredItems) {
        const { data: operations, error: opError } = await supabase
          .from('producao_operacoes')
          .select('concluido')
          .eq('item_id', item.id)
          .in('Tipo_Op', ['Corte', 'Impressao_Flexiveis'])

        if (!opError && operations) {
          const hasCompletedOperation = operations.some(
            (op: any) => op.concluido === true,
          )
          if (!hasCompletedOperation) {
            itemsWithoutCompleted.push(item)
          }
        } else {
          // If no operations exist, include the item
          itemsWithoutCompleted.push(item)
        }
      }

      debugLog(
        'Items without completed operations:',
        itemsWithoutCompleted.length,
      )
      setItems(itemsWithoutCompleted)
    } catch (error: any) {
      console.error('Error fetching data:', error)
      const errorMessage =
        error?.message || error?.toString() || 'Unknown error occurred'
      setError(`Failed to load production items: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Debug function to help troubleshoot issues
  const runDebugCheck = useCallback(async () => {
    debugLog('Running debug check...')
    const debug: any = {}

    try {
      // Check basic table access and counts
      const tables = [
        'items_base',
        'folhas_obras',
        'designer_items',
        'logistica_entregas',
      ]

      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })

          if (error) {
            debug[table] = { error: error.message, accessible: false }
          } else {
            debug[table] = { count: count || 0, accessible: true }
          }
        } catch (err: any) {
          debug[table] = { error: err.message, accessible: false }
        }
      }

      // Check items with relationships
      try {
        const { data: itemsWithDesigner } = await supabase
          .from('items_base')
          .select(
            `
            id,
            designer_items(paginacao)
          `,
          )
          .limit(10)

        const itemsWithPaginacao =
          itemsWithDesigner?.filter(
            (item: any) =>
              item.designer_items &&
              (Array.isArray(item.designer_items)
                ? item.designer_items.some(
                    (d: { paginacao?: boolean | null }) => d.paginacao === true,
                  )
                : (item.designer_items as { paginacao?: boolean | null })
                    ?.paginacao === true),
          ) || []

        debug.items_with_paginacao = itemsWithPaginacao.length
        debug.sample_items_with_designer = itemsWithDesigner?.slice(0, 3)
      } catch (err: any) {
        debug.relationship_check = { error: err.message }
      }

      // Check authentication
      const {
        data: { user },
      } = await supabase.auth.getUser()
      debug.authenticated = !!user
      debug.user_id = user?.id || 'Not authenticated'

      setDebugInfo(debug)
      setShowDebug(true)
    } catch (err: any) {
      console.error('Debug check failed:', err)
      setDebugInfo({ general_error: err.message })
      setShowDebug(true)
    }
  }, [supabase])

  // Fetch completed items from last 3 months
  const fetchCompletedItems = useCallback(async () => {
    setCompletedLoading(true)
    setError(null)

    try {
      debugLog('Starting to fetch completed production items...')

      // Calculate date 3 months ago
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0]

      // First get items with completed operations from last 3 months (both Corte and Impressao_Flexiveis)
      const { data: completedOperations, error: completedError } =
        await supabase
          .from('producao_operacoes')
          .select('item_id')
          .in('Tipo_Op', ['Corte', 'Impressao_Flexiveis'])
          .eq('concluido', true)
          .gte('data_conclusao', threeMonthsAgoStr)

      if (completedError) {
        console.error('Error fetching completed operations:', completedError)
        throw new Error(
          `Failed to fetch completed operations: ${completedError.message}`,
        )
      }

      if (!completedOperations || completedOperations.length === 0) {
        debugLog('No completed operations found in last 3 months')
        setCompletedItems([])
        return
      }

      const completedItemIds = Array.from(
        new Set(completedOperations.map((op: any) => op.item_id)),
      )

      // Now fetch the full item data for these completed items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items_base')
        .select(
          `
          id,
          folha_obra_id,
          descricao,
          codigo,
          quantidade,
          concluido,
          concluido_maq,
          brindes,
          prioridade,
          complexidade,
          created_at,
          folhas_obras (
            numero_fo,
            nome_campanha,
            cliente
          ),
          designer_items (
            paginacao,
            path_trabalho
          ),
          logistica_entregas (
            concluido
          )
        `,
        )
        .in('id', completedItemIds)

      if (itemsError) {
        console.error('Error fetching completed items data:', itemsError)
        throw new Error(
          `Failed to fetch completed items: ${itemsError.message}`,
        )
      }

      // Transform the data
      const transformedCompletedItems = (itemsData || []).map((item) => ({
        ...item,
        folhas_obras: Array.isArray(item.folhas_obras)
          ? item.folhas_obras[0]
          : item.folhas_obras,
        designer_items: Array.isArray(item.designer_items)
          ? item.designer_items[0]
          : item.designer_items,
        logistica_entregas: Array.isArray(item.logistica_entregas)
          ? item.logistica_entregas
          : item.logistica_entregas,
      }))

      debugLog('Completed items retrieved:', transformedCompletedItems.length)
      setCompletedItems(transformedCompletedItems)
    } catch (error: any) {
      console.error('Error fetching completed items:', error)
      const errorMessage =
        error?.message || error?.toString() || 'Unknown error occurred'
      setError(`Failed to load completed items: ${errorMessage}`)
    } finally {
      setCompletedLoading(false)
    }
  }, [supabase])

  // 1. UPDATE: Enhanced fetchAuditLogs function with UUID resolution
  const fetchAuditLogs = useCallback(async () => {
    setLogsLoading(true)
    setError(null)

    try {
      debugLog('🔍 Fetching audit logs...')

      // Get audit data
      const { data: auditData, error } = await supabase
        .from('producao_operacoes_audit')
        .select(
          `
          id,
          operacao_id,
          action_type,
          field_name,
          operador_antigo,
          operador_novo,
          quantidade_antiga,
          quantidade_nova,
          old_value,
          new_value,
          operation_details,
          notes,
          changed_at,
          changed_by,
          producao_operacoes!operacao_id (
            no_interno,
            folha_obra_id,
            item_id,
            folhas_obras!folha_obra_id (
              numero_fo
            ),
            items_base!item_id (
              descricao
            )
          ),
          profiles!changed_by (
            first_name,
            last_name
          )
        `,
        )
        .order('changed_at', { ascending: false })
        .limit(200)

      if (error) {
        throw new Error(`Failed to fetch audit logs: ${error.message}`)
      }

      debugLog('📋 Raw audit data:', auditData)

      // Get all unique operator IDs that need names
      const operatorIds = new Set<string>()

      auditData?.forEach((log: any) => {
        if (log.operador_antigo) operatorIds.add(log.operador_antigo)
        if (log.operador_novo) operatorIds.add(log.operador_novo)

        // Check if old_value/new_value are UUIDs (36 characters)
        if (log.field_name === 'operador_id') {
          if (log.old_value && log.old_value.length === 36)
            operatorIds.add(log.old_value)
          if (log.new_value && log.new_value.length === 36)
            operatorIds.add(log.new_value)
        }
      })

      debugLog('👥 Operator IDs to resolve:', Array.from(operatorIds))

      // Get operator names
      let operatorNames = new Map<string, string>()
      if (operatorIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', Array.from(operatorIds))

        debugLog('📋 Profile data:', profiles)

        if (!profilesError && profiles) {
          profiles.forEach((profile: any) => {
            operatorNames.set(
              profile.id,
              `${profile.first_name} ${profile.last_name}`,
            )
          })
        }
      }

      debugLog('🗺️ Operator names map:', Object.fromEntries(operatorNames))

      // Enhance the logs
      const enhancedLogs =
        auditData?.map((log: any) => {
          const enhanced = { ...log }

          // Add resolved names for dedicated operator columns
          if (log.operador_antigo) {
            enhanced.operador_antigo_nome =
              operatorNames.get(log.operador_antigo) ||
              `Unknown (${log.operador_antigo.substring(0, 8)}...)`
          }
          if (log.operador_novo) {
            enhanced.operador_novo_nome =
              operatorNames.get(log.operador_novo) ||
              `Unknown (${log.operador_novo.substring(0, 8)}...)`
          }

          // Handle old_value and new_value display
          if (log.field_name === 'operador_id') {
            // For operator changes, resolve UUIDs to names
            enhanced.old_value_display =
              log.old_value && log.old_value.length === 36
                ? operatorNames.get(log.old_value) ||
                  `Unknown (${log.old_value.substring(0, 8)}...)`
                : log.old_value || '-'

            enhanced.new_value_display =
              log.new_value && log.new_value.length === 36
                ? operatorNames.get(log.new_value) ||
                  `Unknown (${log.new_value.substring(0, 8)}...)`
                : log.new_value || '-'
          } else {
            // For other fields, show raw values
            enhanced.old_value_display = log.old_value || '-'
            enhanced.new_value_display = log.new_value || '-'
          }

          return enhanced
        }) || []

      debugLog('✅ Enhanced logs:', enhancedLogs)
      setAuditLogs(enhancedLogs)
    } catch (error: any) {
      console.error('❌ Error fetching audit logs:', error)
      setError(`Failed to load audit logs: ${error.message}`)
    } finally {
      setLogsLoading(false)
    }
  }, [supabase])

  // NEW: Export audit logs to CSV (simplified approach)
  const exportAuditLogsToExcel = useCallback(() => {
    if (auditLogs.length === 0) {
      alert('Nenhum log disponível para exportar')
      return
    }

    const dataToExport = auditLogs.map((log: any) => ({
      Ação:
        log.action_type === 'INSERT'
          ? 'CRIADO'
          : log.action_type === 'UPDATE'
            ? 'ALTERADO'
            : 'ELIMINADO',
      Operação: log.producao_operacoes?.no_interno || 'N/A',
      FO: log.producao_operacoes?.folhas_obras?.numero_fo || '-',
      Item: log.producao_operacoes?.items_base?.descricao || '-',
      Campo: (() => {
        const fieldNameMap: { [key: string]: string } = {
          operador_id: 'Operador',
          num_placas_print: 'Placas Impressão',
          num_placas_corte: 'Placas Corte',
          material_id: 'Material',
          maquina: 'Máquina',
          data_operacao: 'Data',
          notas: 'Notas',
          notas_imp: 'Notas Impressão',
          N_Pal: 'Palete',
          QT_print: 'QT Print',
          concluido: 'Concluído',
        }
        return fieldNameMap[log.field_name] || log.field_name || '-'
      })(),
      'Operador Antigo': log.operador_antigo_nome || '-',
      'Operador Novo': log.operador_novo_nome || '-',
      'Quantidade Antiga': log.quantidade_antiga || '-',
      'Quantidade Nova': log.quantidade_nova || '-',
      'Valor Antigo': log.old_value || '-',
      'Valor Novo': log.new_value || '-',
      'Alterado Por': log.profiles
        ? `${log.profiles.first_name} ${log.profiles.last_name}`
        : 'Sistema',
      'Data/Hora': log.changed_at
        ? format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm:ss', {
            locale: pt,
          })
        : '-',
    }))

    // Create CSV content
    const headers = Object.keys(dataToExport[0]).join(',')
    const csvContent = [
      headers,
      ...dataToExport.map((row) =>
        Object.values(row)
          .map((value) => `"${value}"`)
          .join(','),
      ),
    ].join('\n')

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `audit_logs_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`,
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [auditLogs])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = items.length
    const completed = completedItems.length
    const pending = total
    const logs = auditLogs.length

    return { total, completed, pending, logs }
  }, [items, completedItems, auditLogs])

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const foMatch =
        !foFilter ||
        item.folhas_obras?.numero_fo
          ?.toLowerCase()
          .includes(foFilter.toLowerCase())
      const itemMatch =
        !itemFilter ||
        item.descricao?.toLowerCase().includes(itemFilter.toLowerCase())

      return foMatch && itemMatch
    })
  }, [items, foFilter, itemFilter])

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortCol) {
        case 'numero_fo':
          aVal = a.folhas_obras?.numero_fo || ''
          bVal = b.folhas_obras?.numero_fo || ''
          break
        case 'nome_campanha':
          aVal = a.folhas_obras?.nome_campanha || ''
          bVal = b.folhas_obras?.nome_campanha || ''
          break
        case 'descricao':
          aVal = a.descricao || ''
          bVal = b.descricao || ''
          break
        case 'quantidade':
          aVal = a.quantidade || 0
          bVal = b.quantidade || 0
          break
        case 'prioridade': {
          const weight = (it: ProductionItem & { data_in?: string | null }) => {
            if (it.prioridade) return 2 // red: highest
            if (it.data_in) {
              const days =
                (Date.now() - new Date(it.data_in).getTime()) /
                (1000 * 60 * 60 * 24)
              if (days > 3) return 1 // blue: middle
            }
            return 0 // green: lowest
          }
          aVal = weight(a as any)
          bVal = weight(b as any)
          break
        }
        default:
          aVal = a.id
          bVal = b.id
      }

      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      } else {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
    })

    return sorted
  }, [filteredItems, sortCol, sortDir])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full space-y-6">
        <h1 className="text-2xl font-bold">Operações de Produção</h1>
        <div className="rounded-none border-2 border-red-200 bg-red-50 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-red-800">
                  Erro ao carregar dados
                </h3>
                <p className="mt-1 text-red-700">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RotateCw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
            </div>
            <div className="space-y-2 text-sm text-red-600">
              <p>
                <strong>Possíveis causas:</strong>
              </p>
              <ul className="ml-4 list-inside list-disc space-y-1">
                <li>Problemas de conectividade com a base de dados</li>
                <li>Permissões de acesso insuficientes</li>
                <li>Estrutura da base de dados não inicializada</li>
              </ul>
              <p>
                <strong>Verifique:</strong>
              </p>
              <ul className="ml-4 list-inside list-disc space-y-1">
                <li>Se está autenticado no sistema</li>
                <li>Se a base de dados contém os dados necessários</li>
                <li>A consola do navegador para mais detalhes técnicos</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={runDebugCheck}>
                <Settings className="mr-2 h-4 w-4" />
                Diagnóstico
              </Button>
            </div>
            {showDebug && debugInfo && (
              <div className="mt-4 rounded-none border border-gray-300 bg-gray-100 p-4">
                <h4 className="mb-2 font-semibold text-gray-800">
                  Informação de Diagnóstico:
                </h4>
                <pre className="max-h-60 overflow-auto text-xs text-gray-700">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebug(false)}
                  className="mt-2"
                >
                  Fechar Diagnóstico
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show empty state when no items but no error
  if (!loading && items.length === 0 && !error) {
    return (
      <div className="w-full space-y-6">
        <h1 className="text-2xl font-bold">Operações de Produção</h1>

        {/* Statistics */}
        <div className="flex gap-4 text-sm">
          <span>Total: 0</span>
          <span>Concluído: 0</span>
          <span>Pendente: 0</span>
        </div>

        <div className="rounded-none border-2 border-gray-200 bg-gray-50 p-6">
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <AlertCircle className="h-12 w-12 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Nenhum item pronto para produção
              </h3>
              <p className="mt-2 text-gray-600">
                Não foram encontrados itens que atendam aos critérios
                necessários para operações de produção.
              </p>
            </div>
            <div className="space-y-2 text-sm text-gray-500">
              <p>
                <strong>Para um item aparecer aqui, deve ter:</strong>
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  <strong>FO e ORC preenchidos</strong> (numero_fo e numero_orc
                  válidos, não nulos, não zero, não &quot;0000&quot;)
                </li>
                <li>
                  <strong>Paginação concluída</strong> (designer_items.paginacao
                  = true)
                </li>
                <li>
                  <strong>Entregas não concluídas</strong>{' '}
                  (logistica_entregas.concluido = false)
                </li>
                <li>
                  <strong>Não ser brinde</strong> (brindes ≠ true)
                </li>
                <li>
                  <strong>Complexidade não ser OFFSET</strong> (complexidade ≠
                  &apos;OFFSET&apos;)
                </li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchData}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar Lista
              </Button>
              <Button variant="outline" onClick={runDebugCheck}>
                <Settings className="mr-2 h-4 w-4" />
                Diagnóstico
              </Button>
            </div>
          </div>
        </div>
        {showDebug && debugInfo && (
          <div className="mt-4 rounded-none border border-gray-300 bg-gray-100 p-4">
            <h4 className="mb-2 font-semibold text-gray-800">
              Informação de Diagnóstico:
            </h4>
            <pre className="max-h-60 overflow-auto text-xs text-gray-700">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebug(false)}
              className="mt-2"
            >
              Fechar Diagnóstico
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-bold">Operações de Produção</h1>

      {/* Statistics */}
      <div className="flex gap-4 text-sm">
        <span>Total: {stats.total}</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrar FO"
          className="w-40"
          value={foFilter}
          onChange={(e) => setFoFilter(e.target.value)}
        />
        <Input
          placeholder="Filtrar Item"
          className="flex-1"
          value={itemFilter}
          onChange={(e) => setItemFilter(e.target.value)}
        />
        <Button
          size="icon"
          variant="outline"
          onClick={() => {
            setFoFilter('')
            setItemFilter('')
          }}
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={fetchData}
          title="Refresh data"
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs
        defaultValue="operacoes"
        className="w-full"
        onValueChange={async (value) => {
          setCurrentTab(value)
          if (value === 'concluidas' && completedItems.length === 0) {
            // Fetch completed data when switching to completed tab for the first time
            await fetchCompletedItems()
          }
          if (value === 'logs' && auditLogs.length === 0) {
            // Fetch audit logs when switching to logs tab for the first time
            await fetchAuditLogs()
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operacoes">Operações ({stats.total})</TabsTrigger>
          <TabsTrigger value="concluidas">
            Operações Concluídas ({stats.completed})
          </TabsTrigger>
          <TabsTrigger value="analytics">Análises & Gráficos</TabsTrigger>
          <TabsTrigger value="logs">Logs ({stats.logs})</TabsTrigger>
        </TabsList>

        <TabsContent value="operacoes">
          {/* Main table */}
          <div className="bg-background border-border w-full rounded-none border-2">
            <div className="w-full rounded-none">
              <Table className="w-full border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      onClick={() => toggleSort('numero_fo')}
                      className="border-border sticky top-0 z-10 w-[120px] cursor-pointer border-b-2 bg-[var(--orange)] text-black uppercase select-none"
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
                      onClick={() => toggleSort('nome_campanha')}
                      className="border-border sticky top-0 z-10 cursor-pointer border-b-2 bg-[var(--orange)] text-black uppercase select-none"
                    >
                      Campanha{' '}
                      {sortCol === 'nome_campanha' &&
                        (sortDir === 'asc' ? (
                          <ArrowUp className="ml-1 inline h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 inline h-3 w-3" />
                        ))}
                    </TableHead>
                    <TableHead
                      onClick={() => toggleSort('descricao')}
                      className="border-border sticky top-0 z-10 cursor-pointer border-b-2 bg-[var(--orange)] text-black uppercase select-none"
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
                      onClick={() => toggleSort('quantidade')}
                      className="border-border sticky top-0 z-10 w-[100px] cursor-pointer border-b-2 bg-[var(--orange)] text-right text-black uppercase select-none"
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
                      onClick={() => toggleSort('prioridade')}
                      className="border-border sticky top-0 z-10 w-[36px] min-w-[36px] cursor-pointer border-b-2 bg-[var(--orange)] text-black uppercase select-none"
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
                    <TableHead className="border-border w-[100px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-[var(--main)]">
                      <TableCell className="w-[120px]">
                        {item.folhas_obras?.numero_fo}
                      </TableCell>
                      <TableCell>{item.folhas_obras?.nome_campanha}</TableCell>
                      <TableCell>{item.descricao}</TableCell>
                      <TableCell className="w-[100px] text-right">
                        {item.quantidade}
                      </TableCell>
                      <TableCell className="w-[36px] min-w-[36px] text-center">
                        <div
                          className={`mx-auto flex h-3 w-3 items-center justify-center rounded-full ${getPColor(item)}`}
                          title={
                            item.prioridade
                              ? 'Prioritário'
                              : (item as { data_in?: string | null }).data_in &&
                                  (Date.now() -
                                    new Date(
                                      (
                                        item as { data_in?: string | null }
                                      ).data_in!,
                                    ).getTime()) /
                                    (1000 * 60 * 60 * 24) >
                                    3
                                ? 'Aguardando há mais de 3 dias'
                                : 'Normal'
                          }
                        />
                      </TableCell>
                      <TableCell className="w-[100px]">
                        <Button
                          size="icon"
                          variant="default"
                          onClick={() => setOpenItemId(item.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center">
                        Nenhum item encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="concluidas">
          {/* Completed operations table */}
          <div className="bg-background border-border w-full rounded-none border-2">
            <div className="w-full rounded-none">
              {completedLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">
                    Carregando operações concluídas...
                  </span>
                </div>
              ) : (
                <Table className="w-full border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="border-border sticky top-0 z-10 w-[120px] border-b-2 bg-[var(--orange)] text-black uppercase">
                        FO
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 border-b-2 bg-[var(--orange)] text-black uppercase">
                        Campanha
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 border-b-2 bg-[var(--orange)] text-black uppercase">
                        Item
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[100px] border-b-2 bg-[var(--orange)] text-right text-black uppercase">
                        Quantidade
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[36px] min-w-[36px] border-b-2 bg-[var(--orange)] text-black uppercase">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>P</span>
                            </TooltipTrigger>
                            <TooltipContent>Prioridade</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                      <TableHead className="border-border w-[100px] border-b-2 bg-[var(--orange)] p-2 text-center text-sm text-black uppercase">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedItems.map((item) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-[var(--main)]"
                      >
                        <TableCell className="w-[120px]">
                          {item.folhas_obras?.numero_fo}
                        </TableCell>
                        <TableCell>
                          {item.folhas_obras?.nome_campanha}
                        </TableCell>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell className="w-[100px] text-right">
                          {item.quantidade}
                        </TableCell>
                        <TableCell className="w-[36px] min-w-[36px] text-center">
                          <div
                            className={`mx-auto flex h-3 w-3 items-center justify-center rounded-full ${getPColor(item)}`}
                            title={
                              item.prioridade
                                ? 'Prioritário'
                                : (item as { data_in?: string | null })
                                      .data_in &&
                                    (Date.now() -
                                      new Date(
                                        (
                                          item as { data_in?: string | null }
                                        ).data_in!,
                                      ).getTime()) /
                                      (1000 * 60 * 60 * 24) >
                                      3
                                  ? 'Aguardando há mais de 3 dias'
                                  : 'Normal'
                            }
                          />
                        </TableCell>
                        <TableCell className="w-[100px] text-center">
                          <Button
                            size="icon"
                            variant="default"
                            onClick={() => setOpenItemId(item.id)}
                            className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {completedItems.length === 0 && !completedLoading && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center">
                          Nenhuma operação concluída encontrada nos últimos 3
                          meses.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mb-8">
          <ProductionAnalyticsCharts
            supabase={supabase}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="logs">
          {/* Audit logs controls */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Logs de Auditoria</h3>
            <Button
              size="icon"
              variant="outline"
              onClick={fetchAuditLogs}
              title="Atualizar logs"
              disabled={logsLoading}
              className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
            >
              {logsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Enhanced audit logs table */}
          <div className="bg-background border-border w-full rounded-none border-2">
            <div className="w-full rounded-none">
              {logsLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Carregando logs...</span>
                </div>
              ) : (
                <Table className="w-full border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="border-border sticky top-0 z-10 w-[120px] border-b-2 bg-[var(--orange)] text-black uppercase">
                        Ação
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[150px] border-b-2 bg-[var(--orange)] text-black uppercase">
                        Operação
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[120px] border-b-2 bg-[var(--orange)] text-black uppercase">
                        Campo
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[150px] border-b-2 bg-[var(--orange)] text-black uppercase">
                        Operador Antigo
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[150px] border-b-2 bg-[var(--orange)] text-black uppercase">
                        Operador Novo
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[100px] border-b-2 bg-[var(--orange)] text-black uppercase">
                        Qtd Antiga
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[100px] border-b-2 bg-[var(--orange)] text-black uppercase">
                        Qtd Nova
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[120px] border-b-2 bg-[var(--orange)] text-black uppercase">
                        Valor Antigo
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[120px] border-b-2 bg-[var(--orange)] text-black uppercase">
                        Valor Novo
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[120px] border-b-2 bg-[var(--orange)] text-black uppercase">
                        Alterado Por
                      </TableHead>
                      <TableHead className="border-border sticky top-0 z-10 w-[160px] border-b-2 bg-[var(--orange)] text-black uppercase">
                        Data/Hora
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log: any) => (
                      <TableRow key={log.id} className="hover:bg-[var(--main)]">
                        {/* Action Type */}
                        <TableCell className="w-[120px]">
                          <Badge
                            variant={
                              log.action_type === 'INSERT'
                                ? 'default'
                                : log.action_type === 'DELETE'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className="rounded-none text-xs uppercase"
                          >
                            {log.action_type === 'INSERT' && '➕ CRIADO'}
                            {log.action_type === 'UPDATE' && '✏️ ALTERADO'}
                            {log.action_type === 'DELETE' && '🗑️ ELIMINADO'}
                          </Badge>
                        </TableCell>

                        {/* Operation Info */}
                        <TableCell className="w-[150px] font-mono text-sm">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate">
                                  {log.producao_operacoes?.no_interno || 'N/A'}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <div>ID: {log.operacao_id}</div>
                                  {log.producao_operacoes?.folhas_obras
                                    ?.numero_fo && (
                                    <div>
                                      FO:{' '}
                                      {
                                        log.producao_operacoes.folhas_obras
                                          .numero_fo
                                      }
                                    </div>
                                  )}
                                  {log.producao_operacoes?.items_base
                                    ?.descricao && (
                                    <div>
                                      Item:{' '}
                                      {
                                        log.producao_operacoes.items_base
                                          .descricao
                                      }
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>

                        {/* Field Name */}
                        <TableCell className="w-[120px]">
                          {log.field_name ? (
                            (() => {
                              const fieldNameMap: { [key: string]: string } = {
                                operador_id: 'Operador',
                                num_placas_print: 'Placas Impressão',
                                num_placas_corte: 'Placas Corte',
                                material_id: 'Material',
                                maquina: 'Máquina',
                                data_operacao: 'Data',
                                notas: 'Notas',
                                notas_imp: 'Notas Impressão',
                                N_Pal: 'Palete',
                                QT_print: 'QT Print',
                                concluido: 'Concluído',
                              }
                              return (
                                fieldNameMap[log.field_name] || log.field_name
                              )
                            })()
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Operador Antigo */}
                        <TableCell className="w-[150px]">
                          {log.operador_antigo_nome ? (
                            <span
                              className="block truncate"
                              title={log.operador_antigo_nome}
                            >
                              {log.operador_antigo_nome}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Operador Novo */}
                        <TableCell className="w-[150px]">
                          {log.operador_novo_nome ? (
                            <span
                              className="block truncate"
                              title={log.operador_novo_nome}
                            >
                              {log.operador_novo_nome}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Quantidade Antiga */}
                        <TableCell className="w-[100px] text-right font-mono">
                          {log.quantidade_antiga !== null &&
                          log.quantidade_antiga !== undefined ? (
                            <span className="font-bold">
                              {log.quantidade_antiga}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Quantidade Nova */}
                        <TableCell className="w-[100px] text-right font-mono">
                          {log.quantidade_nova !== null &&
                          log.quantidade_nova !== undefined ? (
                            <span className="font-bold text-green-600">
                              {log.quantidade_nova}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Valor Antigo */}
                        <TableCell className="w-[120px]">
                          {log.old_value_display ? (
                            <span
                              className="block truncate"
                              title={log.old_value_display}
                            >
                              {log.old_value_display}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Valor Novo */}
                        <TableCell className="w-[120px]">
                          {log.new_value_display ? (
                            <span
                              className="block truncate font-medium text-green-600"
                              title={log.new_value_display}
                            >
                              {log.new_value_display}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Alterado Por */}
                        <TableCell className="w-[120px]">
                          {log.profiles
                            ? `${log.profiles.first_name} ${log.profiles.last_name}`
                            : log.changed_by
                              ? `Utilizador ${log.changed_by.substring(0, 8)}...`
                              : 'Sistema'}
                        </TableCell>

                        {/* Data/Hora */}
                        <TableCell className="w-[160px] font-mono text-sm">
                          {log.changed_at
                            ? format(
                                new Date(log.changed_at),
                                'dd/MM/yyyy HH:mm:ss',
                                {
                                  locale: pt,
                                },
                              )
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {auditLogs.length === 0 && !logsLoading && (
                      <TableRow>
                        <TableCell colSpan={11} className="py-8 text-center">
                          Nenhum log de auditoria encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card className="rounded-none border-2 p-4">
              <h4 className="text-muted-foreground text-sm font-medium">
                Total de Alterações
              </h4>
              <p className="text-2xl font-bold">{auditLogs.length}</p>
            </Card>
            <Card className="rounded-none border-2 p-4">
              <h4 className="text-muted-foreground text-sm font-medium">
                Operações Criadas
              </h4>
              <p className="text-2xl font-bold text-green-600">
                {
                  auditLogs.filter((log: any) => log.action_type === 'INSERT')
                    .length
                }
              </p>
            </Card>
            <Card className="rounded-none border-2 p-4">
              <h4 className="text-muted-foreground text-sm font-medium">
                Campos Alterados
              </h4>
              <p className="text-2xl font-bold text-blue-600">
                {
                  auditLogs.filter((log: any) => log.action_type === 'UPDATE')
                    .length
                }
              </p>
            </Card>
            <Card className="rounded-none border-2 p-4">
              <h4 className="text-muted-foreground text-sm font-medium">
                Operações Eliminadas
              </h4>
              <p className="text-2xl font-bold text-red-600">
                {
                  auditLogs.filter((log: any) => log.action_type === 'DELETE')
                    .length
                }
              </p>
            </Card>
          </div>

          {/* Export Option */}
          <div className="mt-4 flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={exportAuditLogsToExcel}
                    disabled={auditLogs.length === 0}
                    className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar para CSV</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </TabsContent>
      </Tabs>

      {/* Drawer */}
      <Drawer
        open={!!openItemId}
        onOpenChange={(open) => !open && setOpenItemId(null)}
        shouldScaleBackground={false}
      >
        <DrawerContent className="!top-0 h-[98vh] max-h-[98vh] min-h-[98vh] !transform-none overflow-y-auto !filter-none !backdrop-filter-none will-change-auto">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Operações de Produção</DrawerTitle>
            <DrawerDescription>
              Gestão de operações de impressão e corte
            </DrawerDescription>
          </DrawerHeader>
          {openItemId &&
            (() => {
              // Dynamically determine which array contains the item
              const findItemInArrays = () => {
                // First check if item exists in the current tab's expected array
                if (currentTab === 'concluidas') {
                  const foundInCompleted = completedItems.find(
                    (item) => item.id === openItemId,
                  )
                  if (foundInCompleted) return completedItems
                  // If not found in completed, check main items (in case it just moved)
                  return items
                } else {
                  const foundInMain = items.find(
                    (item) => item.id === openItemId,
                  )
                  if (foundInMain) return items
                  // If not found in main, check completed items (in case it just moved)
                  return completedItems
                }
              }

              return (
                <ItemDrawerContent
                  itemId={openItemId}
                  items={findItemInArrays()}
                  onClose={() => setOpenItemId(null)}
                  supabase={supabase}
                  onMainRefresh={async () => {
                    await fetchData()
                    if (completedItems.length > 0) {
                      await fetchCompletedItems()
                    }
                  }}
                />
              )
            })()}
        </DrawerContent>
      </Drawer>
    </div>
  )
}

// Drawer content component
interface ItemDrawerProps {
  itemId: string
  items: ProductionItem[]
  onClose: () => void
  supabase: any
  onMainRefresh: () => Promise<void>
}

function ItemDrawerContent({
  itemId,
  items,
  onClose,
  supabase,
  onMainRefresh,
}: ItemDrawerProps) {
  const item = items.find((i) => i.id === itemId)
  const [operations, setOperations] = useState<ProductionOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [operators, setOperators] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])

  // State to track totals from each table component
  const [totalQuantidadeImpressao, setTotalQuantidadeImpressao] = useState(0)
  const [
    totalQuantidadeImpressaoFlexiveis,
    setTotalQuantidadeImpressaoFlexiveis,
  ] = useState(0)
  const [totalQuantidadeCorte, setTotalQuantidadeCorte] = useState(0)

  // State for completed checkbox
  const [isItemCompleted, setIsItemCompleted] = useState(false)
  const [isItemCompletedFlexiveis, setIsItemCompletedFlexiveis] =
    useState(false)
  const [hasTemCorteFlexiveis, setHasTemCorteFlexiveis] = useState(false)

  // Fetch operations and reference data
  const fetchOperations = useCallback(async () => {
    if (!item) return

    setLoading(true)
    try {
      const { data: operationsData, error } = await supabase
        .from('producao_operacoes')
        .select(
          `
           id, data_operacao, operador_id, folha_obra_id, item_id, no_interno,
           Tipo_Op, maquina, material_id, stock_consumido_id, num_placas_print, num_placas_corte, QT_print,
           observacoes, notas, notas_imp, status, concluido, data_conclusao, created_at, updated_at, N_Pal,
           profiles!operador_id (
             first_name, 
             last_name,
             roles!profiles_role_id_fkey (
               name
             )
           ),
           materiais (material, cor)
         `,
        )
        .eq('item_id', item.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching operations:', error)
      } else {
        setOperations(operationsData || [])
      }
    } catch (error) {
      console.error('Error fetching operations:', error)
    } finally {
      setLoading(false)
    }
  }, [item, supabase])

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const [operatorsRes, machinesRes, materialsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            `
            id, 
            first_name, 
            last_name,
            roles!profiles_role_id_fkey (
              name
            )
          `,
          )
          .in('role_id', [
            '968afe0b-0b14-46b2-9269-4fc9f120bbfa',
            '2e18fb9d-52ef-4216-90ea-699372cd5a87',
          ]),
        supabase.from('maquinas_operacao').select('id, nome_maquina, tipo'),
        supabase
          .from('materiais')
          .select('id, material, cor, tipo, carateristica, referencia'),
      ])

      if (!operatorsRes.error) setOperators(operatorsRes.data || [])
      if (!machinesRes.error) setMachines(machinesRes.data || [])
      if (!materialsRes.error) {
        setMaterials(materialsRes.data || [])
      }
    } catch (error) {
      console.error('Error fetching reference data:', error)
    }
  }, [supabase])

  // Fetch item completion status
  const fetchItemCompletion = useCallback(async () => {
    if (!item) return

    try {
      // Check if any operations for this item are completed
      const { data: operations, error } = await supabase
        .from('producao_operacoes')
        .select('concluido')
        .eq('item_id', item.id)
        .eq('Tipo_Op', 'Corte')

      if (!error && operations) {
        const hasCompleted = operations.some((op: any) => op.concluido === true)
        setIsItemCompleted(hasCompleted)
      }

      // Check if any Impressão Flexíveis operations for this item are completed
      const { data: operationsFlexiveis, error: errorFlexiveis } =
        await supabase
          .from('producao_operacoes')
          .select('concluido, tem_corte')
          .eq('item_id', item.id)
          .eq('Tipo_Op', 'Impressao_Flexiveis')

      debugLog('🔍 Fetching Impressao_Flexiveis operations for item:', item.id)
      debugLog('🔍 Impressao_Flexiveis operations found:', operationsFlexiveis)

      if (!errorFlexiveis && operationsFlexiveis) {
        const hasCompletedFlexiveis = operationsFlexiveis.some(
          (op: any) => op.concluido === true,
        )
        setIsItemCompletedFlexiveis(hasCompletedFlexiveis)
        debugLog(
          '✅ Impressao_Flexiveis completed status:',
          hasCompletedFlexiveis,
        )

        const hasTemCorte = operationsFlexiveis.some(
          (op: any) => op.tem_corte === true,
        )
        setHasTemCorteFlexiveis(hasTemCorte)
        debugLog('✅ Impressao_Flexiveis tem_corte status:', hasTemCorte)
      } else if (errorFlexiveis) {
        console.error(
          '❌ Error fetching Impressao_Flexiveis operations:',
          errorFlexiveis,
        )
      }
    } catch (error) {
      console.error('Error fetching item completion status:', error)
    }
  }, [item, supabase])

  // Combined function to refresh both operations and completion status
  const fetchOperationsAndCompletion = useCallback(async () => {
    await fetchOperations()
    await fetchItemCompletion()
  }, [fetchOperations, fetchItemCompletion])

  useEffect(() => {
    fetchReferenceData()
    fetchOperations()
    fetchItemCompletion()
  }, [fetchReferenceData, fetchOperations, fetchItemCompletion])

  if (!item) return null

  // All tabs show the same operations - they are independent entries
  const impressaoOperations = operations.filter(
    (op) => op.Tipo_Op === 'Impressao',
  )
  const impressaoFlexiveisOperations = operations.filter(
    (op) => op.Tipo_Op === 'Impressao_Flexiveis',
  )
  const corteOperations = operations.filter((op) => op.Tipo_Op === 'Corte')

  return (
    <div className="relative space-y-6 p-6">
      {/* Close button and Quantity in top right */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs font-bold uppercase">Quantidade</div>
          <div className="font-mono text-lg">{item.quantidade}</div>
        </div>
        <Button size="icon" variant="outline" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Item info */}
      <div className="mb-6 p-4 uppercase">
        <div className="mb-2 flex items-center gap-8">
          <div>
            <div className="text-xs font-bold">FO</div>
            <div className="font-mono">{item.folhas_obras?.numero_fo}</div>
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold">Item</div>
            <div className="truncate font-mono">{item.descricao}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="impressao" className="w-full">
        <TabsList>
          <TabsTrigger value="impressao">
            Impressão ({totalQuantidadeImpressao})
          </TabsTrigger>
          <TabsTrigger value="impressao_flexiveis">
            Impressão Flexíveis ({totalQuantidadeImpressaoFlexiveis})
          </TabsTrigger>
          <TabsTrigger value="corte">
            Corte ({totalQuantidadeCorte})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="impressao">
          <OperationsTable
            operations={impressaoOperations}
            type="impressao"
            itemId={item.id}
            item={item}
            operators={operators}
            machines={machines}
            materials={materials}
            supabase={supabase}
            onRefresh={fetchOperationsAndCompletion}
            onTotalChange={setTotalQuantidadeImpressao}
            onMainRefresh={onMainRefresh}
            onClose={onClose}
          />
        </TabsContent>

        <TabsContent value="impressao_flexiveis">
          <OperationsTable
            operations={impressaoFlexiveisOperations}
            type="impressao_flexiveis"
            itemId={item.id}
            item={item}
            operators={operators}
            machines={machines}
            materials={materials}
            supabase={supabase}
            onRefresh={fetchOperationsAndCompletion}
            onTotalChange={setTotalQuantidadeImpressaoFlexiveis}
            isItemCompleted={isItemCompletedFlexiveis}
            onCompletionChange={(completed) => {
              setIsItemCompletedFlexiveis(completed)
            }}
            hasTemCorte={hasTemCorteFlexiveis}
            onTemCorteChange={(hasTemCorte) => {
              setHasTemCorteFlexiveis(hasTemCorte)
            }}
            onMainRefresh={onMainRefresh}
            onClose={onClose}
          />
        </TabsContent>

        <TabsContent value="corte">
          <OperationsTable
            operations={corteOperations}
            type="corte"
            itemId={item.id}
            item={item}
            operators={operators}
            machines={machines}
            materials={materials}
            supabase={supabase}
            onRefresh={fetchOperationsAndCompletion}
            onTotalChange={setTotalQuantidadeCorte}
            isItemCompleted={isItemCompleted}
            onCompletionChange={(completed) => {
              setIsItemCompleted(completed)
            }}
            onMainRefresh={onMainRefresh}
            onClose={onClose}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Operations table component
interface OperationsTableProps {
  operations: ProductionOperation[]
  type: 'impressao' | 'impressao_flexiveis' | 'corte'
  itemId: string
  item: ProductionItem
  operators: any[]
  machines: any[]
  materials: any[]
  supabase: any
  onRefresh: () => void
  onTotalChange?: (total: number) => void
  isItemCompleted?: boolean
  onCompletionChange?: (completed: boolean) => void
  hasTemCorte?: boolean
  onTemCorteChange?: (hasTemCorte: boolean) => void
  onMainRefresh?: () => Promise<void>
  onClose: () => void
}

function OperationsTable({
  operations,
  type,
  itemId,
  item,
  operators,
  machines,
  materials,
  supabase,
  onRefresh,
  onTotalChange,
  isItemCompleted,
  onCompletionChange,
  hasTemCorte,
  onTemCorteChange,
  onMainRefresh,
  onClose,
}: OperationsTableProps) {
  const quantityField =
    type === 'impressao' || type === 'impressao_flexiveis'
      ? 'num_placas_print'
      : 'num_placas_corte'
  const machineField = 'maquina' // All operation types use the same maquina field
  const notesField =
    type === 'impressao' || type === 'impressao_flexiveis'
      ? 'notas_imp'
      : 'notas' // Different notes fields

  // Local state to track material selections for each operation
  const [materialSelections, setMaterialSelections] = useState<{
    [operationId: string]: {
      material?: string
      caracteristica?: string
      cor?: string
    }
  }>({})

  // Local state to track quantity values for immediate feedback
  const [quantityValues, setQuantityValues] = useState<{
    [operationId: string]: number
  }>({})

  // Local state to track QT_print values for immediate feedback
  const [qtPrintValues, setQtPrintValues] = useState<{
    [operationId: string]: number
  }>({})

  // Loading state to prevent rapid updates
  const [isUpdating, setIsUpdating] = useState(false)

  // Debounce timer refs for quantity updates
  const quantityUpdateTimers = useRef<{
    [operationId: string]: NodeJS.Timeout
  }>({})
  const qtPrintUpdateTimers = useRef<{ [operationId: string]: NodeJS.Timeout }>(
    {},
  )

  // NEW: Pending operations state for unsaved records
  const [pendingOperations, setPendingOperations] = useState<{
    [tempId: string]: Partial<ProductionOperation & { isPending: boolean }>
  }>({})

  // Track active updates to prevent duplicate calls
  const activeUpdatesRef = useRef<Set<string>>(new Set())

  // NEW: State for paletes data (only for Impressão tab)
  const [paletes, setPaletes] = useState<Palete[]>([])
  const [paletesLoading, setPaletesLoading] = useState(true)

  // NEW: State to track palette selections for each operation
  const [paletteSelections, setPaletteSelections] = useState<{
    [operationId: string]: string
  }>({})

  // Helper function to determine if material dropdowns should be disabled
  const isMaterialFromPalette = (operationId: string): boolean => {
    const selectedPaletteId = paletteSelections[operationId]
    if (!selectedPaletteId) return false

    const selectedPalette = paletes.find((p) => p.id === selectedPaletteId)
    return !!selectedPalette?.ref_cartao // If palette has ref_cartao, it defines the material
  }

  // Combine pending and saved operations for display
  const displayOperations = useMemo(() => {
    const getOperationType = () => {
      if (type === 'impressao') return 'Impressao'
      if (type === 'impressao_flexiveis') return 'Impressao_Flexiveis'
      return 'Corte'
    }

    const operationType = getOperationType()
    const saved = operations.filter((op) => op.Tipo_Op === operationType)
    const pending = Object.values(pendingOperations).filter(
      (op) => op.Tipo_Op === operationType,
    )
    return [...saved, ...(pending as ProductionOperation[])]
  }, [operations, pendingOperations, type])

  // NEW: Fetch paletes data (for both Impressão and Corte tabs)
  const fetchPaletes = useCallback(async () => {
    setPaletesLoading(true)
    try {
      const { data, error } = await supabase
        .from('paletes')
        .select(
          `
          id,
          no_palete,
          ref_cartao,
          fornecedor_id,
          fornecedores(nome_forn)
        `,
        )
        .order('no_palete', { ascending: true })

      if (!error && data) {
        setPaletes(data)
      }
    } catch (error) {
      console.error('Error fetching paletes:', error)
    } finally {
      setPaletesLoading(false)
    }
  }, [supabase])

  // NEW: useEffect to fetch paletes data for both tabs
  useEffect(() => {
    fetchPaletes()
  }, [fetchPaletes])

  // Initialize material selections and notes - optimized approach
  useEffect(() => {
    if (isUpdating) return // Skip if currently updating to prevent loops

    const newSelections: {
      [operationId: string]: {
        material?: string
        caracteristica?: string
        cor?: string
      }
    } = {}
    const newPaletteSelections: { [operationId: string]: string } = {}
    const newQuantityValues: { [operationId: string]: number } = {}
    const newQtPrintValues: { [operationId: string]: number } = {}

    displayOperations.forEach((operation) => {
      // Only update if values have actually changed
      const currentMaterialSelection = materialSelections[operation.id]
      const currentPaletteSelection = paletteSelections[operation.id]

      // Initialize material selections
      if (operation.material_id && materials.length > 0) {
        const material = materials.find((m) => m.id === operation.material_id)
        if (material) {
          const newMaterialSelection = {
            material: material.material?.toUpperCase(),
            caracteristica: material.carateristica?.toUpperCase(),
            cor: material.cor?.toUpperCase(),
          }
          // Only update if different
          if (
            JSON.stringify(currentMaterialSelection) !==
            JSON.stringify(newMaterialSelection)
          ) {
            newSelections[operation.id] = newMaterialSelection
          } else {
            newSelections[operation.id] = currentMaterialSelection || {}
          }
        } else {
          // If material not found, keep current selection or empty
          newSelections[operation.id] = currentMaterialSelection || {}
        }
      } else {
        newSelections[operation.id] = currentMaterialSelection || {}
      }

      // Initialize palette selections from N_Pal field
      if (operation.N_Pal && paletes.length > 0) {
        const palette = paletes.find((p) => p.no_palete === operation.N_Pal)
        if (palette && palette.id !== currentPaletteSelection) {
          newPaletteSelections[operation.id] = palette.id
        } else {
          newPaletteSelections[operation.id] = currentPaletteSelection || ''
        }
      } else {
        newPaletteSelections[operation.id] = currentPaletteSelection || ''
      }

      // Initialize quantity values
      const quantityField =
        type === 'impressao' || type === 'impressao_flexiveis'
          ? 'num_placas_print'
          : 'num_placas_corte'
      const currentQuantityValue = quantityValues[operation.id]
      const dbQuantityValue = operation[quantityField] || 0

      // Only update if different
      if (dbQuantityValue !== currentQuantityValue) {
        newQuantityValues[operation.id] = dbQuantityValue
      } else {
        newQuantityValues[operation.id] = currentQuantityValue || 0
      }

      // Initialize QT_print values (for corte operations)
      const currentQtPrintValue = qtPrintValues[operation.id]
      const dbQtPrintValue = operation.QT_print || 0

      // Only update if different
      if (dbQtPrintValue !== currentQtPrintValue) {
        newQtPrintValues[operation.id] = dbQtPrintValue
      } else {
        newQtPrintValues[operation.id] = currentQtPrintValue || 0
      }
    })

    // Only update state if there are actual changes
    const hasChanges =
      JSON.stringify(newSelections) !== JSON.stringify(materialSelections) ||
      JSON.stringify(newPaletteSelections) !==
        JSON.stringify(paletteSelections) ||
      JSON.stringify(newQuantityValues) !== JSON.stringify(quantityValues) ||
      JSON.stringify(newQtPrintValues) !== JSON.stringify(qtPrintValues)

    if (hasChanges) {
      setMaterialSelections(newSelections)
      setPaletteSelections(newPaletteSelections)
      setQuantityValues(newQuantityValues)
      setQtPrintValues(newQtPrintValues)
    }
  }, [
    displayOperations,
    materials,
    paletes,
    type,
    isUpdating,
    materialSelections,
    paletteSelections,
    qtPrintValues,
    quantityValues,
  ])

  // Calculate and report total quantity including pending operations
  useEffect(() => {
    const quantityField =
      type === 'impressao' || type === 'impressao_flexiveis'
        ? 'num_placas_print'
        : 'num_placas_corte'
    const total = displayOperations.reduce(
      (sum, op) => sum + (op[quantityField] || 0),
      0,
    )
    onTotalChange?.(total)
  }, [displayOperations, type, onTotalChange])

  const addOperation = () => {
    if (isUpdating) return

    // Use the passed item to build the no_interno field
    if (!item) {
      alert('Item não encontrado')
      return
    }

    // Create temporary ID for pending operation
    const tempId = `temp_${Date.now()}`

    // Create pending operation (not saved to database)
    const getOperationType = () => {
      if (type === 'impressao') return 'Impressao'
      if (type === 'impressao_flexiveis') return 'Impressao_Flexiveis'
      return 'Corte'
    }

    const pendingOp = {
      id: tempId,
      item_id: itemId,
      folha_obra_id: item.folha_obra_id,
      no_interno: `${item.folhas_obras?.numero_fo || 'FO'}-${item.descricao?.substring(0, 10) || 'ITEM'}`,
      [quantityField]: 1,
      data_operacao: new Date().toISOString().split('T')[0],
      Tipo_Op: getOperationType(),
      isPending: true, // Flag to identify pending operations
    }

    // Add to pending operations (local state only)
    setPendingOperations((prev) => ({
      ...prev,
      [tempId]: pendingOp,
    }))
  }

  // 2. UPDATE: Enhanced acceptOperation function with creation logging
  const acceptOperation = async (
    pendingOperation: ProductionOperation & { isPending?: boolean },
  ) => {
    try {
      setIsUpdating(true)

      // 1. Save the operation to database
      const operationData = {
        item_id: pendingOperation.item_id,
        folha_obra_id: pendingOperation.folha_obra_id,
        no_interno: pendingOperation.no_interno,
        material_id: pendingOperation.material_id,
        [quantityField]: pendingOperation[quantityField],
        [notesField]: pendingOperation[notesField],
        data_operacao: pendingOperation.data_operacao,
        operador_id: pendingOperation.operador_id,
        maquina: pendingOperation.maquina,
        Tipo_Op: pendingOperation.Tipo_Op,
        N_Pal: pendingOperation.N_Pal,
      }

      const { data: savedOperation, error: saveError } = await supabase
        .from('producao_operacoes')
        .insert(operationData)
        .select()
        .single()

      if (saveError) throw saveError

      // 2. LOG AUDIT: Operation creation
      await logOperationCreation(supabase, savedOperation.id, operationData)

      // 3. If this is an Impressão operation, automatically create corresponding Corte operation
      if (type === 'impressao' && savedOperation) {
        const corteOperation = {
          item_id: pendingOperation.item_id,
          folha_obra_id: pendingOperation.folha_obra_id,
          no_interno: pendingOperation.no_interno,
          material_id: pendingOperation.material_id,
          QT_print: pendingOperation.num_placas_print,
          notas: pendingOperation.notas_imp,
          N_Pal: pendingOperation.N_Pal,
          data_operacao: new Date().toISOString().split('T')[0],
          Tipo_Op: 'Corte',
        }

        const { data: savedCorteOperation, error: corteError } = await supabase
          .from('producao_operacoes')
          .insert(corteOperation)
          .select()
          .single()

        if (!corteError && savedCorteOperation) {
          // LOG AUDIT: Corte operation creation (auto-created from Impressão)
          await logOperationCreation(supabase, savedCorteOperation.id, {
            ...corteOperation,
            notes: 'Auto-criado a partir de operação de impressão',
          })
        }
      }

      // 4. Remove from pending operations
      setPendingOperations((prev) => {
        const updated = { ...prev }
        delete updated[pendingOperation.id]
        return updated
      })

      // 5. Refresh both tabs
      onRefresh()
    } catch (error) {
      console.error('Error accepting operation:', error)
      alert('Erro ao aceitar operação')
    } finally {
      setIsUpdating(false)
    }
  }

  // NEW: Cancel operation function
  const cancelOperation = (tempId: string) => {
    setPendingOperations((prev) => {
      const updated = { ...prev }
      delete updated[tempId]
      return updated
    })
  }

  // NEW: Update pending operation function
  const updatePendingOperation = (
    tempId: string,
    field: string,
    value: any,
  ) => {
    setPendingOperations((prev) => ({
      ...prev,
      [tempId]: {
        ...prev[tempId],
        [field]: value,
      },
    }))
  }

  // NEW: Duplicate operation function
  const duplicateOperation = (sourceOperation: ProductionOperation) => {
    if (isUpdating) return

    // Create temporary ID for the duplicated operation
    const tempId = `temp_${Date.now()}`

    // Create duplicated operation (as pending)
    const duplicatedOp = {
      id: tempId,
      item_id: sourceOperation.item_id,
      folha_obra_id: sourceOperation.folha_obra_id,
      no_interno: sourceOperation.no_interno,
      material_id: sourceOperation.material_id,
      [quantityField]: sourceOperation[quantityField] || 1,
      [notesField]: sourceOperation[notesField] || '',
      data_operacao: new Date().toISOString().split('T')[0], // Today's date
      operador_id: sourceOperation.operador_id,
      maquina: sourceOperation.maquina,
      Tipo_Op: sourceOperation.Tipo_Op,
      N_Pal: sourceOperation.N_Pal,
      QT_print: sourceOperation.QT_print,
      isPending: true, // Flag to identify as pending operation
    }

    debugLog(`📋 Duplicating operation:`, sourceOperation)
    debugLog(`✨ Created duplicate:`, duplicatedOp)

    // Add to pending operations (local state only)
    setPendingOperations((prev) => ({
      ...prev,
      [tempId]: duplicatedOp,
    }))

    // Copy material selections if they exist
    if (sourceOperation.material_id && sourceOperation.materiais) {
      setMaterialSelections((prev) => ({
        ...prev,
        [tempId]: {
          material: sourceOperation.materiais?.material || '',
          caracteristica: sourceOperation.materiais?.cor || '', // Note: this might need adjustment based on your data structure
          cor: sourceOperation.materiais?.cor || '',
        },
      }))
    }

    // Copy palette selection if it exists
    if (sourceOperation.N_Pal) {
      setPaletteSelections((prev) => ({
        ...prev,
        [tempId]: sourceOperation.N_Pal || '',
      }))
    }
  }

  // Stock management functions
  const updateStockOnOperation = async (
    materialId: string,
    oldQuantity: number = 0,
    newQuantity: number = 0,
  ) => {
    if (!materialId) return

    try {
      // Calculate the difference in consumption
      const consumptionDiff = newQuantity - oldQuantity

      if (consumptionDiff === 0) return // No change needed

      // Get the current material's stock_correct value
      const { data: materialData, error: materialError } = await supabase
        .from('materiais')
        .select('stock_correct')
        .eq('id', materialId)
        .single()

      if (materialError) {
        console.error('Error fetching stock_correct:', materialError)
        return
      }

      // If no stock_correct exists, calculate it first from current stock levels
      let currentStockCorrect = materialData?.stock_correct

      if (currentStockCorrect === null || currentStockCorrect === undefined) {
        // Calculate current stock in a traditional way
        const [stocksResult, operationsResult] = await Promise.all([
          supabase
            .from('stocks')
            .select('quantidade')
            .eq('material_id', materialId),
          supabase
            .from('producao_operacoes')
            .select('num_placas_corte')
            .eq('material_id', materialId),
        ])

        const stockTotal =
          stocksResult.data?.reduce(
            (sum: number, stock: any) => sum + (stock.quantidade || 0),
            0,
          ) || 0

        const operationsTotal =
          operationsResult.data?.reduce(
            (sum: number, op: any) => sum + (op.num_placas_corte || 0),
            0,
          ) || 0

        currentStockCorrect = stockTotal - operationsTotal
      }

      // Calculate new stock_correct value
      const newStockCorrect = currentStockCorrect - consumptionDiff

      // Update stock_correct in materiais table
      const { error: updateError } = await supabase
        .from('materiais')
        .update({
          stock_correct: newStockCorrect,
          stock_correct_updated_at: new Date().toISOString(),
        })
        .eq('id', materialId)

      if (updateError) {
        console.error('Error updating stock_correct:', updateError)
      }
    } catch (error) {
      console.error('Error in updateStockOnOperation:', error)
    }
  }

  // 3. UPDATE: Enhanced updateOperation function with field change logging
  const updateOperation = async (
    operationId: string,
    field: string,
    value: any,
  ) => {
    // Check if this is a pending operation
    if (operationId.startsWith('temp_')) {
      updatePendingOperation(operationId, field, value)
      return
    }

    const operationKey = `${operationId}-${field}`
    if (activeUpdatesRef.current.has(operationKey)) {
      return
    }

    try {
      activeUpdatesRef.current.add(operationKey)

      // Get the current operation to compare values
      const { data: currentOperation } = await supabase
        .from('producao_operacoes')
        .select('*')
        .eq('id', operationId)
        .single()

      if (!currentOperation) {
        console.error('Operation not found for update')
        return
      }

      // Store old value for audit logging
      const oldValue = currentOperation[field]

      // Skip if no change
      if (oldValue === value) {
        debugLog('No change detected, skipping update')
        return
      }

      // Update the database
      const { data, error } = await supabase
        .from('producao_operacoes')
        .update({ [field]: value })
        .eq('id', operationId)
        .select()

      if (error) {
        console.error(
          `Error updating operation ${operationId} field ${field}:`,
          error,
        )
        alert(`Erro ao atualizar ${field}: ${error.message}`)
        return
      }

      // LOG AUDIT: Field change
      await logFieldUpdate(supabase, operationId, field, oldValue, value)

      // Handle stock operations and syncing (existing logic)
      if (currentOperation && currentOperation.Tipo_Op === 'Corte') {
        if (field === 'material_id') {
          const oldMaterialId = currentOperation.material_id
          const newMaterialId = value
          const quantity = currentOperation.num_placas_corte || 0

          if (oldMaterialId && quantity > 0) {
            await updateStockOnOperation(oldMaterialId, quantity, 0)
          }
          if (newMaterialId && quantity > 0) {
            await updateStockOnOperation(newMaterialId, 0, quantity)
          }
        } else if (field === 'num_placas_corte') {
          const materialId = currentOperation.material_id
          const oldQuantity = currentOperation.num_placas_corte || 0
          const newQuantity = value || 0

          if (materialId) {
            await updateStockOnOperation(materialId, oldQuantity, newQuantity)
          }
        }
      }

      // Auto-sync Impressão changes to corresponding Corte operation (existing logic)
      if (currentOperation && currentOperation.Tipo_Op === 'Impressao') {
        if (
          ['material_id', 'num_placas_print', 'notas_imp', 'N_Pal'].includes(
            field,
          )
        ) {
          const { data: corteOperations } = await supabase
            .from('producao_operacoes')
            .select('id')
            .eq('item_id', currentOperation.item_id)
            .eq('folha_obra_id', currentOperation.folha_obra_id)
            .eq('no_interno', currentOperation.no_interno)
            .eq('Tipo_Op', 'Corte')

          if (corteOperations && corteOperations.length > 0) {
            const corteId = corteOperations[0].id
            const corteUpdateData: any = {}

            if (field === 'material_id') corteUpdateData.material_id = value
            if (field === 'num_placas_print') corteUpdateData.QT_print = value
            if (field === 'notas_imp') corteUpdateData.notas = value
            if (field === 'N_Pal') corteUpdateData.N_Pal = value

            const { error: corteError } = await supabase
              .from('producao_operacoes')
              .update(corteUpdateData)
              .eq('id', corteId)

            if (!corteError) {
              // LOG AUDIT: Auto-sync to Corte operation
              for (const [corteField, corteValue] of Object.entries(
                corteUpdateData,
              )) {
                await logFieldUpdate(
                  supabase,
                  corteId,
                  corteField,
                  null,
                  corteValue,
                )
              }
            }
          }
        }
      }

      onRefresh()
    } catch (error) {
      console.error('❌ Error updating operation:', error)
    } finally {
      activeUpdatesRef.current.delete(operationKey)
    }
  }

  // NEW: Handle palette selection and auto-fill materials
  const handlePaletteSelection = async (
    operationId: string,
    paletteId: string,
  ) => {
    debugLog(
      `🎨 Palette selection: operation=${operationId}, palette=${paletteId}`,
    )

    // If empty value is selected, clear palette and enable material dropdowns
    if (!paletteId) {
      setPaletteSelections((prev) => ({
        ...prev,
        [operationId]: '',
      }))

      // Clear material selections to allow manual input
      setMaterialSelections((prev) => ({
        ...prev,
        [operationId]: {
          material: '',
          caracteristica: '',
          cor: '',
        },
      }))

      // Clear palette and material from operation
      if (operationId.startsWith('temp_')) {
        updatePendingOperation(operationId, 'N_Pal', '')
        updatePendingOperation(operationId, 'material_id', null)
      } else {
        await updateOperation(operationId, 'N_Pal', '')
        await updateOperation(operationId, 'material_id', null)
      }
      return
    }

    // Find the selected palette
    const selectedPalette = paletes.find((p) => p.id === paletteId)
    if (!selectedPalette) {
      debugLog(`❌ Palette not found: ${paletteId}`)
      return
    }

    debugLog(`✅ Found palette:`, selectedPalette)

    // Update palette selection in local state immediately
    setPaletteSelections((prev) => ({
      ...prev,
      [operationId]: paletteId,
    }))

    // Check if this is a pending operation
    if (operationId.startsWith('temp_')) {
      // For pending operations, update the pending state
      updatePendingOperation(operationId, 'N_Pal', selectedPalette.no_palete)

      // If the palette has a reference, also update material for pending operation
      if (selectedPalette.ref_cartao) {
        debugLog(
          `🔍 Looking for material with ref_cartao: ${selectedPalette.ref_cartao}`,
        )

        const materialTipo =
          (type as string) === 'impressao_flexiveis' ? 'FLEXÍVEIS' : 'RÍGIDOS'
        const matchingMaterial = materials.find(
          (m) =>
            m.referencia === selectedPalette.ref_cartao &&
            m.tipo === materialTipo,
        )

        debugLog(`🎯 Found matching material:`, matchingMaterial)

        if (matchingMaterial) {
          debugLog(
            `🎯 Auto-filling material for pending operation:`,
            matchingMaterial,
          )
          // IMPORTANT: Save the material_id to the pending operation data
          updatePendingOperation(
            operationId,
            'material_id',
            matchingMaterial.id,
          )

          // Update material selections immediately for UI display
          setMaterialSelections((prev) => ({
            ...prev,
            [operationId]: {
              material: matchingMaterial.material?.toUpperCase() || '',
              caracteristica:
                matchingMaterial.carateristica?.toUpperCase() || '',
              cor: matchingMaterial.cor?.toUpperCase() || '',
            },
          }))
        }
      }
    } else {
      // For saved operations, save to database
      debugLog(`💾 Saving palette to database: ${selectedPalette.no_palete}`)
      // updateOperation will automatically sync to Corte if this is an Impressão operation
      await updateOperation(operationId, 'N_Pal', selectedPalette.no_palete)

      // If the palette has a reference, try to auto-fill material
      if (selectedPalette.ref_cartao) {
        // Find material by reference (ref_cartao) - use correct material type
        const materialTipo =
          (type as string) === 'impressao_flexiveis' ? 'FLEXÍVEIS' : 'RÍGIDOS'
        const matchingMaterial = materials.find(
          (m) =>
            m.referencia === selectedPalette.ref_cartao &&
            m.tipo === materialTipo,
        )

        if (matchingMaterial) {
          debugLog(`🎯 Auto-filling material:`, matchingMaterial)
          // Update the operation's material_id - this will trigger onRefresh and auto-update the material combos
          // This will also automatically sync to Corte if this is an Impressão operation
          await updateOperation(operationId, 'material_id', matchingMaterial.id)

          // Manually update material selections immediately for better UX
          setMaterialSelections((prev) => ({
            ...prev,
            [operationId]: {
              material: matchingMaterial.material?.toUpperCase() || '',
              caracteristica:
                matchingMaterial.carateristica?.toUpperCase() || '',
              cor: matchingMaterial.cor?.toUpperCase() || '',
            },
          }))
        } else {
          debugLog(
            `❌ No matching material found for reference: ${selectedPalette.ref_cartao} with tipo: ${materialTipo}`,
          )
        }
      } else {
        debugLog(`ℹ️ Palette has no ref_cartao: ${selectedPalette.no_palete}`)
      }
    }
  }

  // 4. UPDATE: Enhanced deleteOperation function with deletion logging
  const deleteOperation = async (operationId: string) => {
    if (isUpdating) return

    if (!confirm('Tem certeza que deseja eliminar esta operação?')) {
      return
    }

    try {
      setIsUpdating(true)

      // Check if this is a pending operation
      if (operationId.startsWith('temp_')) {
        setPendingOperations((prev) => {
          const updated = { ...prev }
          delete updated[operationId]
          return updated
        })
        return
      }

      // Get operation details before deleting for audit log
      const { data: operation, error: fetchError } = await supabase
        .from('producao_operacoes')
        .select('*')
        .eq('id', operationId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          debugLog('Operation not found, probably already deleted')
          onRefresh()
          return
        }
        alert(`Erro ao buscar operação: ${fetchError.message}`)
        return
      }

      // Delete the operation
      const { error: deleteError } = await supabase
        .from('producao_operacoes')
        .delete()
        .eq('id', operationId)

      if (deleteError) {
        console.error('Error deleting operation:', deleteError)
        alert(`Erro ao eliminar operação: ${deleteError.message}`)
        return
      }

      // LOG AUDIT: Operation deletion
      await logOperationDeletion(supabase, operationId, operation)

      // Add stock back if it was a cutting operation
      if (
        operation &&
        operation.Tipo_Op === 'Corte' &&
        operation.material_id &&
        operation.num_placas_corte
      ) {
        await updateStockOnOperation(
          operation.material_id,
          operation.num_placas_corte,
          0,
        )
      }

      onRefresh()
    } catch (error) {
      console.error('Error deleting operation:', error)
      alert(`Erro inesperado ao eliminar operação: ${error}`)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Operações de{' '}
          {type === 'impressao'
            ? 'Impressão'
            : type === 'impressao_flexiveis'
              ? 'Impressão Flexíveis'
              : 'Corte'}
        </h3>
        <div className="flex items-center gap-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={addOperation}
                  disabled={isUpdating}
                  className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Adicionar operação</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {type === 'impressao_flexiveis' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="item-tem-corte-flexiveis"
                checked={hasTemCorte || false}
                onCheckedChange={async (checked) => {
                  try {
                    // Update all Impressão Flexíveis operations for this item
                    const updateData = { tem_corte: !!checked }

                    const { error } = await supabase
                      .from('producao_operacoes')
                      .update(updateData)
                      .eq('item_id', itemId)
                      .eq('Tipo_Op', 'Impressao_Flexiveis')

                    if (!error) {
                      onTemCorteChange?.(!!checked)
                      onRefresh()
                    }
                  } catch (error) {
                    console.error('Error updating tem_corte status:', error)
                  }
                }}
              />
              <label
                htmlFor="item-tem-corte-flexiveis"
                className="cursor-pointer text-sm font-medium"
              >
                Impressão Concluída tem corte
              </label>
            </div>
          )}
          {(type === 'corte' || type === 'impressao_flexiveis') && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={
                  type === 'corte'
                    ? 'item-completed'
                    : 'item-completed-flexiveis'
                }
                checked={isItemCompleted || false}
                onCheckedChange={async (checked) => {
                  try {
                    // Get current user for audit logging
                    const {
                      data: { user },
                      error: authError,
                    } = await supabase.auth.getUser()

                    // Update all operations for this item based on type
                    const today = new Date().toISOString().split('T')[0]
                    const updateData = checked
                      ? { concluido: true, data_conclusao: today }
                      : { concluido: false, data_conclusao: null }

                    const tipoOp =
                      type === 'corte' ? 'Corte' : 'Impressao_Flexiveis'

                    debugLog(
                      `🔄 Updating ${tipoOp} operations for item ${itemId}:`,
                      updateData,
                    )

                    // First, get current operations to capture old values for audit
                    const { data: currentOperations } = await supabase
                      .from('producao_operacoes')
                      .select('id, concluido')
                      .eq('item_id', itemId)
                      .eq('Tipo_Op', tipoOp)

                    const { error, data } = await supabase
                      .from('producao_operacoes')
                      .update(updateData)
                      .eq('item_id', itemId)
                      .eq('Tipo_Op', tipoOp)
                      .select()

                    debugLog(`✅ Update result for ${tipoOp}:`, {
                      error,
                      data,
                    })

                    if (!error) {
                      // Log audit entries for bulk completion changes
                      if (user && currentOperations) {
                        const auditPromises = currentOperations.map(
                          async (op: { id: string; concluido: boolean }) => {
                            const oldValue = op.concluido
                            const newValue = checked

                            if (oldValue !== newValue) {
                              try {
                                await supabase
                                  .from('producao_operacoes_audit')
                                  .insert({
                                    operacao_id: op.id,
                                    field_name: 'concluido',
                                    old_value: oldValue ? 'Sim' : 'Não',
                                    new_value: newValue ? 'Sim' : 'Não',
                                    changed_by: user.id,
                                    changed_at: new Date().toISOString(),
                                  })
                                debugLog(
                                  `📝 Audit: Logged bulk completion change for operation ${op.id}`,
                                )
                              } catch (auditError) {
                                console.warn(
                                  '⚠️ Failed to log audit entry for operation:',
                                  op.id,
                                  auditError,
                                )
                              }
                            }
                          },
                        )

                        // Execute audit logging in background
                        Promise.all(auditPromises).catch((err) => {
                          debugWarn(
                            '⚠️ Some audit log entries failed (non-critical):',
                            err,
                          )
                        })
                      }

                      onCompletionChange?.(!!checked)
                      onRefresh()
                      // Also refresh main data so item moves between tabs
                      if (onMainRefresh) {
                        await onMainRefresh()
                      }
                      // Close drawer since item moved to different tab
                      onClose()
                    } else {
                      console.error(
                        `❌ Error updating ${tipoOp} completion status:`,
                        error,
                      )
                    }
                  } catch (error) {
                    console.error('Error updating completion status:', error)
                  }
                }}
              />
              <label
                htmlFor={
                  type === 'corte'
                    ? 'item-completed'
                    : 'item-completed-flexiveis'
                }
                className="cursor-pointer text-sm font-medium"
              >
                Concluído
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Path trabalho display */}
      {item.designer_items?.path_trabalho && (
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs font-bold uppercase">
            Path Trabalho
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={item.designer_items.path_trabalho}
              readOnly
              className="flex-1 cursor-text rounded-none font-mono text-sm select-all"
              title="Campo apenas de leitura - clique para selecionar todo o texto"
              style={{ cursor: 'text' }}
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                navigator.clipboard
                  .writeText(item.designer_items?.path_trabalho || '')
                  .then(() => {
                    alert('Path copiado para a área de transferência!')
                  })
                  .catch((err) => {
                    console.error('Failed to copy: ', err)
                    alert('Erro ao copiar path')
                  })
              }}
              title="Copiar path para área de transferência"
              className="shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="bg-background border-border w-full rounded-none border-2">
        <div className="w-full overflow-x-auto rounded-none">
          <Table className="w-full border-0">
            <TableHeader>
              <TableRow>
                <TableHead className="border-border w-[150px] min-w-[150px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Data
                </TableHead>
                <TableHead className="border-border w-[120px] min-w-[120px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Operador
                </TableHead>
                <TableHead className="border-border w-[160px] min-w-[160px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Máquina
                </TableHead>
                <TableHead className="border-border w-[160px] min-w-[160px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Pallete
                </TableHead>
                <TableHead className="border-border w-[160px] min-w-[160px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Material
                </TableHead>
                <TableHead className="border-border w-[160px] min-w-[160px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Caract.
                </TableHead>
                <TableHead className="border-border w-[240px] min-w-[240px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Cor
                </TableHead>
                {type === 'corte' && (
                  <TableHead className="border-border w-[80px] min-w-[80px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                    QT_print
                  </TableHead>
                )}
                <TableHead className="border-border w-[80px] min-w-[80px] border-b-2 bg-[var(--orange)] p-2 text-sm text-black uppercase">
                  Quantidade
                </TableHead>
                <TableHead className="border-border w-[60px] min-w-[60px] border-b-2 bg-[var(--orange)] p-2 text-center text-sm text-black uppercase">
                  {type === 'impressao' || type === 'impressao_flexiveis'
                    ? 'Notas'
                    : 'Notas'}
                </TableHead>
                <TableHead className="border-border w-[130px] min-w-[130px] border-b-2 bg-[var(--orange)] p-2 text-center text-sm text-black uppercase">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayOperations.map((operation) => (
                <TableRow
                  key={operation.id}
                  className={`${(operation as { isPending?: boolean }).isPending ? 'border-l-4 border-l-yellow-400 bg-yellow-50' : ''}`}
                >
                  <TableCell className="w-[150px] min-w-[150px] p-2 text-sm">
                    <DatePicker
                      selected={
                        operation.data_operacao
                          ? new Date(operation.data_operacao)
                          : undefined
                      }
                      onSelect={(date) => {
                        const newValue = date
                          ? date.toISOString().split('T')[0]
                          : null
                        // For pending operations, update locally only
                        if ((operation as { isPending?: boolean }).isPending) {
                          updatePendingOperation(
                            operation.id,
                            'data_operacao',
                            newValue,
                          )
                        } else {
                          // For saved operations, update database immediately
                          updateOperation(
                            operation.id,
                            'data_operacao',
                            newValue,
                          )
                        }
                      }}
                      buttonClassName="w-full h-10"
                    />
                  </TableCell>
                  <TableCell className="w-[120px] min-w-[120px] p-2 text-sm">
                    <Select
                      value={operation.operador_id || ''}
                      onValueChange={(value) => {
                        // For pending operations, update locally only
                        if ((operation as { isPending?: boolean }).isPending) {
                          updatePendingOperation(
                            operation.id,
                            'operador_id',
                            value,
                          )
                        } else {
                          // For saved operations, update database immediately
                          updateOperation(operation.id, 'operador_id', value)
                        }
                      }}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Selecionar operador">
                          {isUpdating ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="truncate uppercase">
                                Atualizando...
                              </span>
                            </div>
                          ) : operation.operador_id ? (
                            <span className="truncate uppercase">
                              {operation.profiles
                                ? operation.profiles.first_name
                                : (() => {
                                    const selectedOperator = operators.find(
                                      (op) => op.id === operation.operador_id,
                                    )
                                    return selectedOperator
                                      ? selectedOperator.first_name
                                      : 'Operador'
                                  })()}
                            </span>
                          ) : (
                            <span className="truncate uppercase">
                              Selecionar
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent disablePortal>
                        {operators.map((operator) => (
                          <SelectItem
                            key={operator.id}
                            value={operator.id}
                            className="uppercase"
                          >
                            {operator.first_name} {operator.last_name}
                            {operator.roles?.name && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({operator.roles.name})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="w-[160px] min-w-[160px] p-2 text-sm">
                    <Select
                      value={operation[machineField] || ''}
                      onValueChange={async (value) => {
                        const selectedMachine = machines.find(
                          (m) => m.id === value,
                        )

                        // For pending operations, update locally only
                        if ((operation as { isPending?: boolean }).isPending) {
                          updatePendingOperation(
                            operation.id,
                            machineField,
                            value,
                          )
                          // Don't update Tipo_Op for pending operations - it should stay as set when created
                        } else {
                          // For saved operations, update database immediately
                          await updateOperation(
                            operation.id,
                            machineField,
                            value,
                          )
                          if (selectedMachine) {
                            await updateOperation(
                              operation.id,
                              'Tipo_Op',
                              selectedMachine.tipo,
                            )
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Selecionar máquina">
                          <span className="truncate uppercase">
                            {operation[machineField]
                              ? machines.find(
                                  (m) => m.id === operation[machineField],
                                )?.nome_maquina ||
                                machines.find(
                                  (m) =>
                                    m.nome_maquina === operation[machineField],
                                )?.nome_maquina ||
                                'Máquina Selecionada'
                              : 'Selecionar máquina'}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent disablePortal>
                        {machines
                          .filter((machine) => {
                            if (type === 'impressao')
                              return machine.tipo === 'Impressao'
                            if (type === 'impressao_flexiveis')
                              return machine.tipo === 'Impressao_Vinil'
                            return machine.tipo === 'Corte'
                          })
                          .map((machine) => (
                            <SelectItem
                              key={machine.id}
                              value={machine.id}
                              className="uppercase"
                            >
                              {machine.nome_maquina}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {/* PALLETE Column - For Impressão, Impressão Flexíveis, and Corte */}
                  <TableCell className="w-[160px] min-w-[160px] p-2 text-sm">
                    {type === 'impressao_flexiveis' ? (
                      <Button
                        variant="ghost"
                        disabled
                        className="h-10 w-full justify-start uppercase"
                      >
                        N/A
                      </Button>
                    ) : (
                      <Combobox
                        options={[
                          { value: '', label: 'Sem palete' },
                          ...paletes.map((palete) => ({
                            value: palete.id,
                            label: palete.no_palete,
                          })),
                        ]}
                        value={paletteSelections[operation.id] || ''}
                        onChange={(value: string) => {
                          // Use consistent handlePaletteSelection function for both pending and saved operations
                          handlePaletteSelection(operation.id, value)
                        }}
                        placeholder="Selecionar palete"
                        emptyMessage="Nenhuma palete encontrada"
                        searchPlaceholder="Procurar palete..."
                        disabled={paletesLoading}
                        className="h-10 w-full"
                        buttonClassName="uppercase truncate"
                      />
                    )}
                  </TableCell>
                  {/* Material Combo 1 - Searchable */}
                  <TableCell className="w-[160px] min-w-[160px] p-2 text-sm">
                    <Combobox
                      options={Array.from(
                        new Set(
                          materials
                            .filter((m) => {
                              // Corte tab should show all materials since it can receive from both Impressão types
                              if (type === 'corte')
                                return (
                                  m.tipo === 'RÍGIDOS' || m.tipo === 'FLEXÍVEIS'
                                )
                              // Impressão Flexíveis shows only FLEXÍVEIS materials
                              if (type === 'impressao_flexiveis')
                                return m.tipo === 'FLEXÍVEIS'
                              // Regular Impressão shows only RÍGIDOS materials
                              return m.tipo === 'RÍGIDOS'
                            })
                            .map((m) => m.material?.toUpperCase())
                            .filter(Boolean),
                        ),
                      ).map((material) => ({
                        value: material,
                        label: material,
                      }))}
                      value={materialSelections[operation.id]?.material || ''}
                      onChange={(value: string) => {
                        // Only allow changes if material is not from palette
                        if (!isMaterialFromPalette(operation.id)) {
                          setMaterialSelections((prev) => ({
                            ...prev,
                            [operation.id]: {
                              material: value,
                              caracteristica: undefined,
                              cor: undefined,
                            },
                          }))
                          // For pending operations, no database update needed yet
                          // Material ID will be set when all three dropdowns are selected
                        }
                      }}
                      placeholder="Material"
                      emptyMessage="Nenhum material encontrado"
                      searchPlaceholder="Procurar material..."
                      className="h-10 w-full"
                      buttonClassName={`uppercase truncate ${isMaterialFromPalette(operation.id) ? 'cursor-not-allowed opacity-60' : ''}`}
                      disabled={isMaterialFromPalette(operation.id)}
                    />
                  </TableCell>
                  {/* Material Combo 2 */}
                  <TableCell className="w-[160px] min-w-[160px] p-2 text-sm">
                    <Select
                      key={`caract-${operation.id}-${materialSelections[operation.id]?.material || 'none'}`}
                      value={
                        materialSelections[operation.id]?.caracteristica || ''
                      }
                      onValueChange={(value) => {
                        // Only allow changes if material is not from palette
                        if (!isMaterialFromPalette(operation.id)) {
                          const currentSelection =
                            materialSelections[operation.id]
                          setMaterialSelections((prev) => ({
                            ...prev,
                            [operation.id]: {
                              ...currentSelection,
                              caracteristica: value,
                              cor: undefined,
                            },
                          }))
                          // For pending operations, no database update needed yet
                          // Material ID will be set when all three dropdowns are selected
                        }
                      }}
                      disabled={
                        !materialSelections[operation.id]?.material ||
                        isMaterialFromPalette(operation.id)
                      }
                    >
                      <SelectTrigger
                        className={`h-10 w-full ${isMaterialFromPalette(operation.id) ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <SelectValue placeholder="Caract">
                          <span className="truncate uppercase">
                            {materialSelections[operation.id]?.caracteristica ||
                              'Caract'}
                            {isMaterialFromPalette(operation.id) && (
                              <span className="text-muted-foreground ml-1 text-xs">
                                (Palete)
                              </span>
                            )}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent disablePortal>
                        {(() => {
                          const filtered = materials
                            .filter((m) => {
                              // Check material type based on tab
                              let correctTipo = false
                              if (type === 'corte') {
                                correctTipo =
                                  m.tipo === 'RÍGIDOS' || m.tipo === 'FLEXÍVEIS'
                              } else if (type === 'impressao_flexiveis') {
                                correctTipo = m.tipo === 'FLEXÍVEIS'
                              } else {
                                correctTipo = m.tipo === 'RÍGIDOS'
                              }

                              return (
                                correctTipo &&
                                m.material?.toUpperCase() ===
                                  materialSelections[
                                    operation.id
                                  ]?.material?.toUpperCase()
                              )
                            })
                            .map((m) => m.carateristica?.toUpperCase())
                            .filter(Boolean)
                          const unique = Array.from(new Set(filtered))
                          return unique
                        })().map((caracteristica) => (
                          <SelectItem
                            key={caracteristica}
                            value={caracteristica}
                            className="uppercase"
                          >
                            {caracteristica}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {/* Material Combo 3 */}
                  <TableCell className="w-[240px] min-w-[240px] p-2 text-sm">
                    <Select
                      key={`cor-${operation.id}-${materialSelections[operation.id]?.material || 'none'}-${materialSelections[operation.id]?.caracteristica || 'none'}`}
                      value={materialSelections[operation.id]?.cor || ''}
                      onValueChange={(value) => {
                        // Only allow changes if material is not from palette
                        if (!isMaterialFromPalette(operation.id)) {
                          const currentSelection =
                            materialSelections[operation.id]
                          const updatedSelection = {
                            ...currentSelection,
                            cor: value,
                          }
                          setMaterialSelections((prev) => ({
                            ...prev,
                            [operation.id]: updatedSelection,
                          }))
                          // Only update material_id if all three are selected and a matching material exists
                          const foundMaterial = materials.find((m) => {
                            // Check material type based on tab
                            let correctTipo = false
                            if (type === 'corte') {
                              correctTipo =
                                m.tipo === 'RÍGIDOS' || m.tipo === 'FLEXÍVEIS'
                            } else if (type === 'impressao_flexiveis') {
                              correctTipo = m.tipo === 'FLEXÍVEIS'
                            } else {
                              correctTipo = m.tipo === 'RÍGIDOS'
                            }

                            return (
                              correctTipo &&
                              m.material?.toUpperCase() ===
                                updatedSelection.material?.toUpperCase() &&
                              m.carateristica?.toUpperCase() ===
                                updatedSelection.caracteristica?.toUpperCase() &&
                              m.cor?.toUpperCase() === value?.toUpperCase()
                            )
                          })
                          if (
                            foundMaterial &&
                            updatedSelection.material &&
                            updatedSelection.caracteristica &&
                            value
                          ) {
                            // For pending operations, update locally only
                            if (
                              (operation as { isPending?: boolean }).isPending
                            ) {
                              updatePendingOperation(
                                operation.id,
                                'material_id',
                                foundMaterial.id,
                              )
                            } else {
                              // For saved operations, update database immediately with stock deduction
                              updateOperation(
                                operation.id,
                                'material_id',
                                foundMaterial.id,
                              )
                            }
                          }
                        }
                      }}
                      disabled={
                        !materialSelections[operation.id]?.caracteristica ||
                        isMaterialFromPalette(operation.id)
                      }
                    >
                      <SelectTrigger
                        className={`h-10 w-full ${isMaterialFromPalette(operation.id) ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <SelectValue placeholder="Cor">
                          <span className="truncate uppercase">
                            {materialSelections[operation.id]?.cor || 'Cor'}
                            {isMaterialFromPalette(operation.id) && (
                              <span className="text-muted-foreground ml-1 text-xs">
                                (Palete)
                              </span>
                            )}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent disablePortal>
                        {(() => {
                          const filtered = materials
                            .filter((m) => {
                              // Check material type based on tab
                              let correctTipo = false
                              if (type === 'corte') {
                                correctTipo =
                                  m.tipo === 'RÍGIDOS' || m.tipo === 'FLEXÍVEIS'
                              } else if (type === 'impressao_flexiveis') {
                                correctTipo = m.tipo === 'FLEXÍVEIS'
                              } else {
                                correctTipo = m.tipo === 'RÍGIDOS'
                              }

                              return (
                                correctTipo &&
                                m.material?.toUpperCase() ===
                                  materialSelections[
                                    operation.id
                                  ]?.material?.toUpperCase() &&
                                m.carateristica?.toUpperCase() ===
                                  materialSelections[
                                    operation.id
                                  ]?.caracteristica?.toUpperCase()
                              )
                            })
                            .map((m) => m.cor?.toUpperCase())
                            .filter(Boolean)
                          const unique = Array.from(new Set(filtered))
                          return unique
                        })().map((cor) => (
                          <SelectItem
                            key={cor}
                            value={cor}
                            className="uppercase"
                          >
                            {cor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {type === 'corte' && (
                    <TableCell className="w-[80px] min-w-[80px] p-2 text-sm">
                      <Input
                        type="number"
                        className="h-10 w-full [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={
                          qtPrintValues[operation.id] ??
                          operation.QT_print ??
                          ''
                        }
                        onChange={(e) => {
                          const newValue = Number(e.target.value) || 0

                          // Update local state immediately for visual feedback
                          setQtPrintValues((prev) => ({
                            ...prev,
                            [operation.id]: newValue,
                          }))

                          // Clear existing timer for both pending and saved operations
                          if (qtPrintUpdateTimers.current[operation.id]) {
                            clearTimeout(
                              qtPrintUpdateTimers.current[operation.id],
                            )
                          }

                          // Set new timer to update after 500ms of no typing
                          qtPrintUpdateTimers.current[operation.id] =
                            setTimeout(() => {
                              if ((operation as any).isPending) {
                                updatePendingOperation(
                                  operation.id,
                                  'QT_print',
                                  newValue,
                                )
                              } else {
                                // For saved operations, update database with debouncing
                                updateOperation(
                                  operation.id,
                                  'QT_print',
                                  newValue,
                                )
                              }
                              delete qtPrintUpdateTimers.current[operation.id]
                            }, 500)
                        }}
                        onBlur={(e) => {
                          const newValue = Number(e.target.value) || 0

                          // Clear any pending timer and update immediately on blur
                          if (qtPrintUpdateTimers.current[operation.id]) {
                            clearTimeout(
                              qtPrintUpdateTimers.current[operation.id],
                            )
                            delete qtPrintUpdateTimers.current[operation.id]
                          }

                          if (
                            (operation as { isPending?: boolean }).isPending
                          ) {
                            updatePendingOperation(
                              operation.id,
                              'QT_print',
                              newValue,
                            )
                          } else {
                            // For saved operations, always update to ensure final value is saved
                            updateOperation(operation.id, 'QT_print', newValue)
                          }
                        }}
                        disabled
                        style={{ backgroundColor: '#f3f4f6' }}
                      />
                    </TableCell>
                  )}
                  <TableCell className="w-[80px] min-w-[80px] p-2 text-sm">
                    <Input
                      type="number"
                      className="h-10 w-full [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={
                        quantityValues[operation.id] ??
                        operation[quantityField] ??
                        ''
                      }
                      onChange={(e) => {
                        const newValue = Number(e.target.value) || 0

                        // Update local state immediately for visual feedback
                        setQuantityValues((prev) => ({
                          ...prev,
                          [operation.id]: newValue,
                        }))

                        // Clear existing timer for both pending and saved operations
                        if (quantityUpdateTimers.current[operation.id]) {
                          clearTimeout(
                            quantityUpdateTimers.current[operation.id],
                          )
                        }

                        // Set new timer to update after 500ms of no typing
                        quantityUpdateTimers.current[operation.id] = setTimeout(
                          () => {
                            if (
                              (operation as { isPending?: boolean }).isPending
                            ) {
                              updatePendingOperation(
                                operation.id,
                                quantityField,
                                newValue,
                              )
                            } else {
                              // For saved operations, update database with debouncing
                              updateOperation(
                                operation.id,
                                quantityField,
                                newValue,
                              )
                            }
                            delete quantityUpdateTimers.current[operation.id]
                          },
                          500,
                        )
                      }}
                      onBlur={(e) => {
                        const newValue = Number(e.target.value) || 0

                        // Clear any pending timer and update immediately on blur
                        if (quantityUpdateTimers.current[operation.id]) {
                          clearTimeout(
                            quantityUpdateTimers.current[operation.id],
                          )
                          delete quantityUpdateTimers.current[operation.id]
                        }

                        if ((operation as { isPending?: boolean }).isPending) {
                          updatePendingOperation(
                            operation.id,
                            quantityField,
                            newValue,
                          )
                        } else {
                          // For saved operations, always update to ensure final value is saved
                          updateOperation(operation.id, quantityField, newValue)
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="p-2 text-sm">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <SimpleNotasPopover
                              value={
                                type === 'impressao' ||
                                type === 'impressao_flexiveis'
                                  ? (operation.notas_imp ?? '')
                                  : ((operation as { notas?: string }).notas ??
                                    '')
                              }
                              onSave={async (newNotas) => {
                                if (
                                  (operation as { isPending?: boolean })
                                    .isPending
                                ) {
                                  updatePendingOperation(
                                    operation.id,
                                    notesField,
                                    newNotas,
                                  )
                                } else {
                                  await updateOperation(
                                    operation.id,
                                    notesField,
                                    newNotas,
                                  )
                                }
                              }}
                              placeholder={
                                type === 'impressao' ||
                                type === 'impressao_flexiveis'
                                  ? 'Adicionar notas de impressão...'
                                  : 'Adicionar notas...'
                              }
                              label="Notas"
                              buttonSize="icon"
                              className="mx-auto aspect-square"
                              disabled={false}
                            />
                          </div>
                        </TooltipTrigger>
                        {(type === 'impressao' || type === 'impressao_flexiveis'
                          ? operation.notas_imp
                          : (operation as { notas?: string }).notas) &&
                          (type === 'impressao' ||
                          type === 'impressao_flexiveis'
                            ? operation.notas_imp?.trim()
                            : (
                                operation as { notas?: string }
                              ).notas?.trim()) !== '' && (
                            <TooltipContent>
                              {type === 'impressao' ||
                              type === 'impressao_flexiveis'
                                ? operation.notas_imp
                                : (operation as { notas?: string }).notas}
                            </TooltipContent>
                          )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="w-[130px] min-w-[130px] p-2 text-sm">
                    {(operation as { isPending?: boolean }).isPending ? (
                      // For pending operations: Duplicate, Accept and Cancel buttons
                      <div className="flex justify-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => duplicateOperation(operation)}
                                disabled={isUpdating}
                                className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
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
                                variant="default"
                                onClick={() =>
                                  acceptOperation(
                                    operation as ProductionOperation & {
                                      isPending?: boolean
                                    },
                                  )
                                }
                                disabled={isUpdating}
                                className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {type === 'impressao'
                                ? 'Aceitar e copiar para corte'
                                : 'Aceitar'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => cancelOperation(operation.id)}
                          className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      // For saved operations: Duplicate and Delete buttons
                      <div className="flex justify-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => duplicateOperation(operation)}
                                disabled={isUpdating}
                                className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => deleteOperation(operation.id)}
                          className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {displayOperations.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={type === 'corte' ? 11 : 10}
                    className="py-8 text-center"
                  >
                    Nenhuma operação encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

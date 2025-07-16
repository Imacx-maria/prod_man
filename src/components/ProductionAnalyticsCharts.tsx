'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { RotateCw, Package, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

// Types
interface OperationData {
  id: string
  data_operacao: string
  operador_id?: string | null
  num_placas_print?: number | null
  num_placas_corte?: number | null
  Tipo_Op?: string
  profiles?: {
    first_name?: string
    last_name?: string
  }
}

interface MonthlyData {
  month: string
  total_print: number
  total_corte: number
}

interface OperatorMonthlyData {
  month: string
  [key: string]: string | number // Dynamic operator names as keys
}

interface ProductionAnalyticsChartsProps {
  supabase: any
  onRefresh?: () => Promise<void>
}

// Chart color palette following design guide
const CHART_COLORS = {
  print: '#f9d16a', // Soft pastel yellow - for print operations
  corte: '#2a687a', // Muted teal blue - for corte operations
  neutral: '#72a25e', // Earthy green - for neutral states
  warning: '#c3b49e', // Warm beige - for warnings
  critical: '#3c3434', // Dark charcoal brown - for critical states
}

// Generate colors for different operators
const generateOperatorColors = (operatorCount: number) => {
  const baseColors = [
    CHART_COLORS.print,
    CHART_COLORS.corte,
    CHART_COLORS.neutral,
    CHART_COLORS.warning,
    CHART_COLORS.critical,
  ]
  const colors = []

  for (let i = 0; i < operatorCount; i++) {
    const colorIndex = i % baseColors.length
    const opacity = Math.max(0.3, 1 - Math.floor(i / baseColors.length) * 0.15)
    const color = baseColors[colorIndex]

    // Convert hex to rgba
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)

    colors.push(`rgba(${r}, ${g}, ${b}, ${opacity})`)
  }

  return colors
}

export default function ProductionAnalyticsCharts({
  supabase,
  onRefresh,
}: ProductionAnalyticsChartsProps) {
  const [operations, setOperations] = useState<OperationData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch operations data for current year
  const fetchOperationsAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const currentYear = new Date().getFullYear()
      const startDate = `${currentYear}-01-01`
      const endDate = `${currentYear}-12-31`

      const { data, error } = await supabase
        .from('producao_operacoes')
        .select(
          `
          id,
          data_operacao,
          operador_id,
          num_placas_print,
          num_placas_corte,
          Tipo_Op,
          profiles!operador_id (first_name, last_name)
        `,
        )
        .gte('data_operacao', startDate)
        .lte('data_operacao', endDate)
        .order('data_operacao', { ascending: true })

      if (error) {
        throw error
      }

      setOperations(data || [])
    } catch (err: any) {
      console.error('Error fetching operations analytics:', err)
      setError(err.message || 'Erro ao carregar dados de análise')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Refresh function that calls both local refresh and parent refresh
  const handleRefresh = useCallback(async () => {
    await fetchOperationsAnalytics()
    if (onRefresh) {
      await onRefresh()
    }
  }, [fetchOperationsAnalytics, onRefresh])

  useEffect(() => {
    fetchOperationsAnalytics()
  }, [fetchOperationsAnalytics])

  // Process data for monthly totals
  const monthlyTotals = useMemo(() => {
    const monthlyData: { [key: string]: MonthlyData } = {}

    operations.forEach((operation) => {
      if (!operation.data_operacao) return

      const date = new Date(operation.data_operacao)
      const monthKey = format(date, 'yyyy-MM')
      const monthLabel = format(date, 'MMM', { locale: pt })

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthLabel,
          total_print: 0,
          total_corte: 0,
        }
      }

      if (operation.Tipo_Op === 'Impressao' && operation.num_placas_print) {
        monthlyData[monthKey].total_print += operation.num_placas_print
      }

      if (operation.Tipo_Op === 'Corte' && operation.num_placas_corte) {
        monthlyData[monthKey].total_corte += operation.num_placas_corte
      }
    })

    return Object.values(monthlyData).sort((a, b) =>
      a.month.localeCompare(b.month),
    )
  }, [operations])

  // Process data for operator print operations
  const operatorPrintData = useMemo(() => {
    const operatorData: { [key: string]: OperatorMonthlyData } = {}
    const operatorNames: { [key: string]: string } = {}

    // First pass: collect operator names and initialize data structure
    operations
      .filter(
        (op) => op.Tipo_Op === 'Impressao' && op.operador_id && op.profiles,
      )
      .forEach((operation) => {
        const operatorName = `${operation.profiles!.first_name} ${operation.profiles!.last_name}`
        operatorNames[operation.operador_id!] = operatorName
      })

    // Second pass: aggregate data by month and operator
    operations
      .filter(
        (op) =>
          op.Tipo_Op === 'Impressao' && op.operador_id && op.num_placas_print,
      )
      .forEach((operation) => {
        if (!operation.data_operacao) return

        const date = new Date(operation.data_operacao)
        const monthKey = format(date, 'yyyy-MM')
        const monthLabel = format(date, 'MMM', { locale: pt })
        const operatorName = operatorNames[operation.operador_id!]

        if (!operatorData[monthKey]) {
          operatorData[monthKey] = { month: monthLabel }
          // Initialize all operators to 0 for this month
          Object.values(operatorNames).forEach((name) => {
            operatorData[monthKey][name] = 0
          })
        }

        if (operatorName) {
          operatorData[monthKey][operatorName] =
            ((operatorData[monthKey][operatorName] as number) || 0) +
            operation.num_placas_print!
        }
      })

    return {
      data: Object.values(operatorData).sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
      operators: Object.values(operatorNames),
    }
  }, [operations])

  // Process data for operator corte operations
  const operatorCorteData = useMemo(() => {
    const operatorData: { [key: string]: OperatorMonthlyData } = {}
    const operatorNames: { [key: string]: string } = {}

    // First pass: collect operator names and initialize data structure
    operations
      .filter((op) => op.Tipo_Op === 'Corte' && op.operador_id && op.profiles)
      .forEach((operation) => {
        const operatorName = `${operation.profiles!.first_name} ${operation.profiles!.last_name}`
        operatorNames[operation.operador_id!] = operatorName
      })

    // Second pass: aggregate data by month and operator
    operations
      .filter(
        (op) => op.Tipo_Op === 'Corte' && op.operador_id && op.num_placas_corte,
      )
      .forEach((operation) => {
        if (!operation.data_operacao) return

        const date = new Date(operation.data_operacao)
        const monthKey = format(date, 'yyyy-MM')
        const monthLabel = format(date, 'MMM', { locale: pt })
        const operatorName = operatorNames[operation.operador_id!]

        if (!operatorData[monthKey]) {
          operatorData[monthKey] = { month: monthLabel }
          // Initialize all operators to 0 for this month
          Object.values(operatorNames).forEach((name) => {
            operatorData[monthKey][name] = 0
          })
        }

        if (operatorName) {
          operatorData[monthKey][operatorName] =
            ((operatorData[monthKey][operatorName] as number) || 0) +
            operation.num_placas_corte!
        }
      })

    return {
      data: Object.values(operatorData).sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
      operators: Object.values(operatorNames),
    }
  }, [operations])

  // Calculate overview totals
  const overviewTotals = useMemo(() => {
    const totalPrint = operations
      .filter((op) => op.Tipo_Op === 'Impressao')
      .reduce((sum, op) => sum + (op.num_placas_print || 0), 0)

    const totalCorte = operations
      .filter((op) => op.Tipo_Op === 'Corte')
      .reduce((sum, op) => sum + (op.num_placas_corte || 0), 0)

    return { totalPrint, totalCorte }
  }, [operations])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando análises...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-none border-2 border-red-200 bg-red-50 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-800">
                Erro ao carregar análises
              </h3>
              <p className="mt-1 text-red-700">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RotateCw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (operations.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <Package className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="text-muted-foreground text-lg font-semibold">
          Nenhuma Operação Encontrada
        </h3>
        <p className="text-muted-foreground">
          Não existem operações de produção para o ano atual.
        </p>
        <Button variant="outline" className="mt-4" onClick={handleRefresh}>
          <RotateCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>
    )
  }

  const printOperatorColors = generateOperatorColors(
    operatorPrintData.operators.length,
  )
  const corteOperatorColors = generateOperatorColors(
    operatorCorteData.operators.length,
  )

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          Análises de Produção {new Date().getFullYear()}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          className="h-10 w-10 rounded-none"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="print">Operações de Impressão</TabsTrigger>
          <TabsTrigger value="corte">Operações de Corte</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Overview cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-none border-2 p-4">
              <h3 className="text-muted-foreground text-sm font-medium">
                Total Impressão
              </h3>
              <p className="text-2xl font-bold">
                {overviewTotals.totalPrint.toLocaleString()}
              </p>
            </Card>

            <Card className="rounded-none border-2 p-4">
              <h3 className="text-muted-foreground text-sm font-medium">
                Total Corte
              </h3>
              <p className="text-2xl font-bold">
                {overviewTotals.totalCorte.toLocaleString()}
              </p>
            </Card>

            <Card className="rounded-none border-2 p-4">
              <h3 className="text-muted-foreground text-sm font-medium">
                Total Placas
              </h3>
              <p className="text-2xl font-bold">
                {(
                  overviewTotals.totalPrint + overviewTotals.totalCorte
                ).toLocaleString()}
              </p>
            </Card>

            <Card className="rounded-none border-2 p-4">
              <h3 className="text-muted-foreground text-sm font-medium">
                Operações
              </h3>
              <p className="text-2xl font-bold">
                {operations.length.toLocaleString()}
              </p>
            </Card>
          </div>

          {/* Monthly totals charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4">
                <h3 className="text-lg leading-tight font-semibold">
                  Total Impressão por Mês
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Número de placas
                </p>
              </div>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart
                  data={monthlyTotals}
                  margin={{ top: 40, right: 40, left: 40, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [
                      value.toLocaleString(),
                      'Placas',
                    ]}
                    labelStyle={{ color: '#333' }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                    }}
                  />
                  <Bar dataKey="total_print" fill={CHART_COLORS.print} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="rounded-none border-2 p-4">
              <div className="mb-4">
                <h3 className="text-lg leading-tight font-semibold">
                  Total Corte por Mês
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Número de placas
                </p>
              </div>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart
                  data={monthlyTotals}
                  margin={{ top: 40, right: 40, left: 40, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [
                      value.toLocaleString(),
                      'Placas',
                    ]}
                    labelStyle={{ color: '#333' }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                    }}
                  />
                  <Bar dataKey="total_corte" fill={CHART_COLORS.corte} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="print" className="space-y-4">
          <Card className="rounded-none border-2 p-4">
            <div className="mb-4">
              <h3 className="text-lg leading-tight font-semibold">
                Impressão por Operador
              </h3>
              <p className="text-muted-foreground text-sm leading-tight">
                Número de placas
              </p>
            </div>
            {operatorPrintData.operators.length > 0 ? (
              <ResponsiveContainer width="100%" height={800}>
                <BarChart
                  data={operatorPrintData.data}
                  margin={{ top: 40, right: 40, left: 40, bottom: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name,
                    ]}
                    labelStyle={{ color: '#333' }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                    }}
                  />
                  {operatorPrintData.operators.map((operator, index) => (
                    <Bar
                      key={operator}
                      dataKey={operator}
                      fill={printOperatorColors[index]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <Package className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="text-muted-foreground text-lg font-semibold">
                  Nenhum Dado de Impressão
                </h3>
                <p className="text-muted-foreground">
                  Não existem operações de impressão com operadores definidos.
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="corte" className="space-y-4">
          <Card className="rounded-none border-2 p-4">
            <div className="mb-4">
              <h3 className="text-lg leading-tight font-semibold">
                Corte por Operador
              </h3>
              <p className="text-muted-foreground text-sm leading-tight">
                Número de placas
              </p>
            </div>
            {operatorCorteData.operators.length > 0 ? (
              <ResponsiveContainer width="100%" height={800}>
                <BarChart
                  data={operatorCorteData.data}
                  margin={{ top: 40, right: 40, left: 40, bottom: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name,
                    ]}
                    labelStyle={{ color: '#333' }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                    }}
                  />
                  {operatorCorteData.operators.map((operator, index) => (
                    <Bar
                      key={operator}
                      dataKey={operator}
                      fill={corteOperatorColors[index]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <Package className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="text-muted-foreground text-lg font-semibold">
                  Nenhum Dado de Corte
                </h3>
                <p className="text-muted-foreground">
                  Não existem operações de corte com operadores definidos.
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

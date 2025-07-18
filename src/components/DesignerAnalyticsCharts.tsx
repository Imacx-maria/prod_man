'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RotateCw, TrendingUp, Users, Clock, Layers } from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { pt } from 'date-fns/locale'

// Types for our data
interface MonthlyData {
  month: string
  itemsCount: number
  avgCompletionTime: number
}

interface ComplexityData {
  month: string
  [key: string]: string | number // Dynamic complexity levels
}

interface DesignerData {
  designerName: string
  fosCount: number
  avgCompletionTime: number
  [key: string]: string | number // Dynamic complexity counts
}

interface MonthlyDesignerFOs {
  month: string
  [key: string]: string | number // Dynamic designer names
}

interface AnalyticsData {
  monthlyItems: MonthlyData[]
  monthlyComplexity: ComplexityData[]
  designerPerformance: DesignerData[]
  monthlyDesignerFOs: MonthlyDesignerFOs[]
  totalItems: number
  avgGlobalCompletionTime: number
  totalFOs: number
  avgComplexityTime: { [key: string]: number }
  complexityTypes: string[]
}

// Chart colors - using design style guide palette
const CHART_COLORS = [
  '#f9d16a', // Soft pastel yellow - cartaoFavo
  '#2a687a', // Muted teal blue - rigidosOutros
  '#72a25e', // Earthy green - flexiveis
  '#c3b49e', // Warm beige - warning
  '#3c3434', // Dark charcoal brown - critical
  '#8884d8', // Purple-blue - additional colors
  '#82ca9d', // Green
  '#ffc658', // Yellow
  '#ff7300', // Orange
  '#8dd1e1', // Light blue
  '#d084d0', // Pink
  '#ffb347', // Peach
]

interface DesignerAnalyticsChartsProps {
  onRefresh?: () => void
}

const DesignerAnalyticsCharts = ({
  onRefresh,
}: DesignerAnalyticsChartsProps) => {
  const [data, setData] = useState<AnalyticsData>({
    monthlyItems: [],
    monthlyComplexity: [],
    designerPerformance: [],
    monthlyDesignerFOs: [],
    totalItems: 0,
    avgGlobalCompletionTime: 0,
    totalFOs: 0,
    avgComplexityTime: {},
    complexityTypes: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalyticsData = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createBrowserClient()

      // Calculate date range for the last 12 months
      const now = new Date()
      const startDate = startOfMonth(subMonths(now, 11)) // 12 months ago including current month
      const endDate = endOfMonth(now)

      console.log('Fetching analytics data for last 12 months:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })

      // Get all designer items with related data (only items with data_saida)
      const { data: designerItemsData, error: designerError } = await supabase
        .from('designer_items')
        .select(
          `
          id,
          item_id,
          data_in,
          data_saida,
          paginacao,
          items_base!inner(
            id,
            created_at,
            complexidade,
            folha_obra_id,
            folhas_obras!inner(
              id,
              profile_id,
              created_at,
              profiles(id, first_name, last_name)
            )
          )
        `,
        )
        .gte('items_base.created_at', startDate.toISOString())
        .lte('items_base.created_at', endDate.toISOString())
        .not('items_base.complexidade', 'eq', 'OFFSET')
        .eq('paginacao', true)
        .not('data_saida', 'is', null) // Only include items with data_saida

      if (designerError) {
        console.error('Error fetching designer items:', designerError)
        throw designerError
      }

      console.log(
        'Designer items data:',
        designerItemsData?.length || 0,
        'items',
      )

      // If no data found, show appropriate message
      if (!designerItemsData || designerItemsData.length === 0) {
        console.log('No completed items found in the last 12 months')
        setError(`Nenhum item concluído encontrado nos últimos 12 meses.`)
        setLoading(false)
        return
      }

      // Get all FOs for the last 12 months to count by designer
      const { data: fosData, error: fosError } = await supabase
        .from('folhas_obras')
        .select(
          `
          id,
          created_at,
          profile_id,
          profiles(id, first_name, last_name)
        `,
        )
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('profile_id', 'is', null)

      if (fosError) {
        console.error('Error fetching FOs:', fosError)
        throw fosError
      }

      console.log('FOs data:', fosData?.length || 0, 'FOs')

      // Process the data
      const processedData = processAnalyticsData(
        designerItemsData || [],
        fosData || [],
      )

      setData(processedData)
    } catch (err) {
      console.error('Error fetching analytics data:', err)
      setError('Erro ao carregar dados de análise')
    } finally {
      setLoading(false)
    }
  }

  const calculateCompletionDays = (
    startDate: string,
    endDate: string,
  ): number => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Reset time to start of day for accurate day calculation
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)

    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // If same day (diffDays = 0) or negative, return 1 day
    return Math.max(1, diffDays)
  }

  const processAnalyticsData = (
    designerItemsData: any[],
    fosData: any[],
  ): AnalyticsData => {
    console.log('Processing analytics data...')

    // Create month labels for the last 12 months
    const now = new Date()
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(now, 11 - i) // Start from 12 months ago to current
      return {
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MMM', { locale: pt }),
      }
    })

    // 1. Process monthly items count based on data_saida completion date
    const monthlyItemsMap = new Map<string, number>()
    const monthlyCompletionTimes = new Map<string, number[]>()

    months.forEach((month) => {
      monthlyItemsMap.set(month.label, 0)
      monthlyCompletionTimes.set(month.label, [])
    })

    // Process each designer item (all have data_saida since we filtered for it)
    designerItemsData.forEach((designerItem) => {
      const itemBase = designerItem.items_base
      if (!itemBase || !itemBase.created_at || !designerItem.data_saida) return

      // Use data_saida for the month grouping (when the work was completed)
      const completionDate = new Date(designerItem.data_saida)
      const month = format(completionDate, 'MMM', { locale: pt })

      // Count all items by completion month
      if (monthlyItemsMap.has(month)) {
        monthlyItemsMap.set(month, (monthlyItemsMap.get(month) || 0) + 1)

        // Calculate completion time: items_base.created_at to data_saida
        const completionDays = calculateCompletionDays(
          itemBase.created_at,
          designerItem.data_saida,
        )

        const times = monthlyCompletionTimes.get(month) || []
        times.push(completionDays)
        monthlyCompletionTimes.set(month, times)
      }
    })

    // Build monthly items with completion times
    const monthlyItems: MonthlyData[] = months.map((month) => {
      const times = monthlyCompletionTimes.get(month.label) || []
      const avgCompletionTime =
        times.length > 0
          ? Math.round(
              times.reduce((sum, time) => sum + time, 0) / times.length,
            )
          : 0

      return {
        month: month.label,
        itemsCount: monthlyItemsMap.get(month.label) || 0,
        avgCompletionTime,
      }
    })

    // 2. Process complexity data by completion month
    const complexityTypes = [
      ...new Set(
        designerItemsData
          .map((item) => item.items_base?.complexidade)
          .filter((complexity) => complexity && complexity !== 'OFFSET'),
      ),
    ]

    console.log('Complexity types found:', complexityTypes)

    const monthlyComplexityMap = new Map<string, Map<string, number>>()
    months.forEach((month) => {
      const complexityMap = new Map<string, number>()
      complexityTypes.forEach((complexity) => complexityMap.set(complexity, 0))
      monthlyComplexityMap.set(month.label, complexityMap)
    })

    designerItemsData.forEach((designerItem) => {
      const itemBase = designerItem.items_base
      if (!itemBase || !itemBase.complexidade || !designerItem.data_saida)
        return

      if (itemBase.complexidade !== 'OFFSET') {
        const completionDate = new Date(designerItem.data_saida)
        const month = format(completionDate, 'MMM', { locale: pt })
        const complexityMap = monthlyComplexityMap.get(month)
        if (complexityMap) {
          complexityMap.set(
            itemBase.complexidade,
            (complexityMap.get(itemBase.complexidade) || 0) + 1,
          )
        }
      }
    })

    const monthlyComplexity: ComplexityData[] = months.map((month) => {
      const result: ComplexityData = { month: month.label }
      const complexityMap = monthlyComplexityMap.get(month.label)
      if (complexityMap) {
        complexityTypes.forEach((complexity) => {
          result[complexity] = complexityMap.get(complexity) || 0
        })
      }
      return result
    })

    // 3. Process designer performance
    const designerMap = new Map<
      string,
      {
        fosCount: number
        completionTimes: number[]
        complexityCounts: Map<string, number>
      }
    >()

    // Count FOs by designer
    fosData.forEach((fo) => {
      if (fo.profiles) {
        const designerName =
          `${fo.profiles.first_name} ${fo.profiles.last_name}`.trim()
        if (!designerMap.has(designerName)) {
          designerMap.set(designerName, {
            fosCount: 0,
            completionTimes: [],
            complexityCounts: new Map(),
          })
        }
        const designer = designerMap.get(designerName)!
        designer.fosCount++
      }
    })

    // Add completion times and complexity counts from designer items
    designerItemsData.forEach((designerItem) => {
      const folhaObra = designerItem.items_base?.folhas_obras
      if (!folhaObra?.profiles || !designerItem.data_saida) return

      const designerName =
        `${folhaObra.profiles.first_name} ${folhaObra.profiles.last_name}`.trim()

      if (!designerMap.has(designerName)) {
        designerMap.set(designerName, {
          fosCount: 0,
          completionTimes: [],
          complexityCounts: new Map(),
        })
      }

      const designer = designerMap.get(designerName)!

      // Add completion time: items_base.created_at to data_saida
      if (designerItem.items_base?.created_at) {
        const completionTime = calculateCompletionDays(
          designerItem.items_base.created_at,
          designerItem.data_saida,
        )
        designer.completionTimes.push(completionTime)
      }

      // Add complexity count
      const complexity = designerItem.items_base?.complexidade
      if (complexity && complexity !== 'OFFSET') {
        designer.complexityCounts.set(
          complexity,
          (designer.complexityCounts.get(complexity) || 0) + 1,
        )
      }
    })

    const designerPerformance: DesignerData[] = Array.from(
      designerMap.entries(),
    ).map(([name, data]) => {
      const result: DesignerData = {
        designerName: name,
        fosCount: data.fosCount,
        avgCompletionTime:
          data.completionTimes.length > 0
            ? Math.round(
                data.completionTimes.reduce((sum, time) => sum + time, 0) /
                  data.completionTimes.length,
              )
            : 0,
      }

      // Add complexity counts
      complexityTypes.forEach((complexity) => {
        result[complexity] = data.complexityCounts.get(complexity) || 0
      })

      return result
    })

    // 4. Process monthly FOs by designer (based on FO creation date)
    const monthlyDesignerFOsMap = new Map<string, Map<string, number>>()
    months.forEach((month) => {
      monthlyDesignerFOsMap.set(month.label, new Map())
    })

    fosData.forEach((fo) => {
      if (fo.profiles) {
        const foDate = new Date(fo.created_at)
        const month = format(foDate, 'MMM', { locale: pt })
        const designerName =
          `${fo.profiles.first_name} ${fo.profiles.last_name}`.trim()

        const monthMap = monthlyDesignerFOsMap.get(month)
        if (monthMap) {
          monthMap.set(designerName, (monthMap.get(designerName) || 0) + 1)
        }
      }
    })

    const allDesigners = [
      ...new Set(
        fosData
          .map((fo) =>
            fo.profiles
              ? `${fo.profiles.first_name} ${fo.profiles.last_name}`.trim()
              : '',
          )
          .filter(Boolean),
      ),
    ]

    const monthlyDesignerFOs: MonthlyDesignerFOs[] = months.map((month) => {
      const result: MonthlyDesignerFOs = { month: month.label }
      const monthMap = monthlyDesignerFOsMap.get(month.label)
      allDesigners.forEach((designer) => {
        result[designer] = monthMap?.get(designer) || 0
      })
      return result
    })

    // 5. Calculate average completion time by complexity
    const avgComplexityTime: { [key: string]: number } = {}
    complexityTypes.forEach((complexity) => {
      const times = designerItemsData
        .filter(
          (item) =>
            item.items_base?.complexidade === complexity &&
            complexity !== 'OFFSET' &&
            item.data_saida &&
            item.items_base?.created_at,
        )
        .map((item) =>
          calculateCompletionDays(item.items_base.created_at, item.data_saida),
        )

      avgComplexityTime[complexity] =
        times.length > 0
          ? Math.round(
              times.reduce((sum, time) => sum + time, 0) / times.length,
            )
          : 0
    })

    // Calculate totals
    const totalItems = designerItemsData.length
    const allCompletionTimes = designerItemsData
      .filter((item) => item.data_saida && item.items_base?.created_at)
      .map((item) =>
        calculateCompletionDays(item.items_base.created_at, item.data_saida),
      )

    const avgGlobalCompletionTime =
      allCompletionTimes.length > 0
        ? Math.round(
            allCompletionTimes.reduce((sum, time) => sum + time, 0) /
              allCompletionTimes.length,
          )
        : 0

    const totalFOs = fosData.length

    console.log('Processed data summary:', {
      totalItems,
      avgGlobalCompletionTime,
      totalFOs,
      complexityTypesCount: complexityTypes.length,
      designersCount: designerPerformance.length,
      dateRange: `${months[0]?.label} - ${months[months.length - 1]?.label}`,
      designerPerformance: designerPerformance,
    })

    return {
      monthlyItems,
      monthlyComplexity,
      designerPerformance,
      monthlyDesignerFOs,
      totalItems,
      avgGlobalCompletionTime,
      totalFOs,
      avgComplexityTime,
      complexityTypes,
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, []) // fetchAnalyticsData - temporarily removed to prevent infinite loop

  const handleRefresh = async () => {
    await fetchAnalyticsData()
    if (onRefresh) {
      onRefresh()
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="text-center">
          <RotateCw className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2">Carregando análises...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <Button onClick={handleRefresh} className="mt-4" variant="outline">
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl leading-tight font-bold">
            Análises & Gráficos Designer - Últimos 12 Meses
          </h2>
          <p className="text-muted-foreground leading-tight">
            Itens concluídos, tempo de conclusão (created_at → data_saída) e
            análise por complexidade
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-none"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-none border-2">
          <TabsTrigger value="overview" className="rounded-none">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="complexity" className="rounded-none">
            Análise por Complexidade
          </TabsTrigger>
          <TabsTrigger value="team" className="rounded-none">
            Performance da Equipa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-none border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm leading-tight font-medium">
                    Total de Itens
                  </CardTitle>
                  <p className="text-muted-foreground text-xs leading-tight">
                    Itens concluídos (últimos 12 meses)
                  </p>
                </div>
                <Layers className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalItems}</div>
              </CardContent>
            </Card>

            <Card className="rounded-none border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm leading-tight font-medium">
                    Tempo Médio Global
                  </CardTitle>
                  <p className="text-muted-foreground text-xs leading-tight">
                    Created_at até Data-Saída
                  </p>
                </div>
                <Clock className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.avgGlobalCompletionTime}
                </div>
                <p className="text-muted-foreground text-xs">dias</p>
              </CardContent>
            </Card>

            <Card className="rounded-none border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm leading-tight font-medium">
                    Total de FOs
                  </CardTitle>
                  <p className="text-muted-foreground text-xs leading-tight">
                    Folhas de obra criadas
                  </p>
                </div>
                <TrendingUp className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalFOs}</div>
              </CardContent>
            </Card>

            <Card className="rounded-none border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm leading-tight font-medium">
                    Designers Ativos
                  </CardTitle>
                  <p className="text-muted-foreground text-xs leading-tight">
                    Membros da equipa
                  </p>
                </div>
                <Users className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.designerPerformance.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-none border-2">
              <CardHeader className="mb-4">
                <div>
                  <CardTitle className="text-lg leading-tight font-bold">
                    Itens por Mês
                  </CardTitle>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Número de itens concluídos (excluindo OFFSET)
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {data.monthlyItems.every((item) => item.itemsCount === 0) ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center">
                    <h3 className="text-muted-foreground text-lg font-semibold">
                      Nenhum Dado Encontrado
                    </h3>
                    <p className="text-muted-foreground">
                      Não foram encontrados itens concluídos para este período.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={450}>
                    <BarChart
                      data={data.monthlyItems}
                      margin={{ top: 40, right: 40, left: 40, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [
                          `${value} itens`,
                          'Quantidade',
                        ]}
                      />
                      <Bar
                        dataKey="itemsCount"
                        fill={CHART_COLORS[0]}
                        name="Itens"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-none border-2">
              <CardHeader className="mb-4">
                <div>
                  <CardTitle className="text-lg leading-tight font-bold">
                    Tempo Médio por Mês
                  </CardTitle>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Created_at até Data-Saída (dias)
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {data.monthlyItems.every(
                  (item) => item.avgCompletionTime === 0,
                ) ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center">
                    <h3 className="text-muted-foreground text-lg font-semibold">
                      Nenhum Dado Encontrado
                    </h3>
                    <p className="text-muted-foreground">
                      Não foram encontrados dados de tempo de conclusão.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={450}>
                    <LineChart
                      data={data.monthlyItems}
                      margin={{ top: 40, right: 40, left: 40, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [
                          `${value} dias`,
                          'Tempo Médio',
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgCompletionTime"
                        stroke={CHART_COLORS[1]}
                        strokeWidth={3}
                        dot={{ fill: CHART_COLORS[1], strokeWidth: 2, r: 4 }}
                        name="Tempo Médio (dias)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="complexity" className="space-y-6">
          {/* Complexity Analysis */}
          <div className="grid gap-6">
            <Card className="rounded-none border-2">
              <CardHeader className="mb-4">
                <div>
                  <CardTitle className="text-lg leading-tight font-bold">
                    Trabalhos por Complexidade - Mês
                  </CardTitle>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Quantidade de trabalhos concluídos por nível de complexidade
                    (excluindo OFFSET)
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {data.complexityTypes.length === 0 ||
                data.monthlyComplexity.every((month) =>
                  data.complexityTypes.every(
                    (complexity) => (month as any)[complexity] === 0,
                  ),
                ) ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center">
                    <h3 className="text-muted-foreground text-lg font-semibold">
                      Nenhum Dado Encontrado
                    </h3>
                    <p className="text-muted-foreground">
                      Não foram encontrados dados de complexidade para itens
                      concluídos neste período.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={450}>
                    <BarChart
                      data={data.monthlyComplexity}
                      margin={{ top: 40, right: 40, left: 40, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${value} trabalhos`,
                          name,
                        ]}
                      />
                      {data.complexityTypes.map(
                        (complexity: string, index: number) => (
                          <Bar
                            key={complexity}
                            dataKey={complexity}
                            stackId="complexity"
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            name={complexity}
                          />
                        ),
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Average time by complexity */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(data.avgComplexityTime)
                .filter(
                  ([complexity, avgTime]) =>
                    complexity !== 'OFFSET' && avgTime > 0,
                )
                .map(([complexity, avgTime]) => (
                  <Card key={complexity} className="rounded-none border-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm leading-tight font-medium">
                        {complexity}
                      </CardTitle>
                      <p className="text-muted-foreground text-xs leading-tight">
                        Tempo médio de conclusão
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{avgTime}</div>
                      <p className="text-muted-foreground text-xs">dias</p>
                    </CardContent>
                  </Card>
                ))}
              {Object.entries(data.avgComplexityTime).filter(
                ([complexity, avgTime]) =>
                  complexity !== 'OFFSET' && avgTime > 0,
              ).length === 0 && (
                <div className="col-span-full flex h-32 flex-col items-center justify-center text-center">
                  <h3 className="text-muted-foreground text-lg font-semibold">
                    Nenhum Dado Encontrado
                  </h3>
                  <p className="text-muted-foreground">
                    Não foram encontrados dados de tempo por complexidade.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          {/* Team Performance */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-none border-2">
              <CardHeader className="mb-4">
                <div>
                  <CardTitle className="text-lg leading-tight font-bold">
                    FOs por Designer - Mês
                  </CardTitle>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Número de folhas de obra atribuídas por designer
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {data.designerPerformance.length === 0 ||
                data.monthlyDesignerFOs.every((month) =>
                  data.designerPerformance.every(
                    (designer) => (month as any)[designer.designerName] === 0,
                  ),
                ) ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center">
                    <h3 className="text-muted-foreground text-lg font-semibold">
                      Nenhum Dado Encontrado
                    </h3>
                    <p className="text-muted-foreground">
                      Não foram encontradas FOs atribuídas a designers.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={data.monthlyDesignerFOs}
                      margin={{ top: 40, right: 40, left: 40, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${value} FOs`,
                          name,
                        ]}
                      />
                      {data.designerPerformance.map((designer, index) => (
                        <Bar
                          key={designer.designerName}
                          dataKey={designer.designerName}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-none border-2">
              <CardHeader className="mb-4">
                <div>
                  <CardTitle className="text-lg leading-tight font-bold">
                    Performance por Designer
                  </CardTitle>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Tempo médio de conclusão por designer
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {data.designerPerformance.length === 0 ||
                data.designerPerformance.every(
                  (d) => Number(d.avgCompletionTime) === 0,
                ) ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center">
                    <h3 className="text-muted-foreground text-lg font-semibold">
                      Nenhum Dado Encontrado
                    </h3>
                    <p className="text-muted-foreground">
                      Não foram encontrados dados de performance dos designers.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={data.designerPerformance.filter(
                        (d) => Number(d.avgCompletionTime) > 0,
                      )}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="designerName"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        label={{
                          value: 'Dias',
                          angle: -90,
                          position: 'insideLeft',
                        }}
                        domain={[0, 'dataMax + 1']}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          `${value} dias`,
                          'Tempo Médio de Conclusão',
                        ]}
                        labelFormatter={(label) => `Designer: ${label}`}
                      />
                      <Bar
                        dataKey="avgCompletionTime"
                        fill={CHART_COLORS[0]}
                        name="Tempo Médio (dias)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Designer Complexity Performance */}
          <Card className="rounded-none border-2">
            <CardHeader className="mb-4">
              <div>
                <CardTitle className="text-lg leading-tight font-bold">
                  Trabalhos por Complexidade - Designer
                </CardTitle>
                <p className="text-muted-foreground text-sm leading-tight">
                  Quantidade de trabalhos concluídos por designer e complexidade
                  (excluindo OFFSET)
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {data.designerPerformance.length === 0 ||
              data.complexityTypes.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <h3 className="text-muted-foreground text-lg font-semibold">
                    Nenhum Dado Encontrado
                  </h3>
                  <p className="text-muted-foreground">
                    Não foram encontrados dados de trabalhos concluídos por
                    complexidade dos designers.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart
                    data={data.designerPerformance}
                    margin={{ top: 40, right: 40, left: 40, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="designerName"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis
                      label={{
                        value: 'Trabalhos',
                        angle: -90,
                        position: 'insideLeft',
                      }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} trabalhos`,
                        name,
                      ]}
                      labelFormatter={(label: string) => `Designer: ${label}`}
                    />
                    {data.complexityTypes.map(
                      (complexity: string, index: number) => (
                        <Bar
                          key={complexity}
                          dataKey={complexity}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          name={complexity}
                          radius={[2, 2, 0, 0]}
                        />
                      ),
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DesignerAnalyticsCharts

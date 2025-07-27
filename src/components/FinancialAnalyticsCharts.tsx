'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  RotateCw,
  TrendingUp,
  TrendingDown,
  Euro,
  Users,
  Loader2,
} from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
  groupMonthYearData,
  groupMonthYearDataByYear,
  formatSimplePeriodDisplay,
  type MonthYearData,
  type SimpleGroupedData,
  convertToStandardPeriod,
  convertToDisplayPeriod,
  // Legacy functions for backward compatibility during transition
  groupDataByMonth,
  groupDataByYear,
  formatPeriodDisplay,
  type DateGroupableData,
  type GroupedData,
} from '@/utils/date'
import SalesPerformanceCharts from '@/components/SalesPerformanceCharts'

// Types for financial data (monthly aggregated views)
interface FaturasVendedorMonthly {
  id: string
  numero_documento: string
  data_documento: string // MM/YYYY format from monthly view
  nome_cliente: string
  euro_total: number
  nome: string // Standardized seller name from view
  department: string // Standardized department from view
  transaction_count: number // Count of original transactions
  created_at: string // View timestamp
  updated_at: string // View timestamp
}

interface OrcamentosVendedorMonthly {
  id: string
  numero_documento: string
  data_documento: string // MM/YYYY format from monthly view
  nome_cliente: string
  euro_total: number
  nome_utilizador: string
  iniciais_utilizador: string
  nome: string // Standardized seller name from view
  department: string // Standardized department from view
  transaction_count: number // Count of original transactions
  created_at: string // View timestamp
  updated_at: string // View timestamp
}

interface ListagemComprasMonthly {
  id: string
  nome_fornecedor: string
  data_documento: string // MM/YYYY format from monthly view
  nome_dossier: string
  euro_total: number
  transaction_count: number // Count of original transactions
  created_at: string // View timestamp
  updated_at: string // View timestamp
}

interface NeFornecedorMonthly {
  id: string
  numero_documento: string
  data_documento: string // MM/YYYY format from monthly view
  nome_fornecedor: string
  euro_total: number
  nome_utilizador: string
  transaction_count: number // Count of original transactions
  created_at: string // View timestamp
  updated_at: string // View timestamp
}

interface ListagemNotasCreditoMonthly {
  id: string
  numero_documento: string
  data_documento: string // MM/YYYY format from monthly view
  nome_fornecedor: string
  euro_total: number
  nome_utilizador: string
  transaction_count: number // Count of original transactions
  created_at: string // View timestamp
  updated_at: string // View timestamp
}

interface FinancialData {
  faturasVendedor: FaturasVendedorMonthly[]
  orcamentosVendedor: OrcamentosVendedorMonthly[]
  listagemCompras: ListagemComprasMonthly[]
  neFornecedor: NeFornecedorMonthly[]
  listagemNotasCredito: ListagemNotasCreditoMonthly[]
}

interface FinancialAnalyticsChartsProps {
  supabase: any
  onRefresh?: () => Promise<void>
}

// Chart color palette following design guide
const CHART_COLORS = {
  vendas: '#22c55e', // Green for sales
  compras: '#ef4444', // Red for purchases
  orcamentos: '#3b82f6', // Blue for quotes
  margem: '#8b5cf6', // Purple for margin
  neutral: '#6b7280', // Gray for neutral data
}

export default function FinancialAnalyticsCharts({
  supabase,
  onRefresh,
}: FinancialAnalyticsChartsProps) {
  const [financialData, setFinancialData] = useState<FinancialData>({
    faturasVendedor: [],
    orcamentosVendedor: [],
    listagemCompras: [],
    neFornecedor: [],
    listagemNotasCredito: [],
  })
  const [multiYearData, setMultiYearData] = useState<FaturasVendedorMonthly[]>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch multi-year faturas data for yearly comparison chart
  const fetchMultiYearData = useCallback(async () => {
    try {
      // Dynamic year range: from 4 years ago to next year
      const currentYear = new Date().getFullYear()
      const startYear = currentYear - 4
      const endYear = currentYear + 1

      // Fetch data for each year separately with pagination to get ALL records
      const allYearlyData: FaturasVendedorMonthly[] = []

      for (let year = startYear; year <= endYear; year++) {
        let allYearData: FaturasVendedorMonthly[] = []
        let hasMoreData = true
        let page = 0

        // Paginate through all data for this year
        while (hasMoreData) {
          const startRange = page * 1000
          const endRange = startRange + 999

          const { data, error, count } = await supabase
            .from('faturas_vendedor_monthly')
            .select('*', { count: 'exact' })
            .order('data_documento', { ascending: true })
            .range(startRange, endRange)

          if (error) {
            throw new Error(`Multi-year faturas for ${year}: ${error.message}`)
          }

          // Filter data to only include our target year in MM/YYYY format
          if (data && data.length > 0) {
            const filteredData = data.filter((item: FaturasVendedorMonthly) => {
              const dataParts = item.data_documento.split('/')
              if (dataParts.length === 2) {
                const itemYear = parseInt(dataParts[1])
                return itemYear === year
              }
              return false
            })

            allYearData = [...allYearData, ...filteredData]

            // If we got fewer than 1000 records, we've reached the end
            if (data.length < 1000) {
              hasMoreData = false
            } else {
              // Move to next page
              page++
            }
          } else {
            // No data returned, end pagination
            hasMoreData = false
          }
        }

        // Add this year's data to the overall collection
        allYearlyData.push(...allYearData)
      }

      setMultiYearData(allYearlyData)
    } catch (err: any) {
      console.error('Error fetching multi-year data:', err)
      // Don't set main error for this, just log it
    }
  }, [supabase])

  // Fetch financial data for current and next year
  const fetchFinancialData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Dynamic year range: current year and next year
      const currentYear = new Date().getFullYear()
      const targetYears = [currentYear, currentYear + 1]

      // Helper function to generate MM/YYYY patterns for a given year
      const generateMonthYearPatterns = (year: number): string[] => {
        return Array.from({ length: 12 }, (_, i) => {
          const month = String(i + 1).padStart(2, '0')
          return `${month}/${year}`
        })
      }

      // Helper function to fetch all data with pagination for MM/YYYY format
      const fetchAllWithPagination = async <
        T extends { data_documento: string; id: string },
      >(
        table: string,
        years: number[],
      ): Promise<T[]> => {
        // Generate all MM/YYYY patterns for target years
        const patterns = years.flatMap(generateMonthYearPatterns)

        let allData: T[] = []
        let hasMoreData = true
        let page = 0

        while (hasMoreData) {
          const startRange = page * 1000
          const endRange = startRange + 999

          // Use 'in' operator to match any of the MM/YYYY patterns, or fetch all and filter
          // Since 'in' might not work well with many patterns, let's use a broader approach
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .order('data_documento', { ascending: true })
            .range(startRange, endRange)

          if (error) {
            throw new Error(`${table}: ${error.message}`)
          }

          // Filter data to only include our target years in MM/YYYY format
          if (data && data.length > 0) {
            const filteredData = data.filter((item: T) => {
              const dataParts = item.data_documento.split('/')
              if (dataParts.length === 2) {
                const year = parseInt(dataParts[1])
                return years.includes(year)
              }
              return false
            })

            allData = [...allData, ...filteredData]

            // If we got fewer than 1000 records, we've reached the end
            if (data.length < 1000) {
              hasMoreData = false
            } else {
              // Move to next page
              page++
            }
          } else {
            // No data returned, end pagination
            hasMoreData = false
          }
        }

        return allData
      }

      // Fetch all financial tables with pagination
      const faturasData = await fetchAllWithPagination<FaturasVendedorMonthly>(
        'faturas_vendedor_monthly',
        targetYears,
      )
      const orcamentosData =
        await fetchAllWithPagination<OrcamentosVendedorMonthly>(
          'orcamentos_vendedor_monthly',
          targetYears,
        )
      const listagemData = await fetchAllWithPagination<ListagemComprasMonthly>(
        'listagem_compras_monthly',
        targetYears,
      )
      const neData = await fetchAllWithPagination<NeFornecedorMonthly>(
        'ne_fornecedor_monthly',
        targetYears,
      )
      const notasCreditoData =
        await fetchAllWithPagination<ListagemNotasCreditoMonthly>(
          'listagem_notas_credito_monthly',
          targetYears,
        )

      setFinancialData({
        faturasVendedor: faturasData || [],
        orcamentosVendedor: orcamentosData || [],
        listagemCompras: listagemData || [],
        neFornecedor: neData || [],
        listagemNotasCredito: notasCreditoData || [],
      })

      // Also fetch multi-year data
      await fetchMultiYearData()
    } catch (err: any) {
      console.error('Error fetching financial data:', err)
      setError(err.message || 'Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }, [supabase, fetchMultiYearData])

  // Refresh function that calls both local refresh and parent refresh
  const handleRefresh = useCallback(async () => {
    await fetchFinancialData()
    if (onRefresh) {
      await onRefresh()
    }
  }, [fetchFinancialData, onRefresh])

  useEffect(() => {
    fetchFinancialData()
  }, [fetchFinancialData])

  // Calculate overview metrics and monthly data using new grouping utilities
  const chartData = useMemo(() => {
    // Get current date information
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1 // JavaScript months are 0-indexed

    // Debug: Log euro_total values by month for faturas_vendedor
    const faturasMonthlyTotals = new Map<string, number>()

    financialData.faturasVendedor.forEach((fatura) => {
      const dateParts = fatura.data_documento.split('/')
      const month = parseInt(dateParts[0])
      const year = parseInt(dateParts[1])

      if (year === currentYear) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`
        const currentTotal = faturasMonthlyTotals.get(monthKey) || 0
        faturasMonthlyTotals.set(
          monthKey,
          currentTotal + (fatura.euro_total || 0),
        )
      }
    })

    // Debug: Log euro_total values by month for listagem_compras
    const comprasMonthlyTotals = new Map<string, number>()

    financialData.listagemCompras.forEach((compra) => {
      const dateParts = compra.data_documento.split('/')
      const month = parseInt(dateParts[0])
      const year = parseInt(dateParts[1])

      if (year === currentYear) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`
        const currentTotal = comprasMonthlyTotals.get(monthKey) || 0
        comprasMonthlyTotals.set(
          monthKey,
          currentTotal + (compra.euro_total || 0),
        )
      }
    })

    // Current year data for year-to-date cards
    const currentYearStart = new Date(currentYear, 0, 1) // January 1st of current year

    // Year-to-date data for second row of cards
    const yearToDateFaturas = financialData.faturasVendedor.filter((f) => {
      const dateParts = f.data_documento.split('/')
      const year = parseInt(dateParts[1])
      return year === currentYear
    })

    const yearToDateCompras = financialData.listagemCompras.filter((c) => {
      const dateParts = c.data_documento.split('/')
      const year = parseInt(dateParts[1])
      return year === currentYear
    })

    // Group data by month
    const faturasGroupedByMonth = new Map<string, FaturasVendedorMonthly[]>()
    const comprasGroupedByMonth = new Map<string, ListagemComprasMonthly[]>()

    financialData.faturasVendedor.forEach((fatura) => {
      const dateParts = fatura.data_documento.split('/')
      const month = parseInt(dateParts[0])
      const year = parseInt(dateParts[1])
      const monthKey = `${year}-${String(month).padStart(2, '0')}`

      if (!faturasGroupedByMonth.has(monthKey)) {
        faturasGroupedByMonth.set(monthKey, [])
      }

      faturasGroupedByMonth.get(monthKey)?.push(fatura)
    })

    financialData.listagemCompras.forEach((compra) => {
      const dateParts = compra.data_documento.split('/')
      const month = parseInt(dateParts[0])
      const year = parseInt(dateParts[1])
      const monthKey = `${year}-${String(month).padStart(2, '0')}`

      if (!comprasGroupedByMonth.has(monthKey)) {
        comprasGroupedByMonth.set(monthKey, [])
      }

      comprasGroupedByMonth.get(monthKey)?.push(compra)
    })

    // Get all month keys and sort them in descending order (most recent first)
    const allMonthKeys = Array.from(
      new Set([
        ...Array.from(faturasGroupedByMonth.keys()),
        ...Array.from(comprasGroupedByMonth.keys()),
      ]),
    )
      .sort()
      .reverse()

    // Current month key
    const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

    // Use current month if it has data, otherwise use the most recent month with data
    const monthToUse = allMonthKeys.includes(currentMonthKey)
      ? currentMonthKey
      : allMonthKeys.length > 0
        ? allMonthKeys[0]
        : currentMonthKey

    // Get the data for the selected month
    const selectedMonthFaturas = faturasGroupedByMonth.get(monthToUse) || []
    const selectedMonthCompras = comprasGroupedByMonth.get(monthToUse) || []

    // Check if we're using fallback data (not current month)
    const usingFallbackData = monthToUse !== currentMonthKey

    // Monthly metrics calculations
    const totalVendasMes = selectedMonthFaturas.reduce(
      (sum, f) => sum + (f.euro_total || 0),
      0,
    )
    const totalComprasMes = selectedMonthCompras.reduce(
      (sum, c) => sum + (c.euro_total || 0),
      0,
    )

    // Calculate Margem Bruta as both monetary value and percentage
    const margemBrutaMes = totalVendasMes - totalComprasMes
    const margemBrutaPercentage =
      totalVendasMes > 0
        ? ((totalVendasMes - totalComprasMes) / totalVendasMes) * 100
        : 0

    // Year-to-date metrics calculations
    const totalVendasAno = yearToDateFaturas.reduce(
      (sum, f) => sum + (f.euro_total || 0),
      0,
    )
    const totalComprasAno = yearToDateCompras.reduce(
      (sum, c) => sum + (c.euro_total || 0),
      0,
    )

    // Calculate Year-to-date Margem Bruta as both monetary value and percentage
    const margemBrutaAno = totalVendasAno - totalComprasAno
    const margemBrutaAnoPercentage =
      totalVendasAno > 0
        ? ((totalVendasAno - totalComprasAno) / totalVendasAno) * 100
        : 0

    // Use new simplified grouping utility for MM/YYYY monthly data

    // Create monthly evolution data for charts
    // Convert financial data to MonthYearData format and group by month
    const faturasMonthYearData: MonthYearData[] =
      financialData.faturasVendedor.map((fatura) => ({
        data_documento: fatura.data_documento, // Already in MM/YYYY format
        euro_total: fatura.euro_total,
        id: fatura.id,
        nome_vendedor: fatura.nome, // Updated to use nome field
        nome_cliente: fatura.nome_cliente,
      }))

    const comprasMonthYearData: MonthYearData[] =
      financialData.listagemCompras.map((compra) => ({
        data_documento: compra.data_documento, // Already in MM/YYYY format
        euro_total: compra.euro_total,
        id: compra.id,
        nome_fornecedor: compra.nome_fornecedor,
      }))

    // Group by month with euro_total aggregation - much simpler now!
    const chartFaturasGroupedByMonth = groupMonthYearData(
      faturasMonthYearData,
      ['euro_total'],
    )
    const chartComprasGroupedByMonth = groupMonthYearData(
      comprasMonthYearData,
      ['euro_total'],
    )

    // Create combined monthly data
    const monthlyDataMap = new Map<
      string,
      {
        monthKey: string
        month: string
        vendas: number
        compras: number
        cashFlow: number
      }
    >()

    // Add vendas data
    chartFaturasGroupedByMonth.forEach((group) => {
      const monthLabel = formatSimplePeriodDisplay(group.period, 'month')
      monthlyDataMap.set(group.period, {
        monthKey: group.period,
        month: monthLabel,
        vendas: group.euro_total || 0,
        compras: 0,
        cashFlow: 0,
      })
    })

    // Add compras data
    chartComprasGroupedByMonth.forEach((group) => {
      const monthLabel = formatSimplePeriodDisplay(group.period, 'month')
      const existing = monthlyDataMap.get(group.period)
      if (existing) {
        existing.compras = group.euro_total || 0
        existing.cashFlow = existing.vendas - existing.compras
      } else {
        monthlyDataMap.set(group.period, {
          monthKey: group.period,
          month: monthLabel,
          vendas: 0,
          compras: group.euro_total || 0,
          cashFlow: -(group.euro_total || 0),
        })
      }
    })

    // Finalize cash flow calculations
    monthlyDataMap.forEach((month) => {
      month.cashFlow = month.vendas - month.compras
    })

    // Convert to array and sort chronologically
    const monthlyDataArray = Array.from(monthlyDataMap.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey),
    )

    return {
      overviewMetrics: {
        totalVendasMes,
        totalComprasMes,
        margemBrutaPercentage,
        margemBrutaMes,
        // Add year-to-date metrics
        totalVendasAno,
        totalComprasAno,
        margemBrutaAnoPercentage,
        margemBrutaAno,
        // Add fallback indicator
        usingFallbackData,
        fallbackMonth: usingFallbackData ? monthToUse : null,
      },
      monthlyEvolution: monthlyDataArray,
      cashFlowData: monthlyDataArray,
    }
  }, [financialData])

  // Process multi-year data for yearly comparison chart - SIDE BY SIDE BY MONTH
  const yearlyComparisonData = useMemo(() => {
    if (!multiYearData || multiYearData.length === 0) {
      return { data: [], availableYears: [] }
    }

    // Build data structure: year -> month -> total
    const yearlyData: { [year: string]: { [month: string]: number } } = {}
    const allYears = new Set<string>()
    const allMonths = new Set<string>()

    // Process each fatura to aggregate by year and month - MM/YYYY format
    multiYearData.forEach((fatura) => {
      const dateStr = fatura.data_documento

      // Parse MM/YYYY format
      const dateParts = dateStr.split('/')
      if (dateParts.length !== 2) {
        console.warn('⚠️ Invalid MM/YYYY date format:', dateStr)
        return
      }

      const monthNum = parseInt(dateParts[0])
      const year = dateParts[1]

      // Create month label using Portuguese abbreviations
      const monthNames = [
        'jan',
        'fev',
        'mar',
        'abr',
        'mai',
        'jun',
        'jul',
        'ago',
        'set',
        'out',
        'nov',
        'dez',
      ]
      const monthLabel = monthNames[monthNum - 1]

      if (!monthLabel) {
        console.warn('⚠️ Invalid month number:', monthNum, 'in', dateStr)
        return
      }

      allYears.add(year)
      allMonths.add(monthLabel)

      if (!yearlyData[year]) {
        yearlyData[year] = {}
      }
      if (!yearlyData[year][monthLabel]) {
        yearlyData[year][monthLabel] = 0
      }
      yearlyData[year][monthLabel] += fatura.euro_total || 0
    })

    const availableYears = Array.from(allYears).sort()

    // Create chart data: each entry = one month with all years as properties
    // Using lowercase month names to match what's coming from the date formatter
    const monthOrder = [
      'jan',
      'fev',
      'mar',
      'abr',
      'mai',
      'jun',
      'jul',
      'ago',
      'set',
      'out',
      'nov',
      'dez',
    ]

    const chartData = monthOrder
      .filter((month) => allMonths.has(month)) // Only include months that have data
      .map((month) => {
        const monthData: { month: string; [year: string]: number | string } = {
          month,
        }

        // Add data for each available year (0 if no data for that month/year)
        availableYears.forEach((year) => {
          monthData[year] = yearlyData[year][month] || 0
        })

        return monthData
      })

    return { data: chartData, availableYears }
  }, [multiYearData])

  // Process data for sales performance

  // Process data for operational costs using new grouping utilities
  const operationalCostsData = useMemo(() => {
    // Distribuição de compras: Operacionais (ne_fornecedor) vs Outras (listagem_compras)
    const totalOperacional = financialData.neFornecedor.reduce(
      (sum, ne) => sum + (ne.euro_total || 0),
      0,
    )
    const totalOutras = financialData.listagemCompras.reduce(
      (sum, compra) => sum + (compra.euro_total || 0),
      0,
    )
    const totalCompras = totalOperacional + totalOutras

    const distribuicaoCompras = [
      {
        name: 'Compras Operacionais',
        value: Math.round(totalOperacional),
        percentage:
          totalCompras > 0 ? (totalOperacional / totalCompras) * 100 : 0,
      },
      {
        name: 'Outras Compras',
        value: Math.round(totalOutras),
        percentage: totalCompras > 0 ? (totalOutras / totalCompras) * 100 : 0,
      },
    ].filter((item) => item.value > 0)

    // Top 10 fornecedores (combinando ne_fornecedor + listagem_compras)
    const fornecedorTotals: { [key: string]: number } = {}

    // Aggregate from ne_fornecedor
    financialData.neFornecedor.forEach((ne) => {
      const fornecedor = ne.nome_fornecedor || 'Fornecedor Desconhecido'
      fornecedorTotals[fornecedor] =
        (fornecedorTotals[fornecedor] || 0) + (ne.euro_total || 0)
    })

    // Aggregate from listagem_compras
    financialData.listagemCompras.forEach((compra) => {
      const fornecedor = compra.nome_fornecedor || 'Fornecedor Desconhecido'
      fornecedorTotals[fornecedor] =
        (fornecedorTotals[fornecedor] || 0) + (compra.euro_total || 0)
    })

    const top10Fornecedores = Object.entries(fornecedorTotals)
      .map(([fornecedor, total]) => ({
        name:
          fornecedor.length > 25
            ? fornecedor.substring(0, 25) + '...'
            : fornecedor,
        fullName: fornecedor,
        value: Math.round(total),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    // Custos operacionais vs vendas using new grouping utilities (last 12 months)

    // Get last 12 months data - simplified for MM/YYYY format
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1 // 1-12

    // Generate last 12 months in MM/YYYY format
    const last12Months: string[] = []
    for (let i = 11; i >= 0; i--) {
      const targetDate = subMonths(currentDate, i)
      const month = String(targetDate.getMonth() + 1).padStart(2, '0')
      const year = targetDate.getFullYear()
      last12Months.push(`${month}/${year}`)
    }

    // Filter data for last 12 months and convert to MonthYearData format
    const recentVendas: MonthYearData[] = financialData.faturasVendedor
      .filter((f) => last12Months.includes(f.data_documento))
      .map((f) => ({
        data_documento: f.data_documento,
        euro_total: f.euro_total,
      }))

    const recentNe: MonthYearData[] = financialData.neFornecedor
      .filter((n) => last12Months.includes(n.data_documento))
      .map((n) => ({
        data_documento: n.data_documento,
        euro_total: n.euro_total,
      }))

    // Group by month - much simpler now since data is already monthly
    const vendasGrouped = groupMonthYearData(recentVendas, ['euro_total'])
    const neGrouped = groupMonthYearData(recentNe, ['euro_total'])

    // Create combined data map
    const monthlyComparison = new Map<
      string,
      {
        month: string
        vendas: number
        custosOperacionais: number
        percentagem: number
      }
    >()

    // Initialize last 12 months - use the same periods we generated above
    last12Months.forEach((mmyyyy) => {
      const standardPeriod = convertToStandardPeriod(mmyyyy)
      const monthLabel = formatSimplePeriodDisplay(standardPeriod, 'month')

      monthlyComparison.set(standardPeriod, {
        month: monthLabel,
        vendas: 0,
        custosOperacionais: 0,
        percentagem: 0,
      })
    })

    // Add vendas data
    vendasGrouped.forEach((group) => {
      const existing = monthlyComparison.get(group.period)
      if (existing) {
        existing.vendas = group.euro_total || 0
      }
    })

    // Add operational costs (ne_fornecedor only)
    neGrouped.forEach((group) => {
      const existing = monthlyComparison.get(group.period)
      if (existing) {
        existing.custosOperacionais = group.euro_total || 0
      }
    })

    // Calculate percentage of operational costs over sales
    monthlyComparison.forEach((month) => {
      month.percentagem =
        month.vendas > 0 ? (month.custosOperacionais / month.vendas) * 100 : 0
    })

    const custosVsVendasData = Array.from(monthlyComparison.values())

    return {
      distribuicaoCompras,
      top10Fornecedores,
      custosVsVendasData,
    }
  }, [financialData])

  // Process data for temporal analysis using simplified MM/YYYY grouping
  const temporalAnalysisData = useMemo(() => {
    // Get current year data - simplified for MM/YYYY format
    const currentYear = new Date().getFullYear()

    // Generate current year months in MM/YYYY format
    const currentYearMonths: string[] = []
    for (let month = 1; month <= 12; month++) {
      currentYearMonths.push(`${String(month).padStart(2, '0')}/${currentYear}`)
    }

    // Filter current year data - much simpler now!
    const currentYearOrcamentos: MonthYearData[] =
      financialData.orcamentosVendedor
        .filter((o) => currentYearMonths.includes(o.data_documento))
        .map((o) => ({
          data_documento: o.data_documento,
          euro_total: o.euro_total,
        }))

    // Note: Since vendas_vendedor no longer exists, we'll use faturasVendedor for sales data
    const currentYearVendas: MonthYearData[] = financialData.faturasVendedor
      .filter((v) => currentYearMonths.includes(v.data_documento))
      .map((v) => ({
        data_documento: v.data_documento,
        euro_total: v.euro_total,
      }))

    const currentYearFaturas: MonthYearData[] = financialData.faturasVendedor
      .filter((f) => currentYearMonths.includes(f.data_documento))
      .map((f) => ({
        data_documento: f.data_documento,
        euro_total: f.euro_total,
      }))

    // Group by month - no complex aggregation needed since data is already monthly
    const orcamentosGrouped = groupMonthYearData(currentYearOrcamentos, [
      'euro_total',
    ])
    const vendasGrouped = groupMonthYearData(currentYearVendas, ['euro_total'])
    const faturasGrouped = groupMonthYearData(currentYearFaturas, [
      'euro_total',
    ])

    // Create pipeline data map
    // Note: Since vendas_vendedor no longer exists, vendas and faturas will show the same data from faturas_vendedor
    const pipelineData = new Map<
      string,
      { month: string; orcamentos: number; vendas: number; faturas: number }
    >()

    // Initialize current year months - use the same periods we generated above
    currentYearMonths.forEach((mmyyyy) => {
      const standardPeriod = convertToStandardPeriod(mmyyyy)
      const monthLabel = formatSimplePeriodDisplay(standardPeriod, 'month')

      pipelineData.set(standardPeriod, {
        month: monthLabel,
        orcamentos: 0,
        vendas: 0,
        faturas: 0,
      })
    })

    // Add grouped data
    orcamentosGrouped.forEach((group) => {
      const existing = pipelineData.get(group.period)
      if (existing) {
        existing.orcamentos = group.euro_total || 0
      }
    })

    vendasGrouped.forEach((group) => {
      const existing = pipelineData.get(group.period)
      if (existing) {
        existing.vendas = group.euro_total || 0
      }
    })

    faturasGrouped.forEach((group) => {
      const existing = pipelineData.get(group.period)
      if (existing) {
        existing.faturas = group.euro_total || 0
      }
    })

    const pipelineArray = Array.from(pipelineData.values())

    // Crescimento month-over-month (current vs previous month) - simplified for MM/YYYY
    const currentDate = new Date()
    const currentMonthMM = String(currentDate.getMonth() + 1).padStart(2, '0')
    const currentMonthYYYY = currentDate.getFullYear()
    const currentMonthKey = `${currentMonthMM}/${currentMonthYYYY}`

    const previousDate = subMonths(currentDate, 1)
    const previousMonthMM = String(previousDate.getMonth() + 1).padStart(2, '0')
    const previousMonthYYYY = previousDate.getFullYear()
    const previousMonthKey = `${previousMonthMM}/${previousMonthYYYY}`

    // Current month data - direct filtering by MM/YYYY key
    const currentMonthVendas = financialData.faturasVendedor
      .filter((f) => f.data_documento === currentMonthKey)
      .reduce((sum, f) => sum + (f.euro_total || 0), 0)

    const currentMonthCompras = financialData.listagemCompras
      .filter((c) => c.data_documento === currentMonthKey)
      .reduce((sum, c) => sum + (c.euro_total || 0), 0)

    const currentMonthNe = financialData.neFornecedor
      .filter((n) => n.data_documento === currentMonthKey)
      .reduce((sum, n) => sum + (n.euro_total || 0), 0)

    // Previous month data - direct filtering by MM/YYYY key
    const previousMonthVendas = financialData.faturasVendedor
      .filter((f) => f.data_documento === previousMonthKey)
      .reduce((sum, f) => sum + (f.euro_total || 0), 0)

    const previousMonthCompras = financialData.listagemCompras
      .filter((c) => c.data_documento === previousMonthKey)
      .reduce((sum, c) => sum + (c.euro_total || 0), 0)

    const previousMonthNe = financialData.neFornecedor
      .filter((n) => n.data_documento === previousMonthKey)
      .reduce((sum, n) => sum + (n.euro_total || 0), 0)

    // Calculate growth percentages
    const vendasGrowth =
      previousMonthVendas > 0
        ? ((currentMonthVendas - previousMonthVendas) / previousMonthVendas) *
          100
        : 0
    const comprasGrowth =
      previousMonthCompras > 0
        ? ((currentMonthCompras - previousMonthCompras) /
            previousMonthCompras) *
          100
        : 0
    const margemGrowth =
      previousMonthVendas - previousMonthNe > 0
        ? ((currentMonthVendas -
            currentMonthNe -
            (previousMonthVendas - previousMonthNe)) /
            (previousMonthVendas - previousMonthNe)) *
          100
        : 0

    const crescimentoData = [
      {
        category: 'Vendas',
        atual: Math.round(currentMonthVendas),
        anterior: Math.round(previousMonthVendas),
        crescimento: Math.round(vendasGrowth * 10) / 10,
      },
      {
        category: 'Compras',
        atual: Math.round(currentMonthCompras),
        anterior: Math.round(previousMonthCompras),
        crescimento: Math.round(comprasGrowth * 10) / 10,
      },
      {
        category: 'Margem',
        atual: Math.round(currentMonthVendas - currentMonthNe),
        anterior: Math.round(previousMonthVendas - previousMonthNe),
        crescimento: Math.round(margemGrowth * 10) / 10,
      },
    ]

    return {
      pipelineArray,
      crescimentoData,
    }
  }, [financialData])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando análises financeiras...</span>
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
                Erro ao carregar análises financeiras
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

  return (
    <div className="space-y-6 pb-8">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          Análises Financeiras {new Date().getFullYear() - 1}-
          {new Date().getFullYear()}
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
        <TabsList className="grid w-full grid-cols-4 rounded-none border-2">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="vendas">Performance de Vendas</TabsTrigger>
          <TabsTrigger value="custos">Custos Operacionais</TabsTrigger>
          <TabsTrigger value="analise">Análise Temporal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Overview cards */}
          <div className="space-y-4">
            {/* Monthly data cards - first row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-none border-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-muted-foreground text-sm font-medium">
                      Total Vendas do Mês
                    </h3>
                    <p className="text-2xl font-bold text-green-600">
                      {chartData.overviewMetrics.totalVendasMes.toLocaleString(
                        'pt-PT',
                        {
                          style: 'currency',
                          currency: 'EUR',
                        },
                      )}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </Card>

              <Card className="rounded-none border-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-muted-foreground text-sm font-medium">
                      Total Compras do Mês
                    </h3>
                    <p className="text-2xl font-bold text-red-600">
                      {chartData.overviewMetrics.totalComprasMes.toLocaleString(
                        'pt-PT',
                        {
                          style: 'currency',
                          currency: 'EUR',
                        },
                      )}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </Card>

              <Card className="rounded-none border-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-muted-foreground text-sm font-medium">
                      Margem Bruta (%)
                    </h3>
                    <p
                      className={`text-2xl font-bold ${chartData.overviewMetrics.margemBrutaPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {chartData.overviewMetrics.margemBrutaPercentage.toFixed(
                        1,
                      )}
                      %
                    </p>
                  </div>
                  <Euro className="h-8 w-8 text-purple-600" />
                </div>
              </Card>

              <Card className="rounded-none border-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-muted-foreground text-sm font-medium">
                      Margem Bruta
                    </h3>
                    <p
                      className={`text-2xl font-bold ${chartData.overviewMetrics.margemBrutaMes >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {chartData.overviewMetrics.margemBrutaMes.toLocaleString(
                        'pt-PT',
                        {
                          style: 'currency',
                          currency: 'EUR',
                        },
                      )}
                    </p>
                  </div>
                  <Euro className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
            </div>

            {/* Year-to-date data cards - second row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-none border-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-muted-foreground text-sm font-medium">
                      Total Vendas do Ano
                    </h3>
                    <p className="text-2xl font-bold text-green-600">
                      {chartData.overviewMetrics.totalVendasAno.toLocaleString(
                        'pt-PT',
                        {
                          style: 'currency',
                          currency: 'EUR',
                        },
                      )}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </Card>

              <Card className="rounded-none border-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-muted-foreground text-sm font-medium">
                      Total Compras do Ano
                    </h3>
                    <p className="text-2xl font-bold text-red-600">
                      {chartData.overviewMetrics.totalComprasAno.toLocaleString(
                        'pt-PT',
                        {
                          style: 'currency',
                          currency: 'EUR',
                        },
                      )}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </Card>

              <Card className="rounded-none border-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-muted-foreground text-sm font-medium">
                      Margem Bruta Anual (%)
                    </h3>
                    <p
                      className={`text-2xl font-bold ${chartData.overviewMetrics.margemBrutaAnoPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {chartData.overviewMetrics.margemBrutaAnoPercentage.toFixed(
                        1,
                      )}
                      %
                    </p>
                  </div>
                  <Euro className="h-8 w-8 text-purple-600" />
                </div>
              </Card>

              <Card className="rounded-none border-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-muted-foreground text-sm font-medium">
                      Margem Bruta Anual
                    </h3>
                    <p
                      className={`text-2xl font-bold ${chartData.overviewMetrics.margemBrutaAno >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {chartData.overviewMetrics.margemBrutaAno.toLocaleString(
                        'pt-PT',
                        {
                          style: 'currency',
                          currency: 'EUR',
                        },
                      )}
                    </p>
                  </div>
                  <Euro className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
            </div>
          </div>

          {/* Charts */}
          <div className="space-y-6">
            {/* Monthly Evolution Line Chart */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Evolução Mensal - Vendas vs Compras
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    {new Date().getFullYear()}
                  </p>
                </div>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="icon"
                  className="h-10"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={chartData.monthlyEvolution}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toLocaleString('pt-PT', {
                        style: 'currency',
                        currency: 'EUR',
                      }),
                      name === 'vendas' ? 'Vendas' : 'Compras',
                    ]}
                    labelStyle={{ color: '#333' }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '0px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="vendas"
                    stroke={CHART_COLORS.vendas}
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.vendas, strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="compras"
                    stroke={CHART_COLORS.compras}
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.compras, strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Cash Flow Bar Chart */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Cash Flow Mensal
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Diferença entre vendas e compras (verde: positivo, vermelho:
                    negativo)
                  </p>
                </div>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="icon"
                  className="h-10"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={chartData.cashFlowData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      value.toLocaleString('pt-PT', {
                        style: 'currency',
                        currency: 'EUR',
                      }),
                      value >= 0 ? 'Cash Flow Positivo' : 'Cash Flow Negativo',
                    ]}
                    labelStyle={{ color: '#333' }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '0px',
                    }}
                  />
                  <Bar dataKey="cashFlow">
                    {chartData.cashFlowData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.cashFlow >= 0
                            ? CHART_COLORS.vendas
                            : CHART_COLORS.compras
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Yearly Comparison Bar Chart - SIDE BY SIDE BY MONTH */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Comparação Anual de Vendas
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Valor Vendas por mês
                  </p>
                  <div className="text-muted-foreground mt-1 text-xs">
                    Anos disponíveis:{' '}
                    {yearlyComparisonData.availableYears.join(', ')} | Dados:{' '}
                    {yearlyComparisonData.data.length} meses
                  </div>
                </div>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="icon"
                  className="h-10"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={yearlyComparisonData.data}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toLocaleString('pt-PT', {
                        style: 'currency',
                        currency: 'EUR',
                      }),
                      `Vendas ${name}`,
                    ]}
                    labelStyle={{ color: '#333' }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '0px',
                    }}
                  />
                  {yearlyComparisonData.availableYears.map((year, index) => {
                    // Cycle through different colors for each year to create side-by-side effect
                    const colors = [
                      CHART_COLORS.vendas,
                      CHART_COLORS.orcamentos,
                      '#94a3b8',
                      '#f97316',
                      '#10b981',
                      '#8b5cf6',
                    ]
                    const fillColor = colors[index % colors.length]

                    return (
                      <Bar
                        key={year}
                        dataKey={year}
                        fill={fillColor}
                        name={year}
                      />
                    )
                  })}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vendas" className="space-y-4">
          <SalesPerformanceCharts supabase={supabase} onRefresh={onRefresh} />
        </TabsContent>

        <TabsContent value="custos" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Distribuição de Compras - Pie Chart */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Distribuição de Compras
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Operacionais vs Outras compras
                  </p>
                </div>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="icon"
                  className="h-10"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={operationalCostsData.distribuicaoCompras}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) =>
                      `${name}: ${percentage.toFixed(1)}%`
                    }
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill={CHART_COLORS.compras} />
                    <Cell fill={CHART_COLORS.neutral} />
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name) => [
                      value.toLocaleString('pt-PT', {
                        style: 'currency',
                        currency: 'EUR',
                      }),
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Custos Operacionais vs Vendas - Line Chart */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Custos Operacionais vs Vendas
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Percentagem de custos operacionais sobre vendas
                  </p>
                </div>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="icon"
                  className="h-10"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={operationalCostsData.custosVsVendasData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'percentagem') {
                        return [`${value.toFixed(1)}%`, 'Custos/Vendas']
                      }
                      return [
                        value.toLocaleString('pt-PT', {
                          style: 'currency',
                          currency: 'EUR',
                        }),
                        name === 'vendas' ? 'Vendas' : 'Custos Operacionais',
                      ]
                    }}
                    labelStyle={{ color: '#333' }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '0px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentagem"
                    stroke={CHART_COLORS.margem}
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.margem, strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Top 10 Fornecedores - Bar Chart */}
          <Card className="rounded-none border-2 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-tight font-semibold">
                  Top 10 Fornecedores
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Fornecedores com maior volume de compras (operacionais +
                  outras)
                </p>
              </div>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="icon"
                className="h-10"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart
                data={operationalCostsData.top10Fornecedores}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                />
                <Tooltip
                  formatter={(value: number, name, props: any) => [
                    value.toLocaleString('pt-PT', {
                      style: 'currency',
                      currency: 'EUR',
                    }),
                    'Total Compras',
                  ]}
                  labelFormatter={(label, payload) =>
                    payload && payload[0]
                      ? `Fornecedor: ${payload[0].payload.fullName}`
                      : `Fornecedor: ${label}`
                  }
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '0px',
                  }}
                />
                <Bar dataKey="value" fill={CHART_COLORS.compras} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="analise" className="space-y-4">
          {/* Pipeline de Vendas - Multi-line Chart */}
          <Card className="rounded-none border-2 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-tight font-semibold">
                  Pipeline de Vendas
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Orçamentos criados, vendas concretizadas e faturas emitidas (
                  {new Date().getFullYear()})
                </p>
              </div>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="icon"
                className="h-10"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={450}>
              <LineChart
                data={temporalAnalysisData.pipelineArray}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    value.toLocaleString('pt-PT', {
                      style: 'currency',
                      currency: 'EUR',
                    }),
                    name === 'orcamentos'
                      ? 'Orçamentos Criados'
                      : name === 'vendas'
                        ? 'Vendas Concretizadas'
                        : 'Faturas Emitidas',
                  ]}
                  labelStyle={{ color: '#333' }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '0px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="orcamentos"
                  stroke={CHART_COLORS.orcamentos}
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS.orcamentos, strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="vendas"
                  stroke={CHART_COLORS.neutral}
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS.neutral, strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="faturas"
                  stroke={CHART_COLORS.vendas}
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS.vendas, strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Crescimento Month-over-Month */}
          <Card className="rounded-none border-2 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-tight font-semibold">
                  Crescimento Month-over-Month
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Comparação entre{' '}
                  {format(subMonths(new Date(), 1), 'MMMM', { locale: pt })} e{' '}
                  {format(new Date(), 'MMMM', { locale: pt })}
                </p>
              </div>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="icon"
                className="h-10"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={temporalAnalysisData.crescimentoData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'crescimento') {
                      return [`${value}%`, 'Crescimento']
                    }
                    return [
                      value.toLocaleString('pt-PT', {
                        style: 'currency',
                        currency: 'EUR',
                      }),
                      name === 'atual' ? 'Mês Atual' : 'Mês Anterior',
                    ]
                  }}
                  labelStyle={{ color: '#333' }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '0px',
                  }}
                />
                <Bar dataKey="crescimento">
                  {temporalAnalysisData.crescimentoData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.crescimento >= 0
                          ? CHART_COLORS.vendas
                          : CHART_COLORS.compras
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

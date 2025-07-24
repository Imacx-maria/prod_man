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
  groupDataByMonth,
  groupDataByYear,
  formatPeriodDisplay,
  type DateGroupableData,
  type GroupedData,
} from '@/utils/date'

// Types for financial data
interface VendasVendedor {
  id: string
  numero_documento: string
  data_documento: string // Renamed from data to match actual field name
  nome_cliente: string
  euro_total: number
  nome_vendedor: string
}

interface FaturasVendedor {
  id: string
  numero_documento: string
  data_documento: string // Renamed from data to match actual field name
  nome_cliente: string
  euro_total: number
  nome_vendedor: string
}

interface OrcamentosVendedor {
  id: string
  numero_documento: string
  data_documento: string // Renamed from data to match actual field name
  nome_cliente: string
  euro_total: number
  nome_utilizador: string
  iniciais_utilizador: string
}

interface ListagemCompras {
  id: string
  nome_fornecedor: string
  data_documento: string // Renamed from data to match actual field name
  nome_dossier: string
  euro_total: number
}

interface NeFornecedor {
  id: string
  numero_documento: string
  data_documento: string // Renamed from data to match actual field name
  nome_fornecedor: string
  euro_total: number
  nome_utilizador: string
}

interface FinancialData {
  vendasVendedor: VendasVendedor[]
  faturasVendedor: FaturasVendedor[]
  orcamentosVendedor: OrcamentosVendedor[]
  listagemCompras: ListagemCompras[]
  neFornecedor: NeFornecedor[]
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
    vendasVendedor: [],
    faturasVendedor: [],
    orcamentosVendedor: [],
    listagemCompras: [],
    neFornecedor: [],
  })
  const [multiYearData, setMultiYearData] = useState<FaturasVendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch multi-year faturas data for yearly comparison chart
  const fetchMultiYearData = useCallback(async () => {
    try {
      // Dynamic year range: from 4 years ago to next year
      const currentYear = new Date().getFullYear()
      const startYear = currentYear - 4
      const endYear = currentYear + 1

      console.log('🔍 Fetching multi-year data from', startYear, 'to', endYear)

      // Fetch data for each year separately with pagination to get ALL records
      const allYearlyData: FaturasVendedor[] = []

      for (let year = startYear; year <= endYear; year++) {
        const yearStart = `${year}-01-01`
        const yearEnd = `${year}-12-31`

        console.log(`📅 Fetching data for year ${year} with pagination...`)

        let allYearData: FaturasVendedor[] = []
        let hasMoreData = true
        let page = 0

        // Paginate through all data for this year
        while (hasMoreData) {
          const startRange = page * 1000
          const endRange = startRange + 999

          console.log(
            `📄 Fetching page ${page + 1} (range ${startRange}-${endRange}) for year ${year}`,
          )

          const { data, error, count } = await supabase
            .from('faturas_vendedor')
            .select('*', { count: 'exact' })
            .gte('data_documento', yearStart)
            .lte('data_documento', yearEnd)
            .order('data_documento', { ascending: true })
            .range(startRange, endRange)

          if (error) {
            throw new Error(`Multi-year faturas for ${year}: ${error.message}`)
          }

          // Add this batch to our year data
          if (data && data.length > 0) {
            allYearData = [...allYearData, ...data]
            console.log(
              `✅ Fetched ${data.length} records for year ${year}, page ${page + 1}`,
            )

            // If we got fewer than 1000 records, we've reached the end
            if (data.length < 1000) {
              hasMoreData = false
              console.log(
                `🏁 Reached end of data for year ${year} with ${allYearData.length} total records`,
              )
            } else {
              // Move to next page
              page++
            }
          } else {
            // No data returned, end pagination
            hasMoreData = false
            console.log(`🏁 No more data for year ${year}`)
          }
        }

        // Add this year's data to the overall collection
        allYearlyData.push(...allYearData)
        console.log(`📊 Year ${year} complete: ${allYearData.length} records`)
      }

      console.log('📊 Fetched data by year:', {
        totalRecords: allYearlyData.length,
        yearCounts: Array.from({ length: endYear - startYear + 1 }, (_, i) => {
          const year = startYear + i
          const yearData = allYearlyData.filter((item) => {
            const dateParts = item.data_documento.split('-')
            return parseInt(dateParts[0]) === year
          })
          return {
            year,
            count: yearData.length,
          }
        }),
      })

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
      // Dynamic date range: current year and next year
      const currentYear = new Date().getFullYear()
      const startDate = `${currentYear}-01-01`
      const endDate = `${currentYear + 1}-12-31`

      console.log('🔍 Fetching financial data for', startDate, 'to', endDate)

      // Helper function to fetch all data with pagination
      const fetchAllWithPagination = async <
        T extends { data_documento: string; id: string },
      >(
        table: string,
        startDate: string,
        endDate: string,
      ): Promise<T[]> => {
        console.log(`📊 Fetching all ${table} data with pagination...`)

        let allData: T[] = []
        let hasMoreData = true
        let page = 0

        while (hasMoreData) {
          const startRange = page * 1000
          const endRange = startRange + 999

          console.log(
            `📄 Fetching ${table} page ${page + 1} (range ${startRange}-${endRange})`,
          )

          const { data, error } = await supabase
            .from(table)
            .select('*')
            .gte('data_documento', startDate)
            .lte('data_documento', endDate)
            .order('data_documento', { ascending: true })
            .range(startRange, endRange)

          if (error) {
            throw new Error(`${table}: ${error.message}`)
          }

          // Add this batch to our data
          if (data && data.length > 0) {
            allData = [...allData, ...data]
            console.log(
              `✅ Fetched ${data.length} ${table} records, page ${page + 1}`,
            )

            // If we got fewer than 1000 records, we've reached the end
            if (data.length < 1000) {
              hasMoreData = false
              console.log(
                `🏁 Reached end of ${table} data with ${allData.length} total records`,
              )
            } else {
              // Move to next page
              page++
            }
          } else {
            // No data returned, end pagination
            hasMoreData = false
            console.log(`🏁 No more ${table} data`)
          }
        }

        return allData
      }

      // Fetch all financial tables with pagination
      console.log('🔄 Starting to fetch all financial data with pagination...')

      const vendasData = await fetchAllWithPagination<VendasVendedor>(
        'vendas_vendedor',
        startDate,
        endDate,
      )
      const faturasData = await fetchAllWithPagination<FaturasVendedor>(
        'faturas_vendedor',
        startDate,
        endDate,
      )
      const orcamentosData = await fetchAllWithPagination<OrcamentosVendedor>(
        'orcamentos_vendedor',
        startDate,
        endDate,
      )
      const listagemData = await fetchAllWithPagination<ListagemCompras>(
        'listagem_compras',
        startDate,
        endDate,
      )
      const neData = await fetchAllWithPagination<NeFornecedor>(
        'ne_fornecedor',
        startDate,
        endDate,
      )

      console.log('✅ All financial data fetched successfully:')
      console.log(`- Vendas: ${vendasData.length} records`)
      console.log(`- Faturas: ${faturasData.length} records`)
      console.log(`- Orçamentos: ${orcamentosData.length} records`)
      console.log(`- Listagem Compras: ${listagemData.length} records`)
      console.log(`- NE Fornecedor: ${neData.length} records`)

      setFinancialData({
        vendasVendedor: vendasData,
        faturasVendedor: faturasData,
        orcamentosVendedor: orcamentosData,
        listagemCompras: listagemData,
        neFornecedor: neData,
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

    console.log('Current date:', currentDate.toISOString())
    console.log('Current year/month:', currentYear, currentMonth)

    // Log some sample data to verify date formats
    if (financialData.faturasVendedor.length > 0) {
      console.log(
        'Sample fatura data_documento:',
        financialData.faturasVendedor[0].data_documento,
      )
    }
    if (financialData.listagemCompras.length > 0) {
      console.log(
        'Sample compra data_documento:',
        financialData.listagemCompras[0].data_documento,
      )
    }

    // Debug: Log euro_total values by month for faturas_vendedor
    console.log('--- FATURAS VENDEDOR BY MONTH ---')
    const faturasMonthlyTotals = new Map<string, number>()

    financialData.faturasVendedor.forEach((fatura) => {
      const dateParts = fatura.data_documento.split('-')
      const year = parseInt(dateParts[0])
      const month = parseInt(dateParts[1])

      if (year === currentYear) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`
        const currentTotal = faturasMonthlyTotals.get(monthKey) || 0
        faturasMonthlyTotals.set(
          monthKey,
          currentTotal + (fatura.euro_total || 0),
        )
      }
    })

    // Sort by month and log
    const sortedMonths = Array.from(faturasMonthlyTotals.keys()).sort()
    sortedMonths.forEach((month) => {
      console.log(
        `Month ${month}: ${faturasMonthlyTotals
          .get(month)
          ?.toLocaleString('pt-PT', {
            style: 'currency',
            currency: 'EUR',
          })}`,
      )
    })

    // Debug: Log euro_total values by month for listagem_compras
    console.log('--- LISTAGEM COMPRAS BY MONTH ---')
    const comprasMonthlyTotals = new Map<string, number>()

    financialData.listagemCompras.forEach((compra) => {
      const dateParts = compra.data_documento.split('-')
      const year = parseInt(dateParts[0])
      const month = parseInt(dateParts[1])

      if (year === currentYear) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`
        const currentTotal = comprasMonthlyTotals.get(monthKey) || 0
        comprasMonthlyTotals.set(
          monthKey,
          currentTotal + (compra.euro_total || 0),
        )
      }
    })

    // Sort by month and log
    const sortedComprasMonths = Array.from(comprasMonthlyTotals.keys()).sort()
    sortedComprasMonths.forEach((month) => {
      console.log(
        `Month ${month}: ${comprasMonthlyTotals
          .get(month)
          ?.toLocaleString('pt-PT', {
            style: 'currency',
            currency: 'EUR',
          })}`,
      )
    })

    // Current year data for year-to-date cards
    const currentYearStart = new Date(currentYear, 0, 1) // January 1st of current year

    // Year-to-date data for second row of cards
    const yearToDateFaturas = financialData.faturasVendedor.filter((f) => {
      const dateParts = f.data_documento.split('-')
      const year = parseInt(dateParts[0])
      return year === currentYear
    })

    const yearToDateCompras = financialData.listagemCompras.filter((c) => {
      const dateParts = c.data_documento.split('-')
      const year = parseInt(dateParts[0])
      return year === currentYear
    })

    console.log('Year-to-date data counts:', {
      faturas: yearToDateFaturas.length,
      compras: yearToDateCompras.length,
    })

    // Group data by month
    const faturasGroupedByMonth = new Map<string, FaturasVendedor[]>()
    const comprasGroupedByMonth = new Map<string, ListagemCompras[]>()

    financialData.faturasVendedor.forEach((fatura) => {
      const dateParts = fatura.data_documento.split('-')
      const year = parseInt(dateParts[0])
      const month = parseInt(dateParts[1])
      const monthKey = `${year}-${String(month).padStart(2, '0')}`

      if (!faturasGroupedByMonth.has(monthKey)) {
        faturasGroupedByMonth.set(monthKey, [])
      }

      faturasGroupedByMonth.get(monthKey)?.push(fatura)
    })

    financialData.listagemCompras.forEach((compra) => {
      const dateParts = compra.data_documento.split('-')
      const year = parseInt(dateParts[0])
      const month = parseInt(dateParts[1])
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

    console.log('Available months with data:', allMonthKeys)

    // Current month key
    const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    console.log('Current month key:', currentMonthKey)

    // Use current month if it has data, otherwise use the most recent month with data
    const monthToUse = allMonthKeys.includes(currentMonthKey)
      ? currentMonthKey
      : allMonthKeys.length > 0
        ? allMonthKeys[0]
        : currentMonthKey
    console.log('Month being used for monthly data:', monthToUse)

    // Get the data for the selected month
    const selectedMonthFaturas = faturasGroupedByMonth.get(monthToUse) || []
    const selectedMonthCompras = comprasGroupedByMonth.get(monthToUse) || []

    console.log('Selected month data counts:', {
      faturas: selectedMonthFaturas.length,
      compras: selectedMonthCompras.length,
    })

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

    // Use new grouping utility for monthly aggregation

    // Create monthly evolution data for charts
    // Convert financial data to DateGroupableData format and group by month
    const faturasGroupableData: DateGroupableData[] =
      financialData.faturasVendedor.map((fatura) => ({
        data: fatura.data_documento,
        euro_total: fatura.euro_total,
        id: fatura.id,
        nome_vendedor: fatura.nome_vendedor,
        nome_cliente: fatura.nome_cliente,
      }))

    const comprasGroupableData: DateGroupableData[] =
      financialData.listagemCompras.map((compra) => ({
        data: compra.data_documento,
        euro_total: compra.euro_total,
        id: compra.id,
        nome_fornecedor: compra.nome_fornecedor,
      }))

    // Group by month with euro_total aggregation
    const chartFaturasGroupedByMonth = groupDataByMonth(faturasGroupableData, [
      'euro_total',
    ])
    const chartComprasGroupedByMonth = groupDataByMonth(comprasGroupableData, [
      'euro_total',
    ])

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
      const monthLabel = formatPeriodDisplay(group.period, 'month')
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
      const monthLabel = formatPeriodDisplay(group.period, 'month')
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

    console.log(
      '🔍 Processing multi-year data:',
      multiYearData.length,
      'records',
    )

    // Build data structure: year -> month -> total
    const yearlyData: { [year: string]: { [month: string]: number } } = {}
    const allYears = new Set<string>()
    const allMonths = new Set<string>()

    // Process each fatura to aggregate by year and month
    multiYearData.forEach((fatura) => {
      // Use a more reliable date parsing approach
      const dateStr = fatura.data_documento

      // Parse date using split for more reliable extraction of year
      const dateParts = dateStr.split('-')
      if (dateParts.length !== 3) {
        console.warn('⚠️ Invalid date format:', dateStr)
        return
      }

      const year = dateParts[0]
      const monthNum = parseInt(dateParts[1])

      // Create a date object for month label formatting
      const date = new Date(parseInt(year), monthNum - 1, 1)
      const monthLabel = format(date, 'MMM', { locale: pt })

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

    console.log('📊 Available years:', availableYears)
    console.log('📊 Available months:', Array.from(allMonths))

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

    // Temporary debug: log final chart data structure
    if (chartData.length > 0) {
      console.log('🎯 CHART DATA READY:', {
        months: chartData.length,
        years: availableYears,
        sample: chartData[0],
      })
    } else {
      console.log('⚠️ CHART DATA EMPTY:', {
        multiYearDataLength: multiYearData?.length || 0,
        availableYears: availableYears.length,
      })
    }

    return { data: chartData, availableYears }
  }, [multiYearData])

  // Process data for sales performance
  const salesPerformanceData = useMemo(() => {
    // Vendas por vendedor (pie chart data)
    const vendasPorVendedor: { [key: string]: number } = {}
    financialData.faturasVendedor.forEach((fatura) => {
      const vendedor = fatura.nome_vendedor || 'Sem Vendedor'
      vendasPorVendedor[vendedor] =
        (vendasPorVendedor[vendedor] || 0) + (fatura.euro_total || 0)
    })

    const vendasVendedorData = Object.entries(vendasPorVendedor)
      .map(([vendedor, total]) => ({
        name: vendedor,
        value: Math.round(total),
        percentage: 0, // Will be calculated below
      }))
      .sort((a, b) => b.value - a.value)

    const totalVendasVendedores = vendasVendedorData.reduce(
      (sum, item) => sum + item.value,
      0,
    )
    vendasVendedorData.forEach((item) => {
      item.percentage =
        totalVendasVendedores > 0
          ? (item.value / totalVendasVendedores) * 100
          : 0
    })

    // Top 10 clientes (horizontal bar chart data)
    const vendasPorCliente: { [key: string]: number } = {}
    financialData.faturasVendedor.forEach((fatura) => {
      const cliente = fatura.nome_cliente || 'Cliente Desconhecido'
      vendasPorCliente[cliente] =
        (vendasPorCliente[cliente] || 0) + (fatura.euro_total || 0)
    })

    const top10Clientes = Object.entries(vendasPorCliente)
      .map(([cliente, total]) => ({
        name: cliente.length > 30 ? cliente.substring(0, 30) + '...' : cliente,
        fullName: cliente,
        value: Math.round(total),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    // Taxa de conversão por vendedor (bar chart data)
    const orcamentosPorVendedor: { [key: string]: number } = {}
    const faturasPorVendedor: { [key: string]: number } = {}

    // Aggregate orcamentos by user initials
    financialData.orcamentosVendedor.forEach((orcamento) => {
      const vendedor =
        orcamento.iniciais_utilizador ||
        orcamento.nome_utilizador ||
        'Sem Vendedor'
      orcamentosPorVendedor[vendedor] =
        (orcamentosPorVendedor[vendedor] || 0) + (orcamento.euro_total || 0)
    })

    // Aggregate faturas by vendedor
    financialData.faturasVendedor.forEach((fatura) => {
      const vendedor = fatura.nome_vendedor || 'Sem Vendedor'
      faturasPorVendedor[vendedor] =
        (faturasPorVendedor[vendedor] || 0) + (fatura.euro_total || 0)
    })

    // Create conversion rate data
    const conversaoData = Object.keys({
      ...orcamentosPorVendedor,
      ...faturasPorVendedor,
    })
      .map((vendedor) => {
        const orcamentos = orcamentosPorVendedor[vendedor] || 0
        const faturas = faturasPorVendedor[vendedor] || 0
        const conversao = orcamentos > 0 ? (faturas / orcamentos) * 100 : 0

        return {
          name: vendedor,
          orcamentos: Math.round(orcamentos),
          faturas: Math.round(faturas),
          conversao: Math.round(conversao * 10) / 10, // Round to 1 decimal
        }
      })
      .filter((item) => item.orcamentos > 0 || item.faturas > 0) // Only include vendedores with activity
      .sort((a, b) => b.conversao - a.conversao)
      .slice(0, 8) // Top 8 vendedores

    return {
      vendasVendedorData: vendasVendedorData.slice(0, 8), // Top 8 for pie chart
      top10Clientes,
      conversaoData,
    }
  }, [financialData])

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

    // Get last 12 months data
    const twelveMonthsAgo = subMonths(new Date(), 12)

    // Filter data for last 12 months and convert to groupable format
    const recentVendas: DateGroupableData[] = financialData.faturasVendedor
      .filter((f) => new Date(f.data_documento) >= twelveMonthsAgo)
      .map((f) => ({
        data: f.data_documento,
        euro_total: f.euro_total,
      }))

    const recentNe: DateGroupableData[] = financialData.neFornecedor
      .filter((n) => new Date(n.data_documento) >= twelveMonthsAgo)
      .map((n) => ({
        data: n.data_documento,
        euro_total: n.euro_total,
      }))

    // Group by month
    const vendasGrouped = groupDataByMonth(recentVendas, ['euro_total'])
    const neGrouped = groupDataByMonth(recentNe, ['euro_total'])

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

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i)
      const monthKey = format(monthDate, 'yyyy-MM')
      const monthLabel = format(monthDate, 'MMM', { locale: pt })

      monthlyComparison.set(monthKey, {
        month: monthLabel,
        vendas: 0,
        custosOperacionais: 0,
        percentagem: 0,
      })
    }

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

  // Process data for temporal analysis using new grouping utilities
  const temporalAnalysisData = useMemo(() => {
    // Get current year data and convert to groupable format
    const currentYear = new Date().getFullYear()
    const currentYearStart = new Date(currentYear, 0, 1)
    const currentYearEnd = new Date(currentYear, 11, 31)

    // Filter current year data
    const currentYearOrcamentos: DateGroupableData[] =
      financialData.orcamentosVendedor
        .filter((o) => {
          const date = new Date(o.data_documento)
          return date >= currentYearStart && date <= currentYearEnd
        })
        .map((o) => ({
          data: o.data_documento,
          euro_total: o.euro_total,
        }))

    const currentYearVendas: DateGroupableData[] = financialData.vendasVendedor
      .filter((v) => {
        const date = new Date(v.data_documento)
        return date >= currentYearStart && date <= currentYearEnd
      })
      .map((v) => ({
        data: v.data_documento,
        euro_total: v.euro_total,
      }))

    const currentYearFaturas: DateGroupableData[] =
      financialData.faturasVendedor
        .filter((f) => {
          const date = new Date(f.data_documento)
          return date >= currentYearStart && date <= currentYearEnd
        })
        .map((f) => ({
          data: f.data_documento,
          euro_total: f.euro_total,
        }))

    // Group by month
    const orcamentosGrouped = groupDataByMonth(currentYearOrcamentos, [
      'euro_total',
    ])
    const vendasGrouped = groupDataByMonth(currentYearVendas, ['euro_total'])
    const faturasGrouped = groupDataByMonth(currentYearFaturas, ['euro_total'])

    // Create pipeline data map
    const pipelineData = new Map<
      string,
      { month: string; orcamentos: number; vendas: number; faturas: number }
    >()

    // Initialize current year months
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(currentYear, i)
      const monthKey = format(monthDate, 'yyyy-MM')
      const monthLabel = format(monthDate, 'MMM', { locale: pt })

      pipelineData.set(monthKey, {
        month: monthLabel,
        orcamentos: 0,
        vendas: 0,
        faturas: 0,
      })
    }

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

    // Crescimento month-over-month (current vs previous month)
    const currentMonth = new Date()
    const previousMonth = subMonths(currentMonth, 1)

    const currentMonthStart = startOfMonth(currentMonth)
    const currentMonthEnd = endOfMonth(currentMonth)
    const previousMonthStart = startOfMonth(previousMonth)
    const previousMonthEnd = endOfMonth(previousMonth)

    // Current month data
    const currentMonthVendas = financialData.faturasVendedor
      .filter(
        (f) =>
          new Date(f.data_documento) >= currentMonthStart &&
          new Date(f.data_documento) <= currentMonthEnd,
      )
      .reduce((sum, f) => sum + (f.euro_total || 0), 0)

    const currentMonthCompras = financialData.listagemCompras
      .filter(
        (c) =>
          new Date(c.data_documento) >= currentMonthStart &&
          new Date(c.data_documento) <= currentMonthEnd,
      )
      .reduce((sum, c) => sum + (c.euro_total || 0), 0)

    const currentMonthNe = financialData.neFornecedor
      .filter(
        (n) =>
          new Date(n.data_documento) >= currentMonthStart &&
          new Date(n.data_documento) <= currentMonthEnd,
      )
      .reduce((sum, n) => sum + (n.euro_total || 0), 0)

    // Previous month data
    const previousMonthVendas = financialData.faturasVendedor
      .filter(
        (f) =>
          new Date(f.data_documento) >= previousMonthStart &&
          new Date(f.data_documento) <= previousMonthEnd,
      )
      .reduce((sum, f) => sum + (f.euro_total || 0), 0)

    const previousMonthCompras = financialData.listagemCompras
      .filter(
        (c) =>
          new Date(c.data_documento) >= previousMonthStart &&
          new Date(c.data_documento) <= previousMonthEnd,
      )
      .reduce((sum, c) => sum + (c.euro_total || 0), 0)

    const previousMonthNe = financialData.neFornecedor
      .filter(
        (n) =>
          new Date(n.data_documento) >= previousMonthStart &&
          new Date(n.data_documento) <= previousMonthEnd,
      )
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
        <h2 className="text-xl font-bold">Análises Financeiras 2024-2025</h2>
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
              <div className="mb-4">
                <h3 className="text-lg leading-tight font-semibold">
                  Evolução Mensal - Vendas vs Compras
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  2024 e 2025
                </p>
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
              <div className="mb-4">
                <h3 className="text-lg leading-tight font-semibold">
                  Cash Flow Mensal
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Diferença entre vendas e compras (verde: positivo, vermelho:
                  negativo)
                </p>
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
              <div className="mb-4">
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Vendas por Vendedor - Pie Chart */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4">
                <h3 className="text-lg leading-tight font-semibold">
                  Vendas por Vendedor
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Distribuição percentual de vendas por vendedor
                </p>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={salesPerformanceData.vendasVendedorData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) =>
                      percentage > 5 ? `${name}: ${percentage.toFixed(1)}%` : ''
                    }
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {salesPerformanceData.vendasVendedorData.map(
                      (entry, index) => {
                        const colors = [
                          CHART_COLORS.vendas,
                          CHART_COLORS.orcamentos,
                          CHART_COLORS.margem,
                          CHART_COLORS.neutral,
                          '#f97316', // Orange
                          '#06b6d4', // Cyan
                          '#8b5cf6', // Violet
                          '#f59e0b', // Amber
                        ]
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={colors[index % colors.length]}
                          />
                        )
                      },
                    )}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name) => [
                      value.toLocaleString('pt-PT', {
                        style: 'currency',
                        currency: 'EUR',
                      }),
                      'Vendas',
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Taxa de Conversão por Vendedor */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4">
                <h3 className="text-lg leading-tight font-semibold">
                  Taxa de Conversão por Vendedor
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Percentagem de orçamentos convertidos em vendas
                </p>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={salesPerformanceData.conversaoData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'conversao') {
                        return [`${value}%`, 'Taxa de Conversão']
                      }
                      return [
                        value.toLocaleString('pt-PT', {
                          style: 'currency',
                          currency: 'EUR',
                        }),
                        name === 'orcamentos' ? 'Orçamentos' : 'Faturas',
                      ]
                    }}
                    labelStyle={{ color: '#333' }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '0px',
                    }}
                  />
                  <Bar dataKey="conversao" fill={CHART_COLORS.orcamentos} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Top 10 Clientes - Horizontal Bar Chart */}
          <Card className="rounded-none border-2 p-4">
            <div className="mb-4">
              <h3 className="text-lg leading-tight font-semibold">
                Top 10 Clientes
              </h3>
              <p className="text-muted-foreground text-sm leading-tight">
                Clientes com maior volume de vendas
              </p>
            </div>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart
                layout="horizontal"
                data={salesPerformanceData.top10Clientes}
                margin={{ top: 20, right: 30, left: 150, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={140}
                />
                <Tooltip
                  formatter={(value: number, name, props: any) => [
                    value.toLocaleString('pt-PT', {
                      style: 'currency',
                      currency: 'EUR',
                    }),
                    'Vendas',
                  ]}
                  labelFormatter={(label, payload) =>
                    payload && payload[0]
                      ? `Cliente: ${payload[0].payload.fullName}`
                      : `Cliente: ${label}`
                  }
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '0px',
                  }}
                />
                <Bar dataKey="value" fill={CHART_COLORS.vendas} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="custos" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Distribuição de Compras - Pie Chart */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4">
                <h3 className="text-lg leading-tight font-semibold">
                  Distribuição de Compras
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Operacionais vs Outras compras
                </p>
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
              <div className="mb-4">
                <h3 className="text-lg leading-tight font-semibold">
                  Custos Operacionais vs Vendas
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Percentagem de custos operacionais sobre vendas
                </p>
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
            <div className="mb-4">
              <h3 className="text-lg leading-tight font-semibold">
                Top 10 Fornecedores
              </h3>
              <p className="text-muted-foreground text-sm leading-tight">
                Fornecedores com maior volume de compras (operacionais + outras)
              </p>
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
            <div className="mb-4">
              <h3 className="text-lg leading-tight font-semibold">
                Pipeline de Vendas
              </h3>
              <p className="text-muted-foreground text-sm leading-tight">
                Orçamentos criados, vendas concretizadas e faturas emitidas (
                {new Date().getFullYear()})
              </p>
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
            <div className="mb-4">
              <h3 className="text-lg leading-tight font-semibold">
                Crescimento Month-over-Month
              </h3>
              <p className="text-muted-foreground text-sm leading-tight">
                Comparação entre{' '}
                {format(subMonths(new Date(), 1), 'MMMM', { locale: pt })} e{' '}
                {format(new Date(), 'MMMM', { locale: pt })}
              </p>
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

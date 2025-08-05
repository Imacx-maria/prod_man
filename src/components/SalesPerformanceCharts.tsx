'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { getFinancialYearRange } from '@/utils/date'
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { RotateCw, TrendingUp, Euro, ArrowLeft, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

// Types for sales data (monthly aggregated views)
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
  nome_utilizador?: string
  iniciais_utilizador?: string
  nome: string // Standardized seller name from view
  department: string // Standardized department from view
  transaction_count: number // Count of original transactions
  created_at: string // View timestamp
  updated_at: string // View timestamp
}

// Types for count data (monthly aggregated count views)
interface OrcamentosVendedorMonthlyCount {
  id: string
  numero_documento: string
  data_documento: string // MM/YYYY format
  nome_cliente: string
  document_count: number // Number of quotes
  nome_utilizador?: string
  nome: string // Standardized seller name
  department: string // Standardized department
  transaction_count: number
  created_at: string
  updated_at: string
}

interface FaturasVendedorMonthlyCount {
  id: string
  numero_documento: string
  data_documento: string // MM/YYYY format
  nome_cliente: string
  document_count: number // Number of invoices
  nome: string // Standardized seller name
  department: string // Standardized department
  transaction_count: number
  created_at: string
  updated_at: string
}

// User mapping interface
interface UserMapping {
  id: string
  initials?: string
  full_name?: string
  short_name?: string
  standardized_name: string
  department: string
  active: boolean
  sales: boolean
  created_at: string
  updated_at: string
}

interface SalesData {
  faturasVendedor: FaturasVendedorMonthly[]
  orcamentosVendedor: OrcamentosVendedorMonthly[]
  vendasLiquidas: VendasLiquidasMonthly[]
  // Add count data
  faturasVendedorCount: FaturasVendedorMonthlyCount[]
  orcamentosVendedorCount: OrcamentosVendedorMonthlyCount[]
}

interface VendasLiquidasMonthly {
  id: string
  numero_documento: string
  nome_documento: string
  data_documento: string // MM/YYYY format from monthly view
  nome_cliente: string
  euro_total: number
  nome: string // Standardized seller name from view
  department: string // Standardized department from view
  transaction_count: number // Count of original transactions
  created_at: string // View timestamp
  updated_at: string // View timestamp
}

interface SalesPerformanceChartsProps {
  supabase: any
  onRefresh?: () => Promise<void>
}

// Chart color palette following design guide
const CHART_COLORS = {
  primary: '#22c55e', // Green for sales
  secondary: '#3b82f6', // Blue for quotes
  accent: '#8b5cf6', // Purple for conversion
  neutral: '#6b7280', // Gray for neutral data
  success: '#10b981', // Emerald
  warning: '#f59e0b', // Amber
  danger: '#ef4444', // Red
}

const PIE_COLORS = [
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#f43f5e',
  '#84cc16',
  '#f97316',
  '#8b5cf6',
]

export default function SalesPerformanceCharts({
  supabase,
  onRefresh,
}: SalesPerformanceChartsProps) {
  const [salesData, setSalesData] = useState<SalesData>({
    faturasVendedor: [],
    orcamentosVendedor: [],
    vendasLiquidas: [],
    faturasVendedorCount: [],
    orcamentosVendedorCount: [],
  })
  const [userMappings, setUserMappings] = useState<UserMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get departments where sales = true from user_name_mapping
  const allowedDepartments = useMemo(() => {
    // Filter departments based on sales=true in user_name_mapping
    const salesDepartments = userMappings
      .filter((mapping) => mapping.sales === true)
      .map((mapping) => mapping.department)

    // Remove duplicates and return unique departments
    return Array.from(new Set(salesDepartments))
  }, [userMappings])

  // Fetch user mapping data
  const fetchUserMappings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_name_mapping')
        .select('*')
        .eq('active', true)
        .order('department', { ascending: true })

      if (error) {
        throw new Error(`user_name_mapping: ${error.message}`)
      }

      setUserMappings(data || [])
    } catch (err: any) {
      console.error('Error fetching user mappings:', err)
      // Don't set main error for this, just log it and use empty array
      setUserMappings([])
    }
  }, [supabase])

  // Fetch sales data for current year and 2 previous years
  const fetchSalesData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Use standardized financial year range
      const targetYears = getFinancialYearRange()

      // Simplified data fetching - monthly views are pre-aggregated so no pagination needed
      // Filter for target years using direct string matching since data is already in MM/YYYY format
      const yearFilters = targetYears.map((year) => `%/${year}`)

      const { data: faturasData, error: faturasError } = await supabase
        .from('faturas_vendedor_monthly')
        .select('*')
        .or(`data_documento.like.${yearFilters.join(',data_documento.like.')}`)
        .order('data_documento', { ascending: true })

      if (faturasError) {
        throw new Error(`faturas_vendedor_monthly: ${faturasError.message}`)
      }

      // Use pagination for orcamentos_vendedor_monthly to get ALL records
      const fetchAllOrcamentos = async () => {
        let allData: OrcamentosVendedorMonthly[] = []
        let hasMoreData = true
        let page = 0
        const pageSize = 1000

        while (hasMoreData) {
          const startRange = page * pageSize
          const endRange = startRange + pageSize - 1

          const { data, error, count } = await supabase
            .from('orcamentos_vendedor_monthly')
            .select('*', { count: 'exact' })
            .or(
              `data_documento.like.${yearFilters.join(',data_documento.like.')}`,
            )
            .order('data_documento', { ascending: true })
            .range(startRange, endRange)

          if (error) {
            throw new Error(`orcamentos_vendedor_monthly: ${error.message}`)
          }

          if (data && data.length > 0) {
            allData = [...allData, ...data]

            // If we got fewer records than the page size, we've reached the end
            if (data.length < pageSize) {
              hasMoreData = false
            } else {
              page++
            }
          } else {
            hasMoreData = false
          }
        }

        return allData
      }

      const orcamentosData = await fetchAllOrcamentos()

      // Add queries for count views with pagination
      const fetchAllFaturasCount = async () => {
        let allData: FaturasVendedorMonthlyCount[] = []
        let hasMoreData = true
        let page = 0
        const pageSize = 1000

        while (hasMoreData) {
          const startRange = page * pageSize
          const endRange = startRange + pageSize - 1

          const { data, error, count } = await supabase
            .from('faturas_vendedor_monthly_count')
            .select('*', { count: 'exact' })
            .or(
              `data_documento.like.${yearFilters.join(',data_documento.like.')}`,
            )
            .order('data_documento', { ascending: true })
            .range(startRange, endRange)

          if (error) {
            throw new Error(`faturas_vendedor_monthly_count: ${error.message}`)
          }

          if (data && data.length > 0) {
            allData = [...allData, ...data]

            if (data.length < pageSize) {
              hasMoreData = false
            } else {
              page++
            }
          } else {
            hasMoreData = false
          }
        }

        return allData
      }

      const fetchAllOrcamentosCount = async () => {
        let allData: OrcamentosVendedorMonthlyCount[] = []
        let hasMoreData = true
        let page = 0
        const pageSize = 1000

        while (hasMoreData) {
          const startRange = page * pageSize
          const endRange = startRange + pageSize - 1

          const { data, error, count } = await supabase
            .from('orcamentos_vendedor_monthly_count')
            .select('*', { count: 'exact' })
            .or(
              `data_documento.like.${yearFilters.join(',data_documento.like.')}`,
            )
            .order('data_documento', { ascending: true })
            .range(startRange, endRange)

          if (error) {
            throw new Error(
              `orcamentos_vendedor_monthly_count: ${error.message}`,
            )
          }

          if (data && data.length > 0) {
            allData = [...allData, ...data]

            if (data.length < pageSize) {
              hasMoreData = false
            } else {
              page++
            }
          } else {
            hasMoreData = false
          }
        }

        return allData
      }

      const faturasCountData = await fetchAllFaturasCount()
      const orcamentosCountData = await fetchAllOrcamentosCount()

      // Use pagination for vendas_liquidas_monthly to get ALL records (like FinancialAnalyticsCharts)
      const fetchAllVendasLiquidas = async () => {
        let allData: VendasLiquidasMonthly[] = []
        let hasMoreData = true
        let page = 0
        const pageSize = 1000

        while (hasMoreData) {
          const startRange = page * pageSize
          const endRange = startRange + pageSize - 1

          const { data, error, count } = await supabase
            .from('vendas_liquidas_monthly')
            .select('*', { count: 'exact' })
            .or(
              `data_documento.like.${yearFilters.join(',data_documento.like.')}`,
            )
            .order('data_documento', { ascending: true })
            .range(startRange, endRange)

          if (error) {
            throw new Error(`vendas_liquidas_monthly: ${error.message}`)
          }

          if (data && data.length > 0) {
            allData = [...allData, ...data]

            // If we got fewer records than the page size, we've reached the end
            if (data.length < pageSize) {
              hasMoreData = false
            } else {
              page++
            }
          } else {
            hasMoreData = false
          }
        }

        return allData
      }

      const vendasLiquidasData = await fetchAllVendasLiquidas()

      setSalesData({
        faturasVendedor: faturasData || [],
        orcamentosVendedor: orcamentosData || [],
        vendasLiquidas: vendasLiquidasData || [],
        faturasVendedorCount: faturasCountData || [],
        orcamentosVendedorCount: orcamentosCountData || [],
      })
    } catch (err: any) {
      console.error('Error fetching sales data:', err)
      setError(err.message || 'Erro ao carregar dados de vendas')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Refresh function
  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchUserMappings(), fetchSalesData()])
    if (onRefresh) {
      await onRefresh()
    }
  }, [fetchUserMappings, fetchSalesData, onRefresh])

  useEffect(() => {
    const initializeData = async () => {
      await fetchUserMappings()
      await fetchSalesData()
    }
    initializeData()
  }, [fetchUserMappings, fetchSalesData])

  // Calculate overview metrics
  const overviewMetrics = useMemo(() => {
    const currentYear = new Date().getFullYear()

    // Filter data for current year only for yearly totals (no department filtering to match Visão Geral)
    const currentYearSales = salesData.vendasLiquidas.filter((venda) => {
      const parts = venda.data_documento.split('/')
      if (parts.length === 2) {
        const year = parseInt(parts[1])
        return year === currentYear
      }
      return false
    })

    const currentYearQuotes = salesData.orcamentosVendedor.filter(
      (orcamento) => {
        const parts = orcamento.data_documento.split('/')
        if (parts.length === 2) {
          const year = parseInt(parts[1])
          return year === currentYear
        }
        return false
      },
    )

    const totalSalesValue = currentYearSales.reduce(
      (sum, venda) => sum + (venda.euro_total || 0),
      0,
    )

    // Debug logging for sales discrepancy
    console.log('🔍 Performance de Vendas Debug (with pagination):')
    console.log(
      'Total vendas liquidas records:',
      salesData.vendasLiquidas.length,
    )
    console.log('Current year sales (filtered):', currentYearSales.length)
    console.log('Total Sales Value:', totalSalesValue)
    console.log('Sample current year sales:', currentYearSales.slice(0, 3))
    console.log('All departments found:', allowedDepartments)

    const totalQuotesValue = currentYearQuotes.reduce(
      (sum, orcamento) => sum + (orcamento.euro_total || 0),
      0,
    )

    // Debug logging for orçamentos
    console.log('💰 Total Orçamentos (Ano) Debug (with pagination):')
    console.log(
      'Total orcamentos vendedor records:',
      salesData.orcamentosVendedor.length,
    )
    console.log('Current year quotes (filtered):', currentYearQuotes.length)
    console.log('Total Quotes Value:', totalQuotesValue)
    console.log('Sample current year quotes:', currentYearQuotes.slice(0, 3))

    // Updated conversion rate calculation using count data (no department filtering to match Visão Geral)
    const currentYearQuotesCount = salesData.orcamentosVendedorCount
      .filter((orcamento) => {
        const parts = orcamento.data_documento.split('/')
        if (parts.length === 2) {
          const year = parseInt(parts[1])
          return year === currentYear
        }
        return false
      })
      .reduce((sum, o) => sum + (o.document_count || 0), 0)

    const currentYearInvoicesCount = salesData.faturasVendedorCount
      .filter((fatura) => {
        const parts = fatura.data_documento.split('/')
        if (parts.length === 2) {
          const year = parseInt(parts[1])
          return year === currentYear
        }
        return false
      })
      .reduce((sum, f) => sum + (f.document_count || 0), 0)

    const conversionRate =
      currentYearQuotesCount > 0
        ? (currentYearInvoicesCount / currentYearQuotesCount) * 100
        : 0

    // Debug logging for conversion rate
    console.log('📊 Taxa de Conversão Debug (with pagination):')
    console.log(
      'Total faturas count records fetched:',
      salesData.faturasVendedorCount.length,
    )
    console.log(
      'Total orcamentos count records fetched:',
      salesData.orcamentosVendedorCount.length,
    )
    console.log('Current year invoices count:', currentYearInvoicesCount)
    console.log('Current year quotes count:', currentYearQuotesCount)
    console.log(
      'Conversion rate calculation:',
      `(${currentYearInvoicesCount} / ${currentYearQuotesCount}) * 100 = ${conversionRate.toFixed(1)}%`,
    )

    return {
      totalSalesValue,
      totalQuotesValue,
      conversionRate,
    }
  }, [salesData, allowedDepartments])

  // Client name normalization function
  const normalizeClientName = (clientName: string): string => {
    const name = clientName.trim().toUpperCase()

    // HH Print Management Spain variations
    if (
      name.includes('HH') &&
      name.includes('PRINT') &&
      name.includes('MANAGEMENT') &&
      name.includes('SPAIN')
    ) {
      return 'HH Spain'
    }

    // Add more normalization rules here as needed
    // Example:
    // if (name.includes('SOME_OTHER_CLIENT_PATTERN')) {
    //   return 'Normalized Name'
    // }

    // Return original name if no normalization rule applies
    return clientName
  }

  // Process data for top 15 clients - Year-to-date comparison
  const top10Clients = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const lastYear = currentYear - 1
    const currentMonth = new Date().getMonth() + 1 // 1-12

    // Get current year clients first (for ranking)
    const currentYearTotals: { [key: string]: number } = {}
    const lastYearTotals: { [key: string]: number } = {}

    salesData.vendasLiquidas.forEach((venda) => {
      const originalClient = venda.nome_cliente || 'Cliente Desconhecido'
      const client = normalizeClientName(originalClient) // Apply normalization
      const parts = venda.data_documento.split('/')
      if (parts.length === 2) {
        const month = parseInt(parts[0])
        const year = parseInt(parts[1])
        const amount = venda.euro_total || 0
        const department = venda.department || 'Sem Departamento'

        // Only include allowed departments
        if (allowedDepartments.includes(department)) {
          if (year === currentYear) {
            // Include all current year data up to current month
            if (month <= currentMonth) {
              currentYearTotals[client] =
                (currentYearTotals[client] || 0) + amount
            }
          } else if (year === lastYear) {
            // Include previous year data only up to the same month as current year
            if (month <= currentMonth) {
              lastYearTotals[client] = (lastYearTotals[client] || 0) + amount
            }
          }
        }
      }
    })

    // Get top 15 clients by current year sales
    const result = Object.entries(currentYearTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([client, currentAmount]) => ({
        name: client.length > 35 ? client.substring(0, 35) + '...' : client,
        fullName: client,
        currentYear: Math.round(currentAmount),
        lastYear: Math.round(lastYearTotals[client] || 0),
      }))

    // Log final data to confirm values are correct
    console.log(
      '✅ Top 15 Clientes YTD data ready:',
      result.length,
      'clients with current month filter:',
      currentMonth,
      'current year range:',
      result[0]?.currentYear || 0,
      'to',
      result[result.length - 1]?.currentYear || 0,
    )

    // Log client normalization for debugging
    const hhSpainEntry = result.find((client) => client.name === 'HH Spain')
    if (hhSpainEntry) {
      console.log('🎯 HH Spain grouped data:', hhSpainEntry)
    }

    return result
  }, [salesData, allowedDepartments])

  // Enhanced monthlySalesTrend processing with prediction capabilities
  const monthlySalesTrend = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1 // 1-12

    // Dynamic years: current year, previous year, and year before that
    const targetYears = [currentYear - 2, currentYear - 1, currentYear]
    const monthlyDataByYear: { [year: number]: { [month: string]: number } } =
      {}

    // Initialize all months for each year with 0
    targetYears.forEach((year) => {
      monthlyDataByYear[year] = {}
      for (let month = 1; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0')
        const monthKey = `${monthStr}/${year}`
        monthlyDataByYear[year][monthKey] = 0
      }
    })

    // Aggregate sales data by month for each year (only allowed departments)
    salesData.vendasLiquidas.forEach((venda) => {
      const parts = venda.data_documento.split('/')
      if (parts.length === 2) {
        const year = parseInt(parts[1])
        const department = venda.department || 'Sem Departamento'
        if (
          targetYears.includes(year) &&
          allowedDepartments.includes(department)
        ) {
          const month = venda.data_documento
          monthlyDataByYear[year][month] =
            (monthlyDataByYear[year][month] || 0) + (venda.euro_total || 0)
        }
      }
    })

    // Simple prediction function using linear regression and seasonal adjustments
    const calculatePrediction = (
      historicalData: number[],
      targetMonth: number,
    ): number => {
      if (historicalData.length < 2) return 0

      // Get the same month from previous years for seasonal pattern
      const sameMonthValues = [
        monthlyDataByYear[currentYear - 2]?.[
          `${String(targetMonth).padStart(2, '0')}/${currentYear - 2}`
        ] || 0,
        monthlyDataByYear[currentYear - 1]?.[
          `${String(targetMonth).padStart(2, '0')}/${currentYear - 1}`
        ] || 0,
      ].filter((val) => val > 0)

      // Calculate year-over-year growth rate
      let growthRate = 0
      if (sameMonthValues.length >= 2) {
        growthRate =
          (sameMonthValues[sameMonthValues.length - 1] - sameMonthValues[0]) /
          sameMonthValues[0]
      }

      // Calculate average of historical data for the same month
      const seasonalAverage =
        sameMonthValues.length > 0
          ? sameMonthValues.reduce((sum, val) => sum + val, 0) /
            sameMonthValues.length
          : 0

      // Get recent trend from current year's completed months
      const currentYearData = []
      for (let month = 1; month < currentMonth; month++) {
        const monthKey = `${String(month).padStart(2, '0')}/${currentYear}`
        const value = monthlyDataByYear[currentYear][monthKey] || 0
        if (value > 0) currentYearData.push(value)
      }

      if (currentYearData.length === 0) {
        // No current year data, use seasonal pattern with growth
        return Math.max(0, seasonalAverage * (1 + growthRate))
      }

      // Calculate recent average
      const recentAverage =
        currentYearData.reduce((sum, val) => sum + val, 0) /
        currentYearData.length

      // Combine seasonal pattern with recent performance and growth trend
      const basePredict = seasonalAverage > 0 ? seasonalAverage : recentAverage
      const trendAdjusted = basePredict * (1 + growthRate * 0.5) // Moderate the growth rate

      // Blend with recent performance (60% recent trend, 40% seasonal/growth)
      return Math.max(0, Math.round(recentAverage * 0.6 + trendAdjusted * 0.4))
    }

    // Find the last month with actual sales data in current year
    let lastMonthWithData = 0
    for (let month = 12; month >= 1; month--) {
      const monthStr = String(month).padStart(2, '0')
      const monthKey = `${monthStr}/${currentYear}`
      if (monthlyDataByYear[currentYear][monthKey] > 0) {
        lastMonthWithData = month
        break
      }
    }

    // Create chart data with monthly points for all years + predictions
    const chartData: Array<{
      month: string
      monthIndex: number
      isPredicted?: boolean
      [key: string]: number | string | boolean | undefined | null
    }> = []

    for (let month = 1; month <= 12; month++) {
      const monthStr = String(month).padStart(2, '0')
      const monthName = new Date(currentYear, month - 1).toLocaleDateString(
        'pt-PT',
        { month: 'short' },
      )

      const dataPoint: any = {
        month: monthName,
        monthIndex: month,
        isPredicted: month > lastMonthWithData, // Mark future months as predicted
      }

      targetYears.forEach((year) => {
        const monthKey = `${monthStr}/${year}`

        if (year === currentYear) {
          if (month > lastMonthWithData) {
            // For future months in current year, add prediction
            const historicalData = []
            for (let prevMonth = 1; prevMonth < month; prevMonth++) {
              const prevKey = `${String(prevMonth).padStart(2, '0')}/${year}`
              historicalData.push(monthlyDataByYear[year][prevKey] || 0)
            }

            const predictedValue = calculatePrediction(historicalData, month)
            dataPoint[`vendas${year}`] = predictedValue
            dataPoint[`vendas${year}_predicted`] = predictedValue // Separate field for predicted data
            dataPoint[`vendas${year}_actual`] = null // Null for actual data in predicted months
          } else {
            // Historical or current month data
            const actualValue = Math.round(
              monthlyDataByYear[year][monthKey] || 0,
            )
            dataPoint[`vendas${year}`] = actualValue
            dataPoint[`vendas${year}_predicted`] = null // Null for predicted data in actual months
            dataPoint[`vendas${year}_actual`] = actualValue // Separate field for actual data
          }
        } else {
          // Historical years - always actual data
          const actualValue = Math.round(monthlyDataByYear[year][monthKey] || 0)
          dataPoint[`vendas${year}`] = actualValue
        }
      })

      chartData.push(dataPoint)
    }

    return chartData
  }, [salesData, allowedDepartments])

  // Calculate total year prediction based on monthlySalesTrend data
  const totalYearPrediction = useMemo(() => {
    const currentYear = new Date().getFullYear()

    let actualSalesTotal = 0
    let predictedSalesTotal = 0

    monthlySalesTrend.forEach((monthData) => {
      const actualValue = Number(monthData[`vendas${currentYear}_actual`]) || 0
      const predictedValue =
        Number(monthData[`vendas${currentYear}_predicted`]) || 0

      actualSalesTotal += actualValue
      predictedSalesTotal += predictedValue
    })

    return actualSalesTotal + predictedSalesTotal
  }, [monthlySalesTrend])

  // Process department data
  const departmentData = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const previousYear = currentYear - 1
    const currentMonth = new Date().getMonth() + 1 // 1-12

    // Year-to-date comparison: Current year vs Previous year up to same month
    const salesByDeptCurrent: { [key: string]: number } = {}
    const salesByDeptPrevious: { [key: string]: number } = {}
    const quotesCountByDeptCurrent: { [key: string]: number } = {}
    const quotesCountByDeptPrevious: { [key: string]: number } = {}
    const salesCountByDeptCurrent: { [key: string]: number } = {}
    const salesCountByDeptPrevious: { [key: string]: number } = {}

    // Helper function to check if date is within YTD range
    const isWithinYTD = (
      dataDocumento: string,
      targetYear: number,
    ): boolean => {
      const parts = dataDocumento.split('/')
      if (parts.length === 2) {
        const month = parseInt(parts[0])
        const year = parseInt(parts[1])
        return year === targetYear && month <= currentMonth
      }
      return false
    }

    // Process vendas liquidas for both years
    salesData.vendasLiquidas
      .filter((venda) => {
        return (
          isWithinYTD(venda.data_documento, currentYear) ||
          isWithinYTD(venda.data_documento, previousYear)
        )
      })
      .forEach((venda) => {
        const dept = venda.department || 'Sem Departamento'
        if (allowedDepartments.includes(dept)) {
          const parts = venda.data_documento.split('/')
          const year = parseInt(parts[1])

          if (year === currentYear) {
            salesByDeptCurrent[dept] =
              (salesByDeptCurrent[dept] || 0) + (venda.euro_total || 0)
            salesCountByDeptCurrent[dept] =
              (salesCountByDeptCurrent[dept] || 0) + 1
          } else if (year === previousYear) {
            salesByDeptPrevious[dept] =
              (salesByDeptPrevious[dept] || 0) + (venda.euro_total || 0)
            salesCountByDeptPrevious[dept] =
              (salesCountByDeptPrevious[dept] || 0) + 1
          }
        }
      })

    // Process quotes count for both years
    salesData.orcamentosVendedorCount
      .filter((orcamento) => {
        return (
          isWithinYTD(orcamento.data_documento, currentYear) ||
          isWithinYTD(orcamento.data_documento, previousYear)
        )
      })
      .forEach((orcamento) => {
        const dept = orcamento.department || 'Sem Departamento'
        if (allowedDepartments.includes(dept)) {
          const parts = orcamento.data_documento.split('/')
          const year = parseInt(parts[1])

          if (year === currentYear) {
            quotesCountByDeptCurrent[dept] =
              (quotesCountByDeptCurrent[dept] || 0) +
              (orcamento.document_count || 0)
          } else if (year === previousYear) {
            quotesCountByDeptPrevious[dept] =
              (quotesCountByDeptPrevious[dept] || 0) +
              (orcamento.document_count || 0)
          }
        }
      })

    // Process sales count for both years
    salesData.faturasVendedorCount
      .filter((fatura) => {
        return (
          isWithinYTD(fatura.data_documento, currentYear) ||
          isWithinYTD(fatura.data_documento, previousYear)
        )
      })
      .forEach((fatura) => {
        const dept = fatura.department || 'Sem Departamento'
        if (allowedDepartments.includes(dept)) {
          const parts = fatura.data_documento.split('/')
          const year = parseInt(parts[1])

          if (year === currentYear) {
            salesCountByDeptCurrent[dept] =
              (salesCountByDeptCurrent[dept] || 0) +
              (fatura.document_count || 0)
          } else if (year === previousYear) {
            salesCountByDeptPrevious[dept] =
              (salesCountByDeptPrevious[dept] || 0) +
              (fatura.document_count || 0)
          }
        }
      })

    // Get all unique departments from both years
    const allDepartments = new Set([
      ...Object.keys(salesByDeptCurrent),
      ...Object.keys(salesByDeptPrevious),
      ...Object.keys(quotesCountByDeptCurrent),
      ...Object.keys(quotesCountByDeptPrevious),
      ...Object.keys(salesCountByDeptCurrent),
      ...Object.keys(salesCountByDeptPrevious),
    ])

    const salesByDepartment = Array.from(allDepartments)
      .map((dept) => ({
        name: dept,
        currentYear: Math.round(salesByDeptCurrent[dept] || 0),
        previousYear: Math.round(salesByDeptPrevious[dept] || 0),
      }))
      .filter((item) => item.currentYear > 0 || item.previousYear > 0)
      .sort((a, b) => b.currentYear - a.currentYear)

    const quotesByDepartment = Array.from(allDepartments)
      .map((dept) => ({
        name: dept,
        currentYear: quotesCountByDeptCurrent[dept] || 0,
        previousYear: quotesCountByDeptPrevious[dept] || 0,
      }))
      .filter((item) => item.currentYear > 0 || item.previousYear > 0)
      .sort((a, b) => b.currentYear - a.currentYear)

    const conversionByDepartment = Array.from(allDepartments)
      .map((dept) => {
        const quotesCurrent = quotesCountByDeptCurrent[dept] || 0
        const salesCurrent = salesCountByDeptCurrent[dept] || 0
        const quotesPrevious = quotesCountByDeptPrevious[dept] || 0
        const salesPrevious = salesCountByDeptPrevious[dept] || 0

        const rateCurrent =
          quotesCurrent > 0 ? (salesCurrent / quotesCurrent) * 100 : 0
        const ratePrevious =
          quotesPrevious > 0 ? (salesPrevious / quotesPrevious) * 100 : 0

        return {
          name: dept,
          currentYear: Math.round(rateCurrent * 10) / 10,
          previousYear: Math.round(ratePrevious * 10) / 10,
          quotesCountCurrent: quotesCurrent,
          salesCountCurrent: salesCurrent,
          quotesCountPrevious: quotesPrevious,
          salesCountPrevious: salesPrevious,
        }
      })
      .filter(
        (item) => item.salesCountCurrent > 0 || item.salesCountPrevious > 0,
      )
      .sort((a, b) => b.currentYear - a.currentYear)

    const salesCountByDepartment = Array.from(allDepartments)
      .map((dept) => ({
        name: dept,
        currentYear: salesCountByDeptCurrent[dept] || 0,
        previousYear: salesCountByDeptPrevious[dept] || 0,
      }))
      .filter((item) => item.currentYear > 0 || item.previousYear > 0)
      .sort((a, b) => b.currentYear - a.currentYear)

    return {
      salesByDepartment,
      quotesByDepartment,
      conversionByDepartment,
      salesCountByDepartment,
    }
  }, [salesData, allowedDepartments])

  // Process individual salesperson data
  const individualData = useMemo(() => {
    const salesByPerson: { [key: string]: number } = {}
    const quotesValueByPerson: { [key: string]: number } = {}
    const quotesCountByPerson: { [key: string]: number } = {}
    const salesCountByPerson: { [key: string]: number } = {}

    // Filter data for allowed departments only
    const filteredVendas = salesData.vendasLiquidas.filter((v) => {
      const dept = v.department || 'Sem Departamento'
      return allowedDepartments.includes(dept)
    })

    const filteredOrcamentos = salesData.orcamentosVendedor.filter((o) => {
      const dept = o.department || 'Sem Departamento'
      return allowedDepartments.includes(dept)
    })

    const filteredOrcamentosCount = salesData.orcamentosVendedorCount.filter(
      (o) => {
        const dept = o.department || 'Sem Departamento'
        return allowedDepartments.includes(dept)
      },
    )

    const filteredFaturasCount = salesData.faturasVendedorCount.filter((f) => {
      const dept = f.department || 'Sem Departamento'
      return allowedDepartments.includes(dept)
    })

    filteredVendas.forEach((venda) => {
      const person = venda.nome || 'Sem Nome'
      salesByPerson[person] =
        (salesByPerson[person] || 0) + (venda.euro_total || 0)
    })

    filteredOrcamentos.forEach((orcamento) => {
      const person = orcamento.nome || orcamento.nome_utilizador || 'Sem Nome'
      quotesValueByPerson[person] =
        (quotesValueByPerson[person] || 0) + (orcamento.euro_total || 0)
    })

    filteredOrcamentosCount.forEach((orcamento) => {
      const person = orcamento.nome || orcamento.nome_utilizador || 'Sem Nome'
      quotesCountByPerson[person] =
        (quotesCountByPerson[person] || 0) + (orcamento.document_count || 0)
    })

    filteredFaturasCount.forEach((fatura) => {
      const person = fatura.nome || 'Sem Nome'
      salesCountByPerson[person] =
        (salesCountByPerson[person] || 0) + (fatura.document_count || 0)
    })

    const salesByPerson_data = Object.entries(salesByPerson)
      .map(([person, total]) => ({
        name: person,
        value: Math.round(total),
      }))
      .sort((a, b) => b.value - a.value)

    const top5Salespeople = salesByPerson_data.slice(0, 5)

    const quotesVsSales = Object.keys({
      ...quotesCountByPerson,
      ...salesCountByPerson,
    })
      .map((person) => ({
        name: person.length > 20 ? person.substring(0, 20) + '...' : person,
        fullName: person,
        quotes: quotesCountByPerson[person] || 0, // Now count instead of euro value
        sales: salesCountByPerson[person] || 0, // Now count instead of euro value
      }))
      .filter((item) => item.sales > 0 || item.quotes > 0)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10)

    const conversionByPerson = Object.keys({
      ...quotesCountByPerson,
      ...salesCountByPerson,
    })
      .map((person) => {
        const quotes = quotesCountByPerson[person] || 0
        const sales = salesCountByPerson[person] || 0
        const rate = quotes > 0 ? (sales / quotes) * 100 : 0

        return {
          name: person.length > 15 ? person.substring(0, 15) + '...' : person,
          fullName: person,
          value: Math.round(rate * 10) / 10,
        }
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    return {
      salesByPerson: salesByPerson_data,
      top5Salespeople,
      quotesVsSales,
      conversionByPerson,
    }
  }, [salesData, allowedDepartments])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dados de vendas...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <p className="mb-4 text-red-600">Erro: {error}</p>
        <Button onClick={handleRefresh} variant="outline">
          <RotateCw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Performance de Vendas
          </h2>
          <p className="text-muted-foreground">
            Análise detalhada da performance comercial -{' '}
            {new Date().getFullYear()} (Todos os Departamentos)
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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-none border-2">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="team">Performance por Equipa</TabsTrigger>
          <TabsTrigger value="individual">Performance Individual</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-none border-2 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-muted-foreground text-sm font-medium">
                    Total Vendas ({new Date().getFullYear()})
                  </h3>
                  <p className="text-2xl font-bold text-green-600">
                    {overviewMetrics.totalSalesValue.toLocaleString('pt-PT', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </Card>

            <Card className="rounded-none border-2 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-muted-foreground text-sm font-medium">
                    Total Orçamentos ({new Date().getFullYear()})
                  </h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {overviewMetrics.totalQuotesValue.toLocaleString('pt-PT', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </p>
                </div>
                <Euro className="h-8 w-8 text-blue-600" />
              </div>
            </Card>

            <Card className="rounded-none border-2 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-muted-foreground text-sm font-medium">
                    Taxa de Conversão
                  </h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {overviewMetrics.conversionRate.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </Card>

            <Card className="rounded-none border-2 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-muted-foreground text-sm font-medium">
                    Previsão Vendas ({new Date().getFullYear()})
                  </h3>
                  <p className="text-2xl font-bold text-orange-600">
                    {totalYearPrediction.toLocaleString('pt-PT', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </Card>
          </div>

          {/* Top 15 Clientes - SIMPLE VERTICAL CHART */}
          <Card className="rounded-none border-2 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-tight font-semibold">
                  Top 15 Clientes - Vendas Anuais
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Comparação Year-to-Date: {new Date().getFullYear() - 1} vs{' '}
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
            <ResponsiveContainer width="100%" height={750}>
              <BarChart
                data={top10Clients}
                margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number, name) => [
                    `${value.toLocaleString()}€`,
                    name === 'lastYear'
                      ? `${new Date().getFullYear() - 1}`
                      : `${new Date().getFullYear()}`,
                  ]}
                  labelFormatter={(label, payload) =>
                    payload && payload[0] && payload[0].payload.fullName
                      ? payload[0].payload.fullName
                      : label
                  }
                />
                <Bar dataKey="lastYear" fill="#94a3b8" name="lastYear" />
                <Bar dataKey="currentYear" fill="#22c55e" name="currentYear" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Enhanced Monthly Sales Trend with Predictions */}
          <Card className="rounded-none border-2 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-tight font-semibold">
                  Vendas Mensais Trend
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Evolução mensal das vendas - {new Date().getFullYear() - 2},{' '}
                  {new Date().getFullYear() - 1} e {new Date().getFullYear()}
                  <span className="font-medium text-blue-600">
                    {' '}
                    (com previsão)
                  </span>
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
                data={monthlySalesTrend}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => {
                    const currentYear = new Date().getFullYear()
                    const year = name
                      .replace('vendas', '')
                      .replace('_actual', '')
                      .replace('_predicted', '')
                    const isPredicted =
                      name.includes('_predicted') ||
                      (props.payload?.isPredicted &&
                        parseInt(year) === currentYear)

                    return [
                      value.toLocaleString('pt-PT', {
                        style: 'currency',
                        currency: 'EUR',
                      }),
                      `${isPredicted ? 'Previsão ' : 'Vendas '}${year}`,
                    ]
                  }}
                  labelFormatter={(label, payload) => {
                    const isPredicted = payload?.[0]?.payload?.isPredicted
                    return `${label}${isPredicted ? ' (Previsão)' : ''}`
                  }}
                />
                <Legend
                  formatter={(value: string) => value.replace('vendas', '')}
                />

                {/* Historical years - solid lines */}
                <Line
                  type="monotone"
                  dataKey={`vendas${new Date().getFullYear() - 2}`}
                  stroke={CHART_COLORS.danger}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.danger, strokeWidth: 2, r: 3 }}
                  name={`${new Date().getFullYear() - 2}`}
                />
                <Line
                  type="monotone"
                  dataKey={`vendas${new Date().getFullYear() - 1}`}
                  stroke={CHART_COLORS.secondary}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.secondary, strokeWidth: 2, r: 3 }}
                  name={`${new Date().getFullYear() - 1}`}
                />

                {/* Current year line - actual data */}
                <Line
                  type="monotone"
                  dataKey={`vendas${new Date().getFullYear()}_actual`}
                  stroke={CHART_COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS.primary, strokeWidth: 2, r: 4 }}
                  connectNulls={false}
                  name={`${new Date().getFullYear()}`}
                />

                {/* Current year line - predicted data (dashed) */}
                <Line
                  type="monotone"
                  dataKey={`vendas${new Date().getFullYear()}_predicted`}
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  strokeDasharray="8 8"
                  dot={{
                    fill: 'none',
                    stroke: CHART_COLORS.primary,
                    strokeWidth: 2,
                    r: 3,
                  }}
                  connectNulls={false}
                  name={`${new Date().getFullYear()} (Previsão)`}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Prediction Legend */}
            <div className="text-muted-foreground mt-2 flex items-center justify-center space-x-6 text-xs">
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <div className="h-0.5 w-5 bg-green-500"></div>
                  <div className="ml-1 h-1 w-1 rounded-full bg-green-500"></div>
                </div>
                <span>Dados Reais</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <div className="h-0.5 w-5 border-b-2 border-dashed border-green-500"></div>
                  <div className="ml-1 h-1 w-1 rounded-full border border-green-500"></div>
                </div>
                <span>Previsão Baseada em Tendências</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Sales by Department */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Vendas por Departamento - Comparação YTD
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    {new Date().getFullYear() - 1} vs {new Date().getFullYear()}{' '}
                    (até{' '}
                    {new Date().toLocaleDateString('pt-PT', { month: 'long' })})
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
                <BarChart
                  data={departmentData.salesByDepartment}
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
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toLocaleString('pt-PT', {
                        style: 'currency',
                        currency: 'EUR',
                      }),
                      name === 'currentYear'
                        ? `${new Date().getFullYear()}`
                        : `${new Date().getFullYear() - 1}`,
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="previousYear"
                    fill={CHART_COLORS.neutral}
                    name={`${new Date().getFullYear() - 1}`}
                  />
                  <Bar
                    dataKey="currentYear"
                    fill={CHART_COLORS.primary}
                    name={`${new Date().getFullYear()}`}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Quotes by Department */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Orçamentos por Departamento - Comparação YTD
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    {new Date().getFullYear() - 1} vs {new Date().getFullYear()}{' '}
                    (até{' '}
                    {new Date().toLocaleDateString('pt-PT', { month: 'long' })})
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
                <BarChart
                  data={departmentData.quotesByDepartment}
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
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toString(),
                      name === 'currentYear'
                        ? `Orçamentos ${new Date().getFullYear()}`
                        : `Orçamentos ${new Date().getFullYear() - 1}`,
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="previousYear"
                    fill={CHART_COLORS.neutral}
                    name={`${new Date().getFullYear() - 1}`}
                  />
                  <Bar
                    dataKey="currentYear"
                    fill={CHART_COLORS.secondary}
                    name={`${new Date().getFullYear()}`}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Conversion Rate by Department */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Taxa de Conversão por Departamento - Comparação YTD
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    {new Date().getFullYear() - 1} vs {new Date().getFullYear()}{' '}
                    (até{' '}
                    {new Date().toLocaleDateString('pt-PT', { month: 'long' })})
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
                <BarChart
                  data={departmentData.conversionByDepartment}
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
                    formatter={(value: number, name: string) => [
                      `${value}%`,
                      name === 'currentYear'
                        ? `Taxa ${new Date().getFullYear()}`
                        : `Taxa ${new Date().getFullYear() - 1}`,
                    ]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload
                        return `${label} - ${new Date().getFullYear()}: ${data.salesCountCurrent} vendas / ${data.quotesCountCurrent} orçamentos | ${new Date().getFullYear() - 1}: ${data.salesCountPrevious} vendas / ${data.quotesCountPrevious} orçamentos`
                      }
                      return label
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="previousYear"
                    fill={CHART_COLORS.neutral}
                    name={`${new Date().getFullYear() - 1}`}
                  />
                  <Bar
                    dataKey="currentYear"
                    fill={CHART_COLORS.accent}
                    name={`${new Date().getFullYear()}`}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Number of Sales by Department */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Número de Vendas por Departamento - Comparação YTD
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    {new Date().getFullYear() - 1} vs {new Date().getFullYear()}{' '}
                    (até{' '}
                    {new Date().toLocaleDateString('pt-PT', { month: 'long' })})
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
                <BarChart
                  data={departmentData.salesCountByDepartment}
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
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toString(),
                      name === 'currentYear'
                        ? `Vendas ${new Date().getFullYear()}`
                        : `Vendas ${new Date().getFullYear() - 1}`,
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="previousYear"
                    fill={CHART_COLORS.neutral}
                    name={`${new Date().getFullYear() - 1}`}
                  />
                  <Bar
                    dataKey="currentYear"
                    fill={CHART_COLORS.success}
                    name={`${new Date().getFullYear()}`}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Sales by Salesperson - Pie Chart */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Vendas por Vendedor
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Distribuição das vendas por vendedor
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
                    data={individualData.salesByPerson.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      `${name}: ${(value / 1000).toFixed(0)}k€ (${(percent * 100).toFixed(1)}%)`
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {individualData.salesByPerson
                      .slice(0, 8)
                      .map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [
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

            {/* Top 5 Salespeople - VERTICAL */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Top 5 Vendedores por Valor
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Melhores vendedores por valor de vendas
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
                <BarChart
                  data={individualData.top5Salespeople}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toLocaleString()}€`,
                      'Vendas',
                    ]}
                  />
                  <Bar dataKey="value" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Quotes vs Sales by Salesperson - VERTICAL */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Orçamentos vs Vendas por Vendedor
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Comparação entre número de orçamentos e vendas realizadas
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
                <BarChart
                  data={individualData.quotesVsSales}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name) => [
                      value.toString(),
                      name === 'quotes' ? 'Orçamentos' : 'Vendas',
                    ]}
                    labelFormatter={(label, payload) =>
                      payload && payload[0] && payload[0].payload.fullName
                        ? payload[0].payload.fullName
                        : label
                    }
                  />
                  <Bar dataKey="quotes" fill="#3b82f6" name="quotes" />
                  <Bar dataKey="sales" fill="#22c55e" name="sales" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Conversion Rate by Salesperson */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Conversão por Vendedor
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Eficiência individual na conversão de orçamentos
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
                <BarChart
                  data={individualData.conversionByPerson}
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
                    formatter={(value: number) => [
                      `${value}%`,
                      'Taxa de Conversão',
                    ]}
                    labelFormatter={(label, payload) =>
                      payload && payload[0]
                        ? payload[0].payload.fullName
                        : label
                    }
                  />
                  <Bar dataKey="value" fill={CHART_COLORS.accent} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

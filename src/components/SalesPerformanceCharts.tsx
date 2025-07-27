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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  RotateCw,
  TrendingUp,
  Users,
  Euro,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
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

interface SalesData {
  faturasVendedor: FaturasVendedorMonthly[]
  orcamentosVendedor: OrcamentosVendedorMonthly[]
  // Add count data
  faturasVendedorCount: FaturasVendedorMonthlyCount[]
  orcamentosVendedorCount: OrcamentosVendedorMonthlyCount[]
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

// Filter to only show specific departments
const ALLOWED_DEPARTMENTS = ['BRINDES', 'DIGITAL', 'IMACX']

export default function SalesPerformanceCharts({
  supabase,
  onRefresh,
}: SalesPerformanceChartsProps) {
  const [salesData, setSalesData] = useState<SalesData>({
    faturasVendedor: [],
    orcamentosVendedor: [],
    faturasVendedorCount: [],
    orcamentosVendedorCount: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch sales data for current year and 2 previous years
  const fetchSalesData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const currentYear = new Date().getFullYear()
      const targetYears = [currentYear - 2, currentYear - 1, currentYear]

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

      const { data: orcamentosData, error: orcamentosError } = await supabase
        .from('orcamentos_vendedor_monthly')
        .select('*')
        .or(`data_documento.like.${yearFilters.join(',data_documento.like.')}`)
        .order('data_documento', { ascending: true })

      if (orcamentosError) {
        throw new Error(
          `orcamentos_vendedor_monthly: ${orcamentosError.message}`,
        )
      }

      // Add queries for count views
      const { data: faturasCountData, error: faturasCountError } =
        await supabase
          .from('faturas_vendedor_monthly_count')
          .select('*')
          .or(
            `data_documento.like.${yearFilters.join(',data_documento.like.')}`,
          )
          .order('data_documento', { ascending: true })

      if (faturasCountError) {
        throw new Error(
          `faturas_vendedor_monthly_count: ${faturasCountError.message}`,
        )
      }

      const { data: orcamentosCountData, error: orcamentosCountError } =
        await supabase
          .from('orcamentos_vendedor_monthly_count')
          .select('*')
          .or(
            `data_documento.like.${yearFilters.join(',data_documento.like.')}`,
          )
          .order('data_documento', { ascending: true })

      if (orcamentosCountError) {
        throw new Error(
          `orcamentos_vendedor_monthly_count: ${orcamentosCountError.message}`,
        )
      }

      setSalesData({
        faturasVendedor: faturasData || [],
        orcamentosVendedor: orcamentosData || [],
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
    await fetchSalesData()
    if (onRefresh) {
      await onRefresh()
    }
  }, [fetchSalesData, onRefresh])

  useEffect(() => {
    fetchSalesData()
  }, [fetchSalesData])

  // Calculate overview metrics
  const overviewMetrics = useMemo(() => {
    const currentYear = new Date().getFullYear()

    // Filter data for current year only for yearly totals and allowed departments
    const currentYearSales = salesData.faturasVendedor.filter((fatura) => {
      const dataParts = fatura.data_documento.split('/')
      if (dataParts.length === 2) {
        const year = parseInt(dataParts[1])
        const department = fatura.department || 'Sem Departamento'
        return year === currentYear && ALLOWED_DEPARTMENTS.includes(department)
      }
      return false
    })

    const currentYearQuotes = salesData.orcamentosVendedor.filter(
      (orcamento) => {
        const dataParts = orcamento.data_documento.split('/')
        if (dataParts.length === 2) {
          const year = parseInt(dataParts[1])
          const department = orcamento.department || 'Sem Departamento'
          return (
            year === currentYear && ALLOWED_DEPARTMENTS.includes(department)
          )
        }
        return false
      },
    )

    const totalSalesValue = currentYearSales.reduce(
      (sum, fatura) => sum + (fatura.euro_total || 0),
      0,
    )

    const totalQuotesValue = currentYearQuotes.reduce(
      (sum, orcamento) => sum + (orcamento.euro_total || 0),
      0,
    )

    // Updated conversion rate calculation using count data
    const currentYearQuotesCount = salesData.orcamentosVendedorCount
      .filter((orcamento) => {
        const dataParts = orcamento.data_documento.split('/')
        if (dataParts.length === 2) {
          const year = parseInt(dataParts[1])
          const department = orcamento.department || 'Sem Departamento'
          return (
            year === currentYear && ALLOWED_DEPARTMENTS.includes(department)
          )
        }
        return false
      })
      .reduce((sum, o) => sum + (o.document_count || 0), 0)

    const currentYearInvoicesCount = salesData.faturasVendedorCount
      .filter((fatura) => {
        const dataParts = fatura.data_documento.split('/')
        if (dataParts.length === 2) {
          const year = parseInt(dataParts[1])
          const department = fatura.department || 'Sem Departamento'
          return (
            year === currentYear && ALLOWED_DEPARTMENTS.includes(department)
          )
        }
        return false
      })
      .reduce((sum, f) => sum + (f.document_count || 0), 0)

    const conversionRate =
      currentYearQuotesCount > 0
        ? (currentYearInvoicesCount / currentYearQuotesCount) * 100
        : 0

    const activeSalespeople = new Set([
      ...currentYearSales.map((f) => f.nome),
      ...currentYearQuotes.map(
        (o) => o.nome || o.nome_utilizador || 'Desconhecido',
      ),
    ]).size

    return {
      totalSalesValue,
      totalQuotesValue,
      conversionRate,
      activeSalespeople,
    }
  }, [salesData])

  // Process data for top 10 clients - Simple current year vs last year
  const top10Clients = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const lastYear = currentYear - 1

    // Get current year clients first (for ranking)
    const currentYearTotals: { [key: string]: number } = {}
    const lastYearTotals: { [key: string]: number } = {}

    salesData.faturasVendedor.forEach((fatura) => {
      const client = fatura.nome_cliente || 'Cliente Desconhecido'
      const year = parseInt(fatura.data_documento.split('/')[1])
      const amount = fatura.euro_total || 0
      const department = fatura.department || 'Sem Departamento'

      // Only include allowed departments
      if (ALLOWED_DEPARTMENTS.includes(department)) {
        if (year === currentYear) {
          currentYearTotals[client] = (currentYearTotals[client] || 0) + amount
        } else if (year === lastYear) {
          lastYearTotals[client] = (lastYearTotals[client] || 0) + amount
        }
      }
    })

    // Get top 10 clients by current year sales
    const result = Object.entries(currentYearTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([client, currentAmount]) => ({
        name: client.length > 35 ? client.substring(0, 35) + '...' : client,
        fullName: client,
        currentYear: Math.round(currentAmount),
        lastYear: Math.round(lastYearTotals[client] || 0),
      }))

    // Log final data to confirm values are correct
    console.log(
      '✅ Chart data ready:',
      result.length,
      'clients with values from',
      result[0]?.currentYear || 0,
      'to',
      result[result.length - 1]?.currentYear || 0,
    )

    return result
  }, [salesData])

  // Process monthly sales trend for multiple years
  const monthlySalesTrend = useMemo(() => {
    const currentYear = new Date().getFullYear()
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
    salesData.faturasVendedor.forEach((fatura) => {
      const dataParts = fatura.data_documento.split('/')
      if (dataParts.length === 2) {
        const year = parseInt(dataParts[1])
        const department = fatura.department || 'Sem Departamento'
        if (
          targetYears.includes(year) &&
          ALLOWED_DEPARTMENTS.includes(department)
        ) {
          const month = fatura.data_documento
          monthlyDataByYear[year][month] =
            (monthlyDataByYear[year][month] || 0) + (fatura.euro_total || 0)
        }
      }
    })

    // Create chart data with monthly points for all years
    const chartData: Array<{
      month: string
      monthIndex: number
      [key: string]: number | string
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
      }

      targetYears.forEach((year) => {
        const monthKey = `${monthStr}/${year}`
        dataPoint[`vendas${year}`] = Math.round(
          monthlyDataByYear[year][monthKey] || 0,
        )
      })

      chartData.push(dataPoint)
    }

    return chartData
  }, [salesData])

  // Process department data
  const departmentData = useMemo(() => {
    const currentYear = new Date().getFullYear()

    // Sales by department - CURRENT YEAR ONLY
    const salesByDept: { [key: string]: number } = {}
    const quotesValueByDept: { [key: string]: number } = {}
    const quotesCountByDept: { [key: string]: number } = {}
    const salesCountByDept: { [key: string]: number } = {}

    // Filter faturas for current year only
    salesData.faturasVendedor
      .filter((fatura) => {
        const dataParts = fatura.data_documento.split('/')
        if (dataParts.length === 2) {
          const year = parseInt(dataParts[1])
          return year === currentYear
        }
        return false
      })
      .forEach((fatura) => {
        const dept = fatura.department || 'Sem Departamento'
        // Only include allowed departments
        if (ALLOWED_DEPARTMENTS.includes(dept)) {
          salesByDept[dept] =
            (salesByDept[dept] || 0) + (fatura.euro_total || 0)
          salesCountByDept[dept] = (salesCountByDept[dept] || 0) + 1
        }
      })

    // Updated quotes processing to use count data
    salesData.orcamentosVendedorCount
      .filter((orcamento) => {
        const dataParts = orcamento.data_documento.split('/')
        if (dataParts.length === 2) {
          const year = parseInt(dataParts[1])
          return year === currentYear
        }
        return false
      })
      .forEach((orcamento) => {
        const dept = orcamento.department || 'Sem Departamento'
        if (ALLOWED_DEPARTMENTS.includes(dept)) {
          quotesCountByDept[dept] =
            (quotesCountByDept[dept] || 0) + (orcamento.document_count || 0)
        }
      })

    // Also get quotes value data for value-based chart
    salesData.orcamentosVendedor
      .filter((orcamento) => {
        const dataParts = orcamento.data_documento.split('/')
        if (dataParts.length === 2) {
          const year = parseInt(dataParts[1])
          return year === currentYear
        }
        return false
      })
      .forEach((orcamento) => {
        const dept = orcamento.department || 'Sem Departamento'
        // Only include allowed departments
        if (ALLOWED_DEPARTMENTS.includes(dept)) {
          quotesValueByDept[dept] =
            (quotesValueByDept[dept] || 0) + (orcamento.euro_total || 0)
        }
      })

    // Also update sales count to use count data
    salesData.faturasVendedorCount
      .filter((fatura) => {
        const dataParts = fatura.data_documento.split('/')
        if (dataParts.length === 2) {
          const year = parseInt(dataParts[1])
          return year === currentYear
        }
        return false
      })
      .forEach((fatura) => {
        const dept = fatura.department || 'Sem Departamento'
        if (ALLOWED_DEPARTMENTS.includes(dept)) {
          salesCountByDept[dept] =
            (salesCountByDept[dept] || 0) + (fatura.document_count || 0)
        }
      })

    const salesByDepartment = Object.entries(salesByDept)
      .map(([dept, total]) => ({
        name: dept,
        value: Math.round(total),
      }))
      .sort((a, b) => b.value - a.value)

    const quotesByDepartment = Object.entries(quotesCountByDept)
      .map(([dept, count]) => ({
        name: dept,
        value: count, // Now showing count instead of euro value
      }))
      .sort((a, b) => b.value - a.value)

    const conversionByDepartment = Object.keys({
      ...quotesCountByDept,
      ...salesCountByDept,
    })
      .map((dept) => {
        const quotes = quotesCountByDept[dept] || 0
        const sales = salesCountByDept[dept] || 0
        const rate = quotes > 0 ? (sales / quotes) * 100 : 0

        return {
          name: dept,
          value: Math.round(rate * 10) / 10,
          quotesCount: quotes,
          salesCount: sales,
        }
      })
      .filter((item) => item.salesCount > 0)
      .sort((a, b) => b.value - a.value)

    const salesCountByDepartment = Object.entries(salesCountByDept)
      .map(([dept, count]) => ({
        name: dept,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)

    return {
      salesByDepartment,
      quotesByDepartment,
      conversionByDepartment,
      salesCountByDepartment,
    }
  }, [salesData])

  // Process individual salesperson data
  const individualData = useMemo(() => {
    const salesByPerson: { [key: string]: number } = {}
    const quotesValueByPerson: { [key: string]: number } = {}
    const quotesCountByPerson: { [key: string]: number } = {}
    const salesCountByPerson: { [key: string]: number } = {}

    // Filter data for allowed departments only
    const filteredFaturas = salesData.faturasVendedor.filter((f) => {
      const dept = f.department || 'Sem Departamento'
      return ALLOWED_DEPARTMENTS.includes(dept)
    })

    const filteredOrcamentos = salesData.orcamentosVendedor.filter((o) => {
      const dept = o.department || 'Sem Departamento'
      return ALLOWED_DEPARTMENTS.includes(dept)
    })

    const filteredOrcamentosCount = salesData.orcamentosVendedorCount.filter(
      (o) => {
        const dept = o.department || 'Sem Departamento'
        return ALLOWED_DEPARTMENTS.includes(dept)
      },
    )

    const filteredFaturasCount = salesData.faturasVendedorCount.filter((f) => {
      const dept = f.department || 'Sem Departamento'
      return ALLOWED_DEPARTMENTS.includes(dept)
    })

    filteredFaturas.forEach((fatura) => {
      const person = fatura.nome || 'Sem Nome'
      salesByPerson[person] =
        (salesByPerson[person] || 0) + (fatura.euro_total || 0)
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
  }, [salesData])

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
            {new Date().getFullYear()} (BRINDES, DIGITAL, IMACX)
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
                    Total Vendas (Ano)
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
                    Total Orçamentos (Ano)
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
                    Vendedores Ativos
                  </h3>
                  <p className="text-2xl font-bold text-orange-600">
                    {overviewMetrics.activeSalespeople}
                  </p>
                </div>
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </Card>
          </div>

          {/* Top 10 Clientes - SIMPLE VERTICAL CHART */}
          <Card className="rounded-none border-2 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-tight font-semibold">
                  Top 10 Clientes - Vendas Anuais
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Comparação {new Date().getFullYear() - 1} vs{' '}
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
            <ResponsiveContainer width="100%" height={600}>
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

          {/* Monthly Sales Trend */}
          <Card className="rounded-none border-2 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-tight font-semibold">
                  Vendas Mensais Trend
                </h3>
                <p className="text-muted-foreground text-sm leading-tight">
                  Evolução mensal das vendas - {new Date().getFullYear() - 2},{' '}
                  {new Date().getFullYear() - 1} e {new Date().getFullYear()}
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
                  formatter={(value: number, name: string) => {
                    const year = name.replace('vendas', '')
                    return [
                      value.toLocaleString('pt-PT', {
                        style: 'currency',
                        currency: 'EUR',
                      }),
                      `Vendas ${year}`,
                    ]
                  }}
                />
                <Legend
                  formatter={(value: string) => value.replace('vendas', '')}
                />
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
                <Line
                  type="monotone"
                  dataKey={`vendas${new Date().getFullYear()}`}
                  stroke={CHART_COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS.primary, strokeWidth: 2, r: 4 }}
                  name={`${new Date().getFullYear()}`}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Sales by Department */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Vendas por Departamento - {new Date().getFullYear()}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Volume de vendas por equipa
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
                    formatter={(value: number) => [
                      value.toLocaleString('pt-PT', {
                        style: 'currency',
                        currency: 'EUR',
                      }),
                      'Vendas',
                    ]}
                  />
                  <Bar dataKey="value" fill={CHART_COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Quotes by Department */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Orçamentos por Departamento - {new Date().getFullYear()}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Número de orçamentos por equipa
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
                    formatter={(value: number) => [
                      value.toString(),
                      'Número de Orçamentos',
                    ]}
                  />
                  <Bar dataKey="value" fill={CHART_COLORS.secondary} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Conversion Rate by Department */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Taxa de Conversão por Departamento -{' '}
                    {new Date().getFullYear()}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Eficiência na conversão de orçamentos em vendas
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
                    formatter={(value: number, name, props: any) => [
                      `${value}%`,
                      'Taxa de Conversão',
                    ]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload
                        return `${label}: ${data.salesCount} vendas / ${data.quotesCount} orçamentos`
                      }
                      return label
                    }}
                  />
                  <Bar dataKey="value" fill={CHART_COLORS.accent} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Number of Sales by Department */}
            <Card className="rounded-none border-2 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-tight font-semibold">
                    Número de Vendas por Departamento -{' '}
                    {new Date().getFullYear()}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Volume de transações por equipa
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
                    formatter={(value: number) => [
                      value.toString(),
                      'Número de Vendas',
                    ]}
                  />
                  <Bar dataKey="value" fill={CHART_COLORS.success} />
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

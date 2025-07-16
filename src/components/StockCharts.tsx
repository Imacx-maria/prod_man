'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StockData {
  id: string
  material: string | null
  cor: string | null
  tipo: string | null
  carateristica: string | null
  total_recebido: number
  total_consumido: number
  stock_atual: number
  quantidade_disponivel: number
  stock_minimo: number | null
  stock_critico: number | null
  referencia?: string | null
  stock_correct?: number | null
}

interface StockChartsProps {
  stockData: StockData[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export function StockCharts({ stockData }: StockChartsProps) {
  // Separate data by material type
  const rigidMaterials = useMemo(
    () => stockData.filter((item) => item.tipo?.toUpperCase() === 'RÍGIDOS'),
    [stockData],
  )

  const flexibleMaterials = useMemo(
    () => stockData.filter((item) => item.tipo?.toUpperCase() === 'FLEXÍVEIS'),
    [stockData],
  )

  // Special focus on Cartão
  const cartaoMaterials = useMemo(
    () =>
      rigidMaterials.filter(
        (item) => item.material?.toUpperCase() === 'CARTÃO',
      ),
    [rigidMaterials],
  )

  // Prepare data for Rigid Materials Pie Chart
  const rigidMaterialsDistribution = useMemo(() => {
    const distribution = rigidMaterials.reduce(
      (acc, curr) => {
        const material = curr.material || 'Sem Nome'
        if (!acc[material]) {
          acc[material] = {
            name: material,
            value: curr.stock_atual,
          }
        } else {
          acc[material].value += curr.stock_atual
        }
        return acc
      },
      {} as Record<string, { name: string; value: number }>,
    )

    return Object.values(distribution)
  }, [rigidMaterials])

  // Prepare data for Stock Levels Bar Chart
  const stockLevelsData = useMemo(() => {
    return stockData.map((item) => ({
      name: item.material || 'Sem Nome',
      atual: item.stock_atual,
      minimo: item.stock_minimo || 0,
      critico: item.stock_critico || 0,
    }))
  }, [stockData])

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Rigid Materials Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Materiais Rígidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rigidMaterialsDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {rigidMaterialsDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Stock Levels Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Níveis de Stock - Cartão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cartaoMaterials}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="referencia" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="stock_atual" name="Stock Atual" fill="#8884d8" />
                <Bar
                  dataKey="stock_minimo"
                  name="Nível Mínimo"
                  fill="#82ca9d"
                />
                <Bar
                  dataKey="stock_critico"
                  name="Nível Crítico"
                  fill="#ff8042"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Flexible Materials Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Stock de Materiais Flexíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={flexibleMaterials}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="material" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="stock_atual" name="Stock Atual" fill="#8884d8" />
                <Bar
                  dataKey="stock_minimo"
                  name="Nível Mínimo"
                  fill="#82ca9d"
                />
                <Bar
                  dataKey="stock_critico"
                  name="Nível Crítico"
                  fill="#ff8042"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Consumption vs Stock Area Chart for Cartão */}
      <Card>
        <CardHeader>
          <CardTitle>Consumo vs Stock - Cartão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={cartaoMaterials}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="referencia" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="total_recebido"
                  name="Total Recebido"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                />
                <Area
                  type="monotone"
                  dataKey="total_consumido"
                  name="Total Consumido"
                  stackId="1"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

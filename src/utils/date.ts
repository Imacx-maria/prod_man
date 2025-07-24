// Utility to parse a date string as a local date (YYYY-MM-DD)
export const parseDateFromYYYYMMDD = (
  dateString: string | null | undefined,
): Date | null => {
  if (!dateString) return null
  const [year, month, day] = dateString.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

// Utility to format a Date as 'YYYY-MM-DD' in local time
export const formatDateToYYYYMMDD = (
  date: Date | null | undefined,
): string | null => {
  if (!date) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Groups financial data by month or year
 * Used for aggregating daily data from tables like faturas_vendedor, vendas_vendedor, etc.
 */

export interface DateGroupableData {
  data: string // Date in format YYYY-MM-DD
  [key: string]: any // Any other properties
}

export interface GroupedData {
  period: string // YYYY-MM for month, YYYY for year
  data: any[] // Array of original data items for this period
  [key: string]: any // Aggregated values
}

/**
 * Groups data by month (YYYY-MM format)
 */
export function groupDataByMonth(
  data: DateGroupableData[],
  aggregationFields: string[] = [],
): GroupedData[] {
  console.log('🗓️ Grouping data by month:', {
    totalRecords: data.length,
    sampleData: data.slice(0, 3),
    aggregationFields,
  })

  const grouped = data.reduce(
    (acc, item) => {
      const date = new Date(item.data)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!acc[monthKey]) {
        acc[monthKey] = {
          period: monthKey,
          data: [],
          ...aggregationFields.reduce(
            (fieldAcc, field) => {
              fieldAcc[field] = 0
              return fieldAcc
            },
            {} as Record<string, number>,
          ),
        }
      }

      acc[monthKey].data.push(item)

      // Aggregate numeric fields
      aggregationFields.forEach((field) => {
        const value = Number(item[field]) || 0
        acc[monthKey][field] += value
      })

      return acc
    },
    {} as Record<string, GroupedData>,
  )

  const result = Object.values(grouped).sort((a, b) =>
    a.period.localeCompare(b.period),
  )

  console.log('📊 Month grouping result:', {
    periods: result.map((r) => r.period),
    totalPeriods: result.length,
    sampleAggregation: result.slice(0, 3).map((r) => ({
      period: r.period,
      itemCount: r.data.length,
      aggregated: aggregationFields.reduce(
        (acc, field) => {
          acc[field] = r[field]
          return acc
        },
        {} as Record<string, number>,
      ),
    })),
  })

  return result
}

/**
 * Groups data by year (YYYY format)
 */
export function groupDataByYear(
  data: DateGroupableData[],
  aggregationFields: string[] = [],
): GroupedData[] {
  console.log('🗓️ Grouping data by year:', {
    totalRecords: data.length,
    sampleData: data.slice(0, 3),
    aggregationFields,
  })

  const grouped = data.reduce(
    (acc, item) => {
      const date = new Date(item.data)
      const yearKey = String(date.getFullYear())

      if (!acc[yearKey]) {
        acc[yearKey] = {
          period: yearKey,
          data: [],
          ...aggregationFields.reduce(
            (fieldAcc, field) => {
              fieldAcc[field] = 0
              return fieldAcc
            },
            {} as Record<string, number>,
          ),
        }
      }

      acc[yearKey].data.push(item)

      // Aggregate numeric fields
      aggregationFields.forEach((field) => {
        const value = Number(item[field]) || 0
        acc[yearKey][field] += value
      })

      return acc
    },
    {} as Record<string, GroupedData>,
  )

  const result = Object.values(grouped).sort((a, b) =>
    a.period.localeCompare(b.period),
  )

  console.log('📊 Year grouping result:', {
    periods: result.map((r) => r.period),
    totalPeriods: result.length,
    sampleAggregation: result.slice(0, 3).map((r) => ({
      period: r.period,
      itemCount: r.data.length,
      aggregated: aggregationFields.reduce(
        (acc, field) => {
          acc[field] = r[field]
          return acc
        },
        {} as Record<string, number>,
      ),
    })),
  })

  return result
}

/**
 * Format period for display
 */
export function formatPeriodDisplay(
  period: string,
  groupBy: 'month' | 'year',
): string {
  if (groupBy === 'year') {
    return period
  }

  // For month format YYYY-MM
  const [year, month] = period.split('-')
  const monthNames = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]

  return `${monthNames[parseInt(month) - 1]} ${year}`
}

/**
 * Get available periods from data for filtering
 */
export function getAvailablePeriods(
  data: DateGroupableData[],
  groupBy: 'month' | 'year',
): string[] {
  const periods = new Set<string>()

  data.forEach((item) => {
    const date = new Date(item.data)
    if (groupBy === 'year') {
      periods.add(String(date.getFullYear()))
    } else {
      periods.add(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      )
    }
  })

  return Array.from(periods).sort()
}

/**
 * Helper function to aggregate multiple numeric fields at once
 */
export function aggregateFields(
  data: any[],
  fields: string[],
): Record<string, number> {
  return fields.reduce(
    (acc, field) => {
      acc[field] = data.reduce(
        (sum, item) => sum + (Number(item[field]) || 0),
        0,
      )
      return acc
    },
    {} as Record<string, number>,
  )
}

# Chart Fixes Plan

## Problem Analysis

The "Comparação Anual de Vendas" chart is currently showing only data for 2023, even though the database contains data for multiple years (2023, 2024, 2025). The console logs show that there are 1000 records in `multiYearData`, but only 1 year is being detected in `availableYears`.

## Root Cause

The issue appears to be in how dates are being parsed in the `yearlyComparisonData` useMemo. The code is using `new Date(fatura.data_documento)` to parse dates, which might not be handling the date format correctly.

## Proposed Changes

### 1. Modify the `fetchMultiYearData` function

```typescript
// Fetch multi-year faturas data for yearly comparison chart
const fetchMultiYearData = useCallback(async () => {
  try {
    // Dynamic year range: from 4 years ago to next year
    const currentYear = new Date().getFullYear()
    const startYear = currentYear - 4
    const endYear = currentYear + 1
    
    console.log('🔍 Fetching multi-year data from', startYear, 'to', endYear)

    const multiYearResult = await supabase
      .from('faturas_vendedor')
      .select('*')
      .gte('data_documento', `${startYear}-01-01`)
      .lte('data_documento', `${endYear}-12-31`)
      .order('data_documento', { ascending: true })

    if (multiYearResult.error) {
      throw new Error(`Multi-year faturas: ${multiYearResult.error.message}`)
    }

    // Log sample data to debug date format
    if (multiYearResult.data && multiYearResult.data.length > 0) {
      console.log('📊 Sample data:', multiYearResult.data.slice(0, 3).map(item => ({
        id: item.id,
        data_documento: item.data_documento,
        euro_total: item.euro_total
      })))
    }

    setMultiYearData(multiYearResult.data || [])
  } catch (err: any) {
    console.error('Error fetching multi-year data:', err)
    // Don't set main error for this, just log it
  }
}, [supabase])
```

### 2. Update the `yearlyComparisonData` useMemo

```typescript
// Process multi-year data for yearly comparison chart - SIDE BY SIDE BY MONTH
const yearlyComparisonData = useMemo(() => {
  if (!multiYearData || multiYearData.length === 0) {
    return { data: [], availableYears: [] }
  }

  console.log('🔍 Processing multi-year data:', multiYearData.length, 'records')

  // Build data structure: year -> month -> total
  const yearlyData: { [year: string]: { [month: string]: number } } = {}
  const allYears = new Set<string>()
  const allMonths = new Set<string>()

  // Process each fatura to aggregate by year and month
  multiYearData.forEach((fatura) => {
    // Use parseDateFromYYYYMMDD for more reliable date parsing
    const dateStr = fatura.data_documento
    
    // Log raw date string to debug
    console.log('📅 Raw date string:', dateStr)
    
    // Parse date using more reliable method
    const dateParts = dateStr.split('-')
    if (dateParts.length !== 3) {
      console.warn('⚠️ Invalid date format:', dateStr)
      return
    }
    
    const year = dateParts[0]
    const month = parseInt(dateParts[1]) - 1 // JavaScript months are 0-indexed
    const day = parseInt(dateParts[2])
    
    const date = new Date(parseInt(year), month, day)
    
    // Verify parsed date
    console.log('🔍 Parsed date:', date, 'Year:', year)
    
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
  const monthOrder = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  
  const chartData = monthOrder
    .filter(month => allMonths.has(month)) // Only include months that have data
    .map(month => {
      const monthData: { month: string; [year: string]: number | string } = { month }
      
      // Add data for each available year (0 if no data for that month/year)
      availableYears.forEach(year => {
        monthData[year] = yearlyData[year][month] || 0
      })
      
      return monthData
    })

  // Temporary debug: log final chart data structure
  if (chartData.length > 0) {
    console.log('🎯 CHART DATA READY:', {
      months: chartData.length,
      years: availableYears,
      sample: chartData[0]
    })
  } else {
    console.log('⚠️ CHART DATA EMPTY:', {
      multiYearDataLength: multiYearData?.length || 0,
      availableYears: availableYears.length
    })
  }

  return { data: chartData, availableYears }
}, [multiYearData])
```

### 3. Ensure all charts use months and years

All charts in the component should be using months and years for their data, not days. The current implementation already seems to be using months and years for most charts, but we should verify this for all charts.

## Implementation Plan

1. Switch to Code mode to implement these changes
2. Apply the changes to the `fetchMultiYearData` function
3. Apply the changes to the `yearlyComparisonData` useMemo
4. Test the changes to ensure they work correctly
5. Verify all charts are using months and years instead of days

## Expected Outcome

After implementing these changes, the "Comparação Anual de Vendas" chart should show data for all available years (2023, 2024, 2025), and all charts should be using months and years for their data, not days.
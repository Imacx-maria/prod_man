import { cookies } from 'next/headers'
import { createServerClient } from '@/utils/supabase'
import AccessibleWrapper from '@/components/AccessibleWrapper'
import React, { Suspense } from 'react'
import Header from '@/components/Header'
import dynamic from 'next/dynamic'

// Dynamically import ClientDashboardShell which contains all the calendar and drawer functionality
const ClientDashboardShell = dynamic(
  () => import('@/components/ClientDashboardShell'),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded-none bg-gray-200"></div>
    ),
  },
)

// Add metadata for SEO optimization
export const metadata = {
  title: 'IMACX Dashboard | Production Management',
  description:
    'Production management dashboard with holiday calendar and operational overview',
  keywords: 'production, dashboard, calendar, holidays, management, IMACX',
}

// Safe revalidation for holidays data only (changes rarely)
export const revalidate = 3600 // Revalidate every hour

interface Holiday {
  id: string
  holiday_date: string
  description?: string
}

const getHolidays = async (): Promise<Holiday[]> => {
  const cookieStore = cookies()
  const supabase = await createServerClient(cookieStore)

  // Optimize query: only fetch future/current holidays with reasonable limit
  const currentDate = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('feriados')
    .select('id, holiday_date, description')
    .gte('holiday_date', currentDate) // Only current and future holidays
    .order('holiday_date', { ascending: true })
    .limit(50) // Reasonable limit for holidays

  if (error || !data) {
    console.warn('Failed to fetch holidays:', error?.message)
    // fallback test holidays
    return [
      { id: 'test-1', holiday_date: '2024-12-25', description: 'Christmas' },
      {
        id: 'test-2',
        holiday_date: '2024-12-31',
        description: "New Year's Eve",
      },
      {
        id: 'test-3',
        holiday_date: '2025-01-01',
        description: "New Year's Day",
      },
      {
        id: 'test-4',
        holiday_date: '2025-04-25',
        description: 'Liberation Day',
      },
    ]
  }
  return data
}

// Improved loading component
const DashboardLoadingSkeleton = () => (
  <div className="mt-8 flex w-full flex-col items-center">
    <Header />
    <div className="mt-8 w-full max-w-6xl space-y-4">
      <div className="h-8 animate-pulse rounded-none bg-gray-200"></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-none bg-gray-200"
          ></div>
        ))}
      </div>
    </div>
  </div>
)

export default async function Index() {
  const cookieStore = cookies()
  const supabase = await createServerClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not logged in, show simple message (user needs to use login button in header)
  if (!user) {
    return (
      <AccessibleWrapper>
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-20">
          <div className="flex w-full max-w-6xl flex-col items-center gap-10 px-3">
            <h1 className="mb-2 text-center text-4xl font-extrabold">
              Gestão Produção Imacx
            </h1>
            <p className="text-muted-foreground text-center text-xl">
              Please log in to access your dashboard
            </p>
          </div>
        </div>
      </AccessibleWrapper>
    )
  }

  // If logged in, get holidays and show the full dashboard with drawer functionality
  const holidays = await getHolidays()

  return (
    <AccessibleWrapper>
      <Suspense fallback={<DashboardLoadingSkeleton />}>
        <ClientDashboardShell holidays={holidays} />
      </Suspense>
    </AccessibleWrapper>
  )
}

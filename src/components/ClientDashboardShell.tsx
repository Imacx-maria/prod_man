'use client'
import React, { useEffect } from 'react'
import { debugLog } from '@/utils/devLogger'
import dynamic from 'next/dynamic'

interface Holiday {
  id: string
  holiday_date: string
  description?: string
}

interface ClientDashboardShellProps {
  holidays: Holiday[]
}

const ClientIndex = dynamic(() => import('./ClientIndex'), { ssr: false })

const ClientDashboardShell: React.FC<ClientDashboardShellProps> = ({
  holidays,
}) => {
  // Force refresh permissions and auth state on mount to ensure fresh data after login
  useEffect(() => {
    // Check if we just came from a login (URL contains login redirect or fresh session)
    const urlParams = new URLSearchParams(window.location.search)
    const isFromLogin =
      urlParams.has('from_login') ||
      sessionStorage.getItem('just_logged_in') === 'true'

    if (isFromLogin) {
      debugLog('🔄 Detected fresh login, forcing permissions refresh')

      // Clear the login flag
      sessionStorage.removeItem('just_logged_in')

      // Force refresh of auth and permissions
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshAuth'))
        window.dispatchEvent(new CustomEvent('refreshPermissions'))
      }, 200)
    }
  }, [])

  return (
    <div className="flex w-full flex-col items-center">
      <main role="main" className="w-full">
        <ClientIndex holidays={holidays} />
      </main>
    </div>
  )
}

export default ClientDashboardShell

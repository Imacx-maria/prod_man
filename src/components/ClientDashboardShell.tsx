"use client"
import React from 'react'
import dynamic from 'next/dynamic'

interface Holiday {
  id: string;
  holiday_date: string;
  description?: string;
}

interface ClientDashboardShellProps {
  holidays: Holiday[];
}

const ClientIndex = dynamic(() => import('./ClientIndex'), { ssr: false })

const ClientDashboardShell: React.FC<ClientDashboardShellProps> = ({ holidays }) => {
  return (
    <div className="flex flex-col items-center w-full">
      <main role="main" className="w-full">
        <ClientIndex holidays={holidays} />
      </main>
    </div>
  )
}

export default ClientDashboardShell; 
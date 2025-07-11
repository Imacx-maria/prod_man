'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

// Create the context
const PermissionsContext = createContext<
  ReturnType<typeof usePermissions> | undefined
>(undefined)

// Provider component
export function PermissionsProvider({ children }: { children: ReactNode }) {
  const permissionsState = usePermissions()

  return (
    <PermissionsContext.Provider value={permissionsState}>
      {children}
    </PermissionsContext.Provider>
  )
}

// Hook to use the permissions context
export function usePermissionsContext() {
  const context = useContext(PermissionsContext)

  if (context === undefined) {
    throw new Error(
      'usePermissionsContext must be used within a PermissionsProvider',
    )
  }

  return context
}

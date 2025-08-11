'use client'

import { useEffect } from 'react'
import { debugLog, debugWarn } from '@/utils/devLogger'
import { useRouter, usePathname } from 'next/navigation'
import { usePermissionsContext } from '@/providers/PermissionsProvider'
import { Loader2 } from 'lucide-react'

interface PermissionGuardProps {
  children: React.ReactNode
  requiredPath?: string // If not provided, uses current pathname
  fallbackPath?: string // Where to redirect if access denied (default: /dashboard)
}

export default function PermissionGuard({
  children,
  requiredPath,
  fallbackPath = '/dashboard',
}: PermissionGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { canAccessPage, loading, userProfile } = usePermissionsContext()

  const pathToCheck = requiredPath || pathname

  useEffect(() => {
    debugLog('🛡️ PermissionGuard Debug:', {
      loading,
      userProfile: userProfile?.roles?.name || 'No role',
      pathToCheck,
      canAccess: userProfile ? canAccessPage(pathToCheck) : false,
      hasUserProfile: !!userProfile,
      userPermissionsCount: userProfile ? 'Available' : 'N/A',
    })

    // Additional debug for permissions
    if (userProfile) {
      debugLog('🛡️ User Details:', {
        userId: userProfile.user_id,
        roleId: userProfile.role_id,
        roleName: userProfile.roles?.name,
      })
    }

    // Wait for permissions to load completely
    if (loading) {
      debugLog('🛡️ Still loading, waiting...')
      return
    }

    // Only redirect to login if we're certain user is not authenticated after loading
    if (!loading && !userProfile) {
      debugWarn(
        `🛡️ PermissionGuard: No user profile after loading completed, redirecting to login`,
      )
      router.push('/login')
      return
    }

    // Check permissions only after we have user profile
    if (userProfile && !canAccessPage(pathToCheck)) {
      debugWarn(
        `🛡️ PermissionGuard: Access denied to ${pathToCheck} for user with role ${userProfile.roles?.name}`,
      )
      router.push(fallbackPath)
    } else if (userProfile) {
      debugLog(`🛡️ PermissionGuard: Access granted to ${pathToCheck}`)
    }
  }, [loading, userProfile, pathToCheck, canAccessPage, router, fallbackPath])

  // Show loading while checking permissions or authentication
  if (loading || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Check if user has access (only after we have userProfile)
  if (!canAccessPage(pathToCheck)) {
    // Show loading while redirect happens (instead of immediate redirect)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  // User has access, render children
  return <>{children}</>
}

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { useAuth } from './useAuth'

interface Permission {
  page_path: string
  can_access: boolean
}

interface UserProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  role_id: string
  roles: {
    id: string
    name: string
    description: string | null
  }
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const supabase = createBrowserClient()

  useEffect(() => {
    if (!user) {
      setPermissions([])
      setUserProfile(null)
      setLoading(false)
      return
    }

    // Don't reset state if we already have this user's data
    if (userProfile && userProfile.user_id === user.id) {
      setLoading(false)
      return
    }

    const fetchUserPermissions = async () => {
      try {
        setLoading(true)
        setError(null)

        // First, get the user's profile and role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(
            `
            *,
            roles (
              id,
              name,
              description
            )
          `,
          )
          .eq('user_id', user.id)
          .single()

        if (profileError || !profile) {
          console.error('Error fetching user profile:', profileError)
          setError('Failed to fetch user profile')
          return
        }

        setUserProfile(profile)

        console.log('🔍 usePermissions Debug:')
        console.log('- User ID:', user.id)
        console.log('- Profile:', profile)
        console.log('- Role name:', profile.roles?.name)
        console.log('- Role ID:', profile.role_id)

        // Then get the role's permissions
        const { data: rolePermissions, error: permissionsError } =
          await supabase
            .from('role_permissions')
            .select('page_path, can_access')
            .eq('role_id', profile.role_id)
            .eq('can_access', true) // Only fetch allowed permissions

        if (permissionsError) {
          console.error('Error fetching permissions:', permissionsError)
          setError('Failed to fetch permissions')
          return
        }

        console.log('- Fetched permissions:', rolePermissions)
        console.log('- Permission count:', rolePermissions?.length || 0)
        console.log(
          '- Production permissions:',
          rolePermissions?.filter((p) => p.page_path.startsWith('/producao')),
        )
        console.log(
          '- Definicoes permissions:',
          rolePermissions?.filter((p) => p.page_path.startsWith('/definicoes')),
        )
        console.log(
          '- All permission paths:',
          rolePermissions?.map((p) => p.page_path),
        )

        setPermissions(rolePermissions || [])
      } catch (err) {
        console.error('Error in fetchUserPermissions:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchUserPermissions()
  }, [user])

  // Helper function to check if user can access a specific page
  const canAccessPage = (pagePath: string): boolean => {
    if (!userProfile) return false

    // If user has no permissions loaded but has a profile, this might mean:
    // 1. Migration hasn't run yet
    // 2. User has a role but no permissions set up
    // In this case, let's check if they're an ADMIN or have a valid role
    if (!permissions || permissions.length === 0) {
      console.warn(
        '🛡️ No permissions found for user, checking role-based fallback',
      )
      // Allow access for ADMIN role or if it's a basic page
      if (userProfile.roles?.name === 'ADMIN') {
        console.log('🛡️ Admin fallback: allowing access')
        return true
      }
      // Allow access to basic authenticated pages
      if (
        [
          '/dashboard',
          '/dashboard/profile',
          '/dashboard/change-password',
          '/',
        ].includes(pagePath)
      ) {
        return true
      }
      // Temporary: Allow PRODUCAO role access to all production/definicoes pages
      if (
        userProfile.roles?.name === 'PRODUCAO' &&
        (pagePath.startsWith('/producao') ||
          pagePath.startsWith('/definicoes') ||
          pagePath === '/designer-flow')
      ) {
        console.log('🛡️ PRODUCAO role fallback: allowing access to', pagePath)
        return true
      }
      return false
    }

    // Check if user has explicit permission for this page
    const permission = permissions.find((p) => p.page_path === pagePath)
    return permission?.can_access === true
  }

  // Helper function to check if user has a specific role
  const hasRole = (roleName: string): boolean => {
    return userProfile?.roles?.name === roleName
  }

  // Helper function to check if user has any of the specified roles
  const hasAnyRole = (roleNames: string[]): boolean => {
    return roleNames.includes(userProfile?.roles?.name || '')
  }

  // Get all accessible pages for the current user
  const getAccessiblePages = (): string[] => {
    return permissions.filter((p) => p.can_access).map((p) => p.page_path)
  }

  // Filter menu items based on permissions
  const filterMenuItems = (
    menuItems: Array<{ path: string; [key: string]: any }>,
  ): Array<{ path: string; [key: string]: any }> => {
    return menuItems.filter((item) => canAccessPage(item.path))
  }

  return {
    permissions,
    userProfile,
    loading,
    error,
    canAccessPage,
    hasRole,
    hasAnyRole,
    getAccessiblePages,
    filterMenuItems,
    // Utility function to refresh permissions (useful after role changes)
    refresh: () => {
      if (user) {
        setLoading(true)
        const event = new CustomEvent('refreshPermissions')
        window.dispatchEvent(event)
      }
    },
  }
}

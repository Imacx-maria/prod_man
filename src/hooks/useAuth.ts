'use client'

import { createBrowserClient } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient()

  // Force refresh auth state
  const refreshAuth = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()
      if (error) {
        console.error('Error refreshing session:', error)
        setUser(null)
        return
      }

      if (session?.user) {
        setUser(session.user)
        console.log('🔄 Auth refreshed successfully:', session.user.id)
      } else {
        setUser(null)
        console.log('🔄 No session found during refresh')
      }
    } catch (error) {
      console.error('Error in refreshAuth:', error)
      setUser(null)
    }
  }, [supabase.auth])

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        setLoading(true)

        // First, try to get existing session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
          if (mounted) {
            setUser(null)
            setLoading(false)
            setInitialized(true)
          }
          return
        }

        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
          setInitialized(true)

          console.log('🔐 Auth initialized:', {
            hasSession: !!session,
            userId: session?.user?.id,
            expiresAt: session?.expires_at
              ? new Date(session.expires_at * 1000).toLocaleString()
              : null,
          })
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setUser(null)
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    // Set up auth state listener with improved session handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('🔐 Auth state change:', event, {
        hasSession: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at
          ? new Date(session.expires_at * 1000).toLocaleString()
          : null,
      })

      // Update user state
      setUser(session?.user ?? null)

      // Only set loading to false after we've initialized
      if (initialized || event === 'INITIAL_SESSION') {
        setLoading(false)
      }

      // Handle specific auth events
      switch (event) {
        case 'SIGNED_IN':
          console.log('✅ User signed in successfully')
          // Force a small delay to ensure all providers are ready
          setTimeout(() => {
            if (mounted) {
              setLoading(false)
              setInitialized(true)
            }
          }, 100)
          break

        case 'SIGNED_OUT':
          console.log('👋 User signed out')
          setUser(null)
          setLoading(false)
          break

        case 'TOKEN_REFRESHED':
          console.log('🔄 Token refreshed successfully')
          break

        case 'USER_UPDATED':
          console.log('👤 User updated')
          break

        case 'PASSWORD_RECOVERY':
          console.log('🔑 Password recovery initiated')
          break
      }
    })

    // Initialize auth
    initializeAuth()

    // Fallback timeout to ensure loading state resolves
    const timeoutId = setTimeout(() => {
      if (mounted && !initialized) {
        console.warn('⚠️ Auth initialization timeout, forcing completion')
        setLoading(false)
        setInitialized(true)
      }
    }, 2000)

    // Listen for custom refresh events
    const handleRefreshAuth = () => {
      if (mounted) {
        console.log('🔄 Force refreshing auth state')
        refreshAuth()
      }
    }

    window.addEventListener('refreshAuth', handleRefreshAuth)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timeoutId)
      window.removeEventListener('refreshAuth', handleRefreshAuth)
    }
  }, [supabase.auth, initialized, refreshAuth])

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
      // Clear local state immediately
      setUser(null)
      setInitialized(false)
      router.push('/login')
    } catch (error) {
      console.error('Unexpected error during sign out:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    initialized,
    signOut,
    refreshAuth,
    isAuthenticated: !!user && initialized,
  }
}

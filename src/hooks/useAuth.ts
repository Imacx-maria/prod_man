'use client'

import { createBrowserClient } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    let mounted = true

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (mounted) {
          setUser(user)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error getting user:', error)
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    // Set up auth state listener with better session handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setUser(session?.user ?? null)
        setLoading(false)

        // Log auth events for debugging
        console.log('Auth state change:', event, {
          hasSession: !!session,
          userId: session?.user?.id,
          expiresAt: session?.expires_at
            ? new Date(session.expires_at * 1000)
            : null,
        })

        // Handle token refresh automatically
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully')
        }

        if (event === 'SIGNED_OUT') {
          console.log('User signed out')
        }
      }
    })

    getUser()

    // Fallback timeout to ensure loading state resolves
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false)
      }
    }, 1000) // Increased timeout for more stability

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [supabase.auth])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
  }
}

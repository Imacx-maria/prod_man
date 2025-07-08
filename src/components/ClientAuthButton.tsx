'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

export default function ClientAuthButton() {
  const { user, signOut, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-8 w-24 animate-pulse items-center justify-center rounded-md bg-gray-200 dark:bg-gray-800">
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  return user ? (
    <div className="flex items-center gap-4">
      Hey, {user.email}!
      <button
        onClick={signOut}
        className="bg-btn-background hover:bg-btn-background-hover rounded-md px-4 py-2 no-underline"
      >
        Logout
      </button>
    </div>
  ) : (
    <Link
      href="/login"
      className="bg-btn-background hover:bg-btn-background-hover flex rounded-md px-3 py-2 no-underline"
    >
      Login
    </Link>
  )
} 
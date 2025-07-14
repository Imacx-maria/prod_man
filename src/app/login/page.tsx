'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'

export default function Login({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  // Ensure component is mounted before rendering interactive elements
  useEffect(() => {
    setIsMounted(true)

    // Clear any residual auth/permissions state when login page loads
    // This ensures a clean state especially after logout
    localStorage.removeItem('permissions_cache')
    sessionStorage.removeItem('permissions_cache')
    sessionStorage.removeItem('just_logged_in')

    // Dispatch clear events to ensure all components reset
    window.dispatchEvent(new CustomEvent('clearPermissions'))

    console.log('🧹 Login page loaded - cleared all cached state')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.error) {
        router.push(`/login?message=${encodeURIComponent(result.error)}`)
      } else {
        // Clear any cached permissions and force refresh
        localStorage.removeItem('permissions_cache')
        sessionStorage.removeItem('permissions_cache')

        // Set flag to indicate fresh login
        sessionStorage.setItem('just_logged_in', 'true')

        // Dispatch events to clear auth and permissions state
        window.dispatchEvent(new CustomEvent('clearPermissions'))
        window.dispatchEvent(new CustomEvent('refreshAuth'))

        // Small delay to ensure events are processed, then force refresh
        setTimeout(() => {
          window.location.href = '/'
        }, 100)
      }
    } catch (error) {
      router.push('/login?message=Ocorreu um erro inesperado. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Entrar na sua conta
        </CardTitle>
        <CardDescription className="mt-4">
          Introduza o seu email e palavra-passe para aceder ao painel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu.email@empresa.com"
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                className="lowercase"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isMounted || isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  minLength={6}
                  className="pr-10 normal-case"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!isMounted || isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword
                      ? 'Ocultar palavra-passe'
                      : 'Mostrar palavra-passe'
                  }
                  disabled={!isMounted || isLoading}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!isMounted || isLoading}
            >
              {isLoading ? 'A entrar...' : 'Entrar'}
            </Button>
          </div>

          {searchParams?.message && (
            <div className="mt-4 rounded-md border p-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-red-500"></div>
                <p className="text-foreground">
                  {decodeURIComponent(searchParams.message)}
                </p>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

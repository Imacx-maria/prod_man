import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@/utils/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default async function ProtectedRoute({ children }: ProtectedRouteProps) {
  const cookieStore = cookies()
  const supabase = await createServerClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login?message=You must be logged in to view this page')
  }
  
  return <>{children}</>
} 
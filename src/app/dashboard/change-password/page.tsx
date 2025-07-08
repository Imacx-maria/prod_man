import ProtectedRoute from '@/components/ProtectedRoute'
import { cookies } from 'next/headers'
import { createServerClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const changePassword = async (formData: FormData) => {
    'use server'
    
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    
    if (password !== confirmPassword) {
      return redirect('/dashboard/change-password?message=Passwords do not match')
    }
    
    const cookieStore = cookies()
    const supabase = await createServerClient(cookieStore)
    
    const { error } = await supabase.auth.updateUser({
      password,
    })
    
    if (error) {
      return redirect(`/dashboard/change-password?message=${error.message}`)
    }
    
    return redirect('/dashboard/profile?message=Password updated successfully')
  }
  
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/dashboard/profile"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to Profile
          </Link>
        </div>
        
        <h1 className="mb-8 text-3xl font-bold">Change Password</h1>
        
        <div className="max-w-md rounded-lg border p-6 shadow-sm">
          <form action={changePassword} className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="password">New Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password"
                placeholder="••••••••" 
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input 
                id="confirmPassword" 
                name="confirmPassword" 
                type="password"
                placeholder="••••••••" 
                required
              />
            </div>
            
            <Button type="submit">
              Update Password
            </Button>
            
            {searchParams?.message && (
              <p className="p-3 text-sm rounded bg-destructive/10 text-destructive">
                {searchParams.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </ProtectedRoute>
  )
} 
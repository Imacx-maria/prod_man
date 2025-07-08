import { cookies } from 'next/headers'
import { createServerClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { redirect } from 'next/navigation'

export default function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const updatePassword = async (formData: FormData) => {
    'use server'
    
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    
    if (password !== confirmPassword) {
      return redirect('/update-password?message=Passwords do not match')
    }
    
    const cookieStore = cookies()
    const supabase = await createServerClient(cookieStore)
    
    const { error } = await supabase.auth.updateUser({
      password,
    })
    
    if (error) {
      return redirect(`/update-password?message=${error.message}`)
    }
    
    return redirect('/login?message=Password updated successfully. Please log in.')
  }
  
  return (
    <div className="flex w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <h1 className="mb-6 text-2xl font-bold">Update Your Password</h1>
      
      <form
        className="animate-in flex w-full flex-1 flex-col justify-center gap-2 text-foreground"
        action={updatePassword}
      >
        <div className="grid gap-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            className="mb-3"
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
            className="mb-3"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••" 
            required
          />
          <p className="text-sm text-muted-foreground">
            Enter your new password. Make sure it's at least 8 characters and contains a mix of letters, numbers, and symbols.
          </p>
        </div>
        
        <Button className="mt-4" type="submit">
          Update Password
        </Button>
        
        {searchParams?.message && (
          <p className="mt-4 p-4 text-center bg-destructive/10 text-destructive">
            {searchParams.message}
          </p>
        )}
      </form>
    </div>
  )
} 
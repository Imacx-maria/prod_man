import { cookies, headers } from 'next/headers'
import { createServerClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const resetPassword = async (formData: FormData) => {
    'use server'
    
    const headersList = await headers()
    const origin = headersList.get('origin') || ''
    const email = formData.get('email') as string
    const cookieStore = cookies()
    const supabase = await createServerClient(cookieStore)
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/update-password`,
    })
    
    if (error) {
      return redirect(`/reset-password?message=${error.message}`)
    }
    
    return redirect('/reset-password?message=Check your email for a password reset link')
  }
  
  return (
    <div className="flex w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <Link
        href="/login"
        className="group absolute left-8 top-8 flex items-center rounded-md px-4 py-2 text-sm text-foreground no-underline hover:bg-muted"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>{' '}
        Back to Login
      </Link>
      
      <h1 className="mb-6 text-2xl font-bold">Reset Password</h1>
      
      <form
        className="animate-in flex w-full flex-1 flex-col justify-center gap-2 text-foreground"
        action={resetPassword}
      >
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            className="mb-3"
            name="email"
            id="email"
            placeholder="you@example.com"
            required
          />
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>
        
        <Button className="mt-4" type="submit">
          Send Reset Link
        </Button>
        
        {searchParams?.message && (
          <p className="mt-4 p-4 text-center bg-foreground/10">
            {searchParams.message}
          </p>
        )}
      </form>
    </div>
  )
} 
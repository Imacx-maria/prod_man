import Link from 'next/link'
import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

// Add metadata for login page
export const metadata = {
  title: 'Login | IMACX',
  description: 'Sign in to your IMACX account to access the production management dashboard',
  keywords: 'login, sign in, authentication, IMACX, access',
}

// Helper function to get user-friendly error messages
const getErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred';
  
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('invalid_credentials') || message.includes('invalid login')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (message.includes('email not confirmed')) {
    return 'Please check your email and click the confirmation link before signing in.';
  }
  if (message.includes('too many requests')) {
    return 'Too many login attempts. Please wait a few minutes before trying again.';
  }
  if (message.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  return 'Unable to sign in. Please try again or contact support if the problem persists.';
};

export default function Login({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const signIn = async (formData: FormData) => {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    // Basic server-side validation
    if (!email || !password) {
      return redirect('/login?message=Email and password are required');
    }
    
    if (!email.includes('@')) {
      return redirect('/login?message=Please enter a valid email address');
    }

    try {
      const cookieStore = cookies()
      const supabase = await createServerClient(cookieStore)

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) {
        console.error('Login error:', error.message);
        const userMessage = encodeURIComponent(getErrorMessage(error));
        return redirect(`/login?message=${userMessage}`);
      }

      return redirect('/')
    } catch (error: any) {
      // Don't log NEXT_REDIRECT as an error - it's expected behavior for redirects
      if (error?.digest?.includes('NEXT_REDIRECT')) {
        throw error; // Re-throw to let Next.js handle the redirect
      }
      
      console.error('Unexpected login error:', error);
      return redirect('/login?message=An unexpected error occurred. Please try again.');
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your email and password to access your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signIn}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your.email@company.com"
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                className="lowercase"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </div>

          {searchParams?.message && (
            <div className="mt-4 rounded-md border p-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-foreground">
                  {decodeURIComponent(searchParams.message)}
                </p>
              </div>
            </div>
          )}
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              Need help?{' '}
              <Link href="/reset-password" className="text-primary hover:underline">
                Reset your password
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

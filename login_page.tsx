import Link from 'next/link'
import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/utils/supabase'
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

// Add metadata for login page
export const metadata = {
  title: 'Login | IMACX',
  description:
    'Faça login na sua conta IMACX para aceder ao painel de gestão de produção',
  keywords: 'login, entrar, autenticação, IMACX, acesso',
}

// Helper function to get user-friendly error messages
const getErrorMessage = (error: any): string => {
  if (!error) return 'Ocorreu um erro inesperado'

  const message = error.message?.toLowerCase() || ''

  if (
    message.includes('invalid_credentials') ||
    message.includes('invalid login')
  ) {
    return 'Email ou palavra-passe inválidos. Verifique as suas credenciais e tente novamente.'
  }
  if (message.includes('email not confirmed')) {
    return 'Verifique o seu email e clique no link de confirmação antes de fazer login.'
  }
  if (message.includes('too many requests')) {
    return 'Demasiadas tentativas de login. Aguarde alguns minutos antes de tentar novamente.'
  }
  if (message.includes('network')) {
    return 'Erro de rede. Verifique a sua ligação e tente novamente.'
  }

  return 'Não foi possível fazer login. Tente novamente ou contacte o suporte se o problema persistir.'
}

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
      return redirect('/login?message=Email e palavra-passe são obrigatórios')
    }

    if (!email.includes('@')) {
      return redirect(
        '/login?message=Por favor, introduza um endereço de email válido',
      )
    }

    try {
      const cookieStore = cookies()
      const supabase = await createServerClient(cookieStore)

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) {
        console.error('Login error:', error.message)
        const userMessage = encodeURIComponent(getErrorMessage(error))
        return redirect(`/login?message=${userMessage}`)
      }

      return redirect('/')
    } catch (error: any) {
      // Don't log NEXT_REDIRECT as an error - it's expected behavior for redirects
      if (error?.digest?.includes('NEXT_REDIRECT')) {
        throw error // Re-throw to let Next.js handle the redirect
      }

      console.error('Unexpected login error:', error)
      return redirect(
        '/login?message=Ocorreu um erro inesperado. Tente novamente.',
      )
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
        <form action={signIn}>
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
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Palavra-passe</Label>
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
              Entrar
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

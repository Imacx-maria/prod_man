import ProtectedRoute from '@/components/ProtectedRoute'
import { cookies } from 'next/headers'
import { createServerClient } from '@/utils/supabase'

// Add metadata for dashboard page
export const metadata = {
  title: 'Painel | IMACX',
  description:
    'Painel de utilizador com informações da conta e atividade recente',
  keywords: 'painel, conta, utilizador, perfil, IMACX',
}

// Helper function for safe date formatting
const formatLastSignIn = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Nunca'

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Data inválida'

    return date.toLocaleString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Não foi possível exibir a data'
  }
}

export default async function Dashboard() {
  const cookieStore = cookies()
  const supabase = await createServerClient(cookieStore)

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Falha ao obter dados do utilizador:', error.message)
    }

    return (
      <ProtectedRoute>
        <div className="container mx-auto pt-4 pb-10">
          <h1 className="mb-8 text-3xl font-bold">Painel</h1>

          <div className="rounded-lg border p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">
              Bem-vindo{user?.email ? `, ${user.email}` : ''}
            </h2>
            <p className="text-muted-foreground mb-6">
              Esta é uma página protegida que apenas utilizadores autenticados
              podem aceder.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border p-4">
                <h3 className="mb-2 font-medium">A Sua Conta</h3>
                <div className="text-muted-foreground space-y-1 text-sm">
                  <p>Email: {user?.email || 'Não disponível'}</p>
                  <p>
                    ID do Utilizador:{' '}
                    {user?.id ? `${user.id.slice(0, 8)}...` : 'Não disponível'}
                  </p>
                </div>
              </div>

              <div className="rounded-md border p-4">
                <h3 className="mb-2 font-medium">Último Acesso</h3>
                <p className="text-muted-foreground text-sm">
                  {formatLastSignIn(user?.last_sign_in_at)}
                </p>
              </div>

              <div className="rounded-md border p-4">
                <h3 className="mb-2 font-medium">Estado da Conta</h3>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-muted-foreground text-sm">Ativa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  } catch (error) {
    console.error('Erro no painel:', error)

    return (
      <ProtectedRoute>
        <div className="container mx-auto pt-4 pb-10">
          <h1 className="mb-8 text-3xl font-bold">Painel</h1>
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="mb-2 text-lg font-semibold text-red-800">
              Não foi possível carregar o painel
            </h2>
            <p className="text-red-600">
              Ocorreu um problema ao carregar o seu painel. Por favor, tente
              atualizar a página.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }
}

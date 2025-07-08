import ProtectedRoute from '@/components/ProtectedRoute'
import { cookies } from 'next/headers'
import { createServerClient } from '@/utils/supabase'

// Add metadata for dashboard page
export const metadata = {
  title: 'Dashboard | IMACX',
  description: 'User dashboard with account information and recent activity',
  keywords: 'dashboard, account, user, profile, IMACX',
}

// Helper function for safe date formatting
const formatLastSignIn = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Unable to display date';
  }
};

export default async function Dashboard() {
  const cookieStore = cookies()
  const supabase = await createServerClient(cookieStore)
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Failed to fetch user data:', error.message);
    }
    
    return (
      <ProtectedRoute>
        <div className="container mx-auto pt-4 pb-10">
          <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>
          
          <div className="rounded-lg border p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">
              Welcome{user?.email ? `, ${user.email}` : ''}
            </h2>
            <p className="text-muted-foreground mb-6">
              This is a protected page that only authenticated users can access.
            </p>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border p-4">
                <h3 className="font-medium mb-2">Your Account</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Email: {user?.email || 'Not available'}</p>
                  <p>User ID: {user?.id ? `${user.id.slice(0, 8)}...` : 'Not available'}</p>
                </div>
              </div>
              
              <div className="rounded-md border p-4">
                <h3 className="font-medium mb-2">Last Sign In</h3>
                <p className="text-sm text-muted-foreground">
                  {formatLastSignIn(user?.last_sign_in_at)}
                </p>
              </div>
              
              <div className="rounded-md border p-4">
                <h3 className="font-medium mb-2">Account Status</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  } catch (error) {
    console.error('Dashboard error:', error);
    
    return (
      <ProtectedRoute>
        <div className="container mx-auto pt-4 pb-10">
          <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>
          <div className="rounded-lg border border-red-200 p-6 bg-red-50">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Unable to Load Dashboard
            </h2>
            <p className="text-red-600">
              There was an issue loading your dashboard. Please try refreshing the page.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }
} 
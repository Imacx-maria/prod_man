import ProtectedRoute from '@/components/ProtectedRoute'
import { cookies } from 'next/headers'
import { createServerClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function ProfilePage() {
  const cookieStore = cookies()
  const supabase = await createServerClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  
  const updateProfile = async (formData: FormData) => {
    'use server'
    
    const name = formData.get('name') as string
    const cookieStore = cookies()
    const supabase = await createServerClient(cookieStore)
    
    await supabase.auth.updateUser({
      data: { name }
    })
    
    // Refresh the page to show updated data
    return
  }
  
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10">
        <h1 className="mb-8 text-3xl font-bold">Your Profile</h1>
        
        <div className="grid max-w-xl gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-medium">{user?.id}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Last Sign In</p>
                  <p className="font-medium">
                    {new Date(user?.last_sign_in_at || '').toLocaleString() || 'Never'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your profile information.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateProfile} className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    defaultValue={user?.user_metadata?.name || ''} 
                    placeholder="Your name"
                  />
                  <p className="text-sm text-muted-foreground">
                    This is how others will see you.
                  </p>
                </div>
                
                <Button type="submit">
                  Update Profile
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Update your password or delete your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button variant="outline" asChild>
                  <a href="/dashboard/change-password">Change Password</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
} 
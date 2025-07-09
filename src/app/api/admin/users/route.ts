import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Method 1: Try with admin API (with explicit pagination to get all users)
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000  // Ensure we get all users, not just the default page size
    })
    
    console.log(`=== ADMIN API RESULTS ===`)
    console.log(`Fetched ${users?.length || 0} users from Supabase Auth`)
    console.log('User emails:', users?.map(u => u.email) || [])
    
    // Method 2: Try direct SQL query to auth.users (this might give us more insight)
    const { data: sqlUsers, error: sqlError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, created_at, last_sign_in_at, email_confirmed_at, phone, raw_user_meta_data')
      .order('created_at', { ascending: false })
    
    console.log(`=== SQL QUERY RESULTS ===`)
    console.log(`SQL Query fetched ${sqlUsers?.length || 0} users`)
    console.log('SQL User emails:', sqlUsers?.map(u => u.email) || [])
    if (sqlError) {
      console.log('SQL Error:', sqlError)
    }
    
    // Let's also check if there are any filtering issues by looking for specific users
    const geralUser = users?.find(u => u.email === 'geral2@imacx.pt')
    const geralUserSQL = sqlUsers?.find(u => u.email === 'geral2@imacx.pt')
    console.log('Found geral2@imacx.pt in admin API:', geralUser ? 'YES' : 'NO')
    console.log('Found geral2@imacx.pt in SQL query:', geralUserSQL ? 'YES' : 'NO')

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Use the results that give us more users
    let finalUsers: any[] = users
    if (sqlUsers && sqlUsers.length > users.length) {
      console.log(`Using SQL results (${sqlUsers.length} users) instead of admin API (${users.length} users)`)
      finalUsers = sqlUsers.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        phone: user.phone,
        user_metadata: user.raw_user_meta_data || {}
      }))
    }

    // Transform the users data to match our AuthUser interface
    const transformedUsers = finalUsers.map(user => ({
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      phone: user.phone,
      user_metadata: user.user_metadata || {}
    }))

    console.log(`Returning ${transformedUsers.length} transformed users`)
    return NextResponse.json({ users: transformedUsers })
  } catch (error) {
    console.error('Error in admin users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Helper function to create admin client
const createAdminClient = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      )
    }

    const supabaseAdmin = createAdminClient()

    // Create user with confirmed status (bypasses email confirmation)
    const { data: authUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // This confirms the email immediately
        user_metadata: {
          first_name: firstName || '',
          last_name: lastName || '',
        },
      })

    if (createError) {
      console.error('Error creating user:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    return NextResponse.json({
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        created_at: authUser.user.created_at,
        last_sign_in_at: authUser.user.last_sign_in_at,
        email_confirmed_at: authUser.user.email_confirmed_at,
        phone: authUser.user.phone,
        user_metadata: authUser.user.user_metadata || {},
      },
    })
  } catch (error) {
    console.error('Error in POST /api/admin/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { userId, email, firstName, lastName, password } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 },
      )
    }

    const supabaseAdmin = createAdminClient()

    // Prepare update data
    const updateData: any = {}

    if (email) updateData.email = email
    if (password) updateData.password = password
    if (firstName || lastName) {
      updateData.user_metadata = {
        first_name: firstName || '',
        last_name: lastName || '',
      }
    }

    // Update user
    const { data: authUser, error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, updateData)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        created_at: authUser.user.created_at,
        last_sign_in_at: authUser.user.last_sign_in_at,
        email_confirmed_at: authUser.user.email_confirmed_at,
        phone: authUser.user.phone,
        user_metadata: authUser.user.user_metadata || {},
      },
    })
  } catch (error) {
    console.error('Error in PUT /api/admin/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 },
      )
    }

    const supabaseAdmin = createAdminClient()

    // First, delete the profile (if exists) - this handles cascade manually
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId)

    if (profileDeleteError) {
      console.warn(
        'Error deleting profile (may not exist):',
        profileDeleteError,
      )
      // Continue even if profile doesn't exist
    }

    // Then delete the authenticated user
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    // Create admin client with service role key
    const supabaseAdmin = createAdminClient()

    // Method 1: Try with admin API (with explicit pagination to get all users)
    const {
      data: { users },
      error,
    } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Ensure we get all users, not just the default page size
    })

    console.log(`=== ADMIN API RESULTS ===`)
    console.log(`Fetched ${users?.length || 0} users from Supabase Auth`)
    console.log('User emails:', users?.map((u) => u.email) || [])

    // Method 2: Try direct SQL query to auth.users (this might give us more insight)
    const { data: sqlUsers, error: sqlError } = await supabaseAdmin
      .from('auth.users')
      .select(
        'id, email, created_at, last_sign_in_at, email_confirmed_at, phone, raw_user_meta_data',
      )
      .order('created_at', { ascending: false })

    console.log(`=== SQL QUERY RESULTS ===`)
    console.log(`SQL Query fetched ${sqlUsers?.length || 0} users`)
    console.log('SQL User emails:', sqlUsers?.map((u) => u.email) || [])
    if (sqlError) {
      console.log('SQL Error:', sqlError)
    }

    // Let's also check if there are any filtering issues by looking for specific users
    const geralUser = users?.find((u) => u.email === 'geral2@imacx.pt')
    const geralUserSQL = sqlUsers?.find((u) => u.email === 'geral2@imacx.pt')
    console.log('Found geral2@imacx.pt in admin API:', geralUser ? 'YES' : 'NO')
    console.log(
      'Found geral2@imacx.pt in SQL query:',
      geralUserSQL ? 'YES' : 'NO',
    )

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 },
      )
    }

    // Use the results that give us more users
    let finalUsers: any[] = users
    if (sqlUsers && sqlUsers.length > users.length) {
      console.log(
        `Using SQL results (${sqlUsers.length} users) instead of admin API (${users.length} users)`,
      )
      finalUsers = sqlUsers.map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        phone: user.phone,
        user_metadata: user.raw_user_meta_data || {},
      }))
    }

    // Transform the users data to match our AuthUser interface
    const transformedUsers = finalUsers.map((user) => ({
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      phone: user.phone,
      user_metadata: user.user_metadata || {},
    }))

    console.log(`Returning ${transformedUsers.length} transformed users`)
    return NextResponse.json({ users: transformedUsers })
  } catch (error) {
    console.error('Error in admin users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

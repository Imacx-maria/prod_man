import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

// GET: Fetch permissions for a role
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('roleId')

    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    const { data: permissions, error } = await supabase
      .from('role_permissions')
      .select('page_path, can_access')
      .eq('role_id', roleId)

    if (error) {
      console.error('Error fetching role permissions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch permissions' },
        { status: 500 },
      )
    }

    // Transform to a more usable format
    const permissionsMap = permissions.reduce(
      (acc: Record<string, boolean>, permission) => {
        acc[permission.page_path] = permission.can_access
        return acc
      },
      {},
    )

    return NextResponse.json({ permissions: permissionsMap })
  } catch (error) {
    console.error('Error in GET /api/admin/role-permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// PUT: Update permissions for a role
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { roleId, permissions } = body

    if (!roleId || !permissions) {
      return NextResponse.json(
        { error: 'Role ID and permissions are required' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    // Update permissions in batch
    const updates = Object.entries(permissions).map(
      ([pagePath, canAccess]) => ({
        role_id: roleId,
        page_path: pagePath,
        can_access: canAccess,
      }),
    )

    const { error } = await supabase
      .from('role_permissions')
      .upsert(updates, { onConflict: 'role_id,page_path' })

    if (error) {
      console.error('Error updating role permissions:', error)
      return NextResponse.json(
        { error: 'Failed to update permissions' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/admin/role-permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// POST: Initialize permissions for a new role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roleId } = body

    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    // Define all available pages
    const allPages = [
      '/',
      '/login',
      '/reset-password',
      '/update-password',
      '/dashboard',
      '/dashboard/profile',
      '/dashboard/change-password',
      '/definicoes/armazens',
      '/definicoes/clientes',
      '/definicoes/complexidade',
      '/definicoes/feriados',
      '/definicoes/fornecedores',
      '/definicoes/maquinas',
      '/definicoes/materiais',
      '/definicoes/stocks',
      '/definicoes/transportadoras',
      '/definicoes/utilizadores',
      '/producao',
      '/producao/operacoes',
      '/designer-flow',
      '/components',
      '/payments',
      '/test-examples',
    ]

    // Create default permissions (basic pages only)
    const defaultPermissions = allPages.map((pagePath) => ({
      role_id: roleId,
      page_path: pagePath,
      can_access: [
        '/',
        '/login',
        '/reset-password',
        '/update-password',
        '/dashboard',
        '/dashboard/profile',
        '/dashboard/change-password',
      ].includes(pagePath),
    }))

    const { error } = await supabase
      .from('role_permissions')
      .insert(defaultPermissions)

    if (error) {
      console.error('Error creating default permissions:', error)
      return NextResponse.json(
        { error: 'Failed to create permissions' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/admin/role-permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

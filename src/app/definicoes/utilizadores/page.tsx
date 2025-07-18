'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Combobox from '@/components/ui/Combobox'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Trash2,
  X,
  Loader2,
  Edit,
  RotateCw,
  Users,
  Shield,
  Mail,
  Settings,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import PermissionGuard from '@/components/PermissionGuard'
import { Badge } from '@/components/ui/badge'
import RolePermissionsDrawer from '@/components/RolePermissionsDrawer'

interface Role {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface Profile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  role_id: string
  created_at: string
  updated_at: string
  roles?: Role
}

interface AuthUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  phone: string | null
  user_metadata?: {
    first_name?: string
    last_name?: string
  }
}

export default function UtilizadoresPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [rolesLoading, setRolesLoading] = useState(false)

  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editRoleId, setEditRoleId] = useState('')
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editRoleName, setEditRoleName] = useState('')
  const [editRoleDescription, setEditRoleDescription] = useState('')
  const [creatingNewProfile, setCreatingNewProfile] = useState(false)
  const [newProfileUserId, setNewProfileUserId] = useState('')

  // New states for authenticated users management
  const [editingAuthUserId, setEditingAuthUserId] = useState<string | null>(
    null,
  )
  const [editAuthEmail, setEditAuthEmail] = useState('')
  const [editAuthFirstName, setEditAuthFirstName] = useState('')
  const [editAuthLastName, setEditAuthLastName] = useState('')
  const [editAuthPassword, setEditAuthPassword] = useState('')
  const [editAuthRoleId, setEditAuthRoleId] = useState('')
  const [creatingNewAuthUser, setCreatingNewAuthUser] = useState(false)
  const [newAuthEmail, setNewAuthEmail] = useState('')
  const [newAuthPassword, setNewAuthPassword] = useState('')
  const [newAuthFirstName, setNewAuthFirstName] = useState('')
  const [newAuthLastName, setNewAuthLastName] = useState('')

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)

  const [nameFilter, setNameFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [emailFilter, setEmailFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('auth-users')

  // Sorting states for profiles table
  const [profilesSortField, setProfilesSortField] = useState<
    'name' | 'email' | 'role' | null
  >(null)
  const [profilesSortDirection, setProfilesSortDirection] = useState<
    'asc' | 'desc'
  >('asc')

  // Sorting states for authenticated users table
  const [authUsersSortField, setAuthUsersSortField] = useState<
    'name' | 'email' | null
  >(null)
  const [authUsersSortDirection, setAuthUsersSortDirection] = useState<
    'asc' | 'desc'
  >('asc')

  // Sorting states for roles table
  const [rolesSortField, setRolesSortField] = useState<
    'name' | 'description' | null
  >(null)
  const [rolesSortDirection, setRolesSortDirection] = useState<'asc' | 'desc'>(
    'asc',
  )

  // Permissions drawer state
  const [permissionsDrawerOpen, setPermissionsDrawerOpen] = useState(false)
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] =
    useState<Role | null>(null)

  const supabase = createBrowserClient()

  const fetchAuthUsers = async () => {
    try {
      // Fetch all authenticated users using admin API
      const response = await fetch('/api/admin/users')

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()

      if (data.users) {
        setAuthUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching auth users:', error)
      // Fallback: show current user if admin API fails
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()
        if (!error && user) {
          setAuthUsers([
            {
              id: user.id,
              email: user.email || '',
              created_at: user.created_at,
              last_sign_in_at: user.last_sign_in_at || null,
              email_confirmed_at: user.email_confirmed_at || null,
              phone: user.phone || null,
              user_metadata: user.user_metadata,
            },
          ])
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError)
      }
    }
  }

  const fetchProfiles = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          *,
          roles (
            id,
            name,
            description
          )
        `,
        )
        .order('first_name', { ascending: true })

      if (!error && data) {
        setProfiles(data)
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    setRolesLoading(true)
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true })

      if (!error && data) {
        setRoles(data)
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setRolesLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
    fetchRoles()
    fetchAuthUsers()
  }, []) // fetch functions temporarily removed to prevent infinite loop

  // Get auth user info for a profile
  const getAuthUserForProfile = (userId: string) => {
    return authUsers.find((user) => user.id === userId)
  }

  // Get available auth users (those without profiles)
  const getAvailableAuthUsers = () => {
    return authUsers.filter(
      (user) => !profiles.find((profile) => profile.user_id === user.id),
    )
  }

  const handleProfilesSort = (field: 'name' | 'email' | 'role') => {
    if (profilesSortField === field) {
      setProfilesSortDirection(profilesSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setProfilesSortField(field)
      setProfilesSortDirection('asc')
    }
  }

  const handleAuthUsersSort = (field: 'name' | 'email') => {
    if (authUsersSortField === field) {
      setAuthUsersSortDirection(
        authUsersSortDirection === 'asc' ? 'desc' : 'asc',
      )
    } else {
      setAuthUsersSortField(field)
      setAuthUsersSortDirection('asc')
    }
  }

  const handleRolesSort = (field: 'name' | 'description') => {
    if (rolesSortField === field) {
      setRolesSortDirection(rolesSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setRolesSortField(field)
      setRolesSortDirection('asc')
    }
  }

  const filteredProfiles = profiles
    .filter((profile) => {
      const fullName = (
        profile.first_name +
        ' ' +
        profile.last_name
      ).toLowerCase()
      const authUser = getAuthUserForProfile(profile.user_id)
      const emailMatch = authUser
        ? authUser.email.toLowerCase().includes(emailFilter.toLowerCase())
        : true
      const nameMatch = fullName.includes(nameFilter.toLowerCase())
      const roleMatch =
        !roleFilter || roleFilter === 'all' || profile.role_id === roleFilter
      return nameMatch && roleMatch && emailMatch
    })
    .sort((a: Profile, b: Profile) => {
      if (!profilesSortField) return 0

      let aValue = ''
      let bValue = ''

      switch (profilesSortField) {
        case 'name':
          aValue = (a.first_name + ' ' + a.last_name).toLowerCase()
          bValue = (b.first_name + ' ' + b.last_name).toLowerCase()
          break
        case 'email':
          const aUser = getAuthUserForProfile(a.user_id)
          const bUser = getAuthUserForProfile(b.user_id)
          aValue = aUser?.email?.toLowerCase() || ''
          bValue = bUser?.email?.toLowerCase() || ''
          break
        case 'role':
          aValue = a.roles?.name?.toLowerCase() || ''
          bValue = b.roles?.name?.toLowerCase() || ''
          break
      }

      if (profilesSortDirection === 'asc') {
        return aValue.localeCompare(bValue)
      } else {
        return bValue.localeCompare(aValue)
      }
    })

  const filteredAuthUsers = authUsers
    .filter((user) => {
      const emailMatch = user.email
        .toLowerCase()
        .includes(emailFilter.toLowerCase())
      return emailMatch
    })
    .sort((a: AuthUser, b: AuthUser) => {
      if (!authUsersSortField) return 0

      let aValue = ''
      let bValue = ''

      switch (authUsersSortField) {
        case 'name':
          aValue = (
            (a.user_metadata?.first_name || '') +
            ' ' +
            (a.user_metadata?.last_name || '')
          ).toLowerCase()
          bValue = (
            (b.user_metadata?.first_name || '') +
            ' ' +
            (b.user_metadata?.last_name || '')
          ).toLowerCase()
          break
        case 'email':
          aValue = a.email?.toLowerCase() || ''
          bValue = b.email?.toLowerCase() || ''
          break
      }

      if (authUsersSortDirection === 'asc') {
        return aValue.localeCompare(bValue)
      } else {
        return bValue.localeCompare(aValue)
      }
    })

  const filteredRoles = roles
    .filter((role) =>
      role.name.toLowerCase().includes(nameFilter.toLowerCase()),
    )
    .sort((a: Role, b: Role) => {
      if (!rolesSortField) return 0

      let aValue = ''
      let bValue = ''

      switch (rolesSortField) {
        case 'name':
          aValue = a.name?.toLowerCase() || ''
          bValue = b.name?.toLowerCase() || ''
          break
        case 'description':
          aValue = a.description?.toLowerCase() || ''
          bValue = b.description?.toLowerCase() || ''
          break
      }

      if (rolesSortDirection === 'asc') {
        return aValue.localeCompare(bValue)
      } else {
        return bValue.localeCompare(aValue)
      }
    })

  const handleDeleteProfile = async (id: string) => {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id)

      if (!error) {
        setProfiles((prev) => prev.filter((p) => p.id !== id))
      }
    } catch (error) {
      console.error('Error deleting profile:', error)
    }
  }

  const handleDeleteRole = async (id: string) => {
    try {
      const { error } = await supabase.from('roles').delete().eq('id', id)

      if (!error) {
        setRoles((prev) => prev.filter((r) => r.id !== id))
      }
    } catch (error) {
      console.error('Error deleting role:', error)
    }
  }

  const openNewRoleForm = async () => {
    const name = prompt('Digite o nome do novo papel:')
    if (!name || !name.trim()) return

    const description = prompt('Digite a descrição do papel (opcional):') || ''

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('roles')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
        })
        .select('*')

      if (!error && data && data[0]) {
        setRoles((prev) => [...prev, data[0]])
      }
    } catch (error) {
      console.error('Error creating role:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const openNewProfileForm = () => {
    // Start inline creation mode
    setCreatingNewProfile(true)
    setEditFirstName('')
    setEditLastName('')
    setNewProfileUserId('')
    setEditRoleId('')
  }

  const saveNewProfile = async () => {
    if (
      !editFirstName.trim() ||
      !editLastName.trim() ||
      !newProfileUserId.trim() ||
      !editRoleId
    ) {
      alert('Por favor, preencha todos os campos.')
      return
    }

    setSubmitting(true)
    try {
      // Check if a user with this ID exists in auth
      const authUser = authUsers.find((user) => user.id === newProfileUserId)

      if (!authUser) {
        alert('Utilizador não encontrado na autenticação.')
        return
      }

      // Check if profile already exists for this user
      const existingProfile = profiles.find(
        (profile) => profile.user_id === authUser.id,
      )
      if (existingProfile) {
        alert('Este utilizador já tem um perfil criado.')
        return
      }

      const { data, error } = await supabase.from('profiles').insert({
        user_id: authUser.id,
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        role_id: editRoleId,
      }).select(`
          *,
          roles (
            id,
            name,
            description
          )
        `)

      if (!error && data && data[0]) {
        setProfiles((prev) => [...prev, data[0]])
        // Reset creation mode
        setCreatingNewProfile(false)
        setEditFirstName('')
        setEditLastName('')
        setNewProfileUserId('')
        setEditRoleId('')
      } else {
        alert(
          'Erro ao criar perfil: ' + (error?.message || 'Erro desconhecido'),
        )
      }
    } catch (error) {
      console.error('Error creating profile:', error)
      alert('Erro ao criar perfil: ' + error)
    } finally {
      setSubmitting(false)
    }
  }

  const cancelNewProfile = () => {
    setCreatingNewProfile(false)
    setEditFirstName('')
    setEditLastName('')
    setNewProfileUserId('')
    setEditRoleId('')
  }

  const openPermissionsDrawer = (role: Role) => {
    setSelectedRoleForPermissions(role)
    setPermissionsDrawerOpen(true)
  }

  const closePermissionsDrawer = () => {
    setPermissionsDrawerOpen(false)
    setSelectedRoleForPermissions(null)
  }

  return (
    <PermissionGuard>
      <div className="w-full space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gestão de Utilizadores</h1>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-none"
                    onClick={() => {
                      fetchProfiles()
                      fetchRoles()
                      fetchAuthUsers()
                    }}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="auth-users">
              <Users className="mr-2 h-4 w-4" />
              Utilizadores Autenticados
            </TabsTrigger>
            <TabsTrigger value="profiles">
              <Users className="mr-2 h-4 w-4" />
              Perfis de Utilizador
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Shield className="mr-2 h-4 w-4" />
              Papéis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auth-users" className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filtrar por email..."
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                className="h-10 w-[300px] rounded-none"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-none"
                      onClick={() => setEmailFilter('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Limpar filtro</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex-1" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      className="h-10 w-10 rounded-none"
                      onClick={() => {
                        setCreatingNewAuthUser(true)
                        setEditAuthEmail('')
                        setEditAuthFirstName('')
                        setEditAuthLastName('')
                        setEditAuthPassword('')
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Novo Utilizador</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Auth Users Table */}
            <div className="bg-background border-border w-full rounded-none border-2">
              <div className="w-full rounded-none">
                <Table className="w-full rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="sticky top-0 z-10 min-w-[150px] cursor-pointer bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleAuthUsersSort('name')}
                      >
                        <div className="flex items-center justify-between">
                          Nome
                          {authUsersSortField === 'name' &&
                            (authUsersSortDirection === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[150px] bg-[var(--orange)] font-bold uppercase">
                        Apelido
                      </TableHead>
                      <TableHead
                        className="sticky top-0 z-10 min-w-[200px] cursor-pointer bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleAuthUsersSort('email')}
                      >
                        <div className="flex items-center justify-between">
                          Email
                          {authUsersSortField === 'email' &&
                            (authUsersSortDirection === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[150px] bg-[var(--orange)] font-bold normal-case">
                        Nova Senha
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 w-[140px] bg-[var(--orange)] text-center font-bold uppercase">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* New Auth User Creation Row */}
                    {creatingNewAuthUser && (
                      <TableRow className="bg-blue-50 dark:bg-blue-950">
                        <TableCell>
                          <Input
                            value={editAuthFirstName}
                            onChange={(e) =>
                              setEditAuthFirstName(e.target.value)
                            }
                            className="h-10 rounded-none border-0 outline-0 focus:border-0 focus:ring-0"
                            placeholder="Primeiro nome"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editAuthLastName}
                            onChange={(e) =>
                              setEditAuthLastName(e.target.value)
                            }
                            className="h-10 rounded-none border-0 outline-0 focus:border-0 focus:ring-0"
                            placeholder="Apelido"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editAuthEmail}
                            onChange={(e) => setEditAuthEmail(e.target.value)}
                            className="h-10 rounded-none border-0 outline-0 focus:border-0 focus:ring-0"
                            placeholder="Email"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              value={editAuthPassword}
                              onChange={(e: any) =>
                                setEditAuthPassword(e.target.value)
                              }
                              className="h-10 rounded-none border-0 pr-10 normal-case outline-0 focus:border-0 focus:ring-0"
                              placeholder="Senha"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-0 right-0 h-10 w-10 rounded-none hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="flex justify-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  className="h-10 w-10 rounded-none"
                                  onClick={async () => {
                                    if (
                                      !editAuthEmail.trim() ||
                                      !editAuthPassword.trim() ||
                                      !editAuthFirstName.trim() ||
                                      !editAuthLastName.trim()
                                    )
                                      return

                                    setSubmitting(true)
                                    try {
                                      const response = await fetch(
                                        '/api/admin/users',
                                        {
                                          method: 'POST',
                                          headers: {
                                            'Content-Type': 'application/json',
                                          },
                                          body: JSON.stringify({
                                            email: editAuthEmail.trim(),
                                            password: editAuthPassword.trim(),
                                            firstName: editAuthFirstName.trim(),
                                            lastName: editAuthLastName.trim(),
                                          }),
                                        },
                                      )

                                      if (response.ok) {
                                        const { user } = await response.json()
                                        setAuthUsers((prev) => [...prev, user])
                                        fetchAuthUsers() // Refresh the authenticated users list

                                        // Poll for the new profile to appear (trigger might take time)
                                        const pollForProfile = async (
                                          attempts = 0,
                                        ) => {
                                          if (attempts >= 10) return // Stop after 10 attempts (5 seconds)

                                          await new Promise((resolve) =>
                                            setTimeout(resolve, 500),
                                          )

                                          try {
                                            const { data, error } =
                                              await supabase
                                                .from('profiles')
                                                .select(
                                                  `
                                               *,
                                               roles (
                                                 id,
                                                 name,
                                                 description
                                               )
                                             `,
                                                )
                                                .eq('user_id', user.id)
                                                .single()

                                            if (!error && data) {
                                              // Profile found, refresh the full list
                                              fetchProfiles()
                                              return
                                            }
                                          } catch (err) {
                                            console.log(
                                              'Profile not found yet, retrying...',
                                              err,
                                            )
                                          }

                                          // Profile not found yet, try again
                                          pollForProfile(attempts + 1)
                                        }

                                        pollForProfile()
                                      } else {
                                        const { error } = await response.json()
                                        alert(
                                          'Erro ao criar utilizador: ' + error,
                                        )
                                      }
                                    } catch (error) {
                                      console.error(
                                        'Error creating auth user:',
                                        error,
                                      )
                                      alert(
                                        'Erro ao criar utilizador: ' + error,
                                      )
                                    } finally {
                                      setSubmitting(false)
                                      setCreatingNewAuthUser(false)
                                      setEditAuthEmail('')
                                      setEditAuthFirstName('')
                                      setEditAuthLastName('')
                                      setEditAuthPassword('')
                                      setShowPassword(false)
                                    }
                                  }}
                                  disabled={
                                    !editAuthEmail.trim() ||
                                    !editAuthPassword.trim() ||
                                    !editAuthFirstName.trim() ||
                                    !editAuthLastName.trim() ||
                                    submitting
                                  }
                                >
                                  <span className="text-xs">✓</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Guardar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10 rounded-none"
                                  onClick={() => {
                                    setCreatingNewAuthUser(false)
                                    setEditAuthEmail('')
                                    setEditAuthFirstName('')
                                    setEditAuthLastName('')
                                    setEditAuthPassword('')
                                    setShowPassword(false)
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancelar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    )}

                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center">
                          <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : filteredAuthUsers.length === 0 &&
                      !creatingNewAuthUser ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-gray-500"
                        >
                          Nenhum utilizador autenticado encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAuthUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {editingAuthUserId === user.id ? (
                              <Input
                                value={editAuthFirstName}
                                onChange={(e) =>
                                  setEditAuthFirstName(e.target.value)
                                }
                                className="h-10 rounded-none border-0 outline-0 focus:border-0 focus:ring-0"
                                placeholder="Primeiro nome"
                              />
                            ) : (
                              user.user_metadata?.first_name || '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {editingAuthUserId === user.id ? (
                              <Input
                                value={editAuthLastName}
                                onChange={(e) =>
                                  setEditAuthLastName(e.target.value)
                                }
                                className="h-10 rounded-none border-0 outline-0 focus:border-0 focus:ring-0"
                                placeholder="Apelido"
                              />
                            ) : (
                              user.user_metadata?.last_name || '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="text-muted-foreground h-4 w-4" />
                              {user.email || 'Email não encontrado'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {editingAuthUserId === user.id ? (
                              <div className="relative">
                                <Input
                                  type={showEditPassword ? 'text' : 'password'}
                                  value={editAuthPassword}
                                  onChange={(e: any) =>
                                    setEditAuthPassword(e.target.value)
                                  }
                                  className="h-10 rounded-none border-0 pr-10 normal-case outline-0 focus:border-0 focus:ring-0"
                                  placeholder="Nova senha (opcional)"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-0 right-0 h-10 w-10 rounded-none hover:bg-transparent"
                                  onClick={() =>
                                    setShowEditPassword(!showEditPassword)
                                  }
                                >
                                  {showEditPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-gray-400">••••••••</span>
                            )}
                          </TableCell>
                          <TableCell className="flex justify-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="icon"
                                    className="h-10 w-10 rounded-none"
                                    onClick={
                                      editingAuthUserId === user.id
                                        ? async () => {
                                            if (
                                              !editAuthFirstName.trim() ||
                                              !editAuthLastName.trim()
                                            )
                                              return

                                            setSubmitting(true)
                                            try {
                                              const updateData: any = {
                                                userId: user.id,
                                                firstName:
                                                  editAuthFirstName.trim(),
                                                lastName:
                                                  editAuthLastName.trim(),
                                              }

                                              // Only include password if it's provided
                                              if (editAuthPassword.trim()) {
                                                updateData.password =
                                                  editAuthPassword.trim()
                                              }

                                              const response = await fetch(
                                                '/api/admin/users',
                                                {
                                                  method: 'PUT',
                                                  headers: {
                                                    'Content-Type':
                                                      'application/json',
                                                  },
                                                  body: JSON.stringify(
                                                    updateData,
                                                  ),
                                                },
                                              )

                                              if (response.ok) {
                                                const { user: updatedUser } =
                                                  await response.json()
                                                setAuthUsers((prev) =>
                                                  prev.map((u) =>
                                                    u.id === user.id
                                                      ? updatedUser
                                                      : u,
                                                  ),
                                                )
                                                setEditingAuthUserId(null)
                                                setEditAuthFirstName('')
                                                setEditAuthLastName('')
                                                setEditAuthPassword('')
                                              } else {
                                                const { error } =
                                                  await response.json()
                                                alert(
                                                  'Erro ao atualizar utilizador: ' +
                                                    error,
                                                )
                                              }
                                            } catch (error) {
                                              console.error(
                                                'Error updating auth user:',
                                                error,
                                              )
                                              alert(
                                                'Erro ao atualizar utilizador: ' +
                                                  error,
                                              )
                                            } finally {
                                              setSubmitting(false)
                                            }
                                          }
                                        : () => {
                                            setEditingAuthUserId(user.id)
                                            setEditAuthFirstName(
                                              user.user_metadata?.first_name ||
                                                '',
                                            )
                                            setEditAuthLastName(
                                              user.user_metadata?.last_name ||
                                                '',
                                            )
                                            setEditAuthPassword('')
                                          }
                                    }
                                    disabled={
                                      (editingAuthUserId !== null &&
                                        editingAuthUserId !== user.id) ||
                                      submitting
                                    }
                                  >
                                    {editingAuthUserId === user.id ? (
                                      <span className="text-xs">✓</span>
                                    ) : (
                                      <Edit className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Guardar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant={
                                      editingAuthUserId === user.id
                                        ? 'outline'
                                        : 'destructive'
                                    }
                                    size="icon"
                                    className="h-10 w-10 rounded-none"
                                    onClick={
                                      editingAuthUserId === user.id
                                        ? () => {
                                            setEditingAuthUserId(null)
                                            setEditAuthFirstName('')
                                            setEditAuthLastName('')
                                            setEditAuthPassword('')
                                          }
                                        : async () => {
                                            if (
                                              confirm(
                                                'Tem certeza que deseja excluir este utilizador?',
                                              )
                                            ) {
                                              setSubmitting(true)
                                              try {
                                                const response = await fetch(
                                                  `/api/admin/users?userId=${user.id}`,
                                                  {
                                                    method: 'DELETE',
                                                  },
                                                )

                                                if (response.ok) {
                                                  setAuthUsers((prev) =>
                                                    prev.filter(
                                                      (u) => u.id !== user.id,
                                                    ),
                                                  )
                                                  // Also remove any associated profile from the profiles table
                                                  setProfiles((prev) =>
                                                    prev.filter(
                                                      (p) =>
                                                        p.user_id !== user.id,
                                                    ),
                                                  )
                                                } else {
                                                  const { error } =
                                                    await response.json()
                                                  alert(
                                                    'Erro ao excluir utilizador: ' +
                                                      error,
                                                  )
                                                }
                                              } catch (error) {
                                                console.error(
                                                  'Error deleting auth user:',
                                                  error,
                                                )
                                                alert(
                                                  'Erro ao excluir utilizador: ' +
                                                    error,
                                                )
                                              } finally {
                                                setSubmitting(false)
                                              }
                                            }
                                          }
                                    }
                                    disabled={
                                      (editingAuthUserId !== null &&
                                        editingAuthUserId !== user.id) ||
                                      submitting
                                    }
                                  >
                                    {editingAuthUserId === user.id ? (
                                      <X className="h-4 w-4" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {editingAuthUserId === user.id
                                    ? 'Cancelar'
                                    : 'Excluir'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profiles" className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filtrar por nome..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="h-10 w-[200px] rounded-none"
              />
              <Input
                placeholder="Filtrar por email..."
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                className="h-10 w-[200px] rounded-none"
              />
              <Combobox
                value={roleFilter}
                onChange={setRoleFilter}
                placeholder="Filtrar por papel"
                maxWidth="200px"
                options={[
                  { value: 'all', label: 'Todos os papéis' },
                  ...roles.map((role) => ({
                    value: role.id,
                    label: role.name,
                  })),
                ]}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-none"
                      onClick={() => {
                        setNameFilter('')
                        setEmailFilter('')
                        setRoleFilter('all')
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Limpar filtros</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex-1" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      className="h-10 w-10 rounded-none"
                      onClick={openNewProfileForm}
                      disabled={creatingNewProfile || editingProfileId !== null}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Novo Perfil</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Profiles Table */}
            <div className="bg-background border-border w-full rounded-none border-2">
              <div className="w-full rounded-none">
                <Table className="w-full rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="sticky top-0 z-10 min-w-[150px] cursor-pointer bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleProfilesSort('name')}
                      >
                        <div className="flex items-center justify-between">
                          Nome
                          {profilesSortField === 'name' &&
                            (profilesSortDirection === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[150px] bg-[var(--orange)] font-bold uppercase">
                        Apelido
                      </TableHead>
                      <TableHead
                        className="sticky top-0 z-10 min-w-[200px] cursor-pointer bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleProfilesSort('email')}
                      >
                        <div className="flex items-center justify-between">
                          Email
                          {profilesSortField === 'email' &&
                            (profilesSortDirection === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="sticky top-0 z-10 min-w-[150px] cursor-pointer bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleProfilesSort('role')}
                      >
                        <div className="flex items-center justify-between">
                          Papel
                          {profilesSortField === 'role' &&
                            (profilesSortDirection === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 w-[140px] bg-[var(--orange)] text-center font-bold uppercase">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* New Profile Creation Row */}
                    {creatingNewProfile && (
                      <TableRow className="bg-blue-50 dark:bg-blue-950">
                        <TableCell>
                          <Input
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                            className="h-10 rounded-none border-0 outline-0 focus:border-0 focus:ring-0"
                            placeholder="Primeiro nome"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                            className="h-10 rounded-none border-0 outline-0 focus:border-0 focus:ring-0"
                            placeholder="Apelido"
                          />
                        </TableCell>
                        <TableCell>
                          <Combobox
                            value={newProfileUserId}
                            onChange={(userId) => {
                              setNewProfileUserId(userId)
                              // Auto-fill first/last name if available in user metadata
                              const selectedUser = authUsers.find(
                                (user) => user.id === userId,
                              )
                              if (selectedUser?.user_metadata?.first_name) {
                                setEditFirstName(
                                  selectedUser.user_metadata.first_name,
                                )
                              }
                              if (selectedUser?.user_metadata?.last_name) {
                                setEditLastName(
                                  selectedUser.user_metadata.last_name,
                                )
                              }
                            }}
                            placeholder="Selecione um utilizador"
                            maxWidth="250px"
                            options={getAvailableAuthUsers().map((user) => ({
                              value: user.id,
                              label: user.email,
                            }))}
                          />
                        </TableCell>
                        <TableCell>
                          <Combobox
                            value={editRoleId}
                            onChange={setEditRoleId}
                            placeholder="Selecione um papel"
                            maxWidth="200px"
                            options={roles.map((role) => ({
                              value: role.id,
                              label: role.name,
                            }))}
                          />
                        </TableCell>
                        <TableCell className="flex justify-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  className="h-10 w-10 rounded-none"
                                  onClick={saveNewProfile}
                                  disabled={
                                    !editFirstName.trim() ||
                                    !editLastName.trim() ||
                                    !newProfileUserId.trim() ||
                                    !editRoleId ||
                                    submitting
                                  }
                                >
                                  <span className="text-xs">✓</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Guardar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10 rounded-none"
                                  onClick={cancelNewProfile}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancelar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    )}

                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center">
                          <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : filteredProfiles.length === 0 && !creatingNewProfile ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-gray-500"
                        >
                          Nenhum perfil encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProfiles.map((profile) => {
                        const authUser = getAuthUserForProfile(profile.user_id)
                        return (
                          <TableRow key={profile.id}>
                            <TableCell className="font-medium">
                              {editingProfileId === profile.id ? (
                                <Input
                                  value={editFirstName}
                                  onChange={(e) =>
                                    setEditFirstName(e.target.value)
                                  }
                                  className="h-10 rounded-none border-0 outline-0 focus:border-0 focus:ring-0"
                                  placeholder="Primeiro nome"
                                />
                              ) : (
                                profile.first_name
                              )}
                            </TableCell>
                            <TableCell>
                              {editingProfileId === profile.id ? (
                                <Input
                                  value={editLastName}
                                  onChange={(e) =>
                                    setEditLastName(e.target.value)
                                  }
                                  className="h-10 rounded-none border-0 outline-0 focus:border-0 focus:ring-0"
                                  placeholder="Apelido"
                                />
                              ) : (
                                profile.last_name
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Mail className="text-muted-foreground h-4 w-4" />
                                {authUser?.email || 'Email não encontrado'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {editingProfileId === profile.id ? (
                                <Combobox
                                  value={editRoleId}
                                  onChange={setEditRoleId}
                                  placeholder="Selecione um papel"
                                  maxWidth="200px"
                                  options={roles.map((role) => ({
                                    value: role.id,
                                    label: role.name,
                                  }))}
                                />
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="rounded-none"
                                >
                                  {profile.roles?.name || '-'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="flex justify-center gap-2">
                              {editingProfileId === profile.id ? (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="default"
                                          size="icon"
                                          className="h-10 w-10 rounded-none"
                                          onClick={async () => {
                                            if (
                                              !editFirstName.trim() ||
                                              !editLastName.trim() ||
                                              !editRoleId
                                            )
                                              return

                                            setSubmitting(true)
                                            try {
                                              const { data, error } =
                                                await supabase
                                                  .from('profiles')
                                                  .update({
                                                    first_name:
                                                      editFirstName.trim(),
                                                    last_name:
                                                      editLastName.trim(),
                                                    role_id: editRoleId,
                                                    updated_at: new Date()
                                                      .toISOString()
                                                      .split('T')[0],
                                                  })
                                                  .eq('id', profile.id).select(`
                                              *,
                                              roles (
                                                id,
                                                name,
                                                description
                                              )
                                            `)

                                              if (!error && data && data[0]) {
                                                setProfiles((prev) =>
                                                  prev.map((p) =>
                                                    p.id === profile.id
                                                      ? data[0]
                                                      : p,
                                                  ),
                                                )
                                              }
                                            } catch (error) {
                                              console.error(
                                                'Error updating:',
                                                error,
                                              )
                                            } finally {
                                              setSubmitting(false)
                                              setEditingProfileId(null)
                                              setEditFirstName('')
                                              setEditLastName('')
                                              setEditRoleId('')
                                            }
                                          }}
                                          disabled={
                                            !editFirstName.trim() ||
                                            !editLastName.trim() ||
                                            !editRoleId ||
                                            submitting
                                          }
                                        >
                                          <span className="text-xs">✓</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Guardar</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-10 w-10 rounded-none"
                                          onClick={() => {
                                            setEditingProfileId(null)
                                            setEditFirstName('')
                                            setEditLastName('')
                                            setEditRoleId('')
                                          }}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Cancelar</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              ) : (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="default"
                                          size="icon"
                                          className="h-10 w-10 rounded-none"
                                          onClick={() => {
                                            setEditingProfileId(profile.id)
                                            setEditFirstName(profile.first_name)
                                            setEditLastName(profile.last_name)
                                            setEditRoleId(profile.role_id)
                                          }}
                                          disabled={editingProfileId !== null}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Editar</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="icon"
                                          className="h-10 w-10 rounded-none"
                                          onClick={() =>
                                            handleDeleteProfile(profile.id)
                                          }
                                          disabled={editingProfileId !== null}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Excluir</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filtrar por nome do papel..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="h-10 w-[300px] rounded-none"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-none"
                      onClick={() => setNameFilter('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Limpar filtro</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex-1" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      className="h-10 w-10 rounded-none"
                      onClick={openNewRoleForm}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Novo Papel</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Roles Table */}
            <div className="bg-background border-border w-full rounded-none border-2">
              <div className="w-full rounded-none">
                <Table className="w-full rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="sticky top-0 z-10 min-w-[200px] cursor-pointer bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleRolesSort('name')}
                      >
                        <div className="flex items-center justify-between">
                          Nome do Papel
                          {rolesSortField === 'name' &&
                            (rolesSortDirection === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="sticky top-0 z-10 min-w-[300px] cursor-pointer bg-[var(--orange)] font-bold uppercase select-none"
                        onClick={() => handleRolesSort('description')}
                      >
                        <div className="flex items-center justify-between">
                          Descrição
                          {rolesSortField === 'description' &&
                            (rolesSortDirection === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 w-[180px] bg-[var(--orange)] text-center font-bold uppercase">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rolesLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-40 text-center">
                          <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : filteredRoles.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-gray-500"
                        >
                          Nenhum papel encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRoles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">
                            {editingRoleId === role.id ? (
                              <Input
                                value={editRoleName}
                                onChange={(e) =>
                                  setEditRoleName(e.target.value)
                                }
                                className="h-10 rounded-none border-0 outline-0 focus:border-0 focus:ring-0"
                                placeholder="Nome do papel"
                              />
                            ) : (
                              role.name
                            )}
                          </TableCell>
                          <TableCell>
                            {editingRoleId === role.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editRoleDescription}
                                  onChange={(e) =>
                                    setEditRoleDescription(e.target.value)
                                  }
                                  className="h-10 flex-1 rounded-none border-0 outline-0 focus:border-0 focus:ring-0"
                                  placeholder="Descrição do papel"
                                />
                                <div className="flex gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="default"
                                          size="icon"
                                          className="h-10 w-10 rounded-none"
                                          onClick={async () => {
                                            if (!editRoleName.trim()) return

                                            setSubmitting(true)
                                            try {
                                              const { data, error } =
                                                await supabase
                                                  .from('roles')
                                                  .update({
                                                    name: editRoleName.trim(),
                                                    description:
                                                      editRoleDescription.trim() ||
                                                      null,
                                                    updated_at: new Date()
                                                      .toISOString()
                                                      .split('T')[0],
                                                  })
                                                  .eq('id', role.id)
                                                  .select('*')

                                              if (!error && data && data[0]) {
                                                setRoles((prev) =>
                                                  prev.map((r) =>
                                                    r.id === role.id
                                                      ? data[0]
                                                      : r,
                                                  ),
                                                )
                                              }
                                            } catch (error) {
                                              console.error(
                                                'Error updating:',
                                                error,
                                              )
                                            } finally {
                                              setSubmitting(false)
                                              setEditingRoleId(null)
                                              setEditRoleName('')
                                              setEditRoleDescription('')
                                            }
                                          }}
                                          disabled={
                                            !editRoleName.trim() || submitting
                                          }
                                        >
                                          <span className="text-xs">✓</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Guardar</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-10 w-10 rounded-none"
                                          onClick={() => {
                                            setEditingRoleId(null)
                                            setEditRoleName('')
                                            setEditRoleDescription('')
                                          }}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Cancelar</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            ) : (
                              role.description || '-'
                            )}
                          </TableCell>
                          <TableCell className="flex justify-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 rounded-none"
                                    onClick={() => openPermissionsDrawer(role)}
                                    disabled={editingRoleId !== null}
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Gerir permissões
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="icon"
                                    className="h-10 w-10 rounded-none"
                                    onClick={() => {
                                      setEditingRoleId(role.id)
                                      setEditRoleName(role.name)
                                      setEditRoleDescription(
                                        role.description || '',
                                      )
                                    }}
                                    disabled={editingRoleId !== null}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-10 w-10 rounded-none"
                                    onClick={() => handleDeleteRole(role.id)}
                                    disabled={editingRoleId !== null}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Permissions Drawer */}
        <RolePermissionsDrawer
          role={selectedRoleForPermissions}
          open={permissionsDrawerOpen}
          onClose={closePermissionsDrawer}
          onSave={() => {
            // Optionally refresh roles or show success message
            console.log('Permissions saved successfully')
          }}
        />
      </div>
    </PermissionGuard>
  )
}

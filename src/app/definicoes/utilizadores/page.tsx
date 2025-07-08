'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerDescription } from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Trash2, X, Loader2, Edit, RotateCw, Users, Shield, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
  const [openRoleDrawer, setOpenRoleDrawer] = useState(false)
  const [openProfileDrawer, setOpenProfileDrawer] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  
  const [profileFormData, setProfileFormData] = useState({
    user_id: '',
    first_name: '',
    last_name: '',
    role_id: ''
  })

  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: ''
  })

  const [nameFilter, setNameFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [emailFilter, setEmailFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('profiles')

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
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!error && user) {
          setAuthUsers([{
            id: user.id,
            email: user.email || '',
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at || null,
            email_confirmed_at: user.email_confirmed_at || null,
            phone: user.phone || null,
            user_metadata: user.user_metadata
          }])
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
        .select(`
          *,
          roles (
            id,
            name,
            description
          )
        `)
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
  }, [])

  // Get auth user info for a profile
  const getAuthUserForProfile = (userId: string) => {
    return authUsers.find(user => user.id === userId)
  }

  // Get available auth users (those without profiles)
  const getAvailableAuthUsers = () => {
    return authUsers.filter(user => !profiles.find(profile => profile.user_id === user.id))
  }

  const filteredProfiles = profiles.filter(profile => {
    const fullName = (profile.first_name + ' ' + profile.last_name).toLowerCase()
    const authUser = getAuthUserForProfile(profile.user_id)
    const emailMatch = authUser ? authUser.email.toLowerCase().includes(emailFilter.toLowerCase()) : true
    const nameMatch = fullName.includes(nameFilter.toLowerCase())
    const roleMatch = !roleFilter || roleFilter === 'all' || profile.role_id === roleFilter
    return nameMatch && roleMatch && emailMatch
  })

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(nameFilter.toLowerCase())
  )

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileFormData.first_name.trim() || !profileFormData.last_name.trim() || !profileFormData.role_id) return

    setSubmitting(true)
    try {
      if (editingProfile) {
        // Update existing profile
        const { data, error } = await supabase
          .from('profiles')
          .update({
            first_name: profileFormData.first_name,
            last_name: profileFormData.last_name,
            role_id: profileFormData.role_id,
            updated_at: new Date().toISOString().split('T')[0]
          })
          .eq('id', editingProfile.id)
          .select(`
            *,
            roles (
              id,
              name,
              description
            )
          `)

        if (!error && data && data[0]) {
          setProfiles(prev => prev.map(p => p.id === editingProfile.id ? data[0] : p))
        }
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            user_id: profileFormData.user_id,
            first_name: profileFormData.first_name,
            last_name: profileFormData.last_name,
            role_id: profileFormData.role_id
          })
          .select(`
            *,
            roles (
              id,
              name,
              description
            )
          `)

        if (!error && data && data[0]) {
          setProfiles(prev => [...prev, data[0]])
        }
      }

      resetProfileForm()
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleFormData.name.trim()) return

    setSubmitting(true)
    try {
      if (editingRole) {
        // Update existing role
        const { data, error } = await supabase
          .from('roles')
          .update({
            name: roleFormData.name,
            description: roleFormData.description || null,
            updated_at: new Date().toISOString().split('T')[0]
          })
          .eq('id', editingRole.id)
          .select('*')

        if (!error && data && data[0]) {
          setRoles(prev => prev.map(r => r.id === editingRole.id ? data[0] : r))
        }
      } else {
        // Create new role
        const { data, error } = await supabase
          .from('roles')
          .insert({
            name: roleFormData.name,
            description: roleFormData.description || null
          })
          .select('*')

        if (!error && data && data[0]) {
          setRoles(prev => [...prev, data[0]])
        }
      }

      resetRoleForm()
    } catch (error) {
      console.error('Error saving role:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile)
    setProfileFormData({
      user_id: profile.user_id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      role_id: profile.role_id
    })
    setOpenProfileDrawer(true)
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setRoleFormData({
      name: role.name,
      description: role.description || ''
    })
    setOpenRoleDrawer(true)
  }

  const handleDeleteProfile = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

      if (!error) {
        setProfiles(prev => prev.filter(p => p.id !== id))
      }
    } catch (error) {
      console.error('Error deleting profile:', error)
    }
  }

  const handleDeleteRole = async (id: string) => {
    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id)

      if (!error) {
        setRoles(prev => prev.filter(r => r.id !== id))
      }
    } catch (error) {
      console.error('Error deleting role:', error)
    }
  }

  const resetProfileForm = () => {
    setProfileFormData({
      user_id: '',
      first_name: '',
      last_name: '',
      role_id: ''
    })
    setEditingProfile(null)
    setOpenProfileDrawer(false)
  }

  const resetRoleForm = () => {
    setRoleFormData({
      name: '',
      description: ''
    })
    setEditingRole(null)
    setOpenRoleDrawer(false)
  }

  const openNewRoleForm = () => {
    resetRoleForm()
    setOpenRoleDrawer(true)
  }

  const openNewProfileForm = () => {
    setProfileFormData({
      user_id: '',
      first_name: '',
      last_name: '',
      role_id: ''
    })
    setEditingProfile(null)
    setOpenProfileDrawer(true)
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão de Utilizadores</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => {
                  fetchProfiles()
                  fetchRoles()
                  fetchAuthUsers()
                }}>
                  <RotateCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar dados</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profiles">
            <Users className="w-4 h-4 mr-2" />
            Perfis de Utilizador
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield className="w-4 h-4 mr-2" />
            Papéis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filtrar por nome..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="w-[200px]"
            />
            <Input
              placeholder="Filtrar por email..."
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="w-[200px]"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os papéis</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => {
              setNameFilter('')
              setEmailFilter('')
              setRoleFilter('all')
            }}>
              <X className="w-4 h-4" />
            </Button>
            <div className="flex-1" />
            <Button onClick={openNewProfileForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Perfil
            </Button>
          </div>

          {/* Profiles Table */}
          <div className="rounded-md bg-background w-full">
            <div className="max-h-[70vh] overflow-y-auto w-full">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[150px]">
                      Nome
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[150px]">
                      Apelido
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[200px]">
                      Email
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[150px]">
                      Papel
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[140px]">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-40">
                        <Loader2 className="animate-spin w-8 h-8 text-muted-foreground mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        Nenhum perfil encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfiles.map((profile) => {
                      const authUser = getAuthUserForProfile(profile.user_id)
                      return (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.first_name}</TableCell>
                          <TableCell>{profile.last_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              {authUser?.email || 'Email não encontrado'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {profile.roles?.name || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditProfile(profile)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDeleteProfile(profile.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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
              className="w-[300px]"
            />
            <Button variant="outline" size="icon" onClick={() => setNameFilter('')}>
              <X className="w-4 h-4" />
            </Button>
            <div className="flex-1" />
            <Button onClick={openNewRoleForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Papel
            </Button>
          </div>

          {/* Roles Table */}
          <div className="rounded-md bg-background w-full">
            <div className="max-h-[70vh] overflow-y-auto w-full">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[200px]">
                      Nome do Papel
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[300px]">
                      Descrição
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[140px]">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rolesLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-40">
                        <Loader2 className="animate-spin w-8 h-8 text-muted-foreground mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500">
                        Nenhum papel encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{role.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditRole(role)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeleteRole(role.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Profile Form Drawer */}
      <Drawer open={openProfileDrawer} onOpenChange={(open) => { if (!open) resetProfileForm() }}>
        <DrawerContent className="h-screen min-h-screen !top-0 !mt-0">
          <div className="w-full px-4 md:px-8 flex flex-col h-full">
            <DrawerHeader className="flex-none">
              <div className="flex justify-end items-center gap-2 mb-2">
                <DrawerClose asChild>
                  <Button variant="outline" size="sm">
                    <X className="w-5 h-5" />
                  </Button>
                </DrawerClose>
              </div>
              <DrawerTitle>
                {editingProfile ? 'Editar Perfil' : 'Novo Perfil'}
              </DrawerTitle>
              <DrawerDescription>
                {editingProfile 
                  ? 'Edite as informações do perfil do utilizador.'
                  : 'Crie um novo perfil para um utilizador autenticado.'
                }
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-grow overflow-y-auto">
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="space-y-4">
                  {!editingProfile && (
                    <div className="space-y-2">
                      <Label htmlFor="user_select" className="font-base text-sm">Utilizador Autenticado</Label>
                      <select 
                        id="user_select"
                        value={profileFormData.user_id} 
                        onChange={(e) => {
                          const value = e.target.value
                          const selectedUser = authUsers.find(u => u.id === value)
                          setProfileFormData(prev => ({
                            ...prev,
                            user_id: value,
                            first_name: selectedUser?.user_metadata?.first_name || '',
                            last_name: selectedUser?.user_metadata?.last_name || ''
                          }))
                        }}
                        disabled={submitting}
                        className="flex h-9 w-full border border-border bg-background px-3 py-1 text-sm shadow-shadow transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Selecione um utilizador autenticado</option>
                        {getAvailableAuthUsers().map(user => (
                          <option key={user.id} value={user.id}>
                            {user.email}
                            {user.user_metadata?.first_name && user.user_metadata?.last_name && 
                              ' - ' + user.user_metadata.first_name + ' ' + user.user_metadata.last_name
                            }
                          </option>
                        ))}
                      </select>
                      {getAvailableAuthUsers().length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Todos os utilizadores autenticados já têm perfis criados.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name" className="font-base text-sm">Primeiro Nome</Label>
                      <Input
                        id="first_name"
                        name="first_name"
                        value={profileFormData.first_name}
                        onChange={(e) => setProfileFormData(prev => ({
                          ...prev,
                          first_name: e.target.value
                        }))}
                        placeholder="Digite o primeiro nome"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last_name" className="font-base text-sm">Apelido</Label>
                      <Input
                        id="last_name"
                        name="last_name"
                        value={profileFormData.last_name}
                        onChange={(e) => setProfileFormData(prev => ({
                          ...prev,
                          last_name: e.target.value
                        }))}
                        placeholder="Digite o apelido"
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role_id" className="font-base text-sm">Papel</Label>
                    <select
                      id="role_id"
                      value={profileFormData.role_id} 
                      onChange={(e) => setProfileFormData(prev => ({
                        ...prev,
                        role_id: e.target.value
                      }))}
                      disabled={submitting}
                      className="flex h-9 w-full border border-border bg-background px-3 py-1 text-sm shadow-shadow transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Selecione um papel</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                          {role.description && ' - ' + role.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 sticky bottom-0 bg-background border-t border-border">
                  <Button 
                    type="submit" 
                    disabled={submitting || !profileFormData.first_name.trim() || !profileFormData.last_name.trim() || !profileFormData.role_id || (!editingProfile && !profileFormData.user_id)}
                    className="flex-1"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {editingProfile ? 'Atualizando...' : 'Criando...'}
                      </>
                    ) : (
                      editingProfile ? 'Atualizar Perfil' : 'Criar Perfil'
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetProfileForm} disabled={submitting}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Role Form Drawer */}
      <Drawer open={openRoleDrawer} onOpenChange={(open) => { if (!open) resetRoleForm() }}>
        <DrawerContent className="h-screen min-h-screen !top-0 !mt-0">
          <div className="w-full px-4 md:px-8 flex flex-col h-full">
            <DrawerHeader className="flex-none">
              <div className="flex justify-end items-center gap-2 mb-2">
                <DrawerClose asChild>
                  <Button variant="outline" size="sm">
                    <X className="w-5 h-5" />
                  </Button>
                </DrawerClose>
              </div>
              <DrawerTitle>
                {editingRole ? 'Editar Papel' : 'Novo Papel'}
              </DrawerTitle>
              <DrawerDescription>
                {editingRole 
                  ? 'Edite as informações do papel.'
                  : 'Crie um novo papel para atribuir aos utilizadores.'
                }
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-grow overflow-y-auto">
              <form onSubmit={handleRoleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role_name" className="font-base text-sm">Nome do Papel</Label>
                    <Input
                      id="role_name"
                      name="name"
                      value={roleFormData.name}
                      onChange={(e) => setRoleFormData(prev => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      placeholder="Digite o nome do papel"
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role_description" className="font-base text-sm">Descrição</Label>
                    <Textarea
                      id="role_description"
                      name="description"
                      value={roleFormData.description}
                      onChange={(e) => setRoleFormData(prev => ({
                        ...prev,
                        description: e.target.value
                      }))}
                      placeholder="Digite a descrição do papel (opcional)"
                      disabled={submitting}
                      className="min-h-[80px] h-24 resize-none w-full"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4 sticky bottom-0 bg-background border-t border-border">
                  <Button 
                    type="submit" 
                    disabled={submitting || !roleFormData.name.trim()}
                    className="flex-1"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {editingRole ? 'Atualizando...' : 'Criando...'}
                      </>
                    ) : (
                      editingRole ? 'Atualizar Papel' : 'Criar Papel'
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetRoleForm} disabled={submitting}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
} 
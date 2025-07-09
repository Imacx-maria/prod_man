'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Combobox from '@/components/ui/Combobox'

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

  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editRoleId, setEditRoleId] = useState('')
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editRoleName, setEditRoleName] = useState('')
  const [editRoleDescription, setEditRoleDescription] = useState('')
  const [creatingNewProfile, setCreatingNewProfile] = useState(false)
  const [newProfileUserId, setNewProfileUserId] = useState('')
  


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
          description: description.trim() || null
        })
        .select('*')

      if (!error && data && data[0]) {
        setRoles(prev => [...prev, data[0]])
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
    if (!editFirstName.trim() || !editLastName.trim() || !newProfileUserId.trim() || !editRoleId) {
      alert('Por favor, preencha todos os campos.')
      return
    }

    setSubmitting(true)
    try {
      // Check if a user with this ID exists in auth
      const authUser = authUsers.find(user => user.id === newProfileUserId)
      
      if (!authUser) {
        alert('Utilizador não encontrado na autenticação.')
        return
      }

      // Check if profile already exists for this user
      const existingProfile = profiles.find(profile => profile.user_id === authUser.id)
      if (existingProfile) {
        alert('Este utilizador já tem um perfil criado.')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: authUser.id,
          first_name: editFirstName.trim(),
          last_name: editLastName.trim(),
          role_id: editRoleId
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
        // Reset creation mode
        setCreatingNewProfile(false)
        setEditFirstName('')
        setEditLastName('')
        setNewProfileUserId('')
        setEditRoleId('')
      } else {
        alert('Erro ao criar perfil: ' + (error?.message || 'Erro desconhecido'))
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
              <TooltipContent>Atualizar</TooltipContent>
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
              className="w-[200px] rounded-none"
            />
            <Input
              placeholder="Filtrar por email..."
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="w-[200px] rounded-none"
            />
            <Combobox
              value={roleFilter}
              onChange={setRoleFilter}
              placeholder="Filtrar por papel"
              maxWidth="200px"
              options={[
                { value: 'all', label: 'Todos os papéis' },
                ...roles.map(role => ({
                  value: role.id,
                  label: role.name
                }))
              ]}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => {
                    setNameFilter('')
                    setEmailFilter('')
                    setRoleFilter('all')
                  }}>
                    <X className="w-4 h-4" />
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
                    onClick={openNewProfileForm}
                    disabled={creatingNewProfile || editingProfileId !== null}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Novo Perfil</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Profiles Table */}
          <div className="rounded-none bg-background w-full border-2 border-border">
            <div className="max-h-[70vh] overflow-y-auto w-full rounded-none">
              <Table className="w-full border-0 rounded-none">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[150px] font-bold uppercase">
                      Nome
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[150px] font-bold uppercase">
                      Apelido
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[200px] font-bold uppercase">
                      Email
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[150px] font-bold uppercase">
                      Papel
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[140px] font-bold uppercase">
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
                          className="rounded-none"
                          placeholder="Primeiro nome"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          className="rounded-none"
                          placeholder="Apelido"
                        />
                      </TableCell>
                      <TableCell>
                        <Combobox
                          value={newProfileUserId}
                          onChange={(userId) => {
                            setNewProfileUserId(userId)
                            // Auto-fill first/last name if available in user metadata
                            const selectedUser = authUsers.find(user => user.id === userId)
                            if (selectedUser?.user_metadata?.first_name) {
                              setEditFirstName(selectedUser.user_metadata.first_name)
                            }
                            if (selectedUser?.user_metadata?.last_name) {
                              setEditLastName(selectedUser.user_metadata.last_name)
                            }
                          }}
                          placeholder="Selecione um utilizador"
                          maxWidth="250px"
                          options={getAvailableAuthUsers().map(user => ({
                            value: user.id,
                            label: user.email
                          }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Combobox
                          value={editRoleId}
                          onChange={setEditRoleId}
                          placeholder="Selecione um papel"
                          maxWidth="200px"
                          options={roles.map(role => ({
                            value: role.id,
                            label: role.name
                          }))}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={saveNewProfile}
                                  disabled={!editFirstName.trim() || !editLastName.trim() || !newProfileUserId.trim() || !editRoleId || submitting}
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
                                  onClick={cancelNewProfile}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancelar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-40">
                        <Loader2 className="animate-spin w-8 h-8 text-muted-foreground mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredProfiles.length === 0 && !creatingNewProfile ? (
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
                          <TableCell className="font-medium">
                            {editingProfileId === profile.id ? (
                              <Input
                                value={editFirstName}
                                onChange={(e) => setEditFirstName(e.target.value)}
                                className="rounded-none"
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
                                onChange={(e) => setEditLastName(e.target.value)}
                                className="rounded-none"
                                placeholder="Apelido"
                              />
                            ) : (
                              profile.last_name
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground" />
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
                                options={roles.map(role => ({
                                  value: role.id,
                                  label: role.name
                                }))}
                              />
                            ) : (
                              <Badge variant="outline" className="rounded-none">
                                {profile.roles?.name || '-'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {editingProfileId === profile.id ? (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="default"
                                          size="icon"
                                          onClick={async () => {
                                            if (!editFirstName.trim() || !editLastName.trim() || !editRoleId) return;
                                            
                                            setSubmitting(true);
                                            try {
                                              const { data, error } = await supabase
                                                .from('profiles')
                                                .update({
                                                  first_name: editFirstName.trim(),
                                                  last_name: editLastName.trim(),
                                                  role_id: editRoleId,
                                                  updated_at: new Date().toISOString().split('T')[0]
                                                })
                                                .eq('id', profile.id)
                                                .select(`
                                                  *,
                                                  roles (
                                                    id,
                                                    name,
                                                    description
                                                  )
                                                `);
                                              
                                              if (!error && data && data[0]) {
                                                setProfiles(prev => prev.map(p => 
                                                  p.id === profile.id ? data[0] : p
                                                ));
                                              }
                                            } catch (error) {
                                              console.error('Error updating:', error);
                                            } finally {
                                              setSubmitting(false);
                                              setEditingProfileId(null);
                                              setEditFirstName('');
                                              setEditLastName('');
                                              setEditRoleId('');
                                            }
                                          }}
                                          disabled={!editFirstName.trim() || !editLastName.trim() || !editRoleId || submitting}
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
                                          onClick={() => {
                                            setEditingProfileId(null);
                                            setEditFirstName('');
                                            setEditLastName('');
                                            setEditRoleId('');
                                          }}
                                        >
                                          <X className="w-4 h-4" />
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
                                          onClick={() => {
                                            setEditingProfileId(profile.id);
                                            setEditFirstName(profile.first_name);
                                            setEditLastName(profile.last_name);
                                            setEditRoleId(profile.role_id);
                                          }}
                                          disabled={editingProfileId !== null}
                                        >
                                          <Edit className="w-4 h-4" />
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
                                          onClick={() => handleDeleteProfile(profile.id)}
                                          disabled={editingProfileId !== null}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Excluir</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              )}
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
              className="w-[300px] rounded-none"
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => setNameFilter('')}>
                    <X className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Limpar filtro</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex-1" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={openNewRoleForm}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Novo Papel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Roles Table */}
          <div className="rounded-none bg-background w-full border-2 border-border">
            <div className="max-h-[70vh] overflow-y-auto w-full rounded-none">
              <Table className="w-full border-0 rounded-none">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[200px] font-bold uppercase">
                      Nome do Papel
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border min-w-[300px] font-bold uppercase">
                      Descrição
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-t-2 border-border w-[140px] font-bold uppercase">
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
                        <TableCell className="font-medium">
                          {editingRoleId === role.id ? (
                            <Input
                              value={editRoleName}
                              onChange={(e) => setEditRoleName(e.target.value)}
                              className="rounded-none"
                              placeholder="Nome do papel"
                            />
                          ) : (
                            role.name
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRoleId === role.id ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                value={editRoleDescription}
                                onChange={(e) => setEditRoleDescription(e.target.value)}
                                className="rounded-none flex-1"
                                placeholder="Descrição do papel"
                              />
                              <div className="flex gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="default"
                                        size="icon"
                                        onClick={async () => {
                                          if (!editRoleName.trim()) return;
                                          
                                          setSubmitting(true);
                                          try {
                                            const { data, error } = await supabase
                                              .from('roles')
                                              .update({
                                                name: editRoleName.trim(),
                                                description: editRoleDescription.trim() || null,
                                                updated_at: new Date().toISOString().split('T')[0]
                                              })
                                              .eq('id', role.id)
                                              .select('*');
                                            
                                            if (!error && data && data[0]) {
                                              setRoles(prev => prev.map(r => 
                                                r.id === role.id ? data[0] : r
                                              ));
                                            }
                                          } catch (error) {
                                            console.error('Error updating:', error);
                                          } finally {
                                            setSubmitting(false);
                                            setEditingRoleId(null);
                                            setEditRoleName('');
                                            setEditRoleDescription('');
                                          }
                                        }}
                                        disabled={!editRoleName.trim() || submitting}
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
                                        onClick={() => {
                                          setEditingRoleId(null);
                                          setEditRoleName('');
                                          setEditRoleDescription('');
                                        }}
                                      >
                                        <X className="w-4 h-4" />
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
                        <TableCell>
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="icon"
                                    onClick={() => {
                                      setEditingRoleId(role.id);
                                      setEditRoleName(role.name);
                                      setEditRoleDescription(role.description || '');
                                    }}
                                    disabled={editingRoleId !== null}
                                  >
                                    <Edit className="w-4 h-4" />
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
                                    onClick={() => handleDeleteRole(role.id)}
                                    disabled={editingRoleId !== null}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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


    </div>
  )
} 
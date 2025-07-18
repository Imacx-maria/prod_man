'use client'

import { useState, useEffect, useCallback } from 'react'
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Textarea } from '@/components/ui/textarea'
import { useDebounce } from '@/hooks/useDebounce'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Eye,
  Trash2,
  X,
  Loader2,
  Edit,
  RotateCw,
  Users,
} from 'lucide-react'
import PermissionGuard from '@/components/PermissionGuard'

interface Cliente {
  id: string
  numero_phc: string | null
  nome_cl: string
  morada: string | null
  codigo_pos: string | null
  telefone: string | null
  created_at: string
  updated_at: string
}

interface ClienteContact {
  id: string
  cliente_id: string
  name: string
  email: string | null
  phone_number: string | null
  mobile: string | null
  created_at: string
  updated_at: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [contacts, setContacts] = useState<ClienteContact[]>([])
  const [loading, setLoading] = useState(true)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [openDrawer, setOpenDrawer] = useState(false)
  const [openContactDrawer, setOpenContactDrawer] = useState(false)
  const [openContactForm, setOpenContactForm] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [editingContact, setEditingContact] = useState<ClienteContact | null>(
    null,
  )
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(
    null,
  )

  const [formData, setFormData] = useState({
    numero_phc: '',
    nome_cl: '',
    morada: '',
    codigo_pos: '',
    telefone: '',
  })

  const [contactFormData, setContactFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    mobile: '',
  })

  const [nameFilter, setNameFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Debounced filter values for performance
  const [debouncedNameFilter, setDebouncedNameFilter] = useState(nameFilter)

  // Update debounced value with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNameFilter(nameFilter)
    }, 300)
    return () => clearTimeout(timer)
  }, [nameFilter])

  const supabase = createBrowserClient()

  // Convert to database-level filtering
  const fetchClientes = useCallback(
    async (filters: { nameFilter?: string } = {}) => {
      setLoading(true)
      try {
        let query = supabase.from('clientes').select('*')

        // Apply filters at database level
        if (filters.nameFilter?.trim?.()) {
          const searchTerm = filters.nameFilter.trim()
          // Search in both nome_cl and numero_phc fields
          query = query.or(
            `nome_cl.ilike.%${searchTerm}%,numero_phc.ilike.%${searchTerm}%`,
          )
        }

        const { data, error } = await query.order('nome_cl', {
          ascending: true,
        })

        if (!error && data) {
          setClientes(data)
        }
      } catch (error) {
        console.error('Error fetching clientes:', error)
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  const fetchContacts = async (clienteId: string) => {
    setContactsLoading(true)
    try {
      const { data, error } = await supabase
        .from('cliente_contacts')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('name', { ascending: true })

      if (!error && data) {
        setContacts(data)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setContactsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  // Trigger search when filter changes
  useEffect(() => {
    fetchClientes({ nameFilter: debouncedNameFilter })
  }, [debouncedNameFilter, fetchClientes])

  // Remove client-side filtering - now using database-level filtering
  const filteredClientes = clientes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome_cl.trim()) return

    setSubmitting(true)
    try {
      if (editingCliente) {
        // Update existing cliente
        const { data, error } = await supabase
          .from('clientes')
          .update({
            numero_phc: formData.numero_phc || null,
            nome_cl: formData.nome_cl,
            morada: formData.morada || null,
            codigo_pos: formData.codigo_pos || null,
            telefone: formData.telefone || null,
            updated_at: new Date().toISOString().split('T')[0],
          })
          .eq('id', editingCliente.id)
          .select('*')

        if (!error && data && data[0]) {
          setClientes((prev) =>
            prev.map((c) => (c.id === editingCliente.id ? data[0] : c)),
          )
        }
      } else {
        // Create new cliente
        const { data, error } = await supabase
          .from('clientes')
          .insert({
            numero_phc: formData.numero_phc || null,
            nome_cl: formData.nome_cl,
            morada: formData.morada || null,
            codigo_pos: formData.codigo_pos || null,
            telefone: formData.telefone || null,
          })
          .select('*')

        if (!error && data && data[0]) {
          setClientes((prev) => [...prev, data[0]])
        }
      }

      resetForm()
    } catch (error) {
      console.error('Error saving cliente:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactFormData.name.trim() || !selectedClienteId) return

    setSubmitting(true)
    try {
      if (editingContact) {
        // Update existing contact
        const { data, error } = await supabase
          .from('cliente_contacts')
          .update({
            name: contactFormData.name,
            email: contactFormData.email || null,
            phone_number: contactFormData.phone_number || null,
            mobile: contactFormData.mobile || null,
            updated_at: new Date().toISOString().split('T')[0],
          })
          .eq('id', editingContact.id)
          .select('*')

        if (!error && data && data[0]) {
          setContacts((prev) =>
            prev.map((c) => (c.id === editingContact.id ? data[0] : c)),
          )
        }
      } else {
        // Create new contact
        const { data, error } = await supabase
          .from('cliente_contacts')
          .insert({
            cliente_id: selectedClienteId,
            name: contactFormData.name,
            email: contactFormData.email || null,
            phone_number: contactFormData.phone_number || null,
            mobile: contactFormData.mobile || null,
          })
          .select('*')

        if (!error && data && data[0]) {
          setContacts((prev) => [...prev, data[0]])
        }
      }

      resetContactForm()
    } catch (error) {
      console.error('Error saving contact:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente)
    setFormData({
      numero_phc: cliente.numero_phc || '',
      nome_cl: cliente.nome_cl,
      morada: cliente.morada || '',
      codigo_pos: cliente.codigo_pos || '',
      telefone: cliente.telefone || '',
    })
    setOpenDrawer(true)
  }

  const handleEditContact = (contact: ClienteContact) => {
    setEditingContact(contact)
    setContactFormData({
      name: contact.name,
      email: contact.email || '',
      phone_number: contact.phone_number || '',
      mobile: contact.mobile || '',
    })
    setOpenContactDrawer(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return

    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id)

      if (!error) {
        setClientes((prev) => prev.filter((c) => c.id !== id))
      }
    } catch (error) {
      console.error('Error deleting cliente:', error)
    }
  }

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contacto?')) return

    try {
      const { error } = await supabase
        .from('cliente_contacts')
        .delete()
        .eq('id', id)

      if (!error) {
        setContacts((prev) => prev.filter((c) => c.id !== id))
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
    }
  }

  const handleViewContacts = (cliente: Cliente) => {
    setSelectedClienteId(cliente.id)
    fetchContacts(cliente.id)
    setOpenContactDrawer(true)
  }

  const resetForm = () => {
    setFormData({
      numero_phc: '',
      nome_cl: '',
      morada: '',
      codigo_pos: '',
      telefone: '',
    })
    setEditingCliente(null)
    setOpenDrawer(false)
  }

  const resetContactForm = () => {
    setContactFormData({
      name: '',
      email: '',
      phone_number: '',
      mobile: '',
    })
    setEditingContact(null)
    setOpenContactForm(false)
  }

  const openNewForm = () => {
    resetForm()
    setOpenDrawer(true)
  }

  const openNewContactForm = () => {
    if (!selectedClienteId) return
    resetContactForm()
    setOpenContactForm(true)
  }

  const selectedCliente = clientes.find((c) => c.id === selectedClienteId)

  return (
    <PermissionGuard>
      <div className="w-full space-y-6 p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gestão de Clientes</h1>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchClientes()}
                    aria-label="Atualizar"
                    className="h-10 w-10 rounded-none"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={openNewForm}
                    variant="default"
                    size="icon"
                    aria-label="Adicionar"
                    className="h-10 w-10 rounded-none"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Adicionar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-6 flex items-center gap-2">
          <Input
            placeholder="Filtrar por nome ou número PHC..."
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
                  onClick={() => setNameFilter('')}
                  aria-label="Limpar filtro"
                  className="h-10 w-10 rounded-none"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Limpar filtro</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    fetchClientes({ nameFilter: debouncedNameFilter })
                  }
                  aria-label="Atualizar"
                  className="h-10 w-10 rounded-none"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Table */}
        <div className="bg-background border-border w-full rounded-none border-2">
          <div className="w-full rounded-none">
            <Table className="w-full table-fixed rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="border-border sticky top-0 z-10 w-[120px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Número PHC
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 min-w-[200px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Nome do Cliente
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 min-w-[250px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Morada
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[120px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Código Postal
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[140px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                    Telefone
                  </TableHead>
                  <TableHead className="border-border sticky top-0 z-10 w-[140px] rounded-none border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-40 text-center uppercase"
                    >
                      <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filteredClientes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-gray-500 uppercase"
                    >
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClientes.map((cliente) => (
                    <TableRow
                      key={cliente.id}
                      className="hover:bg-[var(--main)]"
                    >
                      <TableCell className="rounded-none uppercase">
                        {cliente.numero_phc || '-'}
                      </TableCell>
                      <TableCell className="rounded-none font-medium uppercase">
                        {cliente.nome_cl}
                      </TableCell>
                      <TableCell className="rounded-none uppercase">
                        {cliente.morada || '-'}
                      </TableCell>
                      <TableCell className="rounded-none uppercase">
                        {cliente.codigo_pos || '-'}
                      </TableCell>
                      <TableCell className="rounded-none uppercase">
                        {cliente.telefone || '-'}
                      </TableCell>
                      <TableCell className="flex justify-center gap-2 rounded-none">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleViewContacts(cliente)}
                                aria-label="Ver contactos"
                                className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Contactos</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => handleEdit(cliente)}
                                aria-label="Ver detalhes do cliente"
                                className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDelete(cliente.id)}
                                aria-label="Eliminar cliente"
                                className="aspect-square !h-10 !w-10 !max-w-10 !min-w-10 !rounded-none !p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar</TooltipContent>
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

        {/* Cliente Form Drawer */}
        <Drawer open={openDrawer} onOpenChange={(open) => !open && resetForm()}>
          <DrawerContent className="!top-0 !mt-0 h-screen min-h-screen rounded-none">
            <div className="flex h-full w-full flex-col px-4 md:px-8">
              <DrawerHeader className="flex-none">
                <div className="mb-2 flex items-center justify-end gap-2">
                  <DrawerClose asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Fechar"
                      className="h-10 w-10 rounded-none"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </DrawerClose>
                </div>
                <DrawerTitle>
                  {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
                </DrawerTitle>
                <DrawerDescription>
                  {editingCliente
                    ? 'Edite as informações do cliente abaixo.'
                    : 'Preencha as informações para criar um novo cliente.'}
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex-grow overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="numero_phc" className="font-base text-sm">
                        Número PHC
                      </Label>
                      <Input
                        id="numero_phc"
                        value={formData.numero_phc}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            numero_phc: e.target.value,
                          }))
                        }
                        placeholder="Número do sistema PHC"
                        className="h-10 rounded-none"
                      />
                    </div>

                    <div>
                      <Label htmlFor="nome_cl" className="font-base text-sm">
                        Nome do Cliente *
                      </Label>
                      <Input
                        id="nome_cl"
                        value={formData.nome_cl}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            nome_cl: e.target.value,
                          }))
                        }
                        placeholder="Nome do cliente"
                        required
                        className="h-10 rounded-none"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="morada" className="font-base text-sm">
                      Morada
                    </Label>
                    <Textarea
                      id="morada"
                      value={formData.morada}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          morada: e.target.value,
                        }))
                      }
                      placeholder="Morada completa do cliente"
                      className="h-24 min-h-[80px] w-full resize-none rounded-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="codigo_pos" className="font-base text-sm">
                        Código Postal
                      </Label>
                      <Input
                        id="codigo_pos"
                        value={formData.codigo_pos}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            codigo_pos: e.target.value,
                          }))
                        }
                        placeholder="Ex: 1000-001"
                        className="h-10 rounded-none"
                      />
                    </div>

                    <div>
                      <Label htmlFor="telefone" className="font-base text-sm">
                        Telefone
                      </Label>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            telefone: e.target.value,
                          }))
                        }
                        placeholder="Ex: +351 123 456 789"
                        className="h-10 rounded-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={submitting || !formData.nome_cl.trim()}
                      variant="default"
                      className="h-10 rounded-none"
                    >
                      {submitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {editingCliente ? 'Guardar' : 'Criar Cliente'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      aria-label="Cancelar"
                      className="h-10 rounded-none"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Contacts Management Drawer */}
        <Drawer
          open={openContactDrawer}
          onOpenChange={(open) => !open && setOpenContactDrawer(false)}
        >
          <DrawerContent className="!top-0 !mt-0 h-screen min-h-screen rounded-none">
            <div className="flex h-full w-full flex-col px-4 md:px-8">
              <DrawerHeader className="flex-none">
                <div className="mb-2 flex items-center justify-end gap-2">
                  <DrawerClose asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setOpenContactDrawer(false)}
                      aria-label="Fechar"
                      className="h-10 w-10 rounded-none"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </DrawerClose>
                </div>
                <DrawerTitle>
                  Gestão de Contactos - {selectedCliente?.nome_cl}
                </DrawerTitle>
                <DrawerDescription>
                  Visualize e gerencie os contactos deste cliente
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex-grow space-y-4 overflow-y-auto rounded-none">
                {/* Add Contact Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={openNewContactForm}
                    aria-label="Adicionar novo contacto"
                    className="h-10 rounded-none"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Contacto
                  </Button>
                </div>

                {/* Contacts Table */}
                <div className="bg-background border-border w-fit rounded-none border-2">
                  <div className="w-fit rounded-none">
                    <Table className="w-fit table-fixed rounded-none border-0 [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="border-border sticky top-0 z-10 min-w-[200px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                            Nome
                          </TableHead>
                          <TableHead className="border-border sticky top-0 z-10 min-w-[200px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                            Email
                          </TableHead>
                          <TableHead className="border-border sticky top-0 z-10 w-[140px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                            Telefone
                          </TableHead>
                          <TableHead className="border-border sticky top-0 z-10 w-[140px] rounded-none border-b-2 bg-[var(--orange)] font-bold uppercase">
                            Telemóvel
                          </TableHead>
                          <TableHead className="border-border sticky top-0 z-10 w-[100px] rounded-none border-b-2 bg-[var(--orange)] text-center font-bold uppercase">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contactsLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="h-40 text-center uppercase"
                            >
                              <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                            </TableCell>
                          </TableRow>
                        ) : contacts.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-8 text-center text-gray-500 uppercase"
                            >
                              <div className="flex flex-col items-center gap-2">
                                <Users className="h-8 w-8 text-gray-400" />
                                <p>
                                  Nenhum contacto encontrado para este cliente.
                                </p>
                                <p className="text-sm">
                                  Clique em &quot;Novo Contacto&quot; para
                                  adicionar o primeiro contacto.
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          contacts.map((contact) => (
                            <TableRow
                              key={contact.id}
                              className="hover:bg-[var(--main)]"
                            >
                              <TableCell className="rounded-none font-medium uppercase">
                                {contact.name}
                              </TableCell>
                              <TableCell className="rounded-none uppercase">
                                {contact.email || '-'}
                              </TableCell>
                              <TableCell className="rounded-none uppercase">
                                {contact.phone_number || '-'}
                              </TableCell>
                              <TableCell className="rounded-none uppercase">
                                {contact.mobile || '-'}
                              </TableCell>
                              <TableCell className="rounded-none">
                                <div className="flex gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() =>
                                            handleEditContact(contact)
                                          }
                                          aria-label="Editar contacto"
                                          className="h-10 w-10 rounded-none"
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
                                          onClick={() =>
                                            handleDeleteContact(contact.id)
                                          }
                                          aria-label="Eliminar contacto"
                                          className="h-10 w-10 rounded-none"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Eliminar</TooltipContent>
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
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Contact Form Drawer */}
        <Drawer
          open={openContactForm || editingContact !== null}
          onOpenChange={(open) => !open && resetContactForm()}
        >
          <DrawerContent className="!top-0 !mt-0 h-screen min-h-screen rounded-none">
            <div className="flex h-full w-full flex-col px-4 md:px-8">
              <DrawerHeader className="flex-none">
                <div className="mb-2 flex items-center justify-end gap-2">
                  <DrawerClose asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Fechar"
                      className="h-10 w-10 rounded-none"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </DrawerClose>
                </div>
                <DrawerTitle>
                  {editingContact ? 'Editar Contacto' : 'Novo Contacto'}
                </DrawerTitle>
                <DrawerDescription>
                  Cliente: {selectedCliente?.nome_cl}
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex-grow overflow-y-auto rounded-none">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="contact_name" className="font-base text-sm">
                      Nome do Contacto *
                    </Label>
                    <Input
                      id="contact_name"
                      value={contactFormData.name}
                      onChange={(e) =>
                        setContactFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Nome completo do contacto"
                      required
                      className="h-10 rounded-none"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="contact_email"
                      className="font-base text-sm"
                    >
                      Email
                    </Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={contactFormData.email}
                      onChange={(e) =>
                        setContactFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="email@exemplo.com"
                      className="h-10 rounded-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label
                        htmlFor="contact_phone"
                        className="font-base text-sm"
                      >
                        Telefone
                      </Label>
                      <Input
                        id="contact_phone"
                        value={contactFormData.phone_number}
                        onChange={(e) =>
                          setContactFormData((prev) => ({
                            ...prev,
                            phone_number: e.target.value,
                          }))
                        }
                        placeholder="Ex: 123 456 789"
                        className="h-10 rounded-none"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="contact_mobile"
                        className="font-base text-sm"
                      >
                        Telemóvel
                      </Label>
                      <Input
                        id="contact_mobile"
                        value={contactFormData.mobile}
                        onChange={(e) =>
                          setContactFormData((prev) => ({
                            ...prev,
                            mobile: e.target.value,
                          }))
                        }
                        placeholder="Ex: 912 345 678"
                        className="h-10 rounded-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={submitting || !contactFormData.name.trim()}
                      variant="default"
                      className="h-10 rounded-none"
                    >
                      {submitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {editingContact ? 'Atualizar' : 'Criar'} Contacto
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetContactForm}
                      aria-label="Cancelar"
                      className="h-10 rounded-none"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </PermissionGuard>
  )
}

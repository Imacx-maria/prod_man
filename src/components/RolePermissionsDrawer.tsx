'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Loader2, X, Shield, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Permission {
  page_path: string
  can_access: boolean
}

interface Role {
  id: string
  name: string
  description: string | null
}

interface RolePermissionsDrawerProps {
  role: Role | null
  open: boolean
  onClose: () => void
  onSave?: () => void
}

// Page definitions with categories and descriptions
const PAGE_CATEGORIES = {
  Geral: {
    pages: [
      { path: '/', name: 'Página Inicial', description: 'Homepage do sistema' },
      {
        path: '/dashboard',
        name: 'Dashboard',
        description: 'Painel principal',
      },
      {
        path: '/dashboard/profile',
        name: 'Perfil',
        description: 'Perfil do utilizador',
      },
      {
        path: '/dashboard/change-password',
        name: 'Alterar Senha',
        description: 'Alteração de palavra-passe',
      },
    ],
  },
  Autenticação: {
    pages: [
      { path: '/login', name: 'Login', description: 'Página de entrada' },
      {
        path: '/reset-password',
        name: 'Reset Password',
        description: 'Recuperação de palavra-passe',
      },
      {
        path: '/update-password',
        name: 'Update Password',
        description: 'Atualização de palavra-passe',
      },
    ],
  },
  Definições: {
    pages: [
      {
        path: '/definicoes/armazens',
        name: 'Armazéns',
        description: 'Gestão de armazéns',
      },
      {
        path: '/definicoes/clientes',
        name: 'Clientes',
        description: 'Gestão de clientes',
      },
      {
        path: '/definicoes/complexidade',
        name: 'Complexidade',
        description: 'Níveis de complexidade',
      },
      {
        path: '/definicoes/feriados',
        name: 'Feriados',
        description: 'Calendário de feriados',
      },
      {
        path: '/definicoes/fornecedores',
        name: 'Fornecedores',
        description: 'Gestão de fornecedores',
      },
      {
        path: '/definicoes/maquinas',
        name: 'Máquinas',
        description: 'Gestão de máquinas',
      },
      {
        path: '/definicoes/materiais',
        name: 'Materiais',
        description: 'Catálogo de materiais',
      },
      {
        path: '/definicoes/stocks',
        name: 'Stocks',
        description: 'Gestão de inventário',
      },
      {
        path: '/definicoes/transportadoras',
        name: 'Transportadoras',
        description: 'Empresas de transporte',
      },
      {
        path: '/definicoes/utilizadores',
        name: 'Utilizadores',
        description: 'Gestão de utilizadores e papéis',
      },
    ],
  },
  Produção: {
    pages: [
      {
        path: '/producao',
        name: 'Produção Principal',
        description: 'Página principal de produção',
      },
      {
        path: '/producao/operacoes',
        name: 'Operações',
        description: 'Operações de produção',
      },
    ],
  },
  Gestão: {
    pages: [
      {
        path: '/gestao/faturacao',
        name: 'Faturação',
        description: 'Gestão de faturação de trabalhos concluídos',
      },
    ],
  },
  Design: {
    pages: [
      {
        path: '/designer-flow',
        name: 'Fluxo de Design',
        description: 'Workflow de design',
      },
    ],
  },
  Outros: {
    pages: [
      {
        path: '/components',
        name: 'Componentes',
        description: 'Showcase de componentes (desenvolvimento)',
      },
      {
        path: '/payments',
        name: 'Pagamentos',
        description: 'Sistema de pagamentos',
      },
      {
        path: '/test-examples',
        name: 'Exemplos de Teste',
        description: 'Páginas de exemplo e teste',
      },
    ],
  },
}

export default function RolePermissionsDrawer({
  role,
  open,
  onClose,
  onSave,
}: RolePermissionsDrawerProps) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load permissions when role changes
  useEffect(() => {
    if (!role || !open) {
      setPermissions([])
      return
    }

    const fetchPermissions = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/admin/role-permissions?roleId=${role.id}`,
        )
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch permissions')
        }

        // Create permissions array with all pages
        const allPages = Object.values(PAGE_CATEGORIES).flatMap((category) =>
          category.pages.map((page) => page.path),
        )

        // Handle both array and object formats from API
        const permissionMap = new Map()
        if (Array.isArray(data.permissions)) {
          // Array format: [{page_path: "/path", can_access: true}, ...]
          data.permissions.forEach((p: Permission) => {
            permissionMap.set(p.page_path, p.can_access)
          })
        } else if (data.permissions && typeof data.permissions === 'object') {
          // Object format: {"/path": true, "/path2": false}
          Object.entries(data.permissions).forEach(([path, canAccess]) => {
            permissionMap.set(path, canAccess)
          })
        }

        const fullPermissions = allPages.map((path) => ({
          page_path: path,
          can_access: Boolean(permissionMap.get(path)),
        }))

        setPermissions(fullPermissions)
      } catch (err) {
        console.error('Error fetching permissions:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to fetch permissions',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [role, open])

  const handlePermissionChange = (pagePath: string, canAccess: boolean) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.page_path === pagePath ? { ...p, can_access: canAccess } : p,
      ),
    )
  }

  const handleSave = async () => {
    if (!role) return

    setSaving(true)
    setError(null)

    try {
      // Convert permissions array to object format expected by API
      const permissionsObject = permissions.reduce(
        (acc: Record<string, boolean>, permission) => {
          acc[permission.page_path] = permission.can_access
          return acc
        },
        {},
      )

      const response = await fetch('/api/admin/role-permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleId: role.id,
          permissions: permissionsObject,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save permissions')
      }

      onSave?.()
      onClose()
    } catch (err) {
      console.error('Error saving permissions:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to save permissions',
      )
    } finally {
      setSaving(false)
    }
  }

  const getPermission = (pagePath: string): boolean => {
    return (
      permissions.find((p) => p.page_path === pagePath)?.can_access || false
    )
  }

  // Count selected permissions
  const selectedCount = permissions.filter((p) => p.can_access).length
  const totalCount = permissions.length

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="!top-0 h-[98vh] max-h-[98vh] min-h-[98vh] overflow-y-auto">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Gerir Permissões do Papel</DrawerTitle>
          <DrawerDescription>
            Configure quais páginas o papel {role?.name} pode aceder
          </DrawerDescription>
        </DrawerHeader>

        <div className="relative space-y-6 p-6">
          {/* Close button */}
          <Button
            size="icon"
            variant="outline"
            onClick={onClose}
            className="absolute top-6 right-6 z-10"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-[var(--orange)]" />
              <div>
                <h2 className="text-2xl font-bold">Permissões do Papel</h2>
                <div className="text-muted-foreground">
                  Configure o acesso às páginas para o papel{' '}
                  <Badge variant="outline">{role?.name}</Badge>
                </div>
              </div>
            </div>

            {role?.description && (
              <p className="text-muted-foreground bg-muted/50 rounded-none border p-3 text-sm">
                {role.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {selectedCount} de {totalCount} páginas selecionadas
              </p>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPermissions((prev) =>
                            prev.map((p) => ({ ...p, can_access: true })),
                          )
                        }}
                      >
                        Selecionar Todas
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Dar acesso a todas as páginas
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPermissions((prev) =>
                            prev.map((p) => ({ ...p, can_access: false })),
                          )
                        }}
                      >
                        Limpar Todas
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Remover acesso a todas as páginas
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 border-destructive rounded-none border p-3">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(PAGE_CATEGORIES).map(
                ([categoryName, category]) => (
                  <div key={categoryName} className="space-y-3">
                    <h3 className="mb-3 text-lg font-semibold text-[var(--orange)]">
                      {categoryName} ({category.pages.length} páginas)
                    </h3>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {category.pages.map((page) => (
                        <div
                          key={page.path}
                          className="bg-muted/20 hover:bg-muted/40 flex items-start space-x-2 rounded p-2 transition-colors"
                        >
                          <Checkbox
                            id={`page-${page.path}`}
                            checked={getPermission(page.path)}
                            onCheckedChange={(checked) => {
                              const value =
                                checked === 'indeterminate' ? false : checked
                              handlePermissionChange(page.path, value)
                            }}
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <Label
                              htmlFor={`page-${page.path}`}
                              className="block cursor-pointer text-sm leading-tight font-medium"
                            >
                              {page.name}
                            </Label>
                            <p className="text-muted-foreground text-xs leading-tight">
                              {page.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 border-t pt-6">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />A guardar...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Permissões
                </>
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

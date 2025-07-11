'use client'

import Link from 'next/link'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar'
import { usePermissionsContext } from '@/providers/PermissionsProvider'

// Define menu items with their required permissions
const MENU_STRUCTURE = [
  {
    type: 'single' as const,
    label: 'Stocks',
    path: '/definicoes/stocks',
    requiredPath: '/definicoes/stocks',
  },
  {
    type: 'dropdown' as const,
    label: 'Orçamentos',
    items: [
      { label: 'View All', path: '/quotes', requiredPath: '/quotes' },
      { label: 'Create New', path: '/quotes/new', requiredPath: '/quotes' },
    ],
  },
  {
    type: 'dropdown' as const,
    label: 'Produção',
    items: [
      {
        label: 'Trabalhos em Aberto',
        path: '/producao',
        requiredPath: '/producao',
      },
      {
        label: 'Operações',
        path: '/producao/operacoes',
        requiredPath: '/producao/operacoes',
      },
    ],
  },
  {
    type: 'single' as const,
    label: 'Designer Flow',
    path: '/designer-flow',
    requiredPath: '/designer-flow',
  },
  {
    type: 'dropdown' as const,
    label: 'Colaboradores',
    items: [
      { label: 'Team', path: '/team', requiredPath: '/team' },
      { label: 'Roles', path: '/team/roles', requiredPath: '/team' },
    ],
  },
  {
    type: 'dropdown' as const,
    label: 'Definições',
    items: [
      {
        label: 'Armazéns',
        path: '/definicoes/armazens',
        requiredPath: '/definicoes/armazens',
      },
      {
        label: 'Clientes',
        path: '/definicoes/clientes',
        requiredPath: '/definicoes/clientes',
      },
      {
        label: 'Transportadoras',
        path: '/definicoes/transportadoras',
        requiredPath: '/definicoes/transportadoras',
      },
      {
        label: 'Fornecedores',
        path: '/definicoes/fornecedores',
        requiredPath: '/definicoes/fornecedores',
      },
      { label: 'separator', path: '', requiredPath: '' },
      {
        label: 'Máquinas',
        path: '/definicoes/maquinas',
        requiredPath: '/definicoes/maquinas',
      },
      {
        label: 'Materiais',
        path: '/definicoes/materiais',
        requiredPath: '/definicoes/materiais',
      },
      { label: 'separator', path: '', requiredPath: '' },
      {
        label: 'Complexidade',
        path: '/definicoes/complexidade',
        requiredPath: '/definicoes/complexidade',
      },
      {
        label: 'Feriados',
        path: '/definicoes/feriados',
        requiredPath: '/definicoes/feriados',
      },
      { label: 'separator', path: '', requiredPath: '' },
      {
        label: 'Utilizadores',
        path: '/definicoes/utilizadores',
        requiredPath: '/definicoes/utilizadores',
      },
    ],
  },
]

export default function MenubarDemo() {
  const { canAccessPage, loading, userProfile, permissions } =
    usePermissionsContext()

  // Debug navigation
  if (!loading && userProfile) {
    console.log('🔍 Navigation Debug:')
    console.log('- User Role:', userProfile.roles?.name)
    console.log('- User Permissions:', permissions?.length || 0, 'permissions')
    console.log('- Can access /producao:', canAccessPage('/producao'))
    console.log(
      '- Can access /producao/operacoes:',
      canAccessPage('/producao/operacoes'),
    )
    console.log('- Can access armazens:', canAccessPage('/definicoes/armazens'))
    console.log('- Can access clientes:', canAccessPage('/definicoes/clientes'))
    console.log(
      '- Can access utilizadores:',
      canAccessPage('/definicoes/utilizadores'),
    )
  }

  // Don't render menu while permissions are loading
  if (loading) {
    return (
      <Menubar className="border-none">
        <MenubarMenu>
          <MenubarTrigger className="whitespace-nowrap">
            Loading...
          </MenubarTrigger>
        </MenubarMenu>
      </Menubar>
    )
  }

  // Filter menu items based on permissions
  const filterMenuItems = (items: typeof MENU_STRUCTURE) => {
    return items.filter((menuItem) => {
      if (menuItem.type === 'single') {
        return canAccessPage(menuItem.requiredPath)
      } else if (menuItem.type === 'dropdown') {
        // Show dropdown if at least one item is accessible (excluding separators)
        const accessibleItems = menuItem.items.filter(
          (item) =>
            item.label !== 'separator' && canAccessPage(item.requiredPath),
        )
        return accessibleItems.length > 0
      }
      return false
    })
  }

  const visibleMenuItems = filterMenuItems(MENU_STRUCTURE)

  return (
    <Menubar className="border-none">
      {visibleMenuItems.map((menuItem, index) => {
        if (menuItem.type === 'single') {
          return (
            <MenubarMenu key={index}>
              <Link href={menuItem.path} className="flex w-full">
                <MenubarTrigger className="cursor-pointer whitespace-nowrap">
                  {menuItem.label}
                </MenubarTrigger>
              </Link>
            </MenubarMenu>
          )
        } else if (menuItem.type === 'dropdown') {
          // Filter dropdown items based on permissions
          const accessibleItems = menuItem.items.filter(
            (item) =>
              item.label === 'separator' || canAccessPage(item.requiredPath),
          )

          if (accessibleItems.length === 0) return null

          return (
            <MenubarMenu key={index}>
              <MenubarTrigger className="whitespace-nowrap">
                {menuItem.label}
              </MenubarTrigger>
              <MenubarContent>
                {accessibleItems.map((item, itemIndex) => {
                  if (item.label === 'separator') {
                    return <MenubarSeparator key={`sep-${itemIndex}`} />
                  }

                  return (
                    <MenubarItem key={itemIndex}>
                      <Link href={item.path} className="flex w-full">
                        {item.label}
                      </Link>
                    </MenubarItem>
                  )
                })}
              </MenubarContent>
            </MenubarMenu>
          )
        }

        return null
      })}
    </Menubar>
  )
}

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

export default function MenubarDemo() {
  return (
    <Menubar className="border-none">
      <MenubarMenu>
        <Link href="/definicoes/stocks" className="flex w-full">
          <MenubarTrigger className="cursor-pointer whitespace-nowrap">Stocks</MenubarTrigger>
        </Link>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="whitespace-nowrap">Orçamentos</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <Link href="/quotes" className="flex w-full">
              View All
            </Link>
          </MenubarItem>
          <MenubarItem>
            <Link href="/quotes/new" className="flex w-full">
              Create New
            </Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="whitespace-nowrap">Produção</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <Link href="/producao" className="flex w-full">
              Trabalhos em Aberto
            </Link>
          </MenubarItem>
          <MenubarItem>
            <Link href="/producao/operacoes" className="flex w-full">
              Operações
            </Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <Link href="/designer-flow">
          <MenubarTrigger className="cursor-pointer whitespace-nowrap">
            Designer Flow
          </MenubarTrigger>
        </Link>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="whitespace-nowrap">Colaboradores</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <Link href="/team" className="flex w-full">
              Team
            </Link>
          </MenubarItem>
          <MenubarItem>
            <Link href="/team/roles" className="flex w-full">
              Roles
            </Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="whitespace-nowrap">Definições</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <Link href="/definicoes/armazens" className="flex w-full">
              Armazéns
            </Link>
          </MenubarItem>
          <MenubarItem>
            <Link href="/definicoes/clientes" className="flex w-full">
              Clientes
            </Link>
          </MenubarItem>
          <MenubarItem>
            <Link href="/definicoes/transportadoras" className="flex w-full">
              Transportadoras
            </Link>
          </MenubarItem>
          <MenubarItem>
            <Link href="/definicoes/fornecedores" className="flex w-full">
              Fornecedores
            </Link>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            <Link href="/definicoes/maquinas" className="flex w-full">
              Máquinas
            </Link>
          </MenubarItem>
          <MenubarItem>
            <Link href="/definicoes/materiais" className="flex w-full">
              Materiais
            </Link>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            <Link href="/definicoes/complexidade" className="flex w-full">
              Complexidade
            </Link>
          </MenubarItem>
          <MenubarItem>
            <Link href="/definicoes/feriados" className="flex w-full">
              Feriados
            </Link>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            <Link href="/definicoes/utilizadores" className="flex w-full">
              Utilizadores
            </Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
} 
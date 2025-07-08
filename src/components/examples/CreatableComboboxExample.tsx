'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase'
import CreatableClienteCombobox, { ClienteOption } from '@/components/CreatableClienteCombobox'
import CreatableArmazemCombobox, { ArmazemOption } from '@/components/CreatableArmazemCombobox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export default function CreatableComboboxExample() {
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [armazens, setArmazens] = useState<ArmazemOption[]>([])
  const [selectedCliente, setSelectedCliente] = useState('')
  const [selectedArmazem, setSelectedArmazem] = useState('')
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient()

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch clientes
        const { data: clientesData, error: clientesError } = await supabase
          .from('clientes')
          .select('id, nome_cl')
          .order('nome_cl', { ascending: true })

        if (!clientesError && clientesData) {
          const clienteOptions: ClienteOption[] = clientesData.map(cliente => ({
            value: cliente.id,
            label: cliente.nome_cl
          }))
          setClientes(clienteOptions)
        }

        // Fetch armazens
        const { data: armazensData, error: armazensError } = await supabase
          .from('armazens')
          .select('id, nome_arm, morada, codigo_pos')
          .order('nome_arm', { ascending: true })

        if (!armazensError && armazensData) {
          const armazemOptions: ArmazemOption[] = armazensData.map(armazem => ({
            value: armazem.id,
            label: armazem.nome_arm,
            morada: armazem.morada,
            codigo_pos: armazem.codigo_pos
          }))
          setArmazens(armazemOptions)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Creatable Comboboxes Example</CardTitle>
          <CardDescription>
            Demonstração dos novos comboboxes que permitem criar clientes e armazens diretamente da interface.
            Quando digitar um nome que não existe, aparecerá uma opção "Criar..." para adicionar o novo item.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Cliente Combobox */}
          <div className="space-y-2">
            <Label>Cliente (com opção de criar novo)</Label>
            <CreatableClienteCombobox
              value={selectedCliente}
              onChange={setSelectedCliente}
              options={clientes}
              onOptionsUpdate={setClientes}
              loading={loading}
              placeholder="Selecione ou crie um cliente"
              className="w-full max-w-xs"
            />
            {selectedCliente && (
              <p className="text-sm text-muted-foreground">
                Cliente selecionado: {clientes.find(c => c.value === selectedCliente)?.label || selectedCliente}
              </p>
            )}
          </div>

          {/* Armazem Combobox */}
          <div className="space-y-2">
            <Label>Armazém (com opção de criar novo)</Label>
            <CreatableArmazemCombobox
              value={selectedArmazem}
              onChange={setSelectedArmazem}
              options={armazens}
              onOptionsUpdate={setArmazens}
              loading={loading}
              placeholder="Selecione ou crie um armazém"
              className="w-full max-w-xs"
            />
            {selectedArmazem && (
              <p className="text-sm text-muted-foreground">
                Armazém selecionado: {armazens.find(a => a.value === selectedArmazem)?.label || selectedArmazem}
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Como usar:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Digite o nome de um cliente ou armazém existente para filtrar</li>
              <li>• Se digitar um nome que não existe, aparecerá a opção "Criar..."</li>
              <li>• Clique na opção "Criar..." para adicionar o novo item automaticamente</li>
              <li>• O novo item será criado na base de dados e selecionado automaticamente</li>
              <li>• A lista será atualizada com o novo item para uso futuro</li>
            </ul>
          </div>

          {/* Current Selections Display */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Seleções Atuais:</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Cliente:</strong> {selectedCliente ? clientes.find(c => c.value === selectedCliente)?.label || 'Desconhecido' : 'Nenhum selecionado'}</p>
              <p><strong>Armazém:</strong> {selectedArmazem ? armazens.find(a => a.value === selectedArmazem)?.label || 'Desconhecido' : 'Nenhum selecionado'}</p>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  )
} 
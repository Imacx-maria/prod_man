import { Label } from '@/components/ui/label'
import CreatableCombobox, { CreatableComboboxOption } from '@/components/ui/CreatableCombobox'
import { Loader2 } from 'lucide-react'
import React from 'react'
import { createBrowserClient } from '@/utils/supabase'

export interface ClienteOption {
  value: string
  label: string
}

interface CreatableClienteComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ClienteOption[]
  onOptionsUpdate?: (newOptions: ClienteOption[]) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  loading?: boolean
  error?: string | null
}

export const CreatableClienteCombobox: React.FC<CreatableClienteComboboxProps> = ({
  value,
  onChange,
  options,
  onOptionsUpdate,
  label,
  placeholder = 'Selecione um cliente',
  disabled = false,
  className = '',
  loading = false,
  error = null,
}) => {
  const supabase = createBrowserClient()

  const handleCreateNew = async (inputValue: string): Promise<CreatableComboboxOption | null> => {
    try {
      // Create new cliente in the database
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nome_cl: inputValue.trim(),
          numero_phc: null,
          morada: null,
          codigo_pos: null,
          telefone: null
        })
        .select('*')

      if (error) {
        console.error('Error creating cliente:', error)
        return null
      }

      if (!data || !data[0]) {
        return null
      }

      const newCliente = data[0]
      const newOption: CreatableComboboxOption = {
        value: newCliente.id,
        label: newCliente.nome_cl
      }

      // Update the options list if callback is provided
      if (onOptionsUpdate) {
        onOptionsUpdate([...options, newOption])
      }

      return newOption
    } catch (error) {
      console.error('Error creating new cliente:', error)
      return null
    }
  }

  return (
    <div className={className}>
      {label !== undefined && label !== null && label !== '' && (
        <Label className="mb-1 block">{label}</Label>
      )}
      <div className="relative w-full max-w-[160px]">
        <div className={
          (disabled || loading)
            ? 'opacity-60 pointer-events-none'
            : ''
        }>
          <CreatableCombobox
            value={value}
            onChange={onChange}
            onCreateNew={handleCreateNew}
            options={options}
            placeholder={placeholder}
            aria-label={label}
            disabled={disabled}
            loading={loading}
            error={error}
            buttonClassName="border-border"
            createMessage="Criar cliente"
            allowCreate={true}
          />
        </div>
      </div>
      {error && (
        <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export default CreatableClienteCombobox 
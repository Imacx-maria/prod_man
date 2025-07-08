import { Label } from '@/components/ui/label'
import CreatableCombobox, { CreatableComboboxOption } from '@/components/ui/CreatableCombobox'
import { Loader2 } from 'lucide-react'
import React from 'react'
import { createBrowserClient } from '@/utils/supabase'

export interface FornecedorOption {
  value: string
  label: string
}

interface CreatableFornecedorComboboxProps {
  value: string
  onChange: (value: string) => void
  options: FornecedorOption[]
  onOptionsUpdate?: (newOptions: FornecedorOption[]) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  loading?: boolean
  error?: string | null
}

export const CreatableFornecedorCombobox: React.FC<CreatableFornecedorComboboxProps> = ({
  value,
  onChange,
  options,
  onOptionsUpdate,
  label,
  placeholder = 'Fornecedor',
  disabled = false,
  className = '',
  loading = false,
  error = null,
}) => {
  const supabase = createBrowserClient()

  const handleCreateNew = async (inputValue: string): Promise<CreatableComboboxOption | null> => {
    try {
      // Create new fornecedor in the database
      const { data, error } = await supabase
        .from('fornecedores')
        .insert({
          nome_forn: inputValue.trim().toUpperCase(),
          numero_phc: null,
          morada: null,
          codigo_pos: null,
          telefone: null,
          email: null,
          contacto_principal: null
        })
        .select('*')

      if (error) {
        console.error('Error creating fornecedor:', error)
        return null
      }

      if (!data || !data[0]) {
        return null
      }

      const newFornecedor = data[0]
      const newOption: CreatableComboboxOption = {
        value: newFornecedor.id,
        label: newFornecedor.nome_forn
      }

      // Update the options list if callback is provided
      if (onOptionsUpdate) {
        onOptionsUpdate([...options, newOption])
      }

      return newOption
    } catch (error) {
      console.error('Error creating new fornecedor:', error)
      return null
    }
  }

  return (
    <div className={className}>
      {label !== undefined && label !== null && label !== '' && (
        <Label className="mb-1 block">{label}</Label>
      )}
      <div className="relative w-full">
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
            searchPlaceholder="Pesquisar..."
            aria-label={label}
            disabled={disabled}
            loading={loading}
            error={error}
            buttonClassName="border-border"
            createMessage="Criar fornecedor"
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

export default CreatableFornecedorCombobox 
import { Label } from '@/components/ui/label'
import CreatableCombobox, { CreatableComboboxOption } from '@/components/ui/CreatableCombobox'
import { Loader2 } from 'lucide-react'
import React from 'react'
import { createBrowserClient } from '@/utils/supabase'

export interface ArmazemOption {
  value: string
  label: string
  morada?: string | null
  codigo_pos?: string | null
}

interface CreatableArmazemComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ArmazemOption[]
  onOptionsUpdate?: (newOptions: ArmazemOption[]) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  loading?: boolean
  error?: string | null
}

export const CreatableArmazemCombobox: React.FC<CreatableArmazemComboboxProps> = ({
  value,
  onChange,
  options,
  onOptionsUpdate,
  label,
  placeholder = 'Selecione um armazém',
  disabled = false,
  className = '',
  loading = false,
  error = null,
}) => {
  const supabase = createBrowserClient()

  const handleCreateNew = async (inputValue: string): Promise<CreatableComboboxOption | null> => {
    try {
      // Create new armazem in the database
      const { data, error } = await supabase
        .from('armazens')
        .insert({
          nome_arm: inputValue.trim(),
          numero_phc: null,
          morada: null,
          codigo_pos: null
        })
        .select('*')

      if (error) {
        console.error('Error creating armazem:', error)
        return null
      }

      if (!data || !data[0]) {
        return null
      }

      const newArmazem = data[0]
      const newOption: CreatableComboboxOption = {
        value: newArmazem.id,
        label: newArmazem.nome_arm
      }

      // Update the options list if callback is provided
      if (onOptionsUpdate) {
        const newArmazemOption: ArmazemOption = {
          value: newArmazem.id,
          label: newArmazem.nome_arm,
          morada: newArmazem.morada,
          codigo_pos: newArmazem.codigo_pos
        }
        onOptionsUpdate([...options, newArmazemOption])
      }

      return newOption
    } catch (error) {
      console.error('Error creating new armazem:', error)
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
            createMessage="Criar armazém"
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

export default CreatableArmazemCombobox 
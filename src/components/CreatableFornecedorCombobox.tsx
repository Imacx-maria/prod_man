import { Label } from '@/components/ui/label'
import CreatableCombobox, {
  CreatableComboboxOption,
} from '@/components/ui/CreatableCombobox'
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

export const CreatableFornecedorCombobox: React.FC<
  CreatableFornecedorComboboxProps
> = ({
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

  const handleCreateNew = async (
    inputValue: string,
  ): Promise<CreatableComboboxOption | null> => {
    // For IVA Exceções, we don't create new fornecedores, only select from existing ones in listagem_compras
    return null
  }

  return (
    <div className={className}>
      {label !== undefined && label !== null && label !== '' && (
        <Label className="mb-1 block">{label}</Label>
      )}
      <div className="relative w-full">
        <div
          className={
            disabled || loading ? 'pointer-events-none opacity-60' : ''
          }
        >
          <CreatableCombobox
            value={value}
            onChange={onChange}
            onCreateNew={undefined}
            options={options}
            placeholder={placeholder}
            aria-label={label}
            disabled={disabled}
            loading={loading}
            error={error}
            buttonClassName="border-border"
            createMessage="Criar fornecedor"
            allowCreate={false}
          />
        </div>
      </div>
      {error && (
        <div className="mt-1 flex items-center gap-1 text-sm text-red-600">
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export default CreatableFornecedorCombobox

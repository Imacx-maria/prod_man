import { Label } from '@/components/ui/label'
import CreatableCombobox, { CreatableComboboxOption } from '@/components/ui/CreatableCombobox'
import React from 'react'

export interface MaterialOption {
  value: string
  label: string
}

interface CreatableMaterialComboboxProps {
  value: string
  onChange: (value: string) => void
  options: MaterialOption[]
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  loading?: boolean
  error?: string | null
}

const CreatableMaterialCombobox: React.FC<CreatableMaterialComboboxProps> = ({
  value,
  onChange,
  options,
  label,
  placeholder = 'Selecione ou crie',
  disabled = false,
  className = '',
  loading = false,
  error = null,
}) => {
  // No DB insert, just normalize and pass up
  const handleCreateNew = async (inputValue: string): Promise<CreatableComboboxOption | null> => {
    const normalized = inputValue.trim().toUpperCase()
    return { value: normalized, label: normalized }
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
            onChange={val => onChange(val.trim().toUpperCase())}
            onCreateNew={handleCreateNew}
            options={options}
            placeholder={placeholder}
            searchPlaceholder="Pesquisar..."
            aria-label={label}
            disabled={disabled}
            loading={loading}
            error={error}
            buttonClassName="border-border"
            createMessage="Criar novo"
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

export default CreatableMaterialCombobox 
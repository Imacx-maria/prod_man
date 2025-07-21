import { Label } from '@/components/ui/label'
import Combobox from '@/components/ui/Combobox'
import { Loader2 } from 'lucide-react'
import React from 'react'

export interface ClienteOption {
  value: string
  label: string
}

interface ClienteComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ClienteOption[]
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  loading?: boolean
  error?: string | null
}

export const ClienteCombobox: React.FC<ClienteComboboxProps> = ({
  value,
  onChange,
  options,
  label,
  placeholder = 'Cliente',
  disabled = false,
  className = '',
  loading = false,
  error = null,
}) => (
  <div className={className}>
    {label !== undefined && label !== null && label !== '' && (
      <Label className="mb-1 block">{label}</Label>
    )}
    <div className="relative w-full max-w-[160px]">
      <div
        className={disabled || loading ? 'pointer-events-none opacity-60' : ''}
      >
        <Combobox
          value={value}
          onChange={onChange}
          options={options}
          placeholder={placeholder}
          aria-label={label}
          disabled={disabled}
          loading={loading}
          error={error}
          buttonClassName="border-border"
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

export default ClienteCombobox

"use client"

import React, { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/tailwind'

export interface CheckboxColumnProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
  checkboxClassName?: string
  labelClassName?: string
  id?: string
  onHover?: () => void
  onLeave?: () => void
}

const CheckboxColumn: React.FC<CheckboxColumnProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  checkboxClassName = '',
  labelClassName = '',
  id,
  onHover,
  onLeave,
}) => {
  const [checkboxId] = useState(() => id || `checkbox-${Math.random().toString(36).substring(2, 9)}`)

  // Handle keyboard interactions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onChange(!checked)
    }
  }
  
  return (
    <div 
      className={cn(
        'flex items-center justify-center gap-2 p-0.5 min-w-[30px]',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className
      )}
      onClick={() => {
        if (!disabled) {
          onChange(!checked)
        }
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
    >
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={cn('cursor-pointer', checkboxClassName)}
        aria-labelledby={label ? `${checkboxId}-label` : undefined}
      />
      {label && (
        <Label 
          htmlFor={checkboxId}
          id={`${checkboxId}-label`}
          className={cn(
            'cursor-pointer select-none text-sm',
            labelClassName
          )}
        >
          {label}
        </Label>
      )}
    </div>
  )
}

export default CheckboxColumn 
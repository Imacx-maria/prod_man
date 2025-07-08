"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FileText, FilePlus, Check, CalendarIcon, TriangleAlertIcon, CircleAlertIcon, BellRingIcon, MessageCircleIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import DatePicker from '@/components/ui/DatePicker'
import { parseDateFromYYYYMMDD, formatDateToYYYYMMDD } from '@/utils/date'
import { format } from 'date-fns'
import { Portal } from '@radix-ui/react-popover'

export interface NotasPopoverProps {
  value: string;
  onChange: (val: string) => void;
  onSave: (fields: {
    outras: string;
    contacto: string;
    telefone: string;
    contacto_entrega: string;
    telefone_entrega: string;
    data?: string | null;
  }) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  iconType?: 'warning' | 'error' | 'info' | 'notification' | 'file' | 'auto';
  label?: string;
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  maxTextareaHeight?: string;
  saveOnBlur?: boolean;
  contacto?: string;
  telefone?: string;
  contacto_entrega?: string;
  telefone_entrega?: string;
  data?: string | null;
  onFieldChange?: (fields: {
    outras: string;
    contacto: string;
    telefone: string;
    contacto_entrega: string;
    telefone_entrega: string;
    data?: string | null;
  }) => void;
  popoverContainer?: HTMLElement | null;
  modal?: boolean;
  /**
   * If true, the popover content is rendered centered in the viewport using a Portal.
   * Useful for usage inside Drawers or modals to avoid clipping/freeze issues.
   */
  centered?: boolean;
}

const NotasPopover: React.FC<NotasPopoverProps> = ({
  value,
  onChange,
  onSave,
  placeholder = 'Adicionar outras...',
  disabled = false,
  className = '',
  iconType = 'auto',
  label,
  buttonSize = 'icon',
  maxTextareaHeight = '200px',
  saveOnBlur = false,
  contacto = '',
  telefone = '',
  contacto_entrega = '',
  telefone_entrega = '',
  data = null,
  onFieldChange,
  popoverContainer,
  modal = true,
  centered = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [localNovaData, setLocalNovaData] = useState<Date | null>(data ? parseDateFromYYYYMMDD(data) : null)
  const [localOutras, setLocalOutras] = useState(value)
  const [localContacto, setLocalContacto] = useState(contacto)
  const [localTelefone, setLocalTelefone] = useState(telefone)
  const [localContactoEntrega, setLocalContactoEntrega] = useState(contacto_entrega)
  const [localTelefoneEntrega, setLocalTelefoneEntrega] = useState(telefone_entrega)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [originalFields, setOriginalFields] = useState({
    data: data ?? null,
    outras: value,
    contacto,
    telefone,
    contacto_entrega,
    telefone_entrega,
  })
  
  // Generate unique IDs for accessibility
  const popoverDescriptionId = React.useId()
  const labelId = React.useId()
  
  // Only sync local state when popover is opened
  useEffect(() => {
    if (isOpen) {
      setLocalNovaData(data ? parseDateFromYYYYMMDD(data) : null)
      setLocalOutras(value)
      setLocalContacto(contacto)
      setLocalTelefone(telefone)
      setLocalContactoEntrega(contacto_entrega)
      setLocalTelefoneEntrega(telefone_entrega)
      setOriginalFields({
        data: data ?? null,
        outras: value,
        contacto,
        telefone,
        contacto_entrega,
        telefone_entrega,
      })
      setSaveSuccess(false)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
        }
      }, 50)
    }
  }, [isOpen])

  const handleSave = async () => {
    if (disabled || isSaving) return
    try {
      setIsSaving(true)
      const fields = {
        data: formatDateToYYYYMMDD(localNovaData),
        outras: localOutras,
        contacto: localContacto,
        telefone: localTelefone,
        contacto_entrega: localContactoEntrega,
        telefone_entrega: localTelefoneEntrega,
      }
      // Only save if any value has changed
      const changed = Object.keys(fields).some(
        key => fields[key as keyof typeof fields] !==
          (key === 'data'
            ? formatDateToYYYYMMDD(originalFields.data ? parseDateFromYYYYMMDD(originalFields.data) : null)
            : originalFields[key as keyof typeof fields])
      )
      if (changed) {
        await onSave(fields)
      }
      setSaveSuccess(true)
      setTimeout(() => {
        setIsOpen(false)
        setTimeout(() => setSaveSuccess(false), 300)
      }, 1500)
    } catch (err) {
      console.error('[NotasPopover] Error during save:', err)
      alert('Erro ao guardar outras')
    } finally {
      setIsSaving(false)
    }
  }

  // Save on blur if enabled
  const handleBlur = () => {
    const fields = {
      data: formatDateToYYYYMMDD(localNovaData),
      outras: localOutras,
      contacto: localContacto,
      telefone: localTelefone,
      contacto_entrega: localContactoEntrega,
      telefone_entrega: localTelefoneEntrega,
    }
    const changed = Object.keys(fields).some(
      key => fields[key as keyof typeof fields] !==
        (key === 'data'
          ? formatDateToYYYYMMDD(originalFields.data ? parseDateFromYYYYMMDD(originalFields.data) : null)
          : originalFields[key as keyof typeof fields])
    )
    if (saveOnBlur && changed && !isSaving) {
      handleSave()
    }
  }

  // Handle field changes
  const handleFieldChange = (field: keyof typeof originalFields, value: string | Date | null | undefined) => {
    let dataValue: string | null | undefined = formatDateToYYYYMMDD(localNovaData);
    if (field === 'data') {
      if (value instanceof Date) dataValue = formatDateToYYYYMMDD(value);
      else if (typeof value === 'string') dataValue = value;
      else dataValue = null;
    }
    const newFields = {
      data: dataValue,
      outras: field === 'outras' ? value as string : localOutras,
      contacto: field === 'contacto' ? value as string : localContacto,
      telefone: field === 'telefone' ? value as string : localTelefone,
      contacto_entrega: field === 'contacto_entrega' ? value as string : localContactoEntrega,
      telefone_entrega: field === 'telefone_entrega' ? value as string : localTelefoneEntrega,
    }
    if (field === 'data') setLocalNovaData(value instanceof Date ? value : null)
    setLocalOutras(newFields.outras)
    setLocalContacto(newFields.contacto)
    setLocalTelefone(newFields.telefone)
    setLocalContactoEntrega(newFields.contacto_entrega)
    setLocalTelefoneEntrega(newFields.telefone_entrega)
    if (onFieldChange) onFieldChange(newFields)
    if (field === 'outras') onChange(value as string)
  }

  // Choose icon based on type and content
  const getIcon = () => {
    // If auto and has content, show content icon
    if (iconType === 'auto') {
      if (value?.trim()) return <MessageCircleIcon className="h-4 w-4" />
      return <MessageCircleIcon className="h-4 w-4 opacity-50" />
    }
    // Otherwise show specified icon
    switch (iconType) {
      case 'warning':
        return <TriangleAlertIcon className="h-4 w-4" />
      case 'error':
        return <CircleAlertIcon className="h-4 w-4" />
      case 'notification':
        return <BellRingIcon className="h-4 w-4" />
      case 'file':
        return <FileText className="h-4 w-4" />
      default:
        return <MessageCircleIcon className="h-4 w-4" />
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    
    // Close on Escape, but only if not handled by Popover already
    if (e.key === 'Escape') {
      if (localOutras !== originalFields.outras) {
        // Revert changes if Escape is pressed
        setLocalOutras(originalFields.outras)
        setLocalContacto(originalFields.contacto)
        setLocalTelefone(originalFields.telefone)
        setLocalContactoEntrega(originalFields.contacto_entrega)
        setLocalTelefoneEntrega(originalFields.telefone_entrega)
      }
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant={value && value.trim() !== "" ? "link" : "ghost"}
          size={buttonSize}
          className={className}
          aria-label={label || (value ? 'Ver ou editar outras existentes' : 'Adicionar outras')}
          disabled={disabled}
        >
          {getIcon()}
          <span className="sr-only">{label}</span>
        </Button>
      </PopoverTrigger>
      {centered ? (
        <Portal>
          <PopoverContent
            side={undefined}
            align={undefined}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 p-4 bg-background border-2 border-border z-[9999] max-h-[70vh] overflow-auto shadow-2xl"
            aria-describedby={popoverDescriptionId}
            data-no-aria-hidden="true"
            onEscapeKeyDown={() => {
              setLocalNovaData(originalFields.data ? parseDateFromYYYYMMDD(originalFields.data) : null)
              setLocalOutras(originalFields.outras)
              setLocalContacto(originalFields.contacto)
              setLocalTelefone(originalFields.telefone)
              setLocalContactoEntrega(originalFields.contacto_entrega)
              setLocalTelefoneEntrega(originalFields.telefone_entrega)
            }}
          >
            <div id={popoverDescriptionId} className="sr-only">
              Editor de outras: {label || 'Editar e guardar outras'}
            </div>
            {label && (
              <div
                id={labelId}
                className="font-medium mb-2"
              >
                {label}
              </div>
            )}
            <div className="mb-6">
              <label className="block text-xs font-semibold mb-1">Data de Saída</label>
              <DatePicker
                selected={localNovaData ?? undefined}
                onSelect={date => handleFieldChange('data', date ?? null)}
                placeholder="Selecionar data"
                buttonClassName="w-auto"
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-semibold mb-1">Outras</label>
              <Textarea
                ref={textareaRef}
                value={localOutras}
                placeholder={placeholder}
                className={`min-h-[80px] max-h-[${maxTextareaHeight}]`}
                style={{ maxHeight: maxTextareaHeight }}
                onChange={e => handleFieldChange('outras', e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={disabled || isSaving}
                aria-label="Outras"
                aria-labelledby={label ? labelId : undefined}
              />
            </div>
            <div className="mb-2">
              <label className="block text-xs font-semibold mb-1">Contacto Recolha</label>
              <Input
                type="text"
                value={localContacto}
                onChange={e => handleFieldChange('contacto', e.target.value)}
                disabled={disabled || isSaving}
                placeholder="Nome do contacto de recolha"
              />
            </div>
            <div className="mb-2">
              <label className="block text-xs font-semibold mb-1">Telefone Recolha</label>
              <Input
                type="text"
                value={localTelefone}
                onChange={e => handleFieldChange('telefone', e.target.value)}
                disabled={disabled || isSaving}
                placeholder="Telefone de recolha"
              />
            </div>
            <div className="mb-2">
              <label className="block text-xs font-semibold mb-1">Contacto Entrega</label>
              <Input
                type="text"
                value={localContactoEntrega}
                onChange={e => handleFieldChange('contacto_entrega', e.target.value)}
                disabled={disabled || isSaving}
                placeholder="Nome do contacto de entrega"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1">Telefone Entrega</label>
              <Input
                type="text"
                value={localTelefoneEntrega}
                onChange={e => handleFieldChange('telefone_entrega', e.target.value)}
                disabled={disabled || isSaving}
                placeholder="Telefone de entrega"
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-muted-foreground">
                {isSaving
                  ? 'A guardar...'
                  : saveOnBlur
                    ? 'Guarda automaticamente ao sair'
                    : ''}
              </div>
              <Button
                variant={saveSuccess ? "outline" : "default"}
                size="sm"
                onClick={handleSave}
                disabled={disabled || isSaving}
                className="relative"
                aria-label="Guardar outras"
              >
                {saveSuccess ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Guardado
                  </>
                ) : isSaving ? (
                  'A guardar...'
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          </PopoverContent>
        </Portal>
      ) : (
        <PopoverContent 
          side="top"
          align="center"
          className="w-96 p-4 bg-background border-2 border-border z-[9999] max-h-[70vh] overflow-auto"
          aria-describedby={popoverDescriptionId}
          data-no-aria-hidden="true"
          onEscapeKeyDown={() => {
            setLocalNovaData(originalFields.data ? parseDateFromYYYYMMDD(originalFields.data) : null)
            setLocalOutras(originalFields.outras)
            setLocalContacto(originalFields.contacto)
            setLocalTelefone(originalFields.telefone)
            setLocalContactoEntrega(originalFields.contacto_entrega)
            setLocalTelefoneEntrega(originalFields.telefone_entrega)
          }}
        >
          <div id={popoverDescriptionId} className="sr-only">
            Editor de outras: {label || 'Editar e guardar outras'}
          </div>
          {label && (
            <div
              id={labelId}
              className="font-medium mb-2"
            >
              {label}
            </div>
          )}
          <div className="mb-6">
            <label className="block text-xs font-semibold mb-1">Data de Saída</label>
            <DatePicker
              selected={localNovaData ?? undefined}
              onSelect={date => handleFieldChange('data', date ?? null)}
              placeholder="Selecionar data"
              buttonClassName="w-auto"
            />
          </div>
          <div className="mb-6">
            <label className="block text-xs font-semibold mb-1">Outras</label>
            <Textarea
              ref={textareaRef}
              value={localOutras}
              placeholder={placeholder}
              className={`min-h-[80px] max-h-[${maxTextareaHeight}]`}
              style={{ maxHeight: maxTextareaHeight }}
              onChange={e => handleFieldChange('outras', e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              disabled={disabled || isSaving}
              aria-label="Outras"
              aria-labelledby={label ? labelId : undefined}
            />
          </div>
          <div className="mb-2">
            <label className="block text-xs font-semibold mb-1">Contacto Recolha</label>
            <Input
              type="text"
              value={localContacto}
              onChange={e => handleFieldChange('contacto', e.target.value)}
              disabled={disabled || isSaving}
              placeholder="Nome do contacto de recolha"
            />
          </div>
          <div className="mb-2">
            <label className="block text-xs font-semibold mb-1">Telefone Recolha</label>
            <Input
              type="text"
              value={localTelefone}
              onChange={e => handleFieldChange('telefone', e.target.value)}
              disabled={disabled || isSaving}
              placeholder="Telefone de recolha"
            />
          </div>
          <div className="mb-2">
            <label className="block text-xs font-semibold mb-1">Contacto Entrega</label>
            <Input
              type="text"
              value={localContactoEntrega}
              onChange={e => handleFieldChange('contacto_entrega', e.target.value)}
              disabled={disabled || isSaving}
              placeholder="Nome do contacto de entrega"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1">Telefone Entrega</label>
            <Input
              type="text"
              value={localTelefoneEntrega}
              onChange={e => handleFieldChange('telefone_entrega', e.target.value)}
              disabled={disabled || isSaving}
              placeholder="Telefone de entrega"
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-muted-foreground">
              {isSaving
                ? 'A guardar...'
                : saveOnBlur
                  ? 'Guarda automaticamente ao sair'
                  : ''}
            </div>
            <Button
              variant={saveSuccess ? "outline" : "default"}
              size="sm"
              onClick={handleSave}
              disabled={disabled || isSaving}
              className="relative"
              aria-label="Guardar outras"
            >
              {saveSuccess ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Guardado
                </>
              ) : isSaving ? (
                'A guardar...'
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  )
}

export default NotasPopover 
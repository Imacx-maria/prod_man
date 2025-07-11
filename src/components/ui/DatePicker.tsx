import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/utils/tailwind'
import { setupAriaHiddenObserver } from '@/utils/accessibility'

export interface DatePickerProps {
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  holidays?: { holiday_date: string }[]
  placeholder?: string
  clearable?: boolean
  onClear?: () => void
  buttonClassName?: string
  disabled?: boolean
  // ...other props for Calendar
  [key: string]: any
}

export const DatePicker: React.FC<DatePickerProps> = ({
  selected,
  onSelect,
  holidays = [],
  placeholder = 'Data',
  clearable = false,
  onClear,
  buttonClassName = '',
  disabled = false,
  ...calendarProps
}) => {
  const descriptionId = React.useId()
  const calendarDescriptionId = React.useId()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [open, setOpen] = React.useState(false)

  // Set up observer to replace aria-hidden with inert when popover content appears
  React.useEffect(() => {
    const contentElement = contentRef.current
    if (!contentElement) return

    // Create an observer for the content
    const observer = setupAriaHiddenObserver(contentElement)

    return () => {
      observer?.disconnect()
    }
  }, [])

  // Handle date selection and close popover
  const handleDateSelect = (date: Date | undefined) => {
    onSelect(date)
    setOpen(false) // Close the popover after selecting a date
  }

  // Handle clear and close popover
  const handleClear = () => {
    if (onClear) {
      onClear()
    }
    setOpen(false) // Close the popover after clearing
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !selected && 'text-muted-foreground',
            buttonClassName,
          )}
          disabled={disabled}
          aria-describedby={descriptionId}
          data-no-aria-hidden="true"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, 'dd/MM/yyyy') : placeholder}
          <span id={descriptionId} className="sr-only">
            Clique para selecionar uma data
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        className="bg-background z-[10000] w-auto p-0"
        data-no-aria-hidden="true"
      >
        <div id={calendarDescriptionId} className="sr-only">
          Calendário para selecionar uma data
        </div>
        <div
          className="flex flex-col"
          role="dialog"
          aria-labelledby={calendarDescriptionId}
          data-no-aria-hidden="true"
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleDateSelect}
            holidays={holidays}
            initialFocus
            {...calendarProps}
          />
          {clearable && selected && (
            <Button
              variant="outline"
              className="mx-2 mt-2 mb-2"
              onClick={handleClear}
              data-no-aria-hidden="true"
            >
              Limpar data
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default DatePicker

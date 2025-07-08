import * as React from 'react'
import { cn } from '@/utils/tailwind'
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'

interface MessageBoxProps {
  message: string
  type?: 'info' | 'error' | 'success'
  className?: string
}

const typeStyles = {
  info: 'bg-secondary text-foreground border-border',
  error: 'bg-destructive text-destructive-foreground border-destructive',
  success: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
}

const typeIcons = {
  info: AlertCircle,
  error: XCircle,
  success: CheckCircle2,
}

export const MessageBox: React.FC<MessageBoxProps> = ({
  message,
  type = 'info',
  className = '',
}) => {
  const Icon = typeIcons[type] || AlertCircle
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-base border-2 shadow-shadow px-4 py-2 font-base',
        typeStyles[type],
        className
      )}
      data-slot="message-box"
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export default MessageBox 
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export function Input({ className, type = 'text', ...props }: InputProps): React.JSX.Element {
  return (
    <input
      className={cn(
        'flex h-8 w-full rounded-md border border-ot-border bg-transparent px-2 py-1 text-[11px] text-ot-foreground placeholder:text-ot-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ot-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ot-background',
        className
      )}
      type={type}
      {...props}
    />
  )
}

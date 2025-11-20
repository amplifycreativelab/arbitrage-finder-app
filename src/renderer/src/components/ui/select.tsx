import * as React from 'react'
import { cn } from '@renderer/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void
}

export function Select({
  className,
  onValueChange,
  children,
  ...props
}: SelectProps): React.JSX.Element {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    props.onChange?.(event)
    onValueChange?.(event.target.value)
  }

  return (
    <select
      className={cn(
        'flex h-8 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-ot-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ot-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ot-background',
        className
      )}
      onChange={handleChange}
      {...props}
    >
      {children}
    </select>
  )
}


import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export function Input({ className, type = 'text', ...props }: InputProps): React.JSX.Element {
  return (
    <input
      className={cn('ot-input', className)}
      type={type}
      {...props}
    />
  )
}

export default Input

import * as React from 'react';

import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'outline' | 'ghost';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = 'primary',
  size = 'default',
  ...props
}: ButtonProps): React.JSX.Element {
  const base =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'focus-visible:ring-ot-accent focus-visible:ring-offset-ot-background disabled:pointer-events-none disabled:opacity-50';

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-ot-accent text-ot-foreground hover:bg-ot-accent/90',
    outline:
      'border border-ot-accent text-ot-accent hover:bg-ot-accent/10 hover:text-ot-foreground',
    ghost: 'hover:bg-ot-accent/10 hover:text-ot-foreground text-ot-muted-foreground',
  };

  const sizes: Record<ButtonSize, string> = {
    default: 'px-4 py-2 text-sm',
    sm: 'px-3 py-1.5 text-xs',
    lg: 'px-6 py-3 text-base',
    icon: 'h-9 w-9',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      type={props.type ?? 'button'}
      {...props}
    />
  );
}

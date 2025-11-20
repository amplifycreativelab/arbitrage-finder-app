import * as React from 'react';

import { cn } from '@renderer/lib/utils';

export type ButtonVariant = 'primary' | 'outline';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonProps): React.JSX.Element {
  const base =
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'focus-visible:ring-ot-accent focus-visible:ring-offset-ot-background disabled:pointer-events-none disabled:opacity-50';

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-ot-accent text-ot-foreground hover:bg-ot-accent/90',
    outline:
      'border border-ot-accent text-ot-accent hover:bg-ot-accent/10 hover:text-ot-foreground',
  };

  return (
    <button
      className={cn(base, variants[variant], className)}
      type={props.type ?? 'button'}
      {...props}
    />
  );
}


import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const badgeVariants = cva(
    'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ot-accent focus:ring-offset-2',
    {
        variants: {
            variant: {
                default: 'border-transparent bg-ot-accent text-white',
                secondary: 'border-transparent bg-white/10 text-ot-foreground',
                outline: 'border-white/20 text-ot-foreground',
                accent: 'border-ot-accent bg-ot-accent/20 text-ot-accent'
            }
        },
        defaultVariants: {
            variant: 'default'
        }
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps): React.JSX.Element {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }

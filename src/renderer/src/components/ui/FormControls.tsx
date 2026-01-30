import * as React from 'react'
import { cn } from '../../lib/utils'

interface CollapsibleSectionProps {
    title: string
    description?: string
    defaultOpen?: boolean
    badge?: React.ReactNode
    children: React.ReactNode
    testId?: string
}

export function CollapsibleSection({
    title,
    description,
    defaultOpen = false,
    badge,
    children,
    testId
}: CollapsibleSectionProps): React.JSX.Element {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)

    return (
        <div
            className="rounded-lg border border-ot-border/60 bg-ot-surface/50"
            data-testid={testId}
        >
            <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn(
                            'h-3.5 w-3.5 text-ot-muted transition-transform duration-200',
                            isOpen && 'rotate-90'
                        )}
                    >
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-ot-foreground">{title}</span>
                            {badge}
                        </div>
                        {description && (
                            <span className="text-[9px] text-ot-muted">{description}</span>
                        )}
                    </div>
                </div>
            </button>
            {isOpen && (
                <div className="border-t border-ot-border/60 px-3 py-2.5">
                    {children}
                </div>
            )}
        </div>
    )
}

interface StatCardProps {
    label: string
    value: string | number
    subValue?: string
    trend?: 'up' | 'down' | 'neutral'
    className?: string
}

export function StatCard({
    label,
    value,
    subValue,
    trend,
    className
}: StatCardProps): React.JSX.Element {
    return (
        <div
            className={cn(
                'rounded-md border border-ot-border/60 bg-gradient-to-b from-ot-surface to-ot-background p-2',
                className
            )}
        >
            <div className="text-[9px] font-medium uppercase tracking-[0.1em] text-ot-muted">
                {label}
            </div>
            <div className="mt-0.5 flex items-center gap-1">
                <span className="text-[13px] font-bold text-ot-foreground">{value}</span>
                {trend && (
                    <span
                        className={cn(
                            'text-[10px]',
                            trend === 'up' && 'text-emerald-500',
                            trend === 'down' && 'text-red-500',
                            trend === 'neutral' && 'text-ot-muted'
                        )}
                    >
                        {trend === 'up' && '↑'}
                        {trend === 'down' && '↓'}
                        {trend === 'neutral' && '—'}
                    </span>
                )}
            </div>
            {subValue && (
                <div className="mt-0.5 text-[9px] text-ot-muted">{subValue}</div>
            )}
        </div>
    )
}

interface ToggleSwitchProps {
    checked: boolean
    onChange: (checked: boolean) => void
    label: string
    description?: string
    className?: string
    testId?: string
}

export function ToggleSwitch({
    checked,
    onChange,
    label,
    description,
    className,
    testId
}: ToggleSwitchProps): React.JSX.Element {
    return (
        <label
            className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-md border border-ot-border/60 p-2.5 transition-colors',
                checked ? 'bg-ot-accent/5 border-ot-accent/30' : 'bg-ot-surface/50',
                className
            )}
        >
            <div className="flex-1">
                <div className="text-[10px] font-semibold text-ot-foreground">{label}</div>
                {description && (
                    <div className="text-[9px] text-ot-muted">{description}</div>
                )}
            </div>
            <input
                type="checkbox"
                role="switch"
                aria-checked={checked}
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="sr-only"
                data-testid={testId}
            />
            <div
                className={cn(
                    'relative h-5 w-9 rounded-full transition-colors',
                    checked ? 'bg-ot-accent' : 'bg-ot-border'
                )}
            >
                <div
                    className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                        checked ? 'translate-x-4' : 'translate-x-0.5'
                    )}
                />
            </div>
        </label>
    )
}

interface NumberInputProps {
    label: string
    description?: string
    value: string
    onChange: (value: string) => void
    onCommit: () => void
    min?: number
    max?: number
    suffix?: string
    className?: string
    testId?: string
}

export function NumberInput({
    label,
    description,
    value,
    onChange,
    onCommit,
    min,
    max,
    suffix,
    className,
    testId
}: NumberInputProps): React.JSX.Element {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') {
            e.preventDefault()
            onCommit()
            e.currentTarget.blur()
        }
    }

    return (
        <div className={cn('flex items-center justify-between gap-2 rounded-md border border-ot-border/60 bg-ot-surface/50 p-2', className)}>
            <div className="flex-1">
                <div className="text-[10px] font-semibold text-ot-foreground">{label}</div>
                {description && (
                    <div className="text-[9px] text-ot-muted">{description}</div>
                )}
            </div>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onCommit}
                    onKeyDown={handleKeyDown}
                    className="h-7 w-16 rounded border border-ot-border bg-ot-background px-2 text-right text-[11px] font-medium text-ot-foreground focus:border-ot-accent focus:outline-none"
                    data-testid={testId}
                />
                {suffix && (
                    <span className="text-[10px] text-ot-muted">{suffix}</span>
                )}
            </div>
        </div>
    )
}

interface SelectInputProps<T extends string> {
    label: string
    description?: string
    value: T
    options: Array<{ value: T; label: string }>
    onChange: (value: T) => void
    className?: string
    testId?: string
}

export function SelectInput<T extends string>({
    label,
    description,
    value,
    options,
    onChange,
    className,
    testId
}: SelectInputProps<T>): React.JSX.Element {
    return (
        <div className={cn('flex items-center justify-between gap-2 rounded-md border border-ot-border/60 bg-ot-surface/50 p-2', className)}>
            <div className="flex-1">
                <div className="text-[10px] font-semibold text-ot-foreground">{label}</div>
                {description && (
                    <div className="text-[9px] text-ot-muted">{description}</div>
                )}
            </div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as T)}
                className="h-7 rounded border border-ot-border bg-ot-background px-2 text-[11px] font-medium text-ot-foreground focus:border-ot-accent focus:outline-none"
                data-testid={testId}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

export default CollapsibleSection

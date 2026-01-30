import * as React from 'react'
import { cn } from '../../lib/utils'

export interface FilterDropdownOption<T extends string> {
    value: T
    label: string
    description?: string
    icon?: React.ReactNode
}

export interface FilterDropdownProps<T extends string> {
    label: string
    options: FilterDropdownOption<T>[]
    value: T
    onChange: (value: T) => void
    className?: string
    triggerClassName?: string
    testId?: string
}

export function FilterDropdown<T extends string>({
    label,
    options,
    value,
    onChange,
    className,
    triggerClassName,
    testId
}: FilterDropdownProps<T>): React.JSX.Element {
    return (
        <div className={cn('flex flex-col gap-1', className)}>
            <label className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ot-muted">
                {label}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as T)}
                className={cn(
                    'h-8 rounded-md border border-ot-border bg-ot-surface px-2.5 text-[11px] font-medium text-ot-foreground',
                    'transition-all duration-150',
                    'hover:border-ot-accent/60 hover:bg-ot-accent/5',
                    'focus:border-ot-accent focus:outline-none focus:ring-1 focus:ring-ot-accent/30',
                    'cursor-pointer appearance-none',
                    'bg-[length:12px] bg-[right_8px_center] bg-no-repeat',
                    'pr-7',
                    triggerClassName
                )}
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`
                }}
                data-testid={testId}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

export interface MultiFilterChipGroupProps<T extends string> {
    label: string
    options: FilterDropdownOption<T>[]
    selected: T[]
    onToggle: (value: T) => void
    className?: string
    testIdPrefix?: string
}

export function MultiFilterChipGroup<T extends string>({
    label,
    options,
    selected,
    onToggle,
    className,
    testIdPrefix = 'filter-chip'
}: MultiFilterChipGroupProps<T>): React.JSX.Element {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <label className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ot-muted">
                {label}
            </label>
            <div className="flex flex-wrap gap-1">
                {options.map((option) => {
                    const isSelected = selected.includes(option.value)
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onToggle(option.value)}
                            className={cn(
                                'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium',
                                'transition-all duration-150',
                                isSelected
                                    ? 'border-ot-accent bg-ot-accent/10 text-ot-accent shadow-sm'
                                    : 'border-ot-border text-ot-muted hover:border-ot-accent/40 hover:bg-ot-accent/5 hover:text-ot-foreground'
                            )}
                            data-testid={`${testIdPrefix}-${option.value}`}
                            aria-pressed={isSelected}
                        >
                            {option.icon && <span className="opacity-70">{option.icon}</span>}
                            <span>{option.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default FilterDropdown

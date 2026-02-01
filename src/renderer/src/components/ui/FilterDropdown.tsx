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
        <div className={cn('flex flex-col gap-1.5', className)}>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ot-muted">
                {label}
            </label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value as T)}
                    className={cn(
                        'h-9 w-full appearance-none rounded-lg border border-ot-border bg-ot-surface pl-3 pr-9',
                        'text-xs font-medium text-ot-foreground',
                        'transition-all duration-150',
                        'hover:border-ot-accent/60 hover:bg-ot-accent-subtle/50',
                        'focus:border-ot-accent focus:outline-none focus:ring-2 focus:ring-ot-accent/20',
                        'cursor-pointer',
                        triggerClassName
                    )}
                    data-testid={testId}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {/* Custom dropdown icon */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="h-4 w-4 text-ot-muted"
                    >
                        <path d="m6 9 6 6 6-6"/>
                    </svg>
                </div>
            </div>
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
        <div className={cn('flex flex-col gap-2', className)}>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ot-muted">
                {label}
            </label>
            <div className="flex flex-wrap gap-1.5">
                {options.map((option) => {
                    const isSelected = selected.includes(option.value)
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onToggle(option.value)}
                            className={cn(
                                'ot-chip',
                                isSelected && 'ot-chip-active'
                            )}
                            data-testid={`${testIdPrefix}-${option.value}`}
                            aria-pressed={isSelected}
                        >
                            {option.icon && (
                                <span className={cn(
                                    'transition-opacity',
                                    isSelected ? 'opacity-100' : 'opacity-70'
                                )}>
                                    {option.icon}
                                </span>
                            )}
                            <span>{option.label}</span>
                            {isSelected && (
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="3" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    className="h-3 w-3 ml-0.5"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default FilterDropdown

import * as React from 'react'

import { cn } from '../../../lib/utils'

const STORAGE_KEY_PREFIX = 'arb-finder-settings-section-'

interface SettingsSectionProps {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  defaultExpanded?: boolean
  children: React.ReactNode
  className?: string
}

function loadExpandedState(id: string, defaultValue: boolean): boolean {
  if (typeof localStorage === 'undefined') return defaultValue
  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`)
  if (stored === null) return defaultValue
  return stored === 'true'
}

function saveExpandedState(id: string, expanded: boolean): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, String(expanded))
}

export function SettingsSection({
  id,
  title,
  description,
  icon,
  defaultExpanded = true,
  children,
  className
}: SettingsSectionProps): React.JSX.Element {
  const [isOpen, setIsOpen] = React.useState(() => loadExpandedState(id, defaultExpanded))

  const handleToggle = (): void => {
    const next = !isOpen
    setIsOpen(next)
    saveExpandedState(id, next)
  }

  return (
    <section
      className={cn(
        'rounded-lg border border-ot-border bg-ot-surface/50',
        className
      )}
      data-testid={`settings-section-${id}`}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-ot-surface/80"
        aria-expanded={isOpen}
        aria-controls={`settings-section-content-${id}`}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ot-accent/10 text-ot-accent">
              {icon}
            </span>
          )}
          <div>
            <h3 className="text-sm font-semibold text-ot-foreground">{title}</h3>
            {description && (
              <p className="mt-0.5 text-[11px] text-ot-muted">{description}</p>
            )}
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            'h-4 w-4 text-ot-muted transition-transform',
            isOpen && 'rotate-180'
          )}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={`settings-section-content-${id}`}
          className="border-t border-ot-border/60 p-4"
        >
          {children}
        </div>
      )}
    </section>
  )
}

export default SettingsSection

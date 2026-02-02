import * as React from 'react'
import { cn } from '../../lib/utils'

interface CollapsibleProps {
  children: React.ReactNode
  className?: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const CollapsibleContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

function useCollapsible() {
  const context = React.useContext(CollapsibleContext)
  if (!context) {
    throw new Error('Collapsible components must be used within a Collapsible')
  }
  return context
}

export function Collapsible({
  children,
  className,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange
}: CollapsibleProps): React.JSX.Element {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value)
      }
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange]
  )

  const value = React.useMemo(() => ({ open, setOpen }), [open, setOpen])

  return (
    <CollapsibleContext.Provider value={value}>
      <div className={className}>{children}</div>
    </CollapsibleContext.Provider>
  )
}

interface CollapsibleTriggerProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

export function CollapsibleTrigger({
  children,
  className,
  asChild = false
}: CollapsibleTriggerProps): React.JSX.Element {
  const { open, setOpen } = useCollapsible()

  const handleClick = React.useCallback(() => {
    setOpen(!open)
  }, [open, setOpen])

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as { className?: string; onClick?: () => void }
    return React.cloneElement(children, {
      onClick: handleClick,
      'aria-expanded': open,
      className: cn(childProps.className, className)
    } as React.HTMLAttributes<HTMLElement>)
  }

  return (
    <button type="button" onClick={handleClick} aria-expanded={open} className={className}>
      {children}
    </button>
  )
}

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

export function CollapsibleContent({
  children,
  className
}: CollapsibleContentProps): React.JSX.Element {
  const { open } = useCollapsible()

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-200 ease-out',
        open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
        className
      )}
    >
      {children}
    </div>
  )
}

// Chevron icon for collapsible triggers
export function CollapsibleChevron({ className }: { className?: string }): React.JSX.Element {
  const { open } = useCollapsible()

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180', className)}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InlineErrorProps {
    /** The error message to display */
    message: string
    /** Optional guidance text explaining how to fix the error */
    guidance?: string
    /** Optional callback when the error is dismissed */
    onDismiss?: () => void
    /** Additional CSS classes */
    className?: string
    /** Test ID for testing */
    testId?: string
}

/**
 * InlineError - Displays user errors inline near the relevant control.
 * Used for configuration errors, validation failures, and user input issues.
 * Styled according to the Orange Terminal theme.
 */
export function InlineError({
    message,
    guidance,
    onDismiss,
    className,
    testId = 'inline-error'
}: InlineErrorProps): React.JSX.Element {
    return (
        <div
            className={cn(
                'flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px]',
                className
            )}
            role="alert"
            data-testid={testId}
        >
            {/* Error icon */}
            <svg
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
            </svg>

            <div className="flex-1">
                <p className="font-medium text-red-300">{message}</p>
                {guidance && (
                    <p className="mt-0.5 text-[10px] text-red-200/80">{guidance}</p>
                )}
            </div>

            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    className="flex-shrink-0 text-red-300/70 hover:text-red-300"
                    aria-label="Dismiss error"
                    data-testid={`${testId}-dismiss`}
                >
                    <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    )
}

export default InlineError

import * as React from 'react'
import { cn } from '../../lib/utils'

export interface SystemErrorBarProps {
    /** Error message to display (defaults to generic message if not provided) */
    message?: string
    /** Correlation ID for log reference */
    correlationId?: string
    /** Retry action callback */
    onRetry?: () => void
    /** View logs action callback */
    onViewLogs?: () => void
    /** Dismiss callback */
    onDismiss?: () => void
    /** Additional CSS classes */
    className?: string
    /** Test ID for testing */
    testId?: string
}

/**
 * SystemErrorBar - Displays system-level errors at the top of the dashboard.
 * Used for unexpected failures, invariant violations, and uncaught exceptions.
 * Shows a generic message with retry and log reference options.
 */
export function SystemErrorBar({
    message = 'Something went wrong. The application encountered an unexpected error.',
    correlationId,
    onRetry,
    onViewLogs,
    onDismiss,
    className,
    testId = 'system-error-bar'
}: SystemErrorBarProps): React.JSX.Element {
    return (
        <div
            className={cn(
                'flex items-center gap-3 border-b border-ot-error/30 bg-ot-error-dim px-4 py-3 text-xs animate-slide-in',
                className
            )}
            role="alert"
            aria-live="polite"
            data-testid={testId}
        >
            {/* Error icon */}
            <div className="flex-shrink-0">
                <svg
                    className="h-5 w-5 text-ot-error"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </div>

            <div className="flex-1 min-w-0">
                <p className="font-semibold text-ot-foreground">{message}</p>
                {correlationId && (
                    <p className="mt-1 text-[10px] text-ot-muted font-mono">
                        Error ID: {correlationId}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                {onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className={cn(
                            'flex items-center gap-1.5 rounded-lg border border-ot-error/30',
                            'bg-ot-error-dim px-3 py-1.5 text-xs font-semibold text-ot-error',
                            'hover:bg-ot-error hover:text-white transition-all duration-150 active:scale-95'
                        )}
                        data-testid={`${testId}-retry`}
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry
                    </button>
                )}
                {onViewLogs && (
                    <button
                        type="button"
                        onClick={onViewLogs}
                        className={cn(
                            'flex items-center gap-1.5 rounded-lg border border-ot-border',
                            'px-3 py-1.5 text-xs font-medium text-ot-muted',
                            'hover:text-ot-foreground hover:bg-ot-surface-hover transition-all duration-150'
                        )}
                        data-testid={`${testId}-view-logs`}
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Logs
                    </button>
                )}
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="p-1.5 rounded-lg text-ot-muted hover:text-ot-foreground hover:bg-ot-surface-hover transition-colors"
                        aria-label="Dismiss error"
                        data-testid={`${testId}-dismiss`}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    )
}

export default SystemErrorBar

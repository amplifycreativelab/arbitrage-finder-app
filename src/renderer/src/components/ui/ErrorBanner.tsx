import * as React from 'react'
import { cn } from '../../lib/utils'
import type { ProviderStatus } from '../../../../../shared/types'

export interface ErrorBannerProps {
    /** Provider name or identifier */
    providerName: string
    /** Current provider status */
    status: ProviderStatus
    /** Human-readable error summary */
    errorSummary: string
    /** Last successful operation timestamp (formatted string) */
    lastSuccess?: string
    /** Primary action button text */
    actionText?: string
    /** Primary action callback */
    onAction?: () => void
    /** Dismiss callback */
    onDismiss?: () => void
    /** Additional CSS classes */
    className?: string
    /** Test ID for testing */
    testId?: string
}

function getStatusStyles(status: ProviderStatus): { container: string; icon: string; badge: string } {
    switch (status) {
        case 'QuotaLimited':
            return {
                container: 'border-ot-warning/30 bg-ot-warning-dim',
                icon: 'text-ot-warning',
                badge: 'border-ot-warning/30 text-ot-warning bg-ot-warning-dim'
            }
        case 'Degraded':
            return {
                container: 'border-amber-500/30 bg-amber-500/10',
                icon: 'text-amber-500',
                badge: 'border-amber-500/30 text-amber-500 bg-amber-500/10'
            }
        case 'ConfigMissing':
            return {
                container: 'border-ot-info/30 bg-ot-info-dim',
                icon: 'text-ot-info',
                badge: 'border-ot-info/30 text-ot-info bg-ot-info-dim'
            }
        case 'Down':
        default:
            return {
                container: 'border-ot-error/30 bg-ot-error-dim',
                icon: 'text-ot-error',
                badge: 'border-ot-error/30 text-ot-error bg-ot-error-dim'
            }
    }
}

function getStatusIcon(status: ProviderStatus): React.ReactNode {
    const iconClass = 'h-4 w-4 flex-shrink-0'

    switch (status) {
        case 'QuotaLimited':
            return (
                <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        case 'Degraded':
            return (
                <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            )
        case 'ConfigMissing':
            return (
                <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        case 'Down':
        default:
            return (
                <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
            )
    }
}

/**
 * ErrorBanner - Displays provider errors as non-blocking banners.
 * Used for HTTP 5xx, 429 rate-limited, timeout errors.
 * Shows provider name, error type, last success, and actionable CTA.
 */
export function ErrorBanner({
    providerName,
    status,
    errorSummary,
    lastSuccess,
    actionText,
    onAction,
    onDismiss,
    className,
    testId = 'error-banner'
}: ErrorBannerProps): React.JSX.Element {
    const styles = getStatusStyles(status)

    return (
        <div
            className={cn(
                'flex items-start gap-3 rounded-lg border px-4 py-3 text-xs animate-slide-in shadow-ot-sm',
                styles.container,
                className
            )}
            role="alert"
            data-testid={testId}
        >
            <div className={styles.icon}>
                {getStatusIcon(status)}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-ot-foreground">{providerName}</span>
                    <span className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        styles.badge
                    )}>
                        {status}
                    </span>
                </div>
                <p className="mt-1 text-xs text-ot-foreground-secondary">{errorSummary}</p>
                {lastSuccess && (
                    <p className="mt-1 text-[10px] text-ot-muted">Last success: {lastSuccess}</p>
                )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                {actionText && onAction && (
                    <button
                        type="button"
                        onClick={onAction}
                        className={cn(
                            'rounded-md border px-3 py-1 text-xs font-medium transition-all duration-150',
                            'hover:bg-ot-surface-hover active:scale-95',
                            styles.badge
                        )}
                        data-testid={`${testId}-action`}
                    >
                        {actionText}
                    </button>
                )}
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="p-1 rounded-md hover:bg-ot-surface-hover transition-colors opacity-70 hover:opacity-100"
                        aria-label="Dismiss"
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

export default ErrorBanner

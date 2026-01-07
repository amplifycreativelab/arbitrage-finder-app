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

function getStatusStyles(status: ProviderStatus): string {
    switch (status) {
        case 'QuotaLimited':
            return 'border-amber-500/40 bg-amber-500/10 text-amber-100'
        case 'Degraded':
            return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100'
        case 'ConfigMissing':
            return 'border-sky-500/40 bg-sky-500/10 text-sky-100'
        case 'Down':
        default:
            return 'border-red-500/40 bg-red-500/10 text-red-100'
    }
}

function getStatusIcon(status: ProviderStatus): React.ReactNode {
    const iconClass = 'h-4 w-4 flex-shrink-0'

    switch (status) {
        case 'QuotaLimited':
            return (
                <svg className={cn(iconClass, 'text-amber-400')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        case 'Degraded':
            return (
                <svg className={cn(iconClass, 'text-yellow-400')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            )
        case 'ConfigMissing':
            return (
                <svg className={cn(iconClass, 'text-sky-400')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        case 'Down':
        default:
            return (
                <svg className={cn(iconClass, 'text-red-400')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
    return (
        <div
            className={cn(
                'flex items-start gap-3 rounded-md border px-3 py-2 text-[11px]',
                getStatusStyles(status),
                className
            )}
            role="alert"
            data-testid={testId}
        >
            {getStatusIcon(status)}

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold">{providerName}</span>
                    <span className="rounded-full border border-current/30 px-1.5 py-0.5 text-[9px] uppercase">
                        {status}
                    </span>
                </div>
                <p className="mt-0.5 text-[10px] opacity-90">{errorSummary}</p>
                {lastSuccess && (
                    <p className="mt-0.5 text-[9px] opacity-70">Last success: {lastSuccess}</p>
                )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                {actionText && onAction && (
                    <button
                        type="button"
                        onClick={onAction}
                        className="rounded border border-current/30 px-2 py-0.5 text-[10px] font-medium hover:bg-white/10 transition-colors"
                        data-testid={`${testId}-action`}
                    >
                        {actionText}
                    </button>
                )}
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="opacity-70 hover:opacity-100"
                        aria-label="Dismiss"
                        data-testid={`${testId}-dismiss`}
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    )
}

export default ErrorBanner

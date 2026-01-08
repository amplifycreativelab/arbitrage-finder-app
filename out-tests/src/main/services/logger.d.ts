import type { ProviderId } from '../../../shared/types';
export type ErrorCategory = 'UserError' | 'ProviderError' | 'SystemError' | 'InfrastructureError';
export interface StructuredLogFields {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    context: string;
    operation: string;
    providerId?: ProviderId;
    correlationId?: string;
    durationMs?: number | null;
    errorCategory?: ErrorCategory | null;
    [key: string]: unknown;
}
export interface StructuredLoggerBackend {
    info(event: string, payload: StructuredLogFields): void;
    warn(event: string, payload: StructuredLogFields): void;
    error(event: string, payload: StructuredLogFields): void;
}
export interface SecretValue {
    __secret: true;
    value: unknown;
}
export declare function secret(value: unknown): SecretValue;
export interface StructuredLogBase {
    context: string;
    operation: string;
    providerId?: ProviderId;
    correlationId?: string;
    durationMs?: number | null;
    errorCategory?: ErrorCategory | null;
    [key: string]: unknown;
}
export declare function getStructuredLoggerBackend(): StructuredLoggerBackend;
export declare function setStructuredLoggerBackend(next: StructuredLoggerBackend): void;
export declare function createCorrelationId(): string;
export declare function logInfo(event: string, base: StructuredLogBase): void;
export declare function logWarn(event: string, base: StructuredLogBase): void;
export declare function logError(event: string, base: StructuredLogBase): void;
export declare function logHeartbeat(base: StructuredLogBase): void;

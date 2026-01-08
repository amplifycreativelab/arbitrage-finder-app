import type { ArbitrageOpportunity } from '../../../shared/types';
import { BaseArbitrageAdapter } from './base';
import type { ProviderRequestContext } from '../services/poller';
export interface OddsApiIoArbitrageBet {
    id: string;
    sport: string;
    event: {
        name: string;
        date: string;
        league: string;
    };
    legs: [
        {
            bookmaker: string;
            market: string;
            odds: number;
            outcome: string;
        },
        {
            bookmaker: string;
            market: string;
            odds: number;
            outcome: string;
        }
    ];
    roi: number;
}
export declare function normalizeOddsApiIoOpportunity(raw: OddsApiIoArbitrageBet, foundAt?: string): ArbitrageOpportunity;
export declare class OddsApiIoAdapter extends BaseArbitrageAdapter {
    readonly id: "odds-api-io" | "the-odds-api";
    protected fetchWithApiKey(apiKey: string, context?: ProviderRequestContext): Promise<ArbitrageOpportunity[]>;
}

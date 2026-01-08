import type { ArbitrageOpportunity } from '../../../shared/types';
import { BaseArbitrageAdapter } from './base';
import type { ProviderRequestContext } from '../services/poller';
export interface TheOddsApiMarket {
    id: string;
    sport: string;
    eventName: string;
    eventDate: string;
    league: string;
    market: string;
    homeBookmaker: string;
    homeOdds: number;
    awayBookmaker: string;
    awayOdds: number;
}
export declare function normalizeTheOddsApiMarket(raw: TheOddsApiMarket, foundAt?: string): ArbitrageOpportunity | null;
export declare class TheOddsApiAdapter extends BaseArbitrageAdapter {
    readonly id: "odds-api-io" | "the-odds-api";
    protected fetchWithApiKey(apiKey: string, context?: ProviderRequestContext): Promise<ArbitrageOpportunity[]>;
}

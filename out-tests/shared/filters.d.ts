import type { ArbitrageOpportunity } from './types';
export type RegionCode = 'AU' | 'UK' | 'IT' | 'RO';
export interface OpportunityFilters {
    sports?: string[];
    regions?: RegionCode[];
}
export type RegionResolver = (opportunity: ArbitrageOpportunity) => RegionCode | null | undefined;
export declare function filterOpportunitiesByRegionAndSport(opportunities: ArbitrageOpportunity[], filters: OpportunityFilters, resolveRegion?: RegionResolver): ArbitrageOpportunity[];

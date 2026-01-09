"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arbitrageOpportunityListSchema = exports.arbitrageOpportunitySchema = exports.allProvidersStatusResponseSchema = exports.providerStatusInfoSchema = exports.setProviderEnabledResponseSchema = exports.enabledProvidersResponseSchema = exports.setProviderEnabledInputSchema = exports.copySignalToClipboardInputSchema = exports.providerIdParamSchema = exports.setActiveProviderInputSchema = exports.activeProviderSchema = exports.getApiKeyInputSchema = exports.saveApiKeyInputSchema = exports.providerIdSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("./types");
exports.providerIdSchema = zod_1.z.enum(types_1.PROVIDER_IDS);
exports.saveApiKeyInputSchema = zod_1.z.object({
    providerId: exports.providerIdSchema,
    apiKey: zod_1.z.string().min(1)
});
exports.getApiKeyInputSchema = zod_1.z.object({
    providerId: exports.providerIdSchema
});
exports.activeProviderSchema = zod_1.z.object({
    providerId: exports.providerIdSchema
});
exports.setActiveProviderInputSchema = exports.activeProviderSchema;
exports.providerIdParamSchema = zod_1.z.object({
    providerId: exports.providerIdSchema
});
exports.copySignalToClipboardInputSchema = zod_1.z.object({
    text: zod_1.z.string().min(1)
});
// ============================================================
// Multi-provider schemas (Story 5.1)
// ============================================================
/**
 * Input schema for toggling a provider's enabled state.
 */
exports.setProviderEnabledInputSchema = zod_1.z.object({
    providerId: exports.providerIdSchema,
    enabled: zod_1.z.boolean()
});
/**
 * Response schema for getEnabledProviders.
 */
exports.enabledProvidersResponseSchema = zod_1.z.object({
    enabledProviders: zod_1.z.array(exports.providerIdSchema)
});
/**
 * Response schema for setProviderEnabled.
 */
exports.setProviderEnabledResponseSchema = zod_1.z.object({
    providerId: exports.providerIdSchema,
    enabled: zod_1.z.boolean()
});
/**
 * Provider status information for UI.
 */
exports.providerStatusInfoSchema = zod_1.z.object({
    providerId: exports.providerIdSchema,
    enabled: zod_1.z.boolean(),
    hasKey: zod_1.z.boolean()
});
exports.allProvidersStatusResponseSchema = zod_1.z.object({
    providers: zod_1.z.array(exports.providerStatusInfoSchema)
});
// ============================================================
// Arbitrage schemas
// ============================================================
const arbitrageLegSchema = zod_1.z.object({
    bookmaker: zod_1.z.string(),
    market: zod_1.z.string(),
    odds: zod_1.z.number().positive(),
    outcome: zod_1.z.string()
});
exports.arbitrageOpportunitySchema = zod_1.z
    .object({
    id: zod_1.z.string(),
    sport: zod_1.z.string(),
    event: zod_1.z.object({
        name: zod_1.z.string(),
        date: zod_1.z.string(),
        league: zod_1.z.string()
    }),
    legs: zod_1.z.tuple([arbitrageLegSchema, arbitrageLegSchema]),
    roi: zod_1.z.number().min(0),
    foundAt: zod_1.z.string(),
    providerId: exports.providerIdSchema.optional(), // Multi-provider source tracking (Story 5.1)
    mergedFrom: zod_1.z.array(exports.providerIdSchema).optional(), // All source providers after deduplication (Story 5.2)
    isCrossProvider: zod_1.z.boolean().optional() // Cross-provider arbitrage indicator (Story 5.4)
})
    .refine((value) => value.legs[0].bookmaker !== value.legs[1].bookmaker, {
    message: 'legs must reference distinct bookmakers',
    path: ['legs']
});
exports.arbitrageOpportunityListSchema = zod_1.z.array(exports.arbitrageOpportunitySchema);

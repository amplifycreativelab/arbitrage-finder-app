"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arbitrageOpportunityListSchema = exports.arbitrageOpportunitySchema = exports.copySignalToClipboardInputSchema = exports.providerIdParamSchema = exports.setActiveProviderInputSchema = exports.activeProviderSchema = exports.getApiKeyInputSchema = exports.saveApiKeyInputSchema = exports.providerIdSchema = void 0;
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
    foundAt: zod_1.z.string()
})
    .refine((value) => value.legs[0].bookmaker !== value.legs[1].bookmaker, {
    message: 'legs must reference distinct bookmakers',
    path: ['legs']
});
exports.arbitrageOpportunityListSchema = zod_1.z.array(exports.arbitrageOpportunitySchema);

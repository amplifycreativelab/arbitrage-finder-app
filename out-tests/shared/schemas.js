"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerIdParamSchema = exports.setActiveProviderInputSchema = exports.activeProviderSchema = exports.getApiKeyInputSchema = exports.saveApiKeyInputSchema = exports.providerIdSchema = void 0;
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

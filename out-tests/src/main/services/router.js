"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRouter = void 0;
const server_1 = require("@trpc/server");
const storage_1 = require("./storage");
const schemas_1 = require("../../../shared/schemas");
const poller_1 = require("./poller");
const credentials_1 = require("../credentials");
const t = server_1.initTRPC.create();
exports.appRouter = t.router({
    saveApiKey: t.procedure
        .input(schemas_1.saveApiKeyInputSchema)
        .mutation(async ({ input }) => {
        await (0, credentials_1.saveApiKey)(input.providerId, input.apiKey);
        return { ok: true };
    }),
    isProviderConfigured: t.procedure
        .input(schemas_1.providerIdParamSchema)
        .query(async ({ input }) => {
        const configured = await (0, credentials_1.isProviderConfigured)(input.providerId);
        return { isConfigured: configured };
    }),
    getActiveProvider: t.procedure.query(async () => {
        const providerId = (0, storage_1.getActiveProviderId)();
        return { providerId };
    }),
    setActiveProvider: t.procedure
        .input(schemas_1.activeProviderSchema)
        .mutation(async ({ input }) => {
        const providerId = input.providerId;
        (0, storage_1.setActiveProviderId)(providerId);
        (0, poller_1.notifyActiveProviderChanged)(providerId);
        return { ok: true };
    }),
    getStorageStatus: t.procedure.query(async () => {
        return (0, credentials_1.getStorageStatus)();
    }),
    acknowledgeFallbackWarning: t.procedure.mutation(async () => {
        await (0, credentials_1.acknowledgeFallbackWarning)();
        return { ok: true };
    })
});

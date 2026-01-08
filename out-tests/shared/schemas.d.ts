import { z } from 'zod';
export declare const providerIdSchema: z.ZodEnum<{
    "odds-api-io": "odds-api-io";
    "the-odds-api": "the-odds-api";
}>;
export declare const saveApiKeyInputSchema: z.ZodObject<{
    providerId: z.ZodEnum<{
        "odds-api-io": "odds-api-io";
        "the-odds-api": "the-odds-api";
    }>;
    apiKey: z.ZodString;
}, z.core.$strip>;
export declare const getApiKeyInputSchema: z.ZodObject<{
    providerId: z.ZodEnum<{
        "odds-api-io": "odds-api-io";
        "the-odds-api": "the-odds-api";
    }>;
}, z.core.$strip>;
export declare const activeProviderSchema: z.ZodObject<{
    providerId: z.ZodEnum<{
        "odds-api-io": "odds-api-io";
        "the-odds-api": "the-odds-api";
    }>;
}, z.core.$strip>;
export declare const setActiveProviderInputSchema: z.ZodObject<{
    providerId: z.ZodEnum<{
        "odds-api-io": "odds-api-io";
        "the-odds-api": "the-odds-api";
    }>;
}, z.core.$strip>;
export declare const providerIdParamSchema: z.ZodObject<{
    providerId: z.ZodEnum<{
        "odds-api-io": "odds-api-io";
        "the-odds-api": "the-odds-api";
    }>;
}, z.core.$strip>;
export declare const copySignalToClipboardInputSchema: z.ZodObject<{
    text: z.ZodString;
}, z.core.$strip>;
/**
 * Input schema for toggling a provider's enabled state.
 */
export declare const setProviderEnabledInputSchema: z.ZodObject<{
    providerId: z.ZodEnum<{
        "odds-api-io": "odds-api-io";
        "the-odds-api": "the-odds-api";
    }>;
    enabled: z.ZodBoolean;
}, z.core.$strip>;
/**
 * Response schema for getEnabledProviders.
 */
export declare const enabledProvidersResponseSchema: z.ZodObject<{
    enabledProviders: z.ZodArray<z.ZodEnum<{
        "odds-api-io": "odds-api-io";
        "the-odds-api": "the-odds-api";
    }>>;
}, z.core.$strip>;
/**
 * Response schema for setProviderEnabled.
 */
export declare const setProviderEnabledResponseSchema: z.ZodObject<{
    providerId: z.ZodEnum<{
        "odds-api-io": "odds-api-io";
        "the-odds-api": "the-odds-api";
    }>;
    enabled: z.ZodBoolean;
}, z.core.$strip>;
/**
 * Provider status information for UI.
 */
export declare const providerStatusInfoSchema: z.ZodObject<{
    providerId: z.ZodEnum<{
        "odds-api-io": "odds-api-io";
        "the-odds-api": "the-odds-api";
    }>;
    enabled: z.ZodBoolean;
    hasKey: z.ZodBoolean;
}, z.core.$strip>;
export declare const allProvidersStatusResponseSchema: z.ZodObject<{
    providers: z.ZodArray<z.ZodObject<{
        providerId: z.ZodEnum<{
            "odds-api-io": "odds-api-io";
            "the-odds-api": "the-odds-api";
        }>;
        enabled: z.ZodBoolean;
        hasKey: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const arbitrageOpportunitySchema: z.ZodObject<{
    id: z.ZodString;
    sport: z.ZodString;
    event: z.ZodObject<{
        name: z.ZodString;
        date: z.ZodString;
        league: z.ZodString;
    }, z.core.$strip>;
    legs: z.ZodTuple<[z.ZodObject<{
        bookmaker: z.ZodString;
        market: z.ZodString;
        odds: z.ZodNumber;
        outcome: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        bookmaker: z.ZodString;
        market: z.ZodString;
        odds: z.ZodNumber;
        outcome: z.ZodString;
    }, z.core.$strip>], null>;
    roi: z.ZodNumber;
    foundAt: z.ZodString;
    providerId: z.ZodOptional<z.ZodEnum<{
        "odds-api-io": "odds-api-io";
        "the-odds-api": "the-odds-api";
    }>>;
    mergedFrom: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "odds-api-io": "odds-api-io";
        "the-odds-api": "the-odds-api";
    }>>>;
}, z.core.$strip>;
export declare const arbitrageOpportunityListSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    sport: z.ZodString;
    event: z.ZodObject<{
        name: z.ZodString;
        date: z.ZodString;
        league: z.ZodString;
    }, z.core.$strip>;
    legs: z.ZodTuple<[z.ZodObject<{
        bookmaker: z.ZodString;
        market: z.ZodString;
        odds: z.ZodNumber;
        outcome: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        bookmaker: z.ZodString;
        market: z.ZodString;
        odds: z.ZodNumber;
        outcome: z.ZodString;
    }, z.core.$strip>], null>;
    roi: z.ZodNumber;
    foundAt: z.ZodString;
    providerId: z.ZodOptional<z.ZodEnum<{
        "odds-api-io": "odds-api-io";
        "the-odds-api": "the-odds-api";
    }>>;
    mergedFrom: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "odds-api-io": "odds-api-io";
        "the-odds-api": "the-odds-api";
    }>>>;
}, z.core.$strip>>;

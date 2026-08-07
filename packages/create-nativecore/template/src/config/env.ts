/**
 * Client environment — browser-safe values only.
 *
 * Source of truth:
 *   1. globalThis.__NC_PUBLIC_ENV__ (injected into index.html from .env)
 *   2. Built-in defaults (local mock API when no .env is present)
 *
 * Server-only secrets never appear here. Use NC_PUBLIC_* or the allowlisted
 * keys documented in .env.example.
 */

type PublicEnvBag = Record<string, string>;

declare global {
    // eslint-disable-next-line no-var
    var __NC_PUBLIC_ENV__: PublicEnvBag | undefined;
}

const defaults: PublicEnvBag = {
    API_BASE_URL: '/api',
    API_TIMEOUT: '30000',
    APP_NAME: 'App',
    APP_VERSION: '0.0.0',
    FEATURE_ANALYTICS: 'false',
    FEATURE_DARK_MODE: 'false',
    FEATURE_DEBUG_MODE: 'false',
};

function readRaw(): PublicEnvBag {
    const runtime =
        typeof globalThis !== 'undefined' && globalThis.__NC_PUBLIC_ENV__
            ? globalThis.__NC_PUBLIC_ENV__
            : {};
    return { ...defaults, ...runtime };
}

function asBool(value: string | undefined, fallback = false): boolean {
    if (value == null || value === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const raw = readRaw();

export const env = Object.freeze({
    /** Backend API prefix. Relative `/api` uses the NativeCore mock server. */
    apiBaseUrl: raw.API_BASE_URL || defaults.API_BASE_URL,
    apiTimeout: Number(raw.API_TIMEOUT || defaults.API_TIMEOUT) || 30000,
    appName: raw.APP_NAME || defaults.APP_NAME,
    appVersion: raw.APP_VERSION || defaults.APP_VERSION,
    features: Object.freeze({
        analytics: asBool(raw.FEATURE_ANALYTICS),
        darkMode: asBool(raw.FEATURE_DARK_MODE),
        debugMode: asBool(raw.FEATURE_DEBUG_MODE),
    }),
    /** Merged raw public map (defaults + injected). */
    raw,
    get(key: string, fallback = ''): string {
        return raw[key] ?? fallback;
    },
});

export type AppEnv = typeof env;

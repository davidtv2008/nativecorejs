/**
 * Public (browser-safe) environment helpers.
 *
 * Exposed to the client:
 *   - NC_PUBLIC_* keys (prefix stripped, e.g. NC_PUBLIC_API_BASE_URL → API_BASE_URL)
 *   - Allowlisted keys from .env.example (API_BASE_URL, APP_NAME, FEATURE_*, …)
 *
 * Never expose secrets. Prefer NC_PUBLIC_ for anything you add later.
 */

const PUBLIC_PREFIX = 'NC_PUBLIC_';

/** Keys that may be copied to the browser without an NC_PUBLIC_ prefix. */
export const PUBLIC_ALLOWLIST = new Set([
    'API_BASE_URL',
    'API_TIMEOUT',
    'APP_NAME',
    'APP_VERSION',
]);

const HTML_MARKER_START = '/*@nc-public-env*/';
const HTML_MARKER_END = '/*@/nc-public-env*/';
const HTML_MARKER_PATTERN = /\/\*@nc-public-env\*\/[\s\S]*?\/\*@\/nc-public-env\*\//;

/**
 * @param {string} key
 * @returns {boolean}
 */
export function isPublicEnvKey(key) {
    if (!key || typeof key !== 'string') return false;
    if (key.startsWith(PUBLIC_PREFIX)) return true;
    if (key.startsWith('FEATURE_')) return true;
    return PUBLIC_ALLOWLIST.has(key);
}

/**
 * @param {string} key
 * @returns {string}
 */
export function toClientEnvKey(key) {
    return key.startsWith(PUBLIC_PREFIX) ? key.slice(PUBLIC_PREFIX.length) : key;
}

/**
 * Build the public env object from process.env (call loadEnv first).
 * @param {NodeJS.ProcessEnv} [source]
 * @returns {Record<string, string>}
 */
export function getPublicEnv(source = process.env) {
    /** @type {Record<string, string>} */
    const out = {};
    for (const [key, value] of Object.entries(source)) {
        if (value == null || !isPublicEnvKey(key)) continue;
        out[toClientEnvKey(key)] = String(value);
    }
    return out;
}

/**
 * JSON literal safe to embed in an inline <script>.
 * @param {Record<string, string>} env
 * @returns {string}
 */
export function formatPublicEnvLiteral(env) {
    return JSON.stringify(env).replace(/</g, '\\u003c');
}

/**
 * Inline assignment used in index.html.
 * @param {Record<string, string>} [env]
 * @returns {string}
 */
export function renderPublicEnvAssignment(env = getPublicEnv()) {
    return `globalThis.__NC_PUBLIC_ENV__=${HTML_MARKER_START}${formatPublicEnvLiteral(env)}${HTML_MARKER_END};`;
}

/**
 * Replace (or insert) the public-env marker in an HTML document.
 * @param {string} html
 * @param {Record<string, string>} [env]
 * @returns {string}
 */
export function injectPublicEnvIntoHtml(html, env = getPublicEnv()) {
    const literal = formatPublicEnvLiteral(env);
    const replacement = `${HTML_MARKER_START}${literal}${HTML_MARKER_END}`;

    if (HTML_MARKER_PATTERN.test(html)) {
        return html.replace(HTML_MARKER_PATTERN, replacement);
    }

    const script = `<script>${renderPublicEnvAssignment(env)}</script>\n`;
    if (/<\/head>/i.test(html)) {
        return html.replace(/<\/head>/i, `${script}</head>`);
    }
    return `${script}${html}`;
}

/**
 * Origins to allow in CSP connect-src for the configured API base URL.
 * @param {Record<string, string>} [env]
 * @returns {string[]}
 */
export function getApiConnectOrigins(env = getPublicEnv()) {
    const base = env.API_BASE_URL || '';
    if (!base || base.startsWith('/')) return [];
    try {
        const origin = new URL(base).origin;
        return origin ? [origin] : [];
    } catch {
        return [];
    }
}

export const PUBLIC_ENV_HTML_MARKERS = {
    start: HTML_MARKER_START,
    end: HTML_MARKER_END,
    pattern: HTML_MARKER_PATTERN,
};

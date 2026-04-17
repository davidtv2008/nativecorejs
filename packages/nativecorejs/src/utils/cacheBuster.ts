const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const cacheVersion = isDevelopment
    ? Date.now()
    : '0.1.0';

export function bustCache(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${cacheVersion}`;
}

/**
 * Import a module with cache busting.
 * Only allows relative paths and same-origin paths — blocks
 * absolute URLs, path traversal, and dangerous protocols.
 */
export async function importWithBust(modulePath: string): Promise<any> {
    const normalized = modulePath.trim().toLowerCase();

    // Block absolute URLs and dangerous protocols
    if (/^https?:\/\//i.test(normalized) || normalized.startsWith('//')) {
        throw new Error(`importWithBust: absolute URLs are not allowed: ${modulePath}`);
    }
    if (/^(javascript|data|vbscript|blob):/i.test(normalized)) {
        throw new Error(`importWithBust: dangerous protocol blocked: ${modulePath}`);
    }
    if (normalized.includes('..')) {
        throw new Error(`importWithBust: path traversal is not allowed: ${modulePath}`);
    }

    return import(bustCache(modulePath));
}

export default { cacheVersion, bustCache, importWithBust };

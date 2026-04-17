/**
 * Cache Busting Utility
 */

const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const cacheVersion = isDevelopment
    ? Date.now()
    : '1.0.0-20260414231644';

export function bustCache(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${cacheVersion}`;
}

export async function importWithBust(modulePath: string): Promise<any> {
    return import(bustCache(modulePath));
}

export default { cacheVersion, bustCache, importWithBust };

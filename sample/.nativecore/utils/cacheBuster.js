/**
 * Cache Busting Utility
 */
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const cacheVersion = isDevelopment ? Date.now() : '0.1.0-20260426153621';
export function bustCache(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${cacheVersion}`;
}
export async function importWithBust(modulePath) {
    return import(bustCache(modulePath));
}
export default { cacheVersion, bustCache, importWithBust };

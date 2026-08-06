/**
 * Route extraction helpers for SSG (and tests).
 *
 * Public static routes are eligible for pre-render. Protected paths come from:
 *   1. Legacy `export const protectedRoutes = [...]`
 *   2. `.register(...)` inside `r.group({ middleware: [...] }, ...)` when the
 *      middleware array has at least one tag (empty `middleware: []` is public)
 */

/**
 * Find the index of the `}` that closes the `{` at openIdx.
 * Skips string literals and comments so nested braces in route bodies work.
 */
export function findMatchingBrace(src, openIdx) {
    if (src[openIdx] !== '{') return -1;
    let depth = 0;
    for (let i = openIdx; i < src.length; i++) {
        const ch = src[i];
        if (ch === '"' || ch === "'" || ch === '`') {
            const quote = ch;
            i++;
            while (i < src.length) {
                if (src[i] === '\\') { i += 2; continue; }
                if (src[i] === quote) break;
                i++;
            }
            continue;
        }
        if (ch === '/' && src[i + 1] === '/') {
            i += 2;
            while (i < src.length && src[i] !== '\n') i++;
            continue;
        }
        if (ch === '/' && src[i + 1] === '*') {
            i += 2;
            while (i < src.length - 1 && !(src[i] === '*' && src[i + 1] === '/')) i++;
            i++;
            continue;
        }
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

export function extractRegisteredRoutes(src) {
    return Array.from(src.matchAll(/\.register\(\s*['"]([^'"]+)['"]/g), m => m[1]);
}

/** Legacy: export const protectedRoutes = ['/a', '/b'] */
export function extractProtectedRoutes(src) {
    const match = src.match(/export const protectedRoutes\s*=\s*\[(.*?)\]/s);
    if (!match) return [];
    return Array.from(match[1].matchAll(/['"]([^'"]+)['"]/g), m => m[1]);
}

/**
 * Routes registered inside `.group({ middleware: [...] }, …)` when the
 * middleware array contains at least one tag. Empty `middleware: []` groups
 * (scaffold default before make:middleware) are NOT treated as protected.
 */
export function extractMiddlewareProtectedRoutes(src) {
    const protectedRoutes = [];
    let i = 0;

    while (i < src.length) {
        const groupIdx = src.indexOf('.group', i);
        if (groupIdx === -1) break;

        let j = groupIdx + 6;
        while (j < src.length && /\s/.test(src[j])) j++;
        if (src[j] !== '(') { i = groupIdx + 6; continue; }
        j++;
        while (j < src.length && /\s/.test(src[j])) j++;
        if (src[j] !== '{') { i = groupIdx + 6; continue; }

        const optionsEnd = findMatchingBrace(src, j);
        if (optionsEnd === -1) { i = groupIdx + 6; continue; }

        const optionsBody = src.slice(j + 1, optionsEnd);
        const middlewareMatch = optionsBody.match(/middleware\s*:\s*\[([\s\S]*?)\]/);
        const tags = middlewareMatch
            ? Array.from(middlewareMatch[1].matchAll(/['"]([^'"]+)['"]/g), m => m[1])
            : [];

        let k = optionsEnd + 1;
        while (k < src.length && /\s/.test(src[k])) k++;
        if (src[k] !== ',') { i = optionsEnd + 1; continue; }
        k++;

        // Skip callback head: (r) => { | r => { | function (r) {
        const scanLimit = Math.min(src.length, k + 200);
        while (k < scanLimit && src[k] !== '{') k++;
        if (src[k] !== '{') { i = optionsEnd + 1; continue; }

        const bodyEnd = findMatchingBrace(src, k);
        if (bodyEnd === -1) { i = optionsEnd + 1; continue; }

        if (tags.length > 0) {
            const body = src.slice(k + 1, bodyEnd);
            for (const m of body.matchAll(/\.register\(\s*['"]([^'"]+)['"]/g)) {
                protectedRoutes.push(m[1]);
            }
        }

        i = bodyEnd + 1;
    }

    return [...new Set(protectedRoutes)];
}

/** Returns only the static, public routes eligible for SSG pre-rendering. */
export function resolvePublicRoutes(src) {
    const all = extractRegisteredRoutes(src);
    const protected_ = new Set([
        ...extractProtectedRoutes(src),
        ...extractMiddlewareProtectedRoutes(src),
    ]);
    return all.filter(route => {
        if (protected_.has(route)) return false;           // protected — skip
        if (route.includes(':') || route.includes('*')) return false; // dynamic — skip
        return true;
    });
}

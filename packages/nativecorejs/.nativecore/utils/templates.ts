/**
 * Escape a string for safe interpolation into HTML.
 * Prevents XSS by converting dangerous characters to HTML entities.
 */
export function escapeHTML(value: unknown): string {
    const str = String(value ?? '');
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}

/** Sentinel class that marks a string as already-safe HTML (not to be escaped). */
class SafeHTML {
    readonly __html: string;
    constructor(value: string) {
        this.__html = value;
    }
    toString(): string {
        return this.__html;
    }
}

/**
 * Wrap a string so the `html` tagged template will NOT escape it.
 * Use only for content you control or have already sanitised.
 *
 * @example
 * html`<div>${raw(trustedMarkup)}</div>`
 */
export function raw(value: string): SafeHTML {
    return new SafeHTML(value);
}

/**
 * Tagged template literal for HTML.
 * **All interpolated values are HTML-escaped by default.**
 * Wrap trusted content with `raw()` to bypass escaping.
 *
 * @example
 * html`<p>${userInput}</p>`           // escaped
 * html`<div>${raw(trustedHTML)}</div>` // not escaped
 */
export const html = (strings: TemplateStringsArray, ...values: unknown[]): string => {
    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        result += (value instanceof SafeHTML) ? value.__html : escapeHTML(value);
        result += strings[i + 1];
    }
    return result;
};

/**
 * Tagged template literal for raw HTML (no auto-escaping).
 * Use when building HTML from fully trusted sources only.
 * Prefer `html` with `raw()` for mixed content.
 */
export const unsafeHTML = (strings: TemplateStringsArray, ...values: unknown[]): string =>
    String.raw({ raw: strings }, ...values);

/**
 * Validate a URL and block dangerous protocols.
 * Returns the URL if safe, or an empty string if blocked.
 * Allows: http, https, mailto, tel, relative paths, data:image/*
 */
export function sanitizeURL(url: string | null | undefined): string {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed === '') return '';

    // Block javascript:, vbscript:, data: (except images)
    const lower = trimmed.toLowerCase().replace(/[\s\u0000-\u001F]+/g, '');
    if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) {
        return '';
    }
    // Allow data:image/* only
    if (lower.startsWith('data:') && !lower.startsWith('data:image/')) {
        return '';
    }

    return trimmed;
}

export const css = (strings: TemplateStringsArray, ...values: unknown[]): string =>
    String.raw({ raw: strings }, ...values);

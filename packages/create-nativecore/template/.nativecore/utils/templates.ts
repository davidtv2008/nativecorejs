/**
 * Template Literal Helpers
 */

/**
 * Container for developer-authored HTML that should bypass auto-escaping.
 * Created via trusted() — never instantiate directly.
 */
export class TrustedHtml {
    constructor(public readonly __html: string) {}
}

/**
 * Mark a developer-authored HTML string as safe to insert without escaping.
 *
 * Use ONLY for strings you construct yourself in component code (sub-templates,
 * icon markup, map/join results). NEVER pass user input through trusted().
 *
 * @example
 * const itemsHtml = items.map(i => `<li>${escapeHtml(i.label)}</li>`).join('');
 * return html`<ul>${trusted(itemsHtml)}</ul>`;
 */
export function trusted(value: string): TrustedHtml {
    return new TrustedHtml(value);
}

/**
 * Escape a value for safe insertion as HTML text content.
 * Use this inside inner template literals (not tagged with html) to sanitize
 * user-supplied strings before combining them with markup.
 *
 * @example
 * const itemsHtml = items.map(i => `<li>${escapeHtml(i.label)}</li>`).join('');
 * return html`<ul>${trusted(itemsHtml)}</ul>`;
 */
export function escapeHtml(value: unknown): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * HTML template literal tag.
 *
 * Automatically HTML-escapes every interpolated value UNLESS it is a TrustedHtml
 * instance (created with trusted()). Use this for all component templates.
 *
 * - Plain values (string, number, boolean) → auto-escaped
 * - trusted(htmlString)                     → inserted verbatim (developer responsibility)
 *
 * Provides syntax highlighting when the "lit-html" VS Code extension is installed.
 *
 * @example
 * return html`<div class="${variant}">${trusted(listHtml)}</div>`;
 */
export const html = (strings: TemplateStringsArray, ...values: unknown[]): string => {
    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        result += value instanceof TrustedHtml ? value.__html : escapeHtml(value);
        result += strings[i + 1];
    }
    return result;
};

/**
 * CSS template literal tag for syntax highlighting.
 * No-op at runtime.
 */
export const css = (strings: TemplateStringsArray, ...values: any[]): string =>
    String.raw({ raw: strings }, ...values);

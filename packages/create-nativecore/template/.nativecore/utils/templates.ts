/**
 * Template Literal Helpers
 * 
 * These are no-op functions that exist purely for syntax highlighting.
 * They have ZERO runtime overhead - just pass through the string unchanged.
 */

/**
 * HTML template literal tag for syntax highlighting
 * Usage: html`<div>content</div>`
 * 
 * This does nothing at runtime - it's only for VS Code highlighting.
 * Install "lit-html" extension for full HTML/CSS syntax highlighting.
 */
export const html = (strings: TemplateStringsArray, ...values: any[]): string => 
    String.raw({ raw: strings }, ...values);

/**
 * CSS template literal tag for syntax highlighting
 * Usage: css`.class { color: red; }`
 */
export const css = (strings: TemplateStringsArray, ...values: any[]): string => 
    String.raw({ raw: strings }, ...values);

/**
 * Global tokens and shared constructable stylesheets
 */

export const globalSheet = new CSSStyleSheet();

// Initialize with some base variables or resets if needed
globalSheet.replaceSync(`
    :host {
        --nc-primary: #007bff;
        --nc-bg: #ffffff;
        --nc-text: #212529;
    }
`);

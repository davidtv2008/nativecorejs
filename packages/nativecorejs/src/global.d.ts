import type { html as HtmlFn, raw as RawFn } from '../.nativecore/utils/templates.js';

declare global {
    var html: typeof HtmlFn;
    var raw: typeof RawFn;
}

export {};

import { useState, effect } from '../core/state.js';
import { registerPageCleanup } from '../core/pageCleanupRegistry.js';
import type { State } from '../core/state.js';

export type WireAttributesOptions = {
    root?: Element | ShadowRoot | null;
};

export type WireAttributesResult = Record<string, State<string>>;

export function wireAttributes(options: WireAttributesOptions = {}): WireAttributesResult {
    const resolvedRoot = options.root ?? document.querySelector('[data-view]');

    if (!resolvedRoot) {
        console.warn('[wireAttributes] no [data-view] element found - nothing to wire');
        return {};
    }

    const disposers: Array<() => void> = [];
    const attrs: Record<string, State<string>> = {};

    (resolvedRoot as Element).querySelectorAll<HTMLElement>('[wire-attribute]').forEach(el => {
        const raw = el.getAttribute('wire-attribute')!;
        const colonIndex = raw.indexOf(':');

        if (colonIndex === -1) {
            console.warn(
                `[wireAttributes] invalid wire-attribute value "${raw}" - ` +
                `expected format "stateKey:attribute-name" (e.g. "status:data-status")`
            );
            return;
        }

        const key = raw.slice(0, colonIndex).trim();
        const attrName = raw.slice(colonIndex + 1).trim();

        if (!attrs[key]) {
            attrs[key] = useState(el.getAttribute(attrName) ?? '');
        }

        const state = attrs[key];
        disposers.push(effect(() => {
            el.setAttribute(attrName, state.value);
        }));
    });

    registerPageCleanup(() => disposers.forEach(d => d()));
    return attrs;
}


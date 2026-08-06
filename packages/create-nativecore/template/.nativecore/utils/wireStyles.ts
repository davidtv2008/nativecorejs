import { useState, effect } from '../core/state.js';
import { registerPageCleanup } from '../core/pageCleanupRegistry.js';
import type { State } from '../core/state.js';

export type WireStylesOptions = {
    root?: Element | ShadowRoot | null;
};

export type WireStylesResult = Record<string, State<string>>;

export function wireStyles(options: WireStylesOptions = {}): WireStylesResult {
    const resolvedRoot = options.root ?? document.querySelector('[data-view]');

    if (!resolvedRoot) {
        console.warn('[wireStyles] no [data-view] element found - nothing to wire');
        return {};
    }

    const disposers: Array<() => void> = [];
    const styles: Record<string, State<string>> = {};

    (resolvedRoot as Element).querySelectorAll<HTMLElement>('[wire-style]').forEach(el => {
        const raw = el.getAttribute('wire-style')!;
        const colonIndex = raw.indexOf(':');

        if (colonIndex === -1) {
            console.warn(
                `[wireStyles] invalid wire-style value "${raw}" - ` +
                `expected format "stateKey:css-property" (e.g. "barWidth:width")`
            );
            return;
        }

        const key = raw.slice(0, colonIndex).trim();
        const styleName = raw.slice(colonIndex + 1).trim();

        if (!styles[key]) {
            styles[key] = useState(el.style.getPropertyValue(styleName) ?? '');
        }

        const state = styles[key];
        disposers.push(effect(() => {
            if (!state.value) {
                el.style.removeProperty(styleName);
                return;
            }
            el.style.setProperty(styleName, state.value);
        }));
    });

    registerPageCleanup(() => disposers.forEach(d => d()));
    return styles;
}


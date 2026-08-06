import { useState, effect } from '../core/state.js';
import { registerPageCleanup } from '../core/pageCleanupRegistry.js';
import type { State } from '../core/state.js';

export type WireContentsOptions = {
    root?: Element | ShadowRoot | null;
};

export type WireContentsResult = Record<string, State<string>>;

export function wireContents(options: WireContentsOptions = {}): WireContentsResult {
    const resolvedRoot = options.root ?? document.querySelector('[data-view]');

    if (!resolvedRoot) {
        console.warn('[wireContents] no [data-view] element found - nothing to wire');
        return {};
    }

    const disposers: Array<() => void> = [];
    const bindings: Record<string, State<string>> = {};

    (resolvedRoot as Element).querySelectorAll<HTMLElement>('[wire-content]').forEach(el => {
        const key = el.getAttribute('wire-content')!;

        if (!bindings[key]) {
            bindings[key] = useState(el.textContent ?? '');
        }

        const state = bindings[key];

        disposers.push(effect(() => {
            el.textContent = state.value;
        }));
    });

    registerPageCleanup(() => disposers.forEach(d => d()));
    return bindings;
}


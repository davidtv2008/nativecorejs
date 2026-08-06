import { useState, effect } from '../core/state.js';
import { registerPageCleanup } from '../core/pageCleanupRegistry.js';
import type { State } from '../core/state.js';

export type WireClassesOptions = {
    root?: Element | ShadowRoot | null;
};

export type WireClassesResult = Record<string, State<boolean>>;

export function wireClasses(options: WireClassesOptions = {}): WireClassesResult {
    const resolvedRoot = options.root ?? document.querySelector('[data-view]');

    if (!resolvedRoot) {
        console.warn('[wireClasses] no [data-view] element found - nothing to wire');
        return {};
    }

    const disposers: Array<() => void> = [];
    const classes: Record<string, State<boolean>> = {};

    (resolvedRoot as Element).querySelectorAll<HTMLElement>('[wire-class]').forEach(el => {
        const raw = el.getAttribute('wire-class')!;
        const colonIndex = raw.indexOf(':');

        if (colonIndex === -1) {
            console.warn(
                `[wireClasses] invalid wire-class value "${raw}" - ` +
                `expected format "stateKey:class-name" (e.g. "isOpen:is-open")`
            );
            return;
        }

        const key = raw.slice(0, colonIndex).trim();
        const className = raw.slice(colonIndex + 1).trim();

        if (!classes[key]) {
            classes[key] = useState(el.classList.contains(className));
        }

        const state = classes[key];
        disposers.push(effect(() => {
            el.classList.toggle(className, Boolean(state.value));
        }));
    });

    registerPageCleanup(() => disposers.forEach(d => d()));
    return classes;
}


/**
 * wireClasses - declarative one-way class binding for controllers
 *
 * Scans the active [data-view] for every [wire-class="key:class-name"] element,
 * creates a useState<boolean>() for each key, and wires an effect() that calls
 * el.classList.toggle(className, Boolean(state.value)) whenever the state changes.
 * Auto-cleaned on navigation via the page cleanup registry.
 *
 * Usage in a controller:
 *   import { wireClasses } from '@core-utils/wires.js';
 *
 *   export async function tasksController() {
 *       const { isSaving } = wireClasses();
 *       isSaving.value = true; // -> toggles class from wire-class="isSaving:is-saving"
 *   }
 */

import { useState, effect } from '../core/state.js';
import { registerPageCleanup } from '../core/pageCleanupRegistry.js';
import type { State } from '../core/state.js';

export type WireClassesOptions = {
    /** Override the root element to scan. Defaults to the active [data-view]. */
    root?: Element | ShadowRoot | null;
};

export type WireClassesResult = Record<string, State<boolean>>;

/**
 * Scan [wire-class] elements in the active view, auto-create boolean states,
 * wire state->classList.toggle via effect(), and return the states.
 * Cleanup is auto-registered - the router disposes everything on navigation.
 */
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


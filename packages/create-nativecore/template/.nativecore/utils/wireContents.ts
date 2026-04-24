/**
 * wireContent — declarative one-way text binding for controllers
 *
 * Scans the active [data-view] for every [wire-content="key"] element, creates a
 * useState() for each key, and wires an effect() that writes state.value to
 * el.textContent whenever the state changes. Auto-cleaned on navigation via
 * the page cleanup registry — no manual cleanup needed.
 *
 * Use this for display elements: headings, paragraphs, spans, labels, badges.
 * For form inputs use wireInputs(). For HTML attributes use wireAttributes().
 *
 * Usage in a controller:
 *   import { wireContents } from '@core-utils/wires.js';
 *
 *   export async function tasksController() {
 *       const { title, count } = wireContents();
 *       title.value = 'My Tasks';  // → h1 textContent updates
 *       count.value = String(42);  // → span textContent updates
 *   }
 *
 * HTML:
 *   <h1  wire-content="title">Loading...</h1>
 *   <span wire-content="count">0</span>
 *
 * Optional config:
 *   wireContents({ root: myEl })  // explicit root instead of active [data-view]
 */

import { useState, effect } from '../core/state.js';
import { registerPageCleanup } from '../core/pageCleanupRegistry.js';
import type { State } from '../core/state.js';

export type WireContentsOptions = {
    /** Override the root element to scan. Defaults to the active [data-view]. */
    root?: Element | ShadowRoot | null;
};

export type WireContentsResult = Record<string, State<string>>;

/**
 * Scan [wire-content] elements in the active view, auto-create string states,
 * wire state→textContent via effect(), and return the states. Cleanup is
 * auto-registered — the router disposes everything on navigation.
 */
export function wireContents(options: WireContentsOptions = {}): WireContentsResult {
    const resolvedRoot = options.root ?? document.querySelector('[data-view]');

    if (!resolvedRoot) {
        console.warn('[wireContents] no [data-view] element found — nothing to wire');
        return {};
    }

    const disposers: Array<() => void> = [];
    const bindings: Record<string, State<string>> = {};

    (resolvedRoot as Element).querySelectorAll<HTMLElement>('[wire-content]').forEach(el => {
        const key = el.getAttribute('wire-content')!;

        // Create state once per key, seeding from current textContent
        if (!bindings[key]) {
            bindings[key] = useState(el.textContent ?? '');
        }

        const state = bindings[key];

        // State → DOM: update textContent whenever state changes
        disposers.push(effect(() => {
            el.textContent = state.value;
        }));
    });

    registerPageCleanup(() => disposers.forEach(d => d()));

    return bindings;
}

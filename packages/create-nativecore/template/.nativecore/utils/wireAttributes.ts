/**
 * wireAttributes — declarative one-way attribute binding for controllers
 *
 * Scans the active [data-view] for every [wire-attribute="key:attr-name"] element,
 * creates a useState() for each key, and wires an effect() that calls
 * el.setAttribute(attr, state.value) whenever the state changes.
 * Auto-cleaned on navigation via the page cleanup registry.
 *
 * Use this for HTML attributes: data-*, aria-*, src, href, disabled, class, etc.
 * For textContent use wireContent(). For form inputs use wireInputs().
 *
 * Usage in a controller:
 *   import { wireAttributes } from '@core-utils/wires.js';
 *
 *   export async function tasksController() {
 *       const { status, busy } = wireAttributes();
 *       status.value = 'active';   // → setAttribute('data-status', 'active')
 *       busy.value   = 'true';     // → setAttribute('aria-busy', 'true')
 *   }
 *
 * HTML:
 *   <div    wire-attribute="status:data-status">...</div>
 *   <button wire-attribute="busy:aria-busy">Save</button>
 *   <img    wire-attribute="avatar:src" />
 *
 * The format is always  wire-attribute="stateKey:html-attribute-name"
 *
 * Optional config:
 *   wireAttributes({ root: myEl })  // explicit root instead of active [data-view]
 */

import { useState, effect } from '../core/state.js';
import { registerPageCleanup } from '../core/pageCleanupRegistry.js';
import type { State } from '../core/state.js';

export type WireAttributesOptions = {
    /** Override the root element to scan. Defaults to the active [data-view]. */
    root?: Element | ShadowRoot | null;
};

export type WireAttributesResult = Record<string, State<string>>;

/**
 * Scan [nc-attribute] elements in the active view, auto-create string states,
 * wire state→setAttribute via effect(), and return the states. Cleanup is
 * auto-registered — the router disposes everything on navigation.
 */
export function wireAttributes(options: WireAttributesOptions = {}): WireAttributesResult {
    const resolvedRoot = options.root ?? document.querySelector('[data-view]');

    if (!resolvedRoot) {
        console.warn('[wireAttributes] no [data-view] element found — nothing to wire');
        return {};
    }

    const disposers: Array<() => void> = [];
    const attrs: Record<string, State<string>> = {};

    (resolvedRoot as Element).querySelectorAll<HTMLElement>('[wire-attribute]').forEach(el => {
        const raw = el.getAttribute('wire-attribute')!;
        const colonIndex = raw.indexOf(':');

        if (colonIndex === -1) {
            console.warn(
                `[wireAttributes] invalid wire-attribute value "${raw}" — ` +
                `expected format "stateKey:attribute-name" (e.g. "status:data-status")`
            );
            return;
        }

        const key      = raw.slice(0, colonIndex).trim();
        const attrName = raw.slice(colonIndex + 1).trim();

        // Create state once per key, seeding from current attribute value
        if (!attrs[key]) {
            attrs[key] = useState(el.getAttribute(attrName) ?? '');
        }

        const state = attrs[key];

        // State → DOM: setAttribute whenever state changes
        disposers.push(effect(() => {
            el.setAttribute(attrName, state.value);
        }));
    });

    registerPageCleanup(() => disposers.forEach(d => d()));

    return attrs;
}

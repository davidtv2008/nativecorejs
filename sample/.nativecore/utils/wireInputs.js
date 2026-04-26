/**
 * wireInputs — declarative two-way input binding for controllers
 *
 * Scans the active [data-view] for every [wire-input="key"] element, creates a
 * useState() for each key, wires both directions (state→DOM, DOM→state), and
 * returns the states. Cleanup is registered automatically with the page
 * cleanup registry — no manual cleanup or return value needed.
 *
 * Use this for form inputs: <input>, <select>, <textarea>, and custom input
 * components that fire input/change events.
 * For text display use wireContent(). For HTML attributes use wireAttributes().
 *
 * Usage in a controller:
 *   import { wireInputs } from '@core-utils/wires.js';
 *
 *   export async function tasksController() {
 *       const { email, done, priority } = wireInputs();
 *       // email.value, done.value, priority.value are live two-way bound
 *       // No cleanup needed — the router handles it automatically on navigation
 *   }
 *
 * HTML (in the view):
 *   <input wire-input="email"    type="email" />
 *   <input wire-input="done"     type="checkbox" />
 *   <select wire-input="priority">...</select>
 *
 * Initial values are inferred from the element:
 *   - checkbox / radio → boolean (el.checked)
 *   - number input     → number  (el.value || 0)
 *   - everything else  → string  (el.value || '')
 *
 * Optional config:
 *   wireInputs({ root: myEl })
 *   wireInputs({ overrides: { rating: { event: 'nc-change', prop: 'value' } } })
 */
import { useState, effect } from '../core/state.js';
import { registerPageCleanup } from '../core/pageCleanupRegistry.js';
/**
 * Scan [wire-input] elements in the active view, auto-create states, wire both
 * directions, and return the states. Cleanup is auto-registered with the page
 * cleanup registry — the router flushes it on every navigation.
 */
export function wireInputs(options = {}) {
    const resolvedRoot = options.root ?? document.querySelector('[data-view]');
    if (!resolvedRoot) {
        console.warn('[wireInputs] no [data-view] element found — nothing to wire');
        return {};
    }
    const disposers = [];
    const models = {};
    resolvedRoot.querySelectorAll('[wire-input]').forEach(el => {
        const key = el.getAttribute('wire-input');
        const overrides = options.overrides?.[key] ?? {};
        const isCheckable = el instanceof HTMLInputElement &&
            (el.type === 'checkbox' || el.type === 'radio');
        const isNumber = el instanceof HTMLInputElement && el.type === 'number';
        // Create state once per key, inferring type from element
        if (!models[key]) {
            let initial;
            if (isCheckable) {
                initial = el.checked;
            }
            else if (isNumber) {
                initial = el.value
                    ? Number(el.value)
                    : 0;
            }
            else {
                initial = el.value ?? '';
            }
            models[key] = useState(initial);
        }
        const state = models[key];
        const eventName = overrides.event ?? (isCheckable ? 'change' : 'input');
        const propName = overrides.prop ?? (isCheckable ? 'checked' : 'value');
        // State → DOM
        disposers.push(effect(() => {
            el[propName] = state.value;
        }));
        // DOM → State
        const handler = (e) => {
            state.value = e.target[propName];
        };
        el.addEventListener(eventName, handler);
        disposers.push(() => el.removeEventListener(eventName, handler));
    });
    // Register all disposers with the page cleanup registry so the router
    // flushes them automatically on every navigation — no manual return needed.
    registerPageCleanup(() => disposers.forEach(d => d()));
    return models;
}

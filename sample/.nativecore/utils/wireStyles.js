/**
 * wireStyles - declarative one-way inline style binding for controllers
 *
 * Scans the active [data-view] for every [wire-style="key:css-property"] element,
 * creates a useState<string>() for each key, and wires an effect() that calls
 * el.style.setProperty(cssProperty, state.value) whenever the state changes.
 * Empty values remove the style property.
 *
 * Usage in a controller:
 *   import { wireStyles } from '@core-utils/wires.js';
 *
 *   export async function tasksController() {
 *       const { progressWidth } = wireStyles();
 *       progressWidth.value = '72%'; // -> style width updates for wire-style="progressWidth:width"
 *   }
 */
import { useState, effect } from '../core/state.js';
import { registerPageCleanup } from '../core/pageCleanupRegistry.js';
/**
 * Scan [wire-style] elements in the active view, auto-create string states,
 * wire state->style.setProperty via effect(), and return the states.
 * Cleanup is auto-registered - the router disposes everything on navigation.
 */
export function wireStyles(options = {}) {
    const resolvedRoot = options.root ?? document.querySelector('[data-view]');
    if (!resolvedRoot) {
        console.warn('[wireStyles] no [data-view] element found - nothing to wire');
        return {};
    }
    const disposers = [];
    const styles = {};
    resolvedRoot.querySelectorAll('[wire-style]').forEach(el => {
        const raw = el.getAttribute('wire-style');
        const colonIndex = raw.indexOf(':');
        if (colonIndex === -1) {
            console.warn(`[wireStyles] invalid wire-style value "${raw}" - ` +
                `expected format "stateKey:css-property" (e.g. "barWidth:width")`);
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

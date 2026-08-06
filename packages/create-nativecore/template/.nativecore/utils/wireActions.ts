/**
 * wireActions — declarative event binding for controllers and components
 *
 * Scans the active [data-view] for every [wire-action="name:eventType"] element,
 * pairs each one with its event name, and returns a map of named WireAction
 * objects ready to be passed directly to the events() callable returned by trackEvents().
 *
 * Nothing is bound automatically — you decide the handler in the controller:
 *
 *   HTML:
 *     <button wire-action="savebtn:click">Save</button>
 *     <nc-rating wire-action="rating:nc-change">…</nc-rating>
 *
 *   Controller:
 *     import { wireActions } from '@core-utils/wires.js';
 *
 *     export async function tasksController() {
 *         const events = trackEvents();
 *         const { savebtn, rating } = wireActions();
 *
 *         events(savebtn, (e) => handleSave());
 *         events(rating,  (e) => score.value = e.detail.value);
 *
 *         return events.cleanup;
 *     }
 *
 * Cleanup is registered automatically — the router removes all listeners on
 * navigation, the same as every other wire utility.
 *
 * Optional config:
 *   wireActions({ root: myEl })  — explicit root instead of active [data-view]
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** A resolved wire-action reference — element + event type already paired. */
export type WireAction = {
    /** The DOM element carrying the wire-action attribute. */
    element: Element;
    /** The event name to listen for (e.g. "click", "nc-change"). */
    event: string;
};

export type WireActionsOptions = {
    /** Override the root element to scan. Defaults to the active [data-view]. */
    root?: Element | ShadowRoot | null;
};

export type WireActionsResult = Record<string, WireAction>;

// ── Implementation ────────────────────────────────────────────────────────────

/**
 * Scan [wire-action] elements in the active view and return a map of named
 * WireAction objects. Pass each action to the events() callable (from trackEvents()) to bind a handler.
 * Listener cleanup is tracked automatically via the page cleanup registry.
 */
export function wireActions(options: WireActionsOptions = {}): WireActionsResult {
    const resolvedRoot = options.root ?? document.querySelector('[data-view]');

    if (!resolvedRoot) {
        console.warn('[wireActions] no [data-view] element found — nothing to wire');
        return {};
    }

    const actions: WireActionsResult = {};

    (resolvedRoot as Element).querySelectorAll<HTMLElement>('[wire-action]').forEach(el => {
        const raw = el.getAttribute('wire-action')!;
        const colonIndex = raw.indexOf(':');

        if (colonIndex === -1) {
            console.warn(
                `[wireActions] invalid wire-action value "${raw}" — ` +
                `expected format "name:eventType" (e.g. "savebtn:click")`
            );
            return;
        }

        const name      = raw.slice(0, colonIndex).trim();
        const eventName = raw.slice(colonIndex + 1).trim();

        if (actions[name]) {
            console.warn(
                `[wireActions] duplicate wire-action name "${name}" — ` +
                `each name must be unique. Use distinct names per element.`
            );
            return;
        }

        actions[name] = { element: el, event: eventName };
    });

    return actions;
}

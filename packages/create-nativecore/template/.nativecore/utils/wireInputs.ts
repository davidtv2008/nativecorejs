import { useState, effect } from '../core/state.js';
import { registerPageCleanup } from '../core/pageCleanupRegistry.js';
import type { State } from '../core/state.js';

export type WireInputsOptions = {
    root?: Element | ShadowRoot | null;
    overrides?: Record<string, { event?: string; prop?: string }>;
};

export type WireInputsResult = Record<string, State<any>>;

export function wireInputs(options: WireInputsOptions = {}): WireInputsResult {
    const resolvedRoot = options.root ?? document.querySelector('[data-view]');

    if (!resolvedRoot) {
        console.warn('[wireInputs] no [data-view] element found - nothing to wire');
        return {};
    }

    const disposers: Array<() => void> = [];
    const models: Record<string, State<any>> = {};

    (resolvedRoot as Element).querySelectorAll<HTMLElement>('[wire-input]').forEach(el => {
        const key = el.getAttribute('wire-input')!;
        const overrides = options.overrides?.[key] ?? {};

        const isCheckable =
            el instanceof HTMLInputElement &&
            (el.type === 'checkbox' || el.type === 'radio');
        const isNumber =
            el instanceof HTMLInputElement && el.type === 'number';

        if (!models[key]) {
            let initial: any;
            if (isCheckable) {
                initial = (el as HTMLInputElement).checked;
            } else if (isNumber) {
                initial = (el as HTMLInputElement).value
                    ? Number((el as HTMLInputElement).value)
                    : 0;
            } else {
                initial = (el as HTMLInputElement).value ?? '';
            }
            models[key] = useState(initial);
        }

        const state = models[key];
        const eventName = overrides.event ?? (isCheckable ? 'change' : 'input');
        const propName = overrides.prop ?? (isCheckable ? 'checked' : 'value');

        disposers.push(effect(() => {
            (el as any)[propName] = state.value;
        }));

        const handler = (e: Event) => {
            state.value = (e.target as any)[propName];
        };
        el.addEventListener(eventName, handler);
        disposers.push(() => el.removeEventListener(eventName, handler));
    });

    registerPageCleanup(() => disposers.forEach(d => d()));
    return models;
}


import type { State } from './state.js';

export type ContextKey<T> = symbol & { readonly __ncContext?: T };

export const CONTEXT_REQUEST = 'context-request';

export class ContextRequestEvent<T> extends Event {
    readonly context: ContextKey<T>;
    readonly callback: (value: T, unsubscribe?: () => void) => void;
    readonly subscribe: boolean;

    constructor(
        context: ContextKey<T>,
        callback: (value: T, unsubscribe?: () => void) => void,
        subscribe = false
    ) {
        super(CONTEXT_REQUEST, { bubbles: true, composed: true, cancelable: true });
        this.context = context;
        this.callback = callback;
        this.subscribe = subscribe;
    }
}

export function createContext<T>(name: string): ContextKey<T> {
    return Symbol(name) as ContextKey<T>;
}

function isState<T>(value: T | State<T>): value is State<T> {
    return Boolean(
        value &&
        typeof value === 'object' &&
        'value' in (value as object) &&
        typeof (value as State<T>).watch === 'function'
    );
}

/**
 * Provide a context value on `host`. Descendants call `inject` (composed,
 * bubbles through Shadow DOM). Pass a `State` to push updates to subscribers.
 * Returns a disposer.
 */
export function provide<T>(host: EventTarget, key: ContextKey<T>, source: T | State<T>): () => void {
    const listeners = new Set<(value: T) => void>();
    let current = isState(source) ? source.value : source;

    const notify = (value: T) => {
        current = value;
        listeners.forEach(listener => listener(value));
    };

    const onRequest = (event: Event) => {
        const request = event as ContextRequestEvent<T>;
        if (request.context !== key) return;
        event.stopPropagation();
        if (request.subscribe) {
            listeners.add(request.callback);
            request.callback(current, () => listeners.delete(request.callback));
            return;
        }
        request.callback(current);
    };

    host.addEventListener(CONTEXT_REQUEST, onRequest);

    let unwatch: (() => void) | undefined;
    if (isState(source)) {
        unwatch = source.watch(notify);
    }

    return () => {
        host.removeEventListener(CONTEXT_REQUEST, onRequest);
        unwatch?.();
        listeners.clear();
    };
}

/**
 * Read a provided context from an ancestor of `el`.
 * One-shot: returns the current value (or `undefined`).
 * With `onChange`: subscribe and return a disposer.
 */
export function inject<T>(el: EventTarget, key: ContextKey<T>): T | undefined;
export function inject<T>(el: EventTarget, key: ContextKey<T>, onChange: (value: T) => void): () => void;
export function inject<T>(
    el: EventTarget,
    key: ContextKey<T>,
    onChange?: (value: T) => void
): T | undefined | (() => void) {
    let value: T | undefined;
    let unsubscribe: (() => void) | undefined;

    const event = new ContextRequestEvent<T>(
        key,
        (next, stop) => {
            value = next;
            unsubscribe = stop;
            onChange?.(next);
        },
        Boolean(onChange)
    );

    el.dispatchEvent(event);

    if (onChange) {
        return () => unsubscribe?.();
    }
    return value;
}

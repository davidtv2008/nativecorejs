import { registerPageCleanup } from '../core/pageCleanupRegistry.js';

export function on<T = Event>(
    selector: string,
    eventName: string,
    handler: (event: T) => void
): () => void {
    const elements = document.querySelectorAll(selector);

    elements.forEach(el => {
        el.addEventListener(eventName, handler as EventListener);
    });

    return () => {
        elements.forEach(el => {
            el.removeEventListener(eventName, handler as EventListener);
        });
    };
}

export function bindEvents(
    bindings: Record<string, Record<string, (event: any) => void>>
): () => void {
    const cleanups: Array<() => void> = [];

    for (const [eventName, handlers] of Object.entries(bindings)) {
        for (const [selector, handler] of Object.entries(handlers)) {
            cleanups.push(on(selector, eventName, handler));
        }
    }

    return () => {
        cleanups.forEach(cleanup => cleanup());
    };
}

export const onClick = (selector: string, handler: (event: Event) => void) =>
    on(selector, 'click', handler);

export const onChange = (selector: string, handler: (event: Event) => void) =>
    on(selector, 'change', handler);

export const onInput = (selector: string, handler: (event: Event) => void) =>
    on(selector, 'input', handler);

export const onSubmit = (selector: string, handler: (event: Event) => void) =>
    on(selector, 'submit', handler);

export function delegate<T = Event>(
    containerSelector: string,
    eventName: string,
    targetSelector: string,
    handler: (event: T, target: Element) => void
): () => void {
    const container = document.querySelector(containerSelector);
    if (!container) return () => {};

    const delegateHandler = (event: Event) => {
        const target = (event.target as Element).closest(targetSelector);
        if (target && container.contains(target)) {
            handler(event as T, target);
        }
    };

    container.addEventListener(eventName, delegateHandler);

    return () => {
        container.removeEventListener(eventName, delegateHandler);
    };
}

export function trackEvents() {
    const cleanupFunctions: Array<() => void> = [];

    const tracker = {
        on<T = Event>(selector: string, eventName: string, handler: (event: T) => void): void {
            cleanupFunctions.push(on(selector, eventName, handler));
        },

        onClick(selector: string, handler: (event: Event) => void): void {
            cleanupFunctions.push(onClick(selector, handler));
        },

        onChange(selector: string, handler: (event: Event) => void): void {
            cleanupFunctions.push(onChange(selector, handler));
        },

        onInput(selector: string, handler: (event: Event) => void): void {
            cleanupFunctions.push(onInput(selector, handler));
        },

        onSubmit(selector: string, handler: (event: Event) => void): void {
            cleanupFunctions.push(onSubmit(selector, handler));
        },

        delegate<T = Event>(
            containerSelector: string,
            eventName: string,
            targetSelector: string,
            handler: (event: T, target: Element) => void
        ): void {
            cleanupFunctions.push(delegate(containerSelector, eventName, targetSelector, handler));
        },

        cleanup(): void {
            cleanupFunctions.forEach(cleanup => cleanup());
            cleanupFunctions.length = 0;
        }
    };

    registerPageCleanup(() => tracker.cleanup());
    return tracker;
}

export function trackSubscriptions() {
    const unsubscribers: Array<() => void> = [];

    return {
        watch(unsubscribe: () => void): void {
            unsubscribers.push(unsubscribe);
        },

        cleanup(): void {
            unsubscribers.forEach(fn => fn());
            unsubscribers.length = 0;
        }
    };
}

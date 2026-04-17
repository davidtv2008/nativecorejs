/**
 * Event handling utilities for controllers
 * Works with any component and any event type
 */

/**
 * Generic event listener with cleanup
 * 
 * Usage:
 *   on('#myBtn', 'click', handleClick);
 *   on('#myBtn', 'nc-click', handleClick);
 *   on('.input', 'input', handleInput);
 */
export function on<T = Event>(
    selectorOrElement: string | Element | null,
    eventName: string, 
    handler: (event: T) => void
): () => void {
    const elements = typeof selectorOrElement === 'string'
        ? Array.from(document.querySelectorAll(selectorOrElement))
        : selectorOrElement
            ? [selectorOrElement]
            : [];
    
    elements.forEach(el => {
        el.addEventListener(eventName, handler as EventListener);
    });
    
    // Return cleanup function
    return () => {
        elements.forEach(el => {
            el.removeEventListener(eventName, handler as EventListener);
        });
    };
}

/**
 * Batch event binding for cleaner controller syntax
 * 
 * Usage:
 *   const cleanup = bindEvents({
 *     'click': {
 *       '#submitBtn': handleSubmit,
 *       '#cancelBtn': handleCancel
 *     },
 *     'nc-click': {
 *       '.action-btn': handleAction
 *     },
 *     'input': {
 *       '#searchInput': handleSearch
 *     }
 *   });
 */
export function bindEvents(
    bindings: Record<string, Record<string, (event: any) => void>>
): () => void {
    const cleanups: Array<() => void> = [];
    
    for (const [eventName, handlers] of Object.entries(bindings)) {
        for (const [selector, handler] of Object.entries(handlers)) {
            cleanups.push(on(selector, eventName, handler));
        }
    }
    
    // Return cleanup function that removes all listeners
    return () => {
        cleanups.forEach(cleanup => cleanup());
    };
}

/**
 * Shorthand for common events
 */
export const onClick = (selectorOrElement: string | Element | null, handler: (event: Event) => void) => 
    on(selectorOrElement, 'click', handler);

export const onChange = (selectorOrElement: string | Element | null, handler: (event: Event) => void) => 
    on(selectorOrElement, 'change', handler);

export const onInput = (selectorOrElement: string | Element | null, handler: (event: Event) => void) => 
    on(selectorOrElement, 'input', handler);

export const onSubmit = (selectorOrElement: string | Element | null, handler: (event: Event) => void) => 
    on(selectorOrElement, 'submit', handler);

/**
 * Delegate event to parent container (for dynamic elements)
 * 
 * Usage:
 *   delegate('#container', 'click', '.dynamic-btn', handleClick);
 */
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

/**
 * Event scope tracker - automatically collects all listeners for cleanup
 * Perfect for controllers that need comprehensive cleanup
 * 
 * Usage:
 *   export function myController() {
 *     const events = trackEvents();
 *     
 *     events.on('#btn1', 'click', handler1);
 *     events.on('#btn2', 'click', handler2);
 *     events.onClick('#btn3', handler3);
 *     
 *     return events.cleanup;
 *   }
 */
export function trackEvents() {
    const cleanupFunctions: Array<() => void> = [];
    
    return {
        on<T = Event>(selectorOrElement: string | Element | null, eventName: string, handler: (event: T) => void): void {
            cleanupFunctions.push(on(selectorOrElement, eventName, handler));
        },
        
        onClick(selectorOrElement: string | Element | null, handler: (event: Event) => void): void {
            cleanupFunctions.push(onClick(selectorOrElement, handler));
        },
        
        onChange(selectorOrElement: string | Element | null, handler: (event: Event) => void): void {
            cleanupFunctions.push(onChange(selectorOrElement, handler));
        },
        
        onInput(selectorOrElement: string | Element | null, handler: (event: Event) => void): void {
            cleanupFunctions.push(onInput(selectorOrElement, handler));
        },
        
        onSubmit(selectorOrElement: string | Element | null, handler: (event: Event) => void): void {
            cleanupFunctions.push(onSubmit(selectorOrElement, handler));
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
            cleanupFunctions.length = 0; // Clear array
        }
    };
}

/**
 * Subscription scope tracker - automatically collects state watcher unsubscribes for cleanup
 * The reactive analog to trackEvents() — use this alongside it in controllers and components
 *
 * Usage:
 *   export async function myController() {
 *     const subs = trackSubscriptions();
 *     const events = trackEvents();
 *
 *     subs.watch(store.user.watch(user => renderUser(user)));
 *     subs.watch(store.isLoading.watch(loading => toggleSpinner(loading)));
 *     events.onClick('#btn', handleClick);
 *
 *     return () => {
 *       subs.cleanup();
 *       events.cleanup();
 *     };
 *   }
 */
export function trackSubscriptions() {
    const unsubscribers: Array<() => void> = [];

    return {
        /**
         * Register a state watcher unsubscribe function
         * Pass the return value of any .watch() call directly
         * @example subs.watch(myState.watch(val => doSomething(val)));
         */
        watch(unsubscribe: () => void): void {
            unsubscribers.push(unsubscribe);
        },

        cleanup(): void {
            unsubscribers.forEach(fn => fn());
            unsubscribers.length = 0;
        }
    };
}

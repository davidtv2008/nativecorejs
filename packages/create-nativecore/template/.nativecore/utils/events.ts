/**
 * Event handling utilities for controllers
 * Works with any component and any event type
 */

import { registerPageCleanup } from '../core/pageCleanupRegistry.js';
import type { WireAction } from './wireActions.js';

// ── Internal helper to detect a WireAction object ────────────────────────────

function isWireAction(v: unknown): v is WireAction {
    return (
        typeof v === 'object' &&
        v !== null &&
        'element' in v &&
        'event' in v
    );
}

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

    return () => {
        cleanups.forEach(cleanup => cleanup());
    };
}

/**
 * Shorthand helpers — all return a cleanup function
 */
export const onClick      = (sel: string | Element | null, h: (e: Event) => void)        => on(sel, 'click', h);
export const onChange     = (sel: string | Element | null, h: (e: Event) => void)        => on(sel, 'change', h);
export const onInput      = (sel: string | Element | null, h: (e: Event) => void)        => on(sel, 'input', h);
export const onSubmit     = (sel: string | Element | null, h: (e: Event) => void)        => on(sel, 'submit', h);
export const onKeydown    = (sel: string | Element | null, h: (e: KeyboardEvent) => void) => on<KeyboardEvent>(sel, 'keydown', h);
export const onKeyup      = (sel: string | Element | null, h: (e: KeyboardEvent) => void) => on<KeyboardEvent>(sel, 'keyup', h);
export const onFocus      = (sel: string | Element | null, h: (e: FocusEvent) => void)   => on<FocusEvent>(sel, 'focus', h);
export const onBlur       = (sel: string | Element | null, h: (e: FocusEvent) => void)   => on<FocusEvent>(sel, 'blur', h);
export const onFocusin    = (sel: string | Element | null, h: (e: FocusEvent) => void)   => on<FocusEvent>(sel, 'focusin', h);
export const onFocusout   = (sel: string | Element | null, h: (e: FocusEvent) => void)   => on<FocusEvent>(sel, 'focusout', h);
export const onScroll     = (sel: string | Element | null, h: (e: Event) => void)        => on(sel, 'scroll', h);
export const onMouseenter = (sel: string | Element | null, h: (e: MouseEvent) => void)   => on<MouseEvent>(sel, 'mouseenter', h);
export const onMouseleave = (sel: string | Element | null, h: (e: MouseEvent) => void)   => on<MouseEvent>(sel, 'mouseleave', h);
export const onDblclick   = (sel: string | Element | null, h: (e: MouseEvent) => void)   => on<MouseEvent>(sel, 'dblclick', h);

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
    return () => container.removeEventListener(eventName, delegateHandler);
}

// ── EventTracker type ────────────────────────────────────────────────────────

/**
 * The object returned by trackEvents().
 *
 * It is both callable and has named shorthand methods — all paths push into
 * the same cleanup list and are removed together on navigation.
 *
 * Call signatures:
 *   events(wireAction, handler)              — WireAction from wireActions()
 *   events(element, 'eventName', handler)    — any element / selector / Window
 */
export interface EventTracker {
    // ── Callable overloads ────────────────────────────────────────────────────
    <T = Event>(action: WireAction, handler: (event: T) => void): void;
    <T = Event>(selectorOrElement: string | Element | EventTarget | null, eventName: string, handler: (event: T) => void): void;

    // ── Named methods ─────────────────────────────────────────────────────────
    on<T = Event>(selectorOrElement: string | Element | null, eventName: string, handler: (event: T) => void): void;
    /** Alias for on() */
    add<T = Event>(selectorOrElement: string | Element | null, eventName: string, handler: (event: T) => void): void;
    onClick(sel: string | Element | null, handler: (e: Event) => void): void;
    onChange(sel: string | Element | null, handler: (e: Event) => void): void;
    onInput(sel: string | Element | null, handler: (e: Event) => void): void;
    onSubmit(sel: string | Element | null, handler: (e: Event) => void): void;
    onKeydown(sel: string | Element | null, handler: (e: KeyboardEvent) => void): void;
    onKeyup(sel: string | Element | null, handler: (e: KeyboardEvent) => void): void;
    onFocus(sel: string | Element | null, handler: (e: FocusEvent) => void): void;
    onBlur(sel: string | Element | null, handler: (e: FocusEvent) => void): void;
    onFocusin(sel: string | Element | null, handler: (e: FocusEvent) => void): void;
    onFocusout(sel: string | Element | null, handler: (e: FocusEvent) => void): void;
    onScroll(sel: string | Element | null, handler: (e: Event) => void): void;
    onMouseenter(sel: string | Element | null, handler: (e: MouseEvent) => void): void;
    onMouseleave(sel: string | Element | null, handler: (e: MouseEvent) => void): void;
    onDblclick(sel: string | Element | null, handler: (e: MouseEvent) => void): void;
    delegate<T = Event>(containerSelector: string, eventName: string, targetSelector: string, handler: (event: T, target: Element) => void): void;
    cleanup(): void;
}

/**
 * Event scope tracker — automatically collects all listeners for cleanup.
 *
 * Returns a callable EventTracker that accepts two call styles:
 *
 *   // Style 1 — WireAction from wireActions()
 *   const { savebtn } = wireActions();
 *   events(savebtn, (e) => handleSave(e));
 *
 *   // Style 2 — classic element / selector / Window + event name
 *   events(window,   'auth-change', sync);
 *   events('#myBtn', 'click',       handleClick);
 *
 * Named shorthands are still available on the same object:
 *   events.onClick('#btn', handler);
 *   events.onKeydown('#input', handler);
 *
 * All paths push into the same cleanup list.
 * Cleanup is auto-registered with the page registry — removed on navigation.
 */
export function trackEvents(): EventTracker {
    const cleanupFunctions: Array<() => void> = [];

    // ── Core dispatcher ───────────────────────────────────────────────────────
    function tracker(
        first:  WireAction | string | Element | EventTarget | null,
        second: string | ((event: any) => void),
        third?: (event: any) => void
    ): void {
        if (isWireAction(first) && typeof second === 'function') {
            // events(wireAction, handler)
            cleanupFunctions.push(on(first.element, first.event, second));
        } else if (typeof second === 'string' && typeof third === 'function') {
            // events(element | selector | Window, 'eventName', handler)
            cleanupFunctions.push(on(first as string | Element | null, second, third));
        } else {
            console.warn('[trackEvents] Unrecognised call signature. Use events(wireAction, handler) or events(element, eventName, handler).');
        }
    }

    // ── Named shorthand methods ───────────────────────────────────────────────
    tracker.on = function<T = Event>(sel: string | Element | null, eventName: string, handler: (e: T) => void) {
        cleanupFunctions.push(on(sel, eventName, handler));
    };

    tracker.add = tracker.on;

    tracker.onClick      = (sel: string | Element | null, h: (e: Event) => void)         => { cleanupFunctions.push(onClick(sel, h)); };
    tracker.onChange     = (sel: string | Element | null, h: (e: Event) => void)         => { cleanupFunctions.push(onChange(sel, h)); };
    tracker.onInput      = (sel: string | Element | null, h: (e: Event) => void)         => { cleanupFunctions.push(onInput(sel, h)); };
    tracker.onSubmit     = (sel: string | Element | null, h: (e: Event) => void)         => { cleanupFunctions.push(onSubmit(sel, h)); };
    tracker.onKeydown    = (sel: string | Element | null, h: (e: KeyboardEvent) => void)  => { cleanupFunctions.push(onKeydown(sel, h)); };
    tracker.onKeyup      = (sel: string | Element | null, h: (e: KeyboardEvent) => void)  => { cleanupFunctions.push(onKeyup(sel, h)); };
    tracker.onFocus      = (sel: string | Element | null, h: (e: FocusEvent) => void)    => { cleanupFunctions.push(onFocus(sel, h)); };
    tracker.onBlur       = (sel: string | Element | null, h: (e: FocusEvent) => void)    => { cleanupFunctions.push(onBlur(sel, h)); };
    tracker.onFocusin    = (sel: string | Element | null, h: (e: FocusEvent) => void)    => { cleanupFunctions.push(onFocusin(sel, h)); };
    tracker.onFocusout   = (sel: string | Element | null, h: (e: FocusEvent) => void)    => { cleanupFunctions.push(onFocusout(sel, h)); };
    tracker.onScroll     = (sel: string | Element | null, h: (e: Event) => void)         => { cleanupFunctions.push(onScroll(sel, h)); };
    tracker.onMouseenter = (sel: string | Element | null, h: (e: MouseEvent) => void)    => { cleanupFunctions.push(onMouseenter(sel, h)); };
    tracker.onMouseleave = (sel: string | Element | null, h: (e: MouseEvent) => void)    => { cleanupFunctions.push(onMouseleave(sel, h)); };
    tracker.onDblclick   = (sel: string | Element | null, h: (e: MouseEvent) => void)    => { cleanupFunctions.push(onDblclick(sel, h)); };

    tracker.delegate = function<T = Event>(
        containerSelector: string,
        eventName: string,
        targetSelector: string,
        handler: (event: T, target: Element) => void
    ) {
        cleanupFunctions.push(delegate(containerSelector, eventName, targetSelector, handler));
    };

    tracker.cleanup = function() {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
    };

    registerPageCleanup(() => tracker.cleanup());
    return tracker as unknown as EventTracker;
}

/**
 * Subscription scope tracker — automatically collects state watcher
 * unsubscribes for cleanup. The reactive analog to trackEvents().
 *
 * Usage:
 *   export async function myController() {
 *     const subs   = trackSubscriptions();
 *     const events = trackEvents();
 *
 *     subs.watch(store.user.watch(user => renderUser(user)));
 *     events(window, 'auth-change', sync);
 *
 *     return () => { subs.cleanup(); events.cleanup(); };
 *   }
 */
export function trackSubscriptions() {
    const unsubscribers: Array<() => void> = [];

    return {
        /**
         * Register a state watcher unsubscribe function.
         * Pass the return value of any .watch() call directly.
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

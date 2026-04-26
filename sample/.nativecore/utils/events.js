/**
 * Event handling utilities for controllers
 * Works with any component and any event type
 */
import { registerPageCleanup } from '../core/pageCleanupRegistry.js';
// ── Internal helper to detect a WireAction object ────────────────────────────
function isWireAction(v) {
    return (typeof v === 'object' &&
        v !== null &&
        'element' in v &&
        'event' in v);
}
/**
 * Generic event listener with cleanup
 *
 * Usage:
 *   on('#myBtn', 'click', handleClick);
 *   on('#myBtn', 'nc-click', handleClick);
 *   on('.input', 'input', handleInput);
 */
export function on(selectorOrElement, eventName, handler) {
    const elements = typeof selectorOrElement === 'string'
        ? Array.from(document.querySelectorAll(selectorOrElement))
        : selectorOrElement
            ? [selectorOrElement]
            : [];
    elements.forEach(el => {
        el.addEventListener(eventName, handler);
    });
    return () => {
        elements.forEach(el => {
            el.removeEventListener(eventName, handler);
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
export function bindEvents(bindings) {
    const cleanups = [];
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
export const onClick = (sel, h) => on(sel, 'click', h);
export const onChange = (sel, h) => on(sel, 'change', h);
export const onInput = (sel, h) => on(sel, 'input', h);
export const onSubmit = (sel, h) => on(sel, 'submit', h);
export const onKeydown = (sel, h) => on(sel, 'keydown', h);
export const onKeyup = (sel, h) => on(sel, 'keyup', h);
export const onFocus = (sel, h) => on(sel, 'focus', h);
export const onBlur = (sel, h) => on(sel, 'blur', h);
export const onFocusin = (sel, h) => on(sel, 'focusin', h);
export const onFocusout = (sel, h) => on(sel, 'focusout', h);
export const onScroll = (sel, h) => on(sel, 'scroll', h);
export const onMouseenter = (sel, h) => on(sel, 'mouseenter', h);
export const onMouseleave = (sel, h) => on(sel, 'mouseleave', h);
export const onDblclick = (sel, h) => on(sel, 'dblclick', h);
/**
 * Delegate event to parent container (for dynamic elements)
 *
 * Usage:
 *   delegate('#container', 'click', '.dynamic-btn', handleClick);
 */
export function delegate(containerSelector, eventName, targetSelector, handler) {
    const container = document.querySelector(containerSelector);
    if (!container)
        return () => { };
    const delegateHandler = (event) => {
        const target = event.target.closest(targetSelector);
        if (target && container.contains(target)) {
            handler(event, target);
        }
    };
    container.addEventListener(eventName, delegateHandler);
    return () => container.removeEventListener(eventName, delegateHandler);
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
export function trackEvents() {
    const cleanupFunctions = [];
    // ── Core dispatcher ───────────────────────────────────────────────────────
    function tracker(first, second, third) {
        if (isWireAction(first) && typeof second === 'function') {
            // events(wireAction, handler)
            cleanupFunctions.push(on(first.element, first.event, second));
        }
        else if (typeof second === 'string' && typeof third === 'function') {
            // events(element | selector | Window, 'eventName', handler)
            cleanupFunctions.push(on(first, second, third));
        }
        else {
            console.warn('[trackEvents] Unrecognised call signature. Use events(wireAction, handler) or events(element, eventName, handler).');
        }
    }
    // ── Named shorthand methods ───────────────────────────────────────────────
    tracker.on = function (sel, eventName, handler) {
        cleanupFunctions.push(on(sel, eventName, handler));
    };
    tracker.add = tracker.on;
    tracker.onClick = (sel, h) => { cleanupFunctions.push(onClick(sel, h)); };
    tracker.onChange = (sel, h) => { cleanupFunctions.push(onChange(sel, h)); };
    tracker.onInput = (sel, h) => { cleanupFunctions.push(onInput(sel, h)); };
    tracker.onSubmit = (sel, h) => { cleanupFunctions.push(onSubmit(sel, h)); };
    tracker.onKeydown = (sel, h) => { cleanupFunctions.push(onKeydown(sel, h)); };
    tracker.onKeyup = (sel, h) => { cleanupFunctions.push(onKeyup(sel, h)); };
    tracker.onFocus = (sel, h) => { cleanupFunctions.push(onFocus(sel, h)); };
    tracker.onBlur = (sel, h) => { cleanupFunctions.push(onBlur(sel, h)); };
    tracker.onFocusin = (sel, h) => { cleanupFunctions.push(onFocusin(sel, h)); };
    tracker.onFocusout = (sel, h) => { cleanupFunctions.push(onFocusout(sel, h)); };
    tracker.onScroll = (sel, h) => { cleanupFunctions.push(onScroll(sel, h)); };
    tracker.onMouseenter = (sel, h) => { cleanupFunctions.push(onMouseenter(sel, h)); };
    tracker.onMouseleave = (sel, h) => { cleanupFunctions.push(onMouseleave(sel, h)); };
    tracker.onDblclick = (sel, h) => { cleanupFunctions.push(onDblclick(sel, h)); };
    tracker.delegate = function (containerSelector, eventName, targetSelector, handler) {
        cleanupFunctions.push(delegate(containerSelector, eventName, targetSelector, handler));
    };
    tracker.cleanup = function () {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
    };
    registerPageCleanup(() => tracker.cleanup());
    return tracker;
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
    const unsubscribers = [];
    return {
        /**
         * Register a state watcher unsubscribe function.
         * Pass the return value of any .watch() call directly.
         * @example subs.watch(myState.watch(val => doSomething(val)));
         */
        watch(unsubscribe) {
            unsubscribers.push(unsubscribe);
        },
        cleanup() {
            unsubscribers.forEach(fn => fn());
            unsubscribers.length = 0;
        }
    };
}

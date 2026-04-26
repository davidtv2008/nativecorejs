/**
 * State Management - React-like useState API
 * Provides intuitive reactive state management for components
 */
import { registerPageCleanup } from './pageCleanupRegistry.js';
// Global tracker for dependency collection
let currentTracker = null;
const DEFAULT_EFFECT_MAX_RUNS_PER_FLUSH = 1000;
const EFFECT_LOOP_GUARD_EVENT = 'nativecore:effect-loop-guard';
// ─── Batch support ───────────────────────────────────────────────────────────
let batchDepth = 0;
const pendingNotifications = new Set();
let currentFlushId = 0;
let notificationDepth = 0;
function runNotificationFlush(fn) {
    const isRootFlush = notificationDepth === 0;
    if (isRootFlush)
        currentFlushId++;
    notificationDepth++;
    try {
        fn();
    }
    finally {
        notificationDepth--;
    }
}
function reportEffectLoopGuard(detail) {
    console.warn(`[NativeCore] effect loop guard tripped after ${detail.runs} runs in a single update cycle (threshold: ${detail.threshold}). Effect disposed.`);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EFFECT_LOOP_GUARD_EVENT, {
            detail,
        }));
    }
}
/**
 * Execute `fn` and defer all state-change notifications until it returns.
 * Multiple writes inside a single batch fire each subscriber at most once.
 *
 * @example
 * batch(() => {
 *   user.value = fetchedUser;
 *   loading.value = false;
 *   error.value = null;
 * }); // subscribers notified once, not three times
 */
export function batch(fn) {
    batchDepth++;
    try {
        fn();
    }
    finally {
        batchDepth--;
        if (batchDepth === 0) {
            const notifications = Array.from(pendingNotifications);
            pendingNotifications.clear();
            runNotificationFlush(() => {
                notifications.forEach(notify => notify());
            });
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
/** Recursively strip prototype-polluting keys from a value. */
function sanitizeValue(value) {
    if (value === null || typeof value !== 'object')
        return value;
    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item));
    }
    const obj = value;
    let needsClean = false;
    for (const key of Object.keys(obj)) {
        if (FORBIDDEN_KEYS.has(key)) {
            needsClean = true;
            break;
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            needsClean = true;
            break;
        }
    }
    if (!needsClean)
        return value;
    const clean = {};
    for (const key of Object.keys(obj)) {
        if (FORBIDDEN_KEYS.has(key))
            continue;
        clean[key] = sanitizeValue(obj[key]);
    }
    return clean;
}
/**
 * Create a reactive state (React-like useState)
 */
function createState(initialValue) {
    let currentValue = sanitizeValue(initialValue);
    const subscribers = new Set();
    const state = {
        // Getter/setter for value property
        get value() {
            return currentValue;
        },
        set value(newValue) {
            const safe = sanitizeValue(newValue);
            if (Object.is(currentValue, safe))
                return;
            currentValue = safe;
            notify();
        },
        // Set method (supports updater function like React)
        set(valueOrUpdater) {
            const rawValue = typeof valueOrUpdater === 'function'
                ? valueOrUpdater(currentValue)
                : valueOrUpdater;
            const newValue = sanitizeValue(rawValue);
            if (Object.is(currentValue, newValue))
                return;
            currentValue = newValue;
            notify();
        },
        // Watch for changes (like useEffect watching a dependency)
        watch(callback) {
            const wrappedCallback = () => callback(currentValue);
            subscribers.add(wrappedCallback);
            // Return unsubscribe function
            return () => subscribers.delete(wrappedCallback);
        }
    };
    function notify() {
        if (batchDepth > 0) {
            subscribers.forEach(fn => pendingNotifications.add(fn));
        }
        else {
            runNotificationFlush(() => {
                subscribers.forEach(fn => fn());
            });
        }
    }
    return state;
}
/**
 * Enhanced useState that tracks accesses for computed values
 */
export function useState(initialValue) {
    const state = createState(initialValue);
    // Wrap the getter to track accesses
    const trackedState = {
        get value() {
            // If we're inside a computed, track this dependency
            if (currentTracker) {
                currentTracker.accessed.add(state);
            }
            return state.value;
        },
        set value(newValue) {
            state.value = newValue;
        },
        set: state.set.bind(state),
        watch: state.watch.bind(state)
    };
    return trackedState;
}
/**
 * Create a computed/derived state from other states
 * Automatically tracks dependencies and recalculates when they change
 */
export function computed(computeFn) {
    const derivedState = createState(undefined);
    const trackedDeps = new Set();
    const depUnsubscribers = new Map();
    let isComputing = false;
    // Create a proxy to track which states are accessed
    const tracker = {
        accessed: new Set()
    };
    // Initial computation
    recompute();
    function recompute() {
        if (isComputing)
            return; // Prevent infinite loops
        isComputing = true;
        tracker.accessed.clear();
        currentTracker = tracker;
        try {
            const newValue = computeFn();
            derivedState.value = newValue;
        }
        finally {
            currentTracker = null;
            isComputing = false;
        }
        syncTrackedDependencies(trackedDeps, tracker.accessed, depUnsubscribers, recompute);
    }
    function dispose() {
        depUnsubscribers.forEach(unsub => unsub());
        depUnsubscribers.clear();
        trackedDeps.clear();
    }
    const computedState = {
        get value() {
            // Track this access if we're inside another computed
            if (currentTracker) {
                currentTracker.accessed.add(derivedState);
            }
            return derivedState.value;
        },
        watch: derivedState.watch.bind(derivedState),
        dispose,
        // Read-only, no setter
        set value(_) {
            console.warn('Computed values are read-only. Cannot set value directly.');
        }
    };
    registerPageCleanup(dispose);
    return computedState;
}
/**
 * Run a reactive side effect that automatically tracks accessed state dependencies.
 *
 * @param effectFn Effect callback that can optionally return a cleanup function.
 * @returns A disposer that unsubscribes all tracked dependencies and runs the latest cleanup.
 */
export function effect(effectFn, options = {}) {
    const trackedDeps = new Set();
    const depUnsubscribers = new Map();
    const tracker = {
        accessed: new Set()
    };
    let cleanup;
    let isRunning = false;
    let isDisposed = false;
    let lastFlushId = -1;
    let runsThisFlush = 0;
    const maxRunsPerFlush = options.maxRunsPerFlush ?? DEFAULT_EFFECT_MAX_RUNS_PER_FLUSH;
    const disposer = () => {
        if (isDisposed)
            return;
        isDisposed = true;
        if (typeof cleanup === 'function') {
            cleanup();
        }
        depUnsubscribers.forEach(unsub => unsub());
        depUnsubscribers.clear();
        trackedDeps.clear();
    };
    runEffect();
    registerPageCleanup(disposer);
    return disposer;
    function runEffect() {
        if (isDisposed || isRunning)
            return;
        const flushId = currentFlushId;
        if (flushId !== lastFlushId) {
            lastFlushId = flushId;
            runsThisFlush = 0;
        }
        runsThisFlush++;
        if (maxRunsPerFlush > 0 && runsThisFlush > maxRunsPerFlush) {
            reportEffectLoopGuard({
                threshold: maxRunsPerFlush,
                runs: runsThisFlush,
                ts: Date.now(),
            });
            disposer();
            return;
        }
        isRunning = true;
        tracker.accessed.clear();
        currentTracker = tracker;
        try {
            if (typeof cleanup === 'function') {
                cleanup();
            }
            cleanup = effectFn();
        }
        finally {
            currentTracker = null;
            isRunning = false;
        }
        syncTrackedDependencies(trackedDeps, tracker.accessed, depUnsubscribers, runEffect);
    }
}
function syncTrackedDependencies(trackedDeps, nextDeps, depUnsubscribers, onDependencyChange) {
    trackedDeps.forEach(dep => {
        if (!nextDeps.has(dep)) {
            depUnsubscribers.get(dep)?.();
            depUnsubscribers.delete(dep);
            trackedDeps.delete(dep);
        }
    });
    nextDeps.forEach(dep => {
        if (!trackedDeps.has(dep)) {
            trackedDeps.add(dep);
            depUnsubscribers.set(dep, dep.watch(() => onDependencyChange()));
        }
    });
}

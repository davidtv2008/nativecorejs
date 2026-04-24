import { registerPageCleanup } from './pageCleanupRegistry.js';

export interface State<T> {
    value: T;
    set(value: T | ((prev: T) => T)): void;
    watch(callback: (value: T) => void): () => void;
}

export interface ComputedState<T> {
    readonly value: T;
    watch(callback: (value: T) => void): () => void;
    dispose(): void;
}

export type EffectCleanup = void | (() => void);
export type EffectCallback = () => EffectCleanup;

export interface EffectOptions {
    /**
     * Maximum number of times an effect may run in a single notification flush.
     * Use 0 to disable the guard intentionally.
     */
    maxRunsPerFlush?: number;
}

export interface EffectLoopGuardDetail {
    threshold: number;
    runs: number;
    ts: number;
}

interface Watchable<T = any> {
    watch(callback: (value: T) => void): () => void;
}

interface Tracker {
    accessed: Set<Watchable<unknown>>;
}

type Unsubscribe = () => void;

let currentTracker: Tracker | null = null;
const DEFAULT_EFFECT_MAX_RUNS_PER_FLUSH = 1000;
const EFFECT_LOOP_GUARD_EVENT = 'nativecore:effect-loop-guard';

// ─── Batch support ───────────────────────────────────────────────────────────
let batchDepth = 0;
const pendingNotifications = new Set<() => void>();
let currentFlushId = 0;
let notificationDepth = 0;

function runNotificationFlush(fn: () => void): void {
    const isRootFlush = notificationDepth === 0;
    if (isRootFlush) currentFlushId++;
    notificationDepth++;
    try {
        fn();
    } finally {
        notificationDepth--;
    }
}

function reportEffectLoopGuard(detail: EffectLoopGuardDetail): void {
    console.warn(
        `[NativeCore] effect loop guard tripped after ${detail.runs} runs in a single update cycle (threshold: ${detail.threshold}). Effect disposed.`
    );

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent<EffectLoopGuardDetail>(EFFECT_LOOP_GUARD_EVENT, {
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
export function batch(fn: () => void): void {
    batchDepth++;
    try {
        fn();
    } finally {
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
function sanitizeValue<T>(value: T): T {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item)) as T;
    }
    const obj = value as Record<string, unknown>;
    let needsClean = false;
    for (const key of Object.keys(obj)) {
        if (FORBIDDEN_KEYS.has(key)) { needsClean = true; break; }
        if (typeof obj[key] === 'object' && obj[key] !== null) { needsClean = true; break; }
    }
    if (!needsClean) return value;
    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
        if (FORBIDDEN_KEYS.has(key)) continue;
        clean[key] = sanitizeValue(obj[key]);
    }
    return clean as T;
}

function createState<T>(initialValue: T): State<T> {
    let currentValue = sanitizeValue(initialValue);
    const subscribers = new Set<() => void>();

    const state = {
        get value(): T {
            return currentValue;
        },
        set value(newValue: T) {
            const safe = sanitizeValue(newValue);
            if (Object.is(currentValue, safe)) return;
            currentValue = safe;
            notify();
        },
        set(valueOrUpdater: T | ((prev: T) => T)): void {
            const rawValue = typeof valueOrUpdater === 'function'
                ? (valueOrUpdater as (prev: T) => T)(currentValue)
                : valueOrUpdater;

            const newValue = sanitizeValue(rawValue);
            if (Object.is(currentValue, newValue)) return;
            currentValue = newValue;
            notify();
        },
        watch(callback: (value: T) => void): Unsubscribe {
            const wrappedCallback = () => callback(currentValue);
            subscribers.add(wrappedCallback);
            return () => subscribers.delete(wrappedCallback);
        }
    };

    function notify(): void {
        if (batchDepth > 0) {
            subscribers.forEach(fn => pendingNotifications.add(fn));
        } else {
            runNotificationFlush(() => {
                subscribers.forEach(fn => fn());
            });
        }
    }

    return state;
}

export function useState<T>(initialValue: T): State<T> {
    const state = createState(initialValue);

    const trackedState: State<T> = {
        get value(): T {
            if (currentTracker) {
                currentTracker.accessed.add(state);
            }
            return state.value;
        },
        set value(newValue: T) {
            state.value = newValue;
        },
        set: state.set.bind(state),
        watch: state.watch.bind(state)
    };

    return trackedState;
}

export function computed<T>(computeFn: () => T): ComputedState<T> {
    const derivedState = createState<T>(undefined as T);
    const trackedDeps = new Set<Watchable<any>>();
    const depUnsubscribers = new Map<Watchable<any>, () => void>();
    let isComputing = false;

    const tracker: Tracker = {
        accessed: new Set()
    };

    recompute();

    function recompute(): void {
        if (isComputing) return;
        isComputing = true;

        tracker.accessed.clear();
        currentTracker = tracker;

        try {
            const newValue = computeFn();
            derivedState.value = newValue;
        } finally {
            currentTracker = null;
            isComputing = false;
        }

        syncTrackedDependencies(trackedDeps, tracker.accessed, depUnsubscribers, recompute);
    }

    function dispose(): void {
        depUnsubscribers.forEach(unsub => unsub());
        depUnsubscribers.clear();
        trackedDeps.clear();
    }

    const computedState: ComputedState<T> = {
        get value(): T {
            if (currentTracker) {
                currentTracker.accessed.add(derivedState);
            }
            return derivedState.value;
        },
        watch: derivedState.watch.bind(derivedState),
        dispose,
        set value(_: T) {
            console.warn('Computed values are read-only. Cannot set value directly.');
        }
    };

    registerPageCleanup(dispose);
    return computedState;
}

export function effect(effectFn: EffectCallback, options: EffectOptions = {}): () => void {
    const trackedDeps = new Set<Watchable<any>>();
    const depUnsubscribers = new Map<Watchable<any>, () => void>();
    const tracker: Tracker = {
        accessed: new Set()
    };
    let cleanup: EffectCleanup;
    let isRunning = false;
    let isDisposed = false;
    let lastFlushId = -1;
    let runsThisFlush = 0;
    const maxRunsPerFlush = options.maxRunsPerFlush ?? DEFAULT_EFFECT_MAX_RUNS_PER_FLUSH;

    const disposer = () => {
        if (isDisposed) return;
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

    function runEffect(): void {
        if (isDisposed || isRunning) return;

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
        } finally {
            currentTracker = null;
            isRunning = false;
        }

        syncTrackedDependencies(trackedDeps, tracker.accessed, depUnsubscribers, runEffect);
    }
}

function syncTrackedDependencies(
    trackedDeps: Set<Watchable<any>>,
    nextDeps: Set<Watchable<any>>,
    depUnsubscribers: Map<Watchable<any>, () => void>,
    onDependencyChange: () => void
): void {
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

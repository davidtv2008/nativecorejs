/**
 * State Management - React-like useState API
 * Provides intuitive reactive state management for components
 */

// Types
export interface State<T> {
    value: T;
    set(value: T | ((prev: T) => T)): void;
    watch(callback: (value: T) => void): () => void;
}

export interface ComputedState<T> {
    readonly value: T;
    watch(callback: (value: T) => void): () => void;
    /** Release all dependency subscriptions. Call when the computed is no longer needed. */
    dispose(): void;
}

export type EffectCleanup = void | (() => void);
export type EffectCallback = () => EffectCleanup;

interface Watchable<T = any> {
    watch(callback: (value: T) => void): () => void;
}

interface Tracker {
    accessed: Set<Watchable<unknown>>;
}

type Unsubscribe = () => void;

// Global tracker for dependency collection
let currentTracker: Tracker | null = null;

/**
 * Create a reactive state (React-like useState)
 */
function createState<T>(initialValue: T): State<T> {
    let _value = initialValue;
    const subscribers = new Set<() => void>();

    const state = {
        // Getter/setter for value property
        get value(): T {
            return _value;
        },
        set value(newValue: T) {
            if (Object.is(_value, newValue)) return;
            _value = newValue;
            notify();
        },
        
        // Set method (supports updater function like React)
        set(valueOrUpdater: T | ((prev: T) => T)): void {
            const newValue = typeof valueOrUpdater === 'function' 
                ? (valueOrUpdater as (prev: T) => T)(_value)
                : valueOrUpdater;
            
            if (Object.is(_value, newValue)) return;
            _value = newValue;
            notify();
        },
        
        // Watch for changes (like useEffect watching a dependency)
        watch(callback: (value: T) => void): Unsubscribe {
            const wrappedCallback = () => callback(_value);
            subscribers.add(wrappedCallback);
            
            // Return unsubscribe function
            return () => subscribers.delete(wrappedCallback);
        }
    };

    function notify(): void {
        subscribers.forEach(fn => fn());
    }

    return state;
}

/**
 * Enhanced useState that tracks accesses for computed values
 */
export function useState<T>(initialValue: T): State<T> {
    const state = createState(initialValue);
    
    // Wrap the getter to track accesses
    const trackedState: State<T> = {
        get value(): T {
            // If we're inside a computed, track this dependency
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

/**
 * Create multiple states at once
 */
export function createStates<T extends Record<string, any>>(
    initialStates: T
): { [K in keyof T]: State<T[K]> } {
    const states: any = {};
    for (const [key, value] of Object.entries(initialStates)) {
        states[key] = useState(value);
    }
    return states;
}

/**
 * Create a computed/derived state from other states
 * Automatically tracks dependencies and recalculates when they change
 */
export function computed<T>(computeFn: () => T): ComputedState<T> {
    const derivedState = createState<T>(undefined as T);
    const trackedDeps = new Set<Watchable<any>>();
    const depUnsubscribers = new Map<Watchable<any>, () => void>();
    let isComputing = false;

    // Create a proxy to track which states are accessed
    const tracker: Tracker = {
        accessed: new Set()
    };

    // Initial computation
    recompute();

    function recompute(): void {
        if (isComputing) return; // Prevent infinite loops
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
    
    return {
        get value(): T {
            // Track this access if we're inside another computed
            if (currentTracker) {
                currentTracker.accessed.add(derivedState);
            }
            return derivedState.value;
        },
        watch: derivedState.watch.bind(derivedState),
        dispose,
        // Read-only, no setter
        set value(_: T) {
            console.warn('Computed values are read-only. Cannot set value directly.');
        }
    };
}

/**
 * Run a reactive side effect that automatically tracks accessed state dependencies.
 *
 * @param effectFn Effect callback that can optionally return a cleanup function.
 * @returns A disposer that unsubscribes all tracked dependencies and runs the latest cleanup.
 */
export function effect(effectFn: EffectCallback): () => void {
    const trackedDeps = new Set<Watchable<any>>();
    const depUnsubscribers = new Map<Watchable<any>, () => void>();
    const tracker: Tracker = {
        accessed: new Set()
    };
    let cleanup: EffectCleanup;
    let isRunning = false;

    runEffect();

    return () => {
        if (typeof cleanup === 'function') {
            cleanup();
        }

        depUnsubscribers.forEach(unsub => unsub());
        depUnsubscribers.clear();
        trackedDeps.clear();
    };

    function runEffect(): void {
        if (isRunning) return;
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

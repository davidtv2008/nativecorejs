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

interface Watchable<T = any> {
    watch(callback: (value: T) => void): () => void;
}

interface Tracker {
    accessed: Set<Watchable<unknown>>;
}

type Unsubscribe = () => void;

let currentTracker: Tracker | null = null;

function createState<T>(initialValue: T): State<T> {
    let currentValue = initialValue;
    const subscribers = new Set<() => void>();

    const state = {
        get value(): T {
            return currentValue;
        },
        set value(newValue: T) {
            if (Object.is(currentValue, newValue)) return;
            currentValue = newValue;
            notify();
        },
        set(valueOrUpdater: T | ((prev: T) => T)): void {
            const newValue = typeof valueOrUpdater === 'function'
                ? (valueOrUpdater as (prev: T) => T)(currentValue)
                : valueOrUpdater;

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
        subscribers.forEach(fn => fn());
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

export function createStates<T extends Record<string, any>>(
    initialStates: T
): { [K in keyof T]: State<T[K]> } {
    const states: any = {};
    for (const [key, value] of Object.entries(initialStates)) {
        states[key] = useState(value);
    }
    return states;
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

    return {
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
}

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

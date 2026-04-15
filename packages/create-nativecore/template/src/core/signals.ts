/**
 * Signals - Fine-Grained Reactivity System
 */

export interface Signal<T> {
    get(): T;
    set(value: T): void;
    subscribe(fn: () => void): () => void;
}

interface SignalTracker {
    accessed: Set<Signal<any>>;
}

let currentTracker: SignalTracker | null = null;

export function createSignal<T>(initialValue: T): Signal<T> {
    let value = initialValue;
    const subscribers = new Set<() => void>();

    const signal: Signal<T> = {
        get(): T {
            if (currentTracker) {
                currentTracker.accessed.add(signal);
            }
            return value;
        },
        set(nextValue: T): void {
            if (Object.is(value, nextValue)) return;
            value = nextValue;
            subscribers.forEach(fn => fn());
        },
        subscribe(callback: () => void): () => void {
            subscribers.add(callback);
            return () => subscribers.delete(callback);
        }
    };

    return signal;
}

export function useState<T>(
    initialValue: T, 
    onChange?: (value: T) => void
): [() => T, (value: T) => void] {
    const signal = createSignal(initialValue);
    
    if (onChange) {
        signal.subscribe(() => onChange(signal.get()));
    }
    
    return [
        () => signal.get(),
        (value: T) => signal.set(value)
    ];
}

export function createComputed<T>(computeFn: () => T): () => T {
    let value = undefined as T;
    const trackedDeps = new Set<Signal<any>>();
    const unsubscribers = new Map<Signal<any>, () => void>();
    const tracker: SignalTracker = {
        accessed: new Set()
    };
    let isComputing = false;

    recompute();

    return () => value;

    function recompute(): void {
        if (isComputing) return;
        isComputing = true;

        tracker.accessed.clear();
        currentTracker = tracker;

        try {
            value = computeFn();
        } finally {
            currentTracker = null;
            isComputing = false;
        }

        syncTrackedSignals(trackedDeps, tracker.accessed, unsubscribers, recompute);
    }
}

export function createEffect(effectFn: () => void | (() => void)): () => void {
    let cleanup: void | (() => void);
    const trackedDeps = new Set<Signal<any>>();
    const unsubscribers = new Map<Signal<any>, () => void>();
    const tracker: SignalTracker = {
        accessed: new Set()
    };
    let isRunning = false;

    execute();

    return () => {
        if (typeof cleanup === 'function') cleanup();
        unsubscribers.forEach(unsub => unsub());
        unsubscribers.clear();
        trackedDeps.clear();
    };

    function execute(): void {
        if (isRunning) return;
        isRunning = true;

        tracker.accessed.clear();
        currentTracker = tracker;

        try {
            if (typeof cleanup === 'function') cleanup();
            cleanup = effectFn();
        } finally {
            currentTracker = null;
            isRunning = false;
        }

        syncTrackedSignals(trackedDeps, tracker.accessed, unsubscribers, execute);
    }
}

function syncTrackedSignals(
    trackedDeps: Set<Signal<any>>,
    nextDeps: Set<Signal<any>>,
    unsubscribers: Map<Signal<any>, () => void>,
    onDependencyChange: () => void
): void {
    trackedDeps.forEach(dep => {
        if (!nextDeps.has(dep)) {
            unsubscribers.get(dep)?.();
            unsubscribers.delete(dep);
            trackedDeps.delete(dep);
        }
    });

    nextDeps.forEach(dep => {
        if (!trackedDeps.has(dep)) {
            trackedDeps.add(dep);
            unsubscribers.set(dep, dep.subscribe(onDependencyChange));
        }
    });
}

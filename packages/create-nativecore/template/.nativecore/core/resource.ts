import { effect, useState, type State } from './state.js';
import { registerPageCleanup } from './pageCleanupRegistry.js';

export interface Resource<T> {
    data: State<T | undefined>;
    loading: State<boolean>;
    error: State<Error | null>;
    refetch(): Promise<void>;
}

export interface ResourceOptions<S> {
    source?: State<S> | (() => S);
    pageCleanup?: boolean;
}

function readSource<S>(source: State<S> | (() => S) | undefined): S {
    if (source == null) return undefined as S;
    if (typeof source === 'function') return source();
    return source.value;
}

/**
 * Async data cell: `{ data, loading, error, refetch }`.
 * Re-fetches when `source` changes. Aborts the in-flight request on
 * source change, refetch, and (by default) page navigation.
 */
export function resource<T, S = undefined>(
    fetcher: (source: S, signal: AbortSignal) => Promise<T>,
    options: ResourceOptions<S> = {}
): Resource<T> {
    const data = useState<T | undefined>(undefined);
    const loading = useState(false);
    const error = useState<Error | null>(null);

    let generation = 0;
    let controller: AbortController | null = null;

    async function run(sourceValue: S): Promise<void> {
        controller?.abort();
        const next = new AbortController();
        controller = next;
        const token = ++generation;

        loading.value = true;
        error.value = null;

        try {
            const result = await fetcher(sourceValue, next.signal);
            if (token !== generation || next.signal.aborted) return;
            data.value = result;
            error.value = null;
        } catch (err) {
            if (token !== generation || next.signal.aborted) return;
            error.value = err instanceof Error ? err : new Error(String(err));
        } finally {
            if (token === generation) loading.value = false;
        }
    }

    function refetch(): Promise<void> {
        return run(readSource(options.source));
    }

    let stopSource: (() => void) | undefined;
    if (options.source) {
        stopSource = effect(() => {
            const value = readSource(options.source);
            void run(value);
        }, { pageCleanup: false });
    } else {
        void run(undefined as S);
    }

    const dispose = () => {
        generation += 1;
        controller?.abort();
        stopSource?.();
    };

    if (options.pageCleanup !== false) registerPageCleanup(dispose);

    return { data, loading, error, refetch };
}

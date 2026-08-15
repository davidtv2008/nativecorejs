import { useState, type State } from '../core/state.js';

/**
 * Call `fn` when a pointerdown happens outside `el` (and its descendants).
 */
export function clickOutside(el: Element, fn: (event: Event) => void): () => void {
    const onPointerDown = (event: Event) => {
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (el.contains(target)) return;
        fn(event);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
}

export interface MediaQueryHandle {
    matches: State<boolean>;
    dispose(): void;
}

/**
 * Reactive `window.matchMedia` wrapper. `matches` updates when the query changes.
 */
export function mediaQuery(query: string): MediaQueryHandle {
    const mq = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query)
        : null;
    const matches = useState(mq?.matches ?? false);

    const onChange = (event: MediaQueryListEvent) => {
        matches.value = event.matches;
    };

    mq?.addEventListener('change', onChange);

    return {
        matches,
        dispose() {
            mq?.removeEventListener('change', onChange);
        },
    };
}

export interface ObserveOptions {
    resize?: (entry: ResizeObserverEntry) => void;
    intersect?: (entry: IntersectionObserverEntry) => void;
    threshold?: number | number[];
    root?: Element | null;
    rootMargin?: string;
}

/**
 * Attach ResizeObserver and/or IntersectionObserver. Returns a disposer.
 */
export function observe(el: Element, options: ObserveOptions): () => void {
    const disposers: Array<() => void> = [];

    if (options.resize && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) options.resize?.(entry);
        });
        ro.observe(el);
        disposers.push(() => ro.disconnect());
    }

    if (options.intersect && typeof IntersectionObserver !== 'undefined') {
        const io = new IntersectionObserver(entries => {
            const entry = entries[0];
            if (entry) options.intersect?.(entry);
        }, {
            threshold: options.threshold,
            root: options.root,
            rootMargin: options.rootMargin,
        });
        io.observe(el);
        disposers.push(() => io.disconnect());
    }

    return () => disposers.forEach(fn => fn());
}

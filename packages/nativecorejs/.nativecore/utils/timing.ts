export type Debounced<T extends (...args: any[]) => void> = T & { cancel(): void };

/**
 * Delay `fn` until `wait` ms have passed without another call.
 * `.cancel()` clears a pending invocation.
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300): Debounced<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const wrapped = ((...args: Parameters<T>) => {
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = undefined;
            fn(...args);
        }, wait);
    }) as Debounced<T>;

    wrapped.cancel = () => {
        if (timer === undefined) return;
        clearTimeout(timer);
        timer = undefined;
    };

    return wrapped;
}

import { describe, expect, it, vi } from 'vitest';
import { createComputed, createEffect, createSignal } from '../../src/core/signals.js';

describe('core/signals', () => {
    it('keeps computed values live when source signals change', () => {
        const count = createSignal(2);
        const doubled = createComputed(() => count.get() * 2);

        expect(doubled()).toBe(4);

        count.set(5);
        expect(doubled()).toBe(10);
    });

    it('releases stale dependencies when a computed branch changes', () => {
        const toggle = createSignal(true);
        const left = createSignal('left');
        const right = createSignal('right');
        const branch = createComputed(() => (toggle.get() ? left.get() : right.get()));

        expect(branch()).toBe('left');

        toggle.set(false);
        expect(branch()).toBe('right');

        left.set('updated-left');
        expect(branch()).toBe('right');

        right.set('updated-right');
        expect(branch()).toBe('updated-right');
    });

    it('tracks effects and runs cleanup before rerunning', () => {
        const count = createSignal(1);
        const seen: number[] = [];
        const cleanup = vi.fn();
        const stop = createEffect(() => {
            seen.push(count.get());
            return cleanup;
        });

        expect(seen).toEqual([1]);

        count.set(2);
        expect(seen).toEqual([1, 2]);
        expect(cleanup).toHaveBeenCalledTimes(1);

        stop();
        expect(cleanup).toHaveBeenCalledTimes(2);

        count.set(3);
        expect(seen).toEqual([1, 2]);
    });
});
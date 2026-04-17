import { describe, expect, it, vi } from 'vitest';
import { useSignal, computed, effect } from '../../src/core/state.js';

describe('core/state – useSignal (tuple API)', () => {
    it('keeps computed values live when source signals change', () => {
        const [count, setCount] = useSignal(2);
        const doubled = computed(() => count() * 2);

        expect(doubled.value).toBe(4);

        setCount(5);
        expect(doubled.value).toBe(10);
    });

    it('releases stale dependencies when a computed branch changes', () => {
        const [toggle, setToggle] = useSignal(true);
        const [left, setLeft] = useSignal('left');
        const [right, setRight] = useSignal('right');
        const branch = computed(() => (toggle() ? left() : right()));

        expect(branch.value).toBe('left');

        setToggle(false);
        expect(branch.value).toBe('right');

        setLeft('updated-left');
        expect(branch.value).toBe('right');

        setRight('updated-right');
        expect(branch.value).toBe('updated-right');
    });

    it('tracks effects and runs cleanup before rerunning', () => {
        const [count, setCount] = useSignal(1);
        const seen: number[] = [];
        const cleanup = vi.fn();
        const stop = effect(() => {
            seen.push(count());
            return cleanup;
        });

        expect(seen).toEqual([1]);

        setCount(2);
        expect(seen).toEqual([1, 2]);
        expect(cleanup).toHaveBeenCalledTimes(1);

        stop();
        expect(cleanup).toHaveBeenCalledTimes(2);

        setCount(3);
        expect(seen).toEqual([1, 2]);
    });
});
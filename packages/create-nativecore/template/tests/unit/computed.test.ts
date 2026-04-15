import { describe, it, expect, vi } from 'vitest';
import { computed, effect, useState } from '../../src/core/state.js';

describe('core/state', () => {
    it('computes an initial value and recomputes when dependencies change', () => {
        const firstName = useState('John');
        const lastName = useState('Doe');
        const fullName = computed(() => `${firstName.value} ${lastName.value}`);

        expect(fullName.value).toBe('John Doe');

        firstName.value = 'Jane';
        expect(fullName.value).toBe('Jane Doe');
    });

    it('releases stale dependencies when the computed branch changes', () => {
        const toggle = useState(true);
        const left = useState('left');
        const right = useState('right');
        const branch = computed(() => (toggle.value ? left.value : right.value));

        expect(branch.value).toBe('left');

        toggle.value = false;
        expect(branch.value).toBe('right');

        left.value = 'updated-left';
        expect(branch.value).toBe('right');

        right.value = 'updated-right';
        expect(branch.value).toBe('updated-right');
    });

    it('chains computed values', () => {
        const base = useState(2);
        const doubled = computed(() => base.value * 2);
        const quadrupled = computed(() => doubled.value * 2);

        expect(quadrupled.value).toBe(8);

        base.value = 5;
        expect(quadrupled.value).toBe(20);
    });

    it('keeps computed values read-only', () => {
        const base = useState(5);
        const doubled = computed(() => base.value * 2);
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        doubled.value = 100;

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Computed values are read-only'));
        expect(doubled.value).toBe(10);

        consoleSpy.mockRestore();
    });

    it('tracks reactive side effects and runs cleanup before re-running', () => {
        const count = useState(1);
        const calls: number[] = [];
        const cleanup = vi.fn();
        const stop = effect(() => {
            calls.push(count.value);
            return cleanup;
        });

        expect(calls).toEqual([1]);

        count.value = 2;
        expect(calls).toEqual([1, 2]);
        expect(cleanup).toHaveBeenCalledTimes(1);

        stop();
        expect(cleanup).toHaveBeenCalledTimes(2);

        count.value = 3;
        expect(calls).toEqual([1, 2]);
    });
});

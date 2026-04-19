/**
 * Unit tests for the NativeCoreJS reactive state module.
 *
 * Run with:  npx vitest run src/__tests__/state.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the module-level functions directly from the source file.
// The .nativecore copy is the canonical runtime; the src/core copy
// mirrors it for the npm package.  We test the runtime copy here.
import {
    useState,
    computed,
    effect,
    batch,
    useSignal,
} from '../../.nativecore/core/state.js';

// ─── useState ────────────────────────────────────────────────────────────────

describe('useState', () => {
    it('returns the initial value', () => {
        const s = useState(42);
        expect(s.value).toBe(42);
    });

    it('updates value via assignment', () => {
        const s = useState(0);
        s.value = 10;
        expect(s.value).toBe(10);
    });

    it('updates value via .set()', () => {
        const s = useState(5);
        s.set(20);
        expect(s.value).toBe(20);
    });

    it('supports updater function in .set()', () => {
        const s = useState(3);
        s.set(n => n * 2);
        expect(s.value).toBe(6);
    });

    it('notifies .watch() subscribers on change', () => {
        const s = useState('a');
        const spy = vi.fn();
        s.watch(spy);
        s.value = 'b';
        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith('b');
    });

    it('does not notify when value is unchanged', () => {
        const s = useState(1);
        const spy = vi.fn();
        s.watch(spy);
        s.value = 1; // same value
        expect(spy).not.toHaveBeenCalled();
    });

    it('unsubscribe returned by .watch() stops notifications', () => {
        const s = useState(0);
        const spy = vi.fn();
        const unsub = s.watch(spy);
        s.value = 1;
        unsub();
        s.value = 2;
        expect(spy).toHaveBeenCalledOnce(); // only the first write
    });
});

// ─── sanitizeValue (via useState) ────────────────────────────────────────────

describe('sanitizeValue (prototype pollution protection)', () => {
    it('strips __proto__ from a set value', () => {
        const s = useState<Record<string, unknown>>({});
        const poisoned = JSON.parse('{"__proto__":{"polluted":true},"safe":1}');
        s.value = poisoned;
        expect(s.value).not.toHaveProperty('__proto__');
        expect((s.value as Record<string, unknown>).safe).toBe(1);
    });

    it('strips constructor from a set value', () => {
        const s = useState<Record<string, unknown>>({});
        s.value = { constructor: 'evil', data: 'ok' };
        expect((s.value as Record<string, unknown>).constructor).toBeUndefined();
        expect((s.value as Record<string, unknown>).data).toBe('ok');
    });

    it('strips prototype from a nested object', () => {
        const s = useState<Record<string, unknown>>({});
        s.value = { nested: { prototype: 'bad', value: 42 } };
        const nested = (s.value as Record<string, unknown>).nested as Record<string, unknown>;
        expect(nested.prototype).toBeUndefined();
        expect(nested.value).toBe(42);
    });

    it('preserves safe array values', () => {
        const s = useState<number[]>([]);
        s.value = [1, 2, 3];
        expect(s.value).toEqual([1, 2, 3]);
    });
});

// ─── batch ───────────────────────────────────────────────────────────────────

describe('batch', () => {
    it('defers notifications until the batch exits', () => {
        const a = useState(0);
        const b = useState(0);
        const spy = vi.fn();
        a.watch(spy);
        b.watch(spy);

        batch(() => {
            a.value = 1;
            b.value = 1;
            expect(spy).not.toHaveBeenCalled(); // still inside batch
        });

        expect(spy).toHaveBeenCalledTimes(2);
    });

    it('each subscriber fires at most once per state per batch', () => {
        const s = useState(0);
        const spy = vi.fn();
        s.watch(spy);

        batch(() => {
            s.value = 1;
            s.value = 2;
            s.value = 3;
        });

        // Only one notification per subscriber/state pair
        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(3);
    });

    it('supports nested batches — flushes only at outermost exit', () => {
        const s = useState(0);
        const spy = vi.fn();
        s.watch(spy);

        batch(() => {
            batch(() => {
                s.value = 5;
                expect(spy).not.toHaveBeenCalled();
            });
            // still inside outer batch
            expect(spy).not.toHaveBeenCalled();
        });

        expect(spy).toHaveBeenCalledOnce();
    });
});

// ─── computed ────────────────────────────────────────────────────────────────

describe('computed', () => {
    it('derives an initial value', () => {
        const s = useState(2);
        const doubled = computed(() => s.value * 2);
        expect(doubled.value).toBe(4);
        doubled.dispose();
    });

    it('reacts to dependency changes', () => {
        const s = useState(3);
        const tripled = computed(() => s.value * 3);
        s.value = 4;
        expect(tripled.value).toBe(12);
        tripled.dispose();
    });

    it('notifies .watch() when recomputed', () => {
        const s = useState(1);
        const c = computed(() => s.value + 10);
        const spy = vi.fn();
        c.watch(spy);
        s.value = 5;
        expect(spy).toHaveBeenCalledWith(15);
        c.dispose();
    });

    it('dispose() stops recomputation', () => {
        const s = useState(0);
        let computeCount = 0;
        const c = computed(() => { computeCount++; return s.value; });
        const initial = computeCount; // 1 from setup
        c.dispose();
        s.value = 99;
        expect(computeCount).toBe(initial); // no additional recompute
    });

    it('handles multiple dependencies', () => {
        const x = useState(2);
        const y = useState(3);
        const sum = computed(() => x.value + y.value);
        expect(sum.value).toBe(5);
        y.value = 10;
        expect(sum.value).toBe(12);
        sum.dispose();
    });
});

// ─── effect ──────────────────────────────────────────────────────────────────

describe('effect', () => {
    it('runs immediately on creation', () => {
        const spy = vi.fn();
        const s = useState(0);
        const stop = effect(() => { spy(s.value); });
        expect(spy).toHaveBeenCalledOnce();
        stop();
    });

    it('re-runs when a tracked dependency changes', () => {
        const s = useState(0);
        const spy = vi.fn();
        const stop = effect(() => { spy(s.value); });
        s.value = 1;
        expect(spy).toHaveBeenCalledTimes(2);
        stop();
    });

    it('calls cleanup function before re-run', () => {
        const cleanup = vi.fn();
        const s = useState(0);
        const stop = effect(() => {
            void s.value;
            return cleanup;
        });
        s.value = 1;
        expect(cleanup).toHaveBeenCalledOnce();
        stop();
    });

    it('disposer stops the effect', () => {
        const s = useState(0);
        const spy = vi.fn();
        const stop = effect(() => { spy(s.value); });
        stop();
        s.value = 99;
        expect(spy).toHaveBeenCalledOnce(); // only the initial run
    });
});

// ─── useSignal ───────────────────────────────────────────────────────────────

describe('useSignal', () => {
    it('returns a getter/setter tuple', () => {
        const [count, setCount] = useSignal(0);
        expect(count()).toBe(0);
        setCount(5);
        expect(count()).toBe(5);
    });

    it('supports updater function', () => {
        const [n, setN] = useSignal(10);
        setN(v => v + 1);
        expect(n()).toBe(11);
    });
});

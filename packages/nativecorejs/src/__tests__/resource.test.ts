import { describe, it, expect } from 'vitest';
import { resource } from '../../.nativecore/core/resource.js';
import { useState } from '../../.nativecore/core/state.js';

function waitFor(predicate: () => boolean, timeout = 500): Promise<void> {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const tick = () => {
            if (predicate()) {
                resolve();
                return;
            }
            if (Date.now() - start > timeout) {
                reject(new Error('waitFor timed out'));
                return;
            }
            setTimeout(tick, 5);
        };
        tick();
    });
}

describe('resource', () => {
    it('loads data from a one-shot fetcher', async () => {
        const box = resource(async () => 'ok');
        expect(box.loading.value).toBe(true);
        await waitFor(() => box.loading.value === false);
        expect(box.data.value).toBe('ok');
        expect(box.error.value).toBeNull();
    });

    it('records fetcher errors', async () => {
        const box = resource(async () => {
            throw new Error('nope');
        });
        await waitFor(() => box.loading.value === false);
        expect(box.error.value?.message).toBe('nope');
        expect(box.data.value).toBeUndefined();
    });

    it('refetches when source changes', async () => {
        const id = useState(1);
        const seen: number[] = [];
        const box = resource(async (source: number) => {
            seen.push(source);
            return `row-${source}`;
        }, { source: id });

        await waitFor(() => box.data.value === 'row-1');
        id.value = 2;
        await waitFor(() => box.data.value === 'row-2');
        expect(seen).toEqual([1, 2]);
    });

    it('refetch() runs the fetcher again', async () => {
        let n = 0;
        const box = resource(async () => {
            n += 1;
            return n;
        });
        await waitFor(() => box.data.value === 1);
        await box.refetch();
        expect(box.data.value).toBe(2);
    });
});

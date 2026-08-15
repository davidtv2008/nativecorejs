import { describe, it, expect, vi, afterEach } from 'vitest';
import { debounce } from '../../.nativecore/utils/timing.js';

describe('debounce', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('invokes the function after the wait window', () => {
        vi.useFakeTimers();
        const spy = vi.fn();
        const run = debounce(spy, 200);
        run('a');
        expect(spy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(199);
        expect(spy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith('a');
    });

    it('restarts the wait when called again', () => {
        vi.useFakeTimers();
        const spy = vi.fn();
        const run = debounce(spy, 100);
        run(1);
        vi.advanceTimersByTime(80);
        run(2);
        vi.advanceTimersByTime(80);
        expect(spy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(20);
        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(2);
    });

    it('cancel() prevents a pending invocation', () => {
        vi.useFakeTimers();
        const spy = vi.fn();
        const run = debounce(spy, 100);
        run();
        run.cancel();
        vi.advanceTimersByTime(200);
        expect(spy).not.toHaveBeenCalled();
    });
});

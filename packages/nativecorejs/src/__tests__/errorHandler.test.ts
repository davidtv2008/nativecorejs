import { describe, it, expect } from 'vitest';
import { handleError, onError } from '../../.nativecore/core/errorHandler.js';

describe('errorHandler', () => {
    it('notifies subscribers from handleError', () => {
        const seen: string[] = [];
        const stop = onError(info => {
            seen.push(info.message);
        });
        handleError('boom');
        expect(seen).toContain('boom');
        stop();
    });

    it('unsubscribe stops further notifications', () => {
        const seen: string[] = [];
        const stop = onError(info => {
            seen.push(info.message);
        });
        stop();
        handleError('after-unsub');
        expect(seen).not.toContain('after-unsub');
    });
});

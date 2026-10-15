/**
 * View Transitions abort when the document is hidden — must not crash the app.
 */
import { describe, it, expect } from 'vitest';
import { isBenignViewTransitionAbort } from '../../.nativecore/utils/viewTransitions.js';

describe('isBenignViewTransitionAbort', () => {
    it('recognizes the Chrome Document hidden abort message', () => {
        expect(isBenignViewTransitionAbort(
            new DOMException('Transition was aborted because of invalid state. Document hidden', 'InvalidStateError'),
        )).toBe(true);
    });

    it('does not treat unrelated errors as benign', () => {
        expect(isBenignViewTransitionAbort(new Error('Failed to fetch view HTML'))).toBe(false);
        expect(isBenignViewTransitionAbort('Document hidden for other reasons')).toBe(false);
    });
});

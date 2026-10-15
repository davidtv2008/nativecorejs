/**
 * Chrome / Chromium reject View Transition promises when the tab is hidden
 * ("Transition was aborted because of invalid state. Document hidden").
 * That is expected browser behavior, not an app failure.
 */
export function isBenignViewTransitionAbort(reason: unknown): boolean {
    const message = reason instanceof Error ? reason.message : String(reason ?? '');
    return /Transition was aborted because of invalid state/i.test(message);
}

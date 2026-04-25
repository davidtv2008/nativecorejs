/**
 * Home Controller
 * Reactively updates the primary landing CTA based on authentication status.
 */
import { wireContents, wireAttributes } from '@core-utils/wires.js';
import { trackEvents } from '@core-utils/events.js';
import auth from '@services/auth.service.js';

export async function homeController(): Promise<() => void> {

    // -- Setup ---------------------------------------------------------------
    const events = trackEvents();

    // -- Wires ---------------------------------------------------------------
    // Wire the CTA text and href declaratively to their [wire-content] /
    // [wire-attribute] counterparts in the view.
    const { ctaText } = wireContents();
    const { ctaHref } = wireAttributes();

    // -- Auth-aware CTA sync -------------------------------------------------
    const sync = () => {
        const authed = auth.isAuthenticated();
        ctaText.value = authed ? 'Go to Dashboard' : 'Read the Docs';
        ctaHref.value = authed ? '/dashboard' : '/docs';
    };

    sync();

    // Re-sync whenever the auth service dispatches an auth-change event
    // (e.g. token expiry, logout in another tab).
    events.add(window as any, 'auth-change', sync);

    // -- Cleanup -------------------------------------------------------------
    return () => events.cleanup();
}

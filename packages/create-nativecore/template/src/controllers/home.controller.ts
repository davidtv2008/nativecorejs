/**
 * Home Controller
 * Updates the primary landing CTA based on authentication status.
 */
import { trackEvents, trackSubscriptions } from '@core-utils/events.js';
import { dom } from '@core-utils/dom.js';
import auth from '@services/auth.service.js';

export async function homeController(): Promise<() => void> {

    // -- Setup ---------------------------------------------------------------
    const events = trackEvents();
    const subs = trackSubscriptions();

    // -- DOM refs ------------------------------------------------------------
    const getStartedBtn = dom.$<HTMLAnchorElement>('#get-started-btn');

    // -- On load -------------------------------------------------------------
    // Update the CTA based on current auth state — no re-render needed after
    if (getStartedBtn) {
        if (auth.isAuthenticated()) {
            getStartedBtn.setAttribute('href', '/dashboard');
            getStartedBtn.textContent = 'Go to Dashboard';
        } else {
            getStartedBtn.setAttribute('href', '/docs');
            getStartedBtn.textContent = 'Read the Docs';
        }
    }

    // -- Cleanup -------------------------------------------------------------
    return () => {
        events.cleanup();
        subs.cleanup();
    };
}

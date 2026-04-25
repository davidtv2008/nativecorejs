/**
 * Home Controller
 * Updates the primary landing CTA based on authentication status.
 */
import { trackEvents, trackSubscriptions } from '@core-utils/events.js';
import { dom } from '@core-utils/dom.js';
import auth from '@services/auth.service.js';

export async function homeController() {
    const events = trackEvents();
    const subs = trackSubscriptions();

    const getStartedBtn = dom.$('#get-started-btn');

    if (getStartedBtn) {
        if (auth.isAuthenticated()) {
            getStartedBtn.setAttribute('href', '/dashboard');
            getStartedBtn.textContent = 'Go to Dashboard';
        } else {
            getStartedBtn.setAttribute('href', '/login');
            getStartedBtn.textContent = 'Sign In';
        }
    }

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}

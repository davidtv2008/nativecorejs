/**
 * Home Controller
 * Reactively updates the primary landing CTA based on authentication status.
 */
import { wireContents, wireAttributes, wireClasses, wireStyles } from '@core-utils/wires.js';
import { trackEvents } from '@core-utils/events.js';
import auth from '@services/auth.service.js';

export async function homeController() {
    // Setup
    const events = trackEvents();

    // Wires
    const { ctaText } = wireContents();
    const { ctaHref } = wireAttributes();
    const { ctaAuthed } = wireClasses();
    const { ctaMinWidth } = wireStyles();

    // Behavior
    const sync = () => {
        const authed = auth.isAuthenticated();
        ctaText.value = authed ? 'Go to Dashboard' : 'Sign In';
        ctaHref.value = authed ? '/dashboard' : '/login';
        ctaAuthed.value = authed;
        ctaMinWidth.value = authed ? '13rem' : '11rem';
    };

    sync();
    events.add(window, 'auth-change', sync);

    // Cleanup
    // wire* and effect() bindings auto-dispose via PageCleanupRegistry.
    // Return cleanup only for tracked DOM events/listeners.
    return () => {
        events.cleanup();
    };
}

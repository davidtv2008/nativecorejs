/**
 * Home Controller
 * Reactively updates the primary landing CTA based on authentication status.
 */
import { wireContents, wireAttributes, wireClasses, wireStyles } from '@core-utils/wires.js';
import { trackEvents } from '@core-utils/events.js';
import auth from '@services/auth.service.js';

export async function homeController(): Promise<() => void> {
    // Setup
    const events = trackEvents();

    // Wires
    // ctaText -> [wire-content="ctaText"]
    // ctaHref -> [wire-attribute="ctaHref:href"]
    const { ctaText } = wireContents();
    const { ctaHref } = wireAttributes();
    const { ctaAuthed } = wireClasses();
    const { ctaMinWidth } = wireStyles();

    // Behavior
    const sync = () => {
        const authed = auth.isAuthenticated();
        ctaText.value = authed ? 'Go to Dashboard' : 'Read the Docs';
        ctaHref.value = authed ? '/dashboard' : '/docs';
        ctaAuthed.value = authed;
        ctaMinWidth.value = authed ? '13rem' : '11rem';
    };

    sync();

    // Re-sync on auth changes (logout, token expiry, manual login).
    events.add(window as any, 'auth-change', sync);

    // Cleanup
    // wire* and effect() bindings auto-dispose via PageCleanupRegistry.
    // We still return explicit cleanup for tracked DOM events.
    return () => {
        events.cleanup();
    };
}

import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { wireContents } from '@core-utils/wires.js';
import router from '@core/router.js';

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

export async function homeController(): Promise<() => void> {
    const events = trackEvents();
    const scope = dom.view('home');

    // -- Wires ---------------------------------------------------------------
    const { title } = wireContents();
    title.value = `${getGreeting()} — Admin Dashboard`;

    // -- Events --------------------------------------------------------------
    const btn = scope.hook('goto-dashboard');
    if (btn) {
        events.add(btn, 'click', () => router.navigate('/dashboard'));
    }

    // -- Cleanup -------------------------------------------------------------
    return () => events.cleanup();
}

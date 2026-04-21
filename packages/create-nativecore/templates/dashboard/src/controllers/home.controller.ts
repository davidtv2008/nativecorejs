import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import router from '@core/router.js';

export async function homeController(): Promise<() => void> {
    const events = trackEvents();
    const scope = dom.data('home');

    const btn = scope.hook('goto-dashboard');
    if (btn) {
        events.add(btn, 'click', () => router.navigate('/dashboard'));
    }

    return () => {
        events.cleanup();
    };
}

import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import router from '@core/router.js';

export async function homeController(): Promise<() => void> {
    const events = trackEvents();
    const scope = dom.view('home');

    const btn = scope.hook('goto-shop');
    if (btn) {
        events.add(btn, 'click', () => router.navigate('/shop'));
    }

    return () => events.cleanup();
}

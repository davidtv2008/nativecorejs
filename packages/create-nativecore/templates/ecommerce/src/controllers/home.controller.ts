import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { wireContents } from '@core-utils/wires.js';
import { useState, effect } from '@core/state.js';
import http from '@core/http.js';
import router from '@core/router.js';

export async function homeController(): Promise<() => void> {
    const events = trackEvents();
    const scope = dom.view('home');

    // -- Wires & state -------------------------------------------------------
    const { subtitle } = wireContents();
    const productCount = useState(0);

    effect(() => {
        const n = productCount.value;
        subtitle.value = n > 0
            ? `Browse our collection of ${n} products.`
            : 'Discover our latest products.';
    });

    // -- Events --------------------------------------------------------------
    const btn = scope.hook('goto-shop');
    if (btn) {
        events.add(btn, 'click', () => router.navigate('/shop'));
    }

    // -- Data ----------------------------------------------------------------
    const result = await http.get<{ id: string }[]>('/api/shop/products');
    if (result.ok && result.data) {
        productCount.value = result.data.length;
    }

    // -- Cleanup -------------------------------------------------------------
    return () => events.cleanup();
}

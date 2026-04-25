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
    const postCount = useState(0);

    effect(() => {
        const n = postCount.value;
        subtitle.value = n > 0
            ? `Explore ${n} stories, tutorials, and updates.`
            : 'Stories, tutorials, and updates.';
    });

    // -- Events --------------------------------------------------------------
    const btn = scope.hook('goto-posts');
    if (btn) {
        events.add(btn, 'click', () => router.navigate('/posts'));
    }

    // -- Data ----------------------------------------------------------------
    const result = await http.get<{ id: string }[]>('/api/blog/posts');
    if (result.ok && result.data) {
        postCount.value = result.data.length;
    }

    // -- Cleanup -------------------------------------------------------------
    return () => events.cleanup();
}

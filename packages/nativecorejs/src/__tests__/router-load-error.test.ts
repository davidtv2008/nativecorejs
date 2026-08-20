/**
 * Router: unmatched routes vs failed loads of a matched route.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Router, ROUTE_ERROR_EVENT } from '../../.nativecore/core/router.js';

describe('Router load vs 404', () => {
    let router: Router;
    let originalFetch: typeof fetch;

    beforeEach(() => {
        router = new Router();
        window.scrollTo = () => {};
        document.body.innerHTML = '<div id="main-content"></div>';
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        document.body.innerHTML = '';
    });

    it('shows Page Not Found with the requested URL when no route matches', async () => {
        await (router as any).handleRoute('/does-not-exist');
        const text = document.getElementById('main-content')!.textContent || '';
        expect(text).toContain('Page Not Found');
        expect(text).toContain('/does-not-exist');
        expect(text).not.toContain('Unable to load this page');
    });

    it('does not show a 404 with the route pattern when a matched view fails to load', async () => {
        router.register('/courses/licensing/:slug', 'licensing-course.html');
        globalThis.fetch = vi.fn(async () => new Response('missing', { status: 404 })) as typeof fetch;

        const errors: CustomEvent[] = [];
        const onError = (event: Event) => errors.push(event as CustomEvent);
        window.addEventListener(ROUTE_ERROR_EVENT, onError);

        await (router as any).handleRoute('/courses/licensing/brt');

        window.removeEventListener(ROUTE_ERROR_EVENT, onError);

        const text = document.getElementById('main-content')!.textContent || '';
        expect(text).toContain('Unable to load this page');
        expect(text).toContain('/courses/licensing/brt');
        expect(text).not.toContain(':slug');
        expect(text).not.toContain('Page Not Found');
        expect(errors[0]?.detail?.requestPath).toBe('/courses/licensing/brt');
        expect(errors[0]?.detail?.route).toBe('/courses/licensing/:slug');
        expect(errors[0]?.detail?.params?.slug).toBe('brt');
    });

    it('attaches requestPath on dynamic matches', () => {
        router.register('/courses/licensing/:slug', 'licensing-course.html');
        const match = (router as any).matchRoute('/courses/licensing/video-principles');
        expect(match.path).toBe('/courses/licensing/:slug');
        expect(match.requestPath).toBe('/courses/licensing/video-principles');
        expect(match.params.slug).toBe('video-principles');
    });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Router } from '../../src/core/router.js';

describe('core/router', () => {
    let router: Router;

    beforeEach(() => {
        document.body.innerHTML = `
            <main class="main-content">
                <div id="main-content"></div>
            </main>
            <div id="page-progress"></div>
        `;
        router = new Router();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('supports optional params and wildcard params', () => {
        router.register('/user/:id?', '/user.html');
        router.register('/docs/*', '/docs.html');

        const optionalRoute = (router as any).matchRoute('/user');
        const dynamicRoute = (router as any).matchRoute('/user/42');
        const wildcardRoute = (router as any).matchRoute('/docs/guides/intro');

        expect(optionalRoute?.params).toEqual({});
        expect(dynamicRoute?.params).toEqual({ id: '42' });
        expect(wildcardRoute?.params).toEqual({ wildcard: 'guides/intro' });
    });

    it('renders child routes into a shared layout outlet without refetching the layout', async () => {
        const fetchMock = vi.fn((input: RequestInfo | URL) => {
            const url = String(input).split('?')[0];
            const htmlByFile: Record<string, string> = {
                '/layout.html': '<section><header>Layout</header><div id="route-outlet"></div></section>',
                '/settings.html': '<div class="settings-page">Settings</div>',
                '/profile.html': '<div class="profile-page">Profile</div>'
            };

            return Promise.resolve({
                ok: true,
                text: () => Promise.resolve(htmlByFile[url])
            } as Response);
        });

        vi.stubGlobal('fetch', fetchMock);

        router.register('/dashboard', '/layout.html');
        router.register('/dashboard/settings', '/settings.html', null, { layout: '/dashboard' });
        router.register('/dashboard/profile', '/profile.html', null, { layout: '/dashboard' });

        await (router as any).handleRoute('/dashboard/settings', {});
        await (router as any).handleRoute('/dashboard/profile', {});

        const mainContent = document.getElementById('main-content');
        expect(mainContent?.querySelector('header')?.textContent).toBe('Layout');
        expect(mainContent?.querySelector('#route-outlet')?.innerHTML).toContain('Profile');
        expect(fetchMock.mock.calls.filter(([request]) => String(request).includes('/layout.html'))).toHaveLength(1);
    });

    it('prefetches route HTML and uses the prefetched response on navigation', async () => {
        const fetchMock = vi.fn((input: RequestInfo | URL) => {
            const url = String(input).split('?')[0];

            return Promise.resolve({
                ok: true,
                text: () => Promise.resolve(url === '/prefetch.html' ? '<div>Prefetched</div>' : '')
            } as Response);
        });

        vi.stubGlobal('fetch', fetchMock);

        router.register('/prefetch', '/prefetch.html');

        await router.prefetch('/prefetch');
        await (router as any).handleRoute('/prefetch', {});

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(document.getElementById('main-content')?.innerHTML).toContain('Prefetched');
    });

    it('resets the page scroll position on navigation', async () => {
        const fetchMock = vi.fn(() => Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<div style="height: 2000px;">Scrolled page</div>')
        } as Response));

        vi.stubGlobal('fetch', fetchMock);
        const windowScrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

        router.register('/scrolled', '/scrolled.html');

        const mainContent = document.getElementById('main-content') as HTMLElement;
        const scrollContainer = document.querySelector('.main-content') as HTMLElement;
        scrollContainer.scrollTop = 240;
        scrollContainer.scrollLeft = 32;
        mainContent.scrollTop = 240;
        mainContent.scrollLeft = 32;

        await (router as any).handleRoute('/scrolled', {});

        expect(scrollContainer.scrollTop).toBe(0);
        expect(scrollContainer.scrollLeft).toBe(0);
        expect(mainContent.scrollTop).toBe(0);
        expect(mainContent.scrollLeft).toBe(0);
        expect(windowScrollSpy).toHaveBeenCalledWith(0, 0);
    });
});

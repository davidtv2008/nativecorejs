import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Router } from '../../.nativecore/core/router.js';
import { navigateAndWait } from '../testing/index.js';

function seedHtml(router: Router, file: string, html: string): void {
    (router as any).htmlCache.set(file, { html, cachedAt: Date.now(), ttl: 300 });
}

describe('Router nested layouts', () => {
    let router: Router;

    beforeEach(() => {
        router = new Router();
        window.scrollTo = () => {};
        document.body.innerHTML = '<div id="main-content"></div>';
        router.register('/app', 'app.html');
        router.register('/app/settings', 'settings.html', null, { layout: '/app' });
        router.register('/app/settings/profile', 'profile.html', null, { layout: '/app/settings' });
        router.register('/app/settings/billing', 'billing.html', null, { layout: '/app/settings' });
        seedHtml(router, 'app.html', '<div data-layout="app"><nav>App</nav><div id="route-outlet"></div></div>');
        seedHtml(router, 'settings.html', '<div data-layout="settings"><h2>Settings</h2><div id="route-outlet"></div></div>');
        seedHtml(router, 'profile.html', '<div data-view="profile">Profile</div>');
        seedHtml(router, 'billing.html', '<div data-view="billing">Billing</div>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('walks layout pointers outer-to-inner', () => {
        const match = {
            path: '/app/settings/profile',
            params: {},
            config: (router as any).routes['/app/settings/profile'],
        };
        const chain = (router as any).getLayoutChain(match);
        expect(chain.map((item: { path: string }) => item.path)).toEqual(['/app', '/app/settings']);
    });

    it('throws on a layout cycle', () => {
        router.register('/loop-a', 'a.html', null, { layout: '/loop-b' });
        router.register('/loop-b', 'b.html', null, { layout: '/loop-a' });
        expect(() => (router as any).getLayoutChain({
            path: '/loop-a',
            params: {},
            config: (router as any).routes['/loop-a'],
        })).toThrow(/Layout cycle/);
    });

    it('throws when a layout path is not registered', () => {
        router.register('/orphan', 'orphan.html', null, { layout: '/missing' });
        expect(() => (router as any).getLayoutChain({
            path: '/orphan',
            params: {},
            config: (router as any).routes['/orphan'],
        })).toThrow(/not registered/);
    });

    it('nests layout HTML and writes the page into the innermost outlet', async () => {
        const main = document.getElementById('main-content')!;
        const match = {
            path: '/app/settings/profile',
            params: {},
            config: (router as any).routes['/app/settings/profile'],
        };
        const { outlet } = await (router as any).resolveContentTarget(main, match);
        outlet.innerHTML = '<div data-view="profile">Profile</div>';

        expect(main.querySelector('[data-layout="app"]')).toBeTruthy();
        expect(main.querySelector('[data-layout="settings"]')).toBeTruthy();
        expect(outlet.textContent).toBe('Profile');
        expect(main.querySelector('[data-layout="settings"] [data-view="profile"]')).toBeTruthy();
    });

    it('reuses the shared layout prefix on sibling navigation', async () => {
        const main = document.getElementById('main-content')!;
        const profile = {
            path: '/app/settings/profile',
            params: {},
            config: (router as any).routes['/app/settings/profile'],
        };
        const billing = {
            path: '/app/settings/billing',
            params: {},
            config: (router as any).routes['/app/settings/billing'],
        };

        await (router as any).resolveContentTarget(main, profile);
        const nav = main.querySelector('nav')!;
        nav.setAttribute('data-kept', '1');

        const second = await (router as any).resolveContentTarget(main, billing);
        expect(main.querySelector('nav')?.getAttribute('data-kept')).toBe('1');
        expect(second.mountedLayouts).toEqual([]);
        second.outlet.innerHTML = '<div data-view="billing">Billing</div>';
        expect(main.querySelector('[data-view="billing"]')?.textContent).toBe('Billing');
    });

    it('runs a layout controller once and keeps it across sibling navigations', async () => {
        let mounts = 0;
        let cleanups = 0;
        router.register('/shell', 'shell.html', (_p, _s, _l, root) => {
            mounts += 1;
            expect(root?.getAttribute('data-view')).toBe('shell');
            return () => { cleanups += 1; };
        });
        router.register('/shell/a', 'a.html', null, { layout: '/shell' });
        router.register('/shell/b', 'b.html', null, { layout: '/shell' });
        seedHtml(router, 'shell.html', '<div data-view="shell" data-layout="shell"><div id="route-outlet"></div></div>');
        seedHtml(router, 'a.html', '<div data-view="a">A</div>');
        seedHtml(router, 'b.html', '<div data-view="b">B</div>');

        await navigateAndWait(router, '/shell/a');
        expect(mounts).toBe(1);
        expect(document.querySelector('[data-view="a"]')?.textContent).toBe('A');

        await navigateAndWait(router, '/shell/b');
        expect(mounts).toBe(1);
        expect(cleanups).toBe(0);
        expect(document.querySelector('[data-view="b"]')?.textContent).toBe('B');

        await navigateAndWait(router, '/app/settings/profile');
        expect(cleanups).toBe(1);
    });
});

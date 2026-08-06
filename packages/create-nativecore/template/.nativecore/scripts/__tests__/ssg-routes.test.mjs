import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    extractMiddlewareProtectedRoutes,
    extractProtectedRoutes,
    resolvePublicRoutes,
} from '../ssg-routes.mjs';

describe('ssg route extraction — middleware groups', () => {
    it('skips static routes inside non-empty middleware groups', () => {
        const src = `
export function registerRoutes(r) {
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html', lazyController('home'));
        r.register('/tasks', 'src/views/public/tasks.html', lazyController('tasks'));
    });

    r.group({ middleware: ['auth'] }, (r) => {
        r.register('/settings', 'src/views/protected/settings.html', lazyController('settings'));
        r.register('/tasks/:id', 'src/views/protected/task.html', lazyController('task'));
    });
}
`;
        assert.deepEqual(extractMiddlewareProtectedRoutes(src), ['/settings', '/tasks/:id']);
        assert.deepEqual(resolvePublicRoutes(src), ['/', '/tasks']);
    });

    it('does not treat empty middleware: [] groups as protected', () => {
        const src = `
    r.group({ middleware: [] }, (r) => {
        r.register('/settings', 'src/views/protected/settings.html', lazyController('settings'));
    });
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html', lazyController('home'));
    });
`;
        assert.deepEqual(extractMiddlewareProtectedRoutes(src), []);
        assert.deepEqual(resolvePublicRoutes(src), ['/settings', '/']);
    });

    it('handles multi-tag middleware and nested groups', () => {
        const src = `
    r.group({ middleware: ['auth', 'verified'], prefix: '/app' }, (r) => {
        r.register('/dashboard', 'a.html', lazy());
        r.group({ middleware: ['admin'] }, (r) => {
            r.register('/admin', 'b.html', lazy());
        });
    });
    r.register('/about', 'c.html', lazy());
`;
        const protected_ = extractMiddlewareProtectedRoutes(src);
        assert.ok(protected_.includes('/dashboard'));
        assert.ok(protected_.includes('/admin'));
        assert.deepEqual(resolvePublicRoutes(src), ['/about']);
    });

    it('still honors legacy export const protectedRoutes', () => {
        const src = `
export const protectedRoutes = ['/legacy', '/also'];
r.register('/', 'home.html', lazy());
r.register('/legacy', 'legacy.html', lazy());
r.register('/public', 'public.html', lazy());
`;
        assert.deepEqual(extractProtectedRoutes(src), ['/legacy', '/also']);
        assert.deepEqual(resolvePublicRoutes(src), ['/', '/public']);
    });

    it('skips dynamic routes regardless of group', () => {
        const src = `
    r.group({}, (r) => {
        r.register('/posts/:slug', 'post.html', lazy());
        r.register('/files/*', 'files.html', lazy());
        r.register('/blog', 'blog.html', lazy());
    });
`;
        assert.deepEqual(resolvePublicRoutes(src), ['/blog']);
    });
});

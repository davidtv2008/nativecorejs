/**
 * Tests for the Router query-string helpers.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Router } from '../../.nativecore/core/router.js';

describe('Router query helpers', () => {
    let router: Router;

    beforeEach(() => {
        router = new Router();
        window.history.replaceState({}, '', '/');
    });

    it('getQuery returns an empty object when there is no search string', () => {
        expect(router.getQuery()).toEqual({});
    });

    it('getQuery parses single values', () => {
        window.history.replaceState({}, '', '/x?page=2&q=hello');
        expect(router.getQuery()).toEqual({ page: '2', q: 'hello' });
    });

    it('getQuery collapses repeated keys into arrays', () => {
        window.history.replaceState({}, '', '/x?tag=a&tag=b&tag=c');
        expect(router.getQuery()).toEqual({ tag: ['a', 'b', 'c'] });
    });

    it('getQueryParam returns the value or the fallback', () => {
        window.history.replaceState({}, '', '/x?q=hi');
        expect(router.getQueryParam('q')).toBe('hi');
        expect(router.getQueryParam('missing', 'default')).toBe('default');
    });

    it('setQuery merges keys and removes null/undefined', () => {
        window.history.replaceState({}, '', '/x?page=1&q=old');
        router.setQuery({ page: 2, q: null, sort: 'name' });
        expect(window.location.search).toBe('?page=2&sort=name');
    });

    it('setQuery preserves the pathname and hash', () => {
        window.history.replaceState({}, '', '/path?a=1#frag');
        router.setQuery({ a: 2 });
        expect(window.location.pathname).toBe('/path');
        expect(window.location.search).toBe('?a=2');
        expect(window.location.hash).toBe('#frag');
    });
});

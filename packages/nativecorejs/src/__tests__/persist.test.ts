import { describe, it, expect, beforeEach } from 'vitest';
import { persistState } from '../../.nativecore/utils/persist.js';

describe('persistState', () => {
    beforeEach(() => {
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch { /* ignore */ }
    });

    it('hydrates from localStorage and writes updates back', () => {
        localStorage.setItem('theme', JSON.stringify('dark'));
        const theme = persistState('theme', 'light');
        expect(theme.value).toBe('dark');
        theme.value = 'light';
        expect(JSON.parse(localStorage.getItem('theme') ?? '')).toBe('light');
    });

    it('uses the initial value when nothing is stored', () => {
        const count = persistState('count', 3);
        expect(count.value).toBe(3);
        expect(JSON.parse(localStorage.getItem('count') ?? '')).toBe(3);
    });

    it('can persist to sessionStorage', () => {
        const flag = persistState('flag', false, { storage: 'session' });
        flag.value = true;
        expect(JSON.parse(sessionStorage.getItem('flag') ?? '')).toBe(true);
        expect(localStorage.getItem('flag')).toBeNull();
    });

    it('ignores invalid JSON and falls back to the initial value', () => {
        localStorage.setItem('broken', '{not-json');
        const value = persistState('broken', { ok: true });
        expect(value.value).toEqual({ ok: true });
    });
});

import { describe, it, expect, afterEach } from 'vitest';
import { createContext, inject, provide } from '../../.nativecore/core/context.js';
import { useState } from '../../.nativecore/core/state.js';

describe('context', () => {
    const theme = createContext<string>('theme');
    const cleanups: Array<() => void> = [];

    afterEach(() => {
        cleanups.splice(0).forEach(fn => fn());
        document.body.replaceChildren();
    });

    it('injects a static value from an ancestor', () => {
        const host = document.createElement('div');
        const child = document.createElement('span');
        host.appendChild(child);
        document.body.appendChild(host);
        cleanups.push(provide(host, theme, 'dark'));
        expect(inject(child, theme)).toBe('dark');
    });

    it('returns undefined when no provider exists', () => {
        const orphan = document.createElement('div');
        document.body.appendChild(orphan);
        expect(inject(orphan, theme)).toBeUndefined();
    });

    it('pushes State updates to subscribers', () => {
        const host = document.createElement('div');
        const child = document.createElement('span');
        host.appendChild(child);
        document.body.appendChild(host);

        const mode = useState('light');
        cleanups.push(provide(host, theme, mode));

        const seen: string[] = [];
        cleanups.push(inject(child, theme, value => { seen.push(value); }));
        expect(seen).toEqual(['light']);
        mode.value = 'dark';
        expect(seen).toEqual(['light', 'dark']);
    });

    it('crosses an open shadow root', () => {
        const host = document.createElement('div');
        const shadow = host.attachShadow({ mode: 'open' });
        const child = document.createElement('span');
        shadow.appendChild(child);
        document.body.appendChild(host);
        cleanups.push(provide(host, theme, 'shadow'));
        expect(inject(child, theme)).toBe('shadow');
    });
});

import { describe, it, expect, afterEach } from 'vitest';
import { clickOutside, mediaQuery } from '../../.nativecore/utils/observe.js';
import { portal } from '../../.nativecore/utils/portal.js';

describe('clickOutside', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('fires when the pointer is outside the element', () => {
        const inside = document.createElement('div');
        const outside = document.createElement('button');
        document.body.append(inside, outside);
        let count = 0;
        const stop = clickOutside(inside, () => { count += 1; });
        outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        expect(count).toBe(1);
        inside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        expect(count).toBe(1);
        stop();
    });
});

describe('mediaQuery', () => {
    it('exposes the current match state', () => {
        const mq = mediaQuery('(min-width: 1px)');
        expect(typeof mq.matches.value).toBe('boolean');
        mq.dispose();
    });
});

describe('portal', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('moves a node and restores it on dispose', () => {
        const home = document.createElement('div');
        const dest = document.createElement('div');
        const node = document.createElement('span');
        home.appendChild(node);
        document.body.append(home, dest);
        const restore = portal(node, dest);
        expect(dest.contains(node)).toBe(true);
        restore();
        expect(home.contains(node)).toBe(true);
    });
});

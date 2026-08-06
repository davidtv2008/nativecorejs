import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { trapFocus, announce } from '../a11y/index.js';

describe('a11y helpers', () => {
    let root: HTMLDivElement;

    beforeEach(() => {
        root = document.createElement('div');
        root.innerHTML = `
            <button id="outside">outside</button>
            <div id="dialog">
                <button id="first">first</button>
                <button id="last">last</button>
            </div>
        `;
        document.body.appendChild(root);
    });

    afterEach(() => {
        root.remove();
    });

    it('trapFocus moves focus into the container', () => {
        const dialog = root.querySelector('#dialog') as HTMLElement;
        const release = trapFocus(dialog);
        expect(document.activeElement?.id).toBe('first');
        release();
    });

    it('announce creates a live region', async () => {
        announce('Hello status');
        const live = document.querySelector('[aria-live]');
        expect(live).toBeTruthy();
        await new Promise((r) => setTimeout(r, 60));
        expect(live?.textContent).toContain('Hello status');
    });
});

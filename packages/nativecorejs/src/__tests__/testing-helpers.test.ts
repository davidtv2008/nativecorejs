import { describe, it, expect, afterEach } from 'vitest';
import { CoreController } from '../../.nativecore/core/controller.js';
import { mountController, navigateAndWait } from '../testing/index.js';

class LabelController extends CoreController {
    declare labelEl: HTMLElement;
    onMount() {
        this.labelEl.textContent = 'mounted';
    }
}

describe('mountController', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('mounts a controller against an HTML snippet', () => {
        const { root, cleanup } = mountController(
            '<span ref="labelEl">x</span>',
            (_p, _s, _l, el) => {
                const ctrl = new LabelController(el);
                return () => ctrl.destroy();
            }
        );
        expect(root.querySelector('[ref="labelEl"]')?.textContent).toBe('mounted');
        cleanup();
        expect(document.body.contains(root)).toBe(false);
    });
});

describe('navigateAndWait', () => {
    it('resolves on pageloaded', async () => {
        const router = {
            navigate() {
                window.dispatchEvent(new CustomEvent('pageloaded', { detail: { path: '/ok' } }));
            },
        };
        const detail = await navigateAndWait(router, '/ok');
        expect((detail as { path: string }).path).toBe('/ok');
    });
});

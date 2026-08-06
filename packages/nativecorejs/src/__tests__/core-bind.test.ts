import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CoreController } from '../../.nativecore/core/controller.js';

class TestController extends CoreController {
    declare labelEl: HTMLElement;
    onMount() {
        const [label, setLabel] = this.signal('hi');
        this.bind(label, this.labelEl);
        (this as any)._setLabel = setLabel;
    }
}

describe('CoreController.bind with signal getters', () => {
    let host: HTMLDivElement;
    let ctrl: TestController;

    beforeEach(() => {
        host = document.createElement('div');
        host.innerHTML = `<span ref="labelEl">x</span>`;
        document.body.appendChild(host);
        ctrl = new TestController(host);
    });

    afterEach(() => {
        ctrl.destroy();
        host.remove();
    });

    it('binds signal getters to textContent', () => {
        expect(ctrl.labelEl.textContent).toBe('hi');
        (ctrl as any)._setLabel('bye');
        expect(ctrl.labelEl.textContent).toBe('bye');
    });
});

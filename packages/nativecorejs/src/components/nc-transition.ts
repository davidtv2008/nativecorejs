/**
 * NcTransition Component
 *
 * Applies a GPU-accelerated enter animation to its slotted content whenever
 * the content changes or the component first mounts.  Uses a MutationObserver
 * on the default slot so swapping content re-triggers the animation.
 *
 * Attributes:
 *   - enter: 'slide-up' | 'slide-down' | 'fade' | 'scale' (default: 'fade')
 *   - duration: number in ms (default: 300)
 *
 * Example:
 *   <nc-transition enter="slide-up" duration="400">
 *     <p>This content will animate in.</p>
 *   </nc-transition>
 */
import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { fadeIn, slideIn, scaleIn } from '../../.nativecore/core/gpu-animation.js';

type TransitionName = 'slide-up' | 'slide-down' | 'fade' | 'scale';

export class NcTransition extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['enter', 'duration'];
    }

    private _observer: MutationObserver | null = null;
    private _slotEl: HTMLSlotElement | null = null;

    template() {
        return `
            <style>
                :host { display: block; }
                ::slotted(*) { display: block; }
            </style>
            <slot></slot>
        `;
    }

    onMount() {
        this._slotEl = this.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;

        // Animate current content on first mount
        this._runEnter();

        if (this._slotEl) {
            this._slotEl.addEventListener('slotchange', () => this._runEnter());
        }

        // Also watch for direct child mutations (innerHTML swaps)
        this._observer = new MutationObserver(() => this._runEnter());
        this._observer.observe(this, { childList: true });
    }

    onUnmount() {
        this._observer?.disconnect();
        this._observer = null;
    }

    private async _runEnter(): Promise<void> {
        const type = (this.getAttribute('enter') ?? 'fade') as TransitionName;
        const duration = parseInt(this.getAttribute('duration') ?? '300', 10) || 300;
        const target = this._getTarget();
        if (!target) return;
        await this._animate(target, type, duration);
    }

    private _getTarget(): HTMLElement | null {
        if (this._slotEl) {
            const assigned = this._slotEl.assignedElements({ flatten: true });
            if (assigned.length > 0) return assigned[0] as HTMLElement;
        }
        return null;
    }

    private async _animate(el: HTMLElement, type: TransitionName, duration: number): Promise<void> {
        switch (type) {
            case 'fade':
                await fadeIn(el, duration);
                break;
            case 'slide-up':
                await slideIn(el, 'up', 30, duration);
                break;
            case 'slide-down':
                await slideIn(el, 'down', 30, duration);
                break;
            case 'scale':
                await scaleIn(el, duration);
                break;
        }
    }
}

defineComponent('nc-transition', NcTransition);

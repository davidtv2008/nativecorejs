/**
 * NcViewTransition Component
 *
 * Wraps page content and applies GPU-accelerated enter/leave animations
 * during router navigations.  Hooks into the router's `nc-route-start`
 * (or `page-transition-exit`) and `pageloaded` events.
 *
 * Attributes:
 *   - enter: 'slide-up' | 'slide-down' | 'fade' | 'scale' — enter animation
 *   - leave: 'slide-up' | 'slide-down' | 'fade' | 'scale' — leave animation
 *
 * Example:
 *   <nc-view-transition enter="slide-up" leave="fade">
 *     <!-- page content / router outlet -->
 *   </nc-view-transition>
 */
import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { fadeIn, fadeOut, slideIn, scaleIn } from '../../.nativecore/core/gpu-animation.js';

type TransitionName = 'slide-up' | 'slide-down' | 'fade' | 'scale';

export class NcViewTransition extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['enter', 'leave'];
    }

    private _onRouteLeave: (() => void) | null = null;
    private _onRouteEnter: (() => void) | null = null;

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
        this._onRouteLeave = () => this._runLeave();
        this._onRouteEnter = () => this._runEnter();

        // nc-route-start fires before page teardown; pageloaded fires after load
        window.addEventListener('nc-route-start', this._onRouteLeave);
        window.addEventListener('pageloaded', this._onRouteEnter);
    }

    onUnmount() {
        if (this._onRouteLeave) window.removeEventListener('nc-route-start', this._onRouteLeave);
        if (this._onRouteEnter) window.removeEventListener('pageloaded', this._onRouteEnter);
        this._onRouteLeave = null;
        this._onRouteEnter = null;
    }

    private _getContainer(): HTMLElement | null {
        // Prefer slotted child; fall back to the host element itself
        const slot = this.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
        if (slot) {
            const assigned = slot.assignedElements({ flatten: true });
            if (assigned.length > 0) return assigned[0] as HTMLElement;
        }
        return this;
    }

    private async _runLeave(): Promise<void> {
        const leave = (this.getAttribute('leave') ?? 'fade') as TransitionName;
        const container = this._getContainer();
        if (!container) return;
        await this._animate(container, leave, 'out');
    }

    private async _runEnter(): Promise<void> {
        const enter = (this.getAttribute('enter') ?? 'slide-up') as TransitionName;
        const container = this._getContainer();
        if (!container) return;
        await this._animate(container, enter, 'in');
    }

    private async _animate(el: HTMLElement, type: TransitionName, direction: 'in' | 'out'): Promise<void> {
        const dur = 300;
        switch (type) {
            case 'fade':
                if (direction === 'in') {
                    await fadeIn(el, dur);
                } else {
                    await fadeOut(el, dur);
                }
                break;
            case 'slide-up':
                if (direction === 'in') {
                    await slideIn(el, 'up', 30, dur);
                } else {
                    await fadeOut(el, dur);
                }
                break;
            case 'slide-down':
                if (direction === 'in') {
                    await slideIn(el, 'down', 30, dur);
                } else {
                    await fadeOut(el, dur);
                }
                break;
            case 'scale':
                if (direction === 'in') {
                    await scaleIn(el, dur);
                } else {
                    await fadeOut(el, dur);
                }
                break;
        }
    }
}

defineComponent('nc-view-transition', NcViewTransition);

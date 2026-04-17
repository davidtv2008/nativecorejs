/**
 * NcScrollTop Component - floating "back to top" button
 *
 * Appends itself to document.body so it always sits over all content.
 * Becomes visible after the user scrolls past `threshold` px.
 *
 * Attributes:
 *   threshold  - scroll distance in px before appearing (default: 300)
 *   position   - 'bottom-right'(default)|'bottom-left'|'bottom-center'
 *   smooth     - boolean - use smooth scrolling (default: true)
 *   label      - accessible aria-label (default: 'Back to top')
 *   offset     - distance from screen edge in px (default: 24)
 *   target     - optional CSS selector for the scroll container (default: window)
 *
 * Usage:
 *   <nc-scroll-top></nc-scroll-top>
 */
import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { addPassiveListener } from '../../.nativecore/core/gpu-animation.js';
import { dom } from '../../.nativecore/utils/dom.js';

export class NcScrollTop extends Component {
    static useShadowDOM = true;

    private _visible = false;
    private _removeScroll: (() => void) | null = null;
    private _scrollTarget: HTMLElement | Window = window;

    template() {
        const pos    = this.getAttribute('position') ?? 'bottom-right';
        const offset = parseInt(this.getAttribute('offset') ?? '24', 10);
        const label  = this.getAttribute('label') ?? 'Back to top';
        const v      = this._visible;

        const posStyle =
            pos === 'bottom-left'   ? `left:${offset}px;right:auto;` :
            pos === 'bottom-center' ? `left:50%;transform:translateX(-50%);` :
            `right:${offset}px;left:auto;`;

        return `
            <style>
                :host { display: contents; }
                button {
                    position: fixed;
                    bottom: ${offset}px;
                    ${posStyle}
                    z-index: 900;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: var(--nc-primary);
                    color: var(--nc-white);
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--nc-shadow-md);
                    opacity: ${v ? '1' : '0'};
                    visibility: ${v ? 'visible' : 'hidden'};
                    transform: ${v ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.9)'};
                    pointer-events: ${v ? 'auto' : 'none'};
                    transition:
                        opacity var(--nc-transition-base),
                        transform var(--nc-transition-base);
                    outline: none;
                }
                button:hover  { opacity: 0.85; }
                button:active { transform: scale(0.94); }
                button:focus-visible { outline: 2px solid var(--nc-primary); outline-offset: 3px; }
            </style>
            <button type="button" aria-label="${label}" tabindex="${v ? '0' : '-1'}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2.5"
                     stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="18 15 12 9 6 15"/>
                </svg>
            </button>
        `;
    }

    onMount() {
        const threshold = parseInt(this.getAttribute('threshold') ?? '300', 10);
        const targetSelector = this.getAttribute('target');
        this._scrollTarget = targetSelector
            ? dom.query<HTMLElement>(targetSelector) ?? window
            : window;

        const updateVisibility = () => {
            const currentScroll = this._scrollTarget instanceof Window
                ? this._scrollTarget.scrollY
                : this._scrollTarget.scrollTop;
            const shouldShow = currentScroll > threshold;
            if (shouldShow !== this._visible) {
                this._visible = shouldShow;
                this.render();
            }
        };

        this._removeScroll = addPassiveListener(this._scrollTarget, 'scroll', updateVisibility);
        updateVisibility();

        this.shadowRoot!.addEventListener('click', () => this._scrollTop());
    }

    private _scrollTop() {
        const smooth = this.getAttribute('smooth') !== 'false';
        this._scrollTarget.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    }

    onUnmount() {
        this._removeScroll?.();
    }
}

defineComponent('nc-scroll-top', NcScrollTop);




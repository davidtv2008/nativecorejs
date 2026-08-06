/**
 * NcScrollTop Component â€” floating "back to top" button
 *
 * Appends itself to document.body so it always sits over all content.
 * Becomes visible after the user scrolls past `threshold` px.
 *
 * Attributes:
 *   threshold  â€” scroll distance in px before appearing (default: 300)
 *   position   â€” 'bottom-right'(default)|'bottom-left'|'bottom-center'
 *   smooth     â€” boolean â€” use smooth scrolling (default: true)
 *   label      â€” accessible aria-label (default: 'Back to top')
 *   offset     â€” distance from screen edge in px (default: 24)
 *   target     â€” optional CSS selector for the scroll container (default: window)
 *
 * Usage:
 *   <nc-scroll-top></nc-scroll-top>
 */
import { CoreComponent } from '../../.nativecore/core/component.js';
import { css } from '../../.nativecore/utils/templates.js';
import { addPassiveListener } from '../../.nativecore/core/gpu-animation.js';
import { dom } from '../../.nativecore/utils/dom.js';

export class NcScrollTop extends CoreComponent {
    static useShadowDOM = true;

    // -- Refs -----------------------------------------------------------------
    declare btnEl: HTMLButtonElement;

    private _removeScroll: (() => void) | null = null;
    private _scrollTarget: HTMLElement | Window = window;

    static styles = css`
        :host { display: contents; --_offset: 24px; }
        button {
            position: fixed;
            bottom: var(--_offset);
            right: var(--_offset);
            z-index: 900;
            width: 44px; height: 44px;
            border-radius: 50%;
            background: var(--nc-primary); color: var(--nc-white);
            border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            box-shadow: var(--nc-shadow-md);
            opacity: 0; visibility: hidden;
            transform: translateY(12px) scale(0.9);
            pointer-events: none;
            transition:
                opacity var(--nc-transition-base),
                transform var(--nc-transition-base),
                visibility var(--nc-transition-base);
            outline: none;
        }
        :host([data-pos="bottom-left"]) button  { right: auto; left: var(--_offset); }
        :host([data-pos="bottom-center"]) button { right: auto; left: 50%; transform: translateX(-50%) translateY(12px) scale(0.9); }
        :host([visible]) button              { opacity: 1; visibility: visible; transform: translateY(0) scale(1); pointer-events: auto; }
        :host([visible][data-pos="bottom-center"]) button { transform: translateX(-50%) translateY(0) scale(1); }
        button:hover  { opacity: 0.85; }
        button:active { transform: scale(0.94); }
        :host([visible][data-pos="bottom-center"]) button:active { transform: translateX(-50%) scale(0.94); }
        button:focus-visible { outline: 2px solid var(--nc-primary); outline-offset: 3px; }
    `;

    template() {
        return `            <button ref="btnEl" type="button" tabindex="-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2.5"
                     stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="18 15 12 9 6 15"/>
                </svg>
            </button>
        `;
    }

    onMount() {
        const offset    = parseInt(this.getAttribute('offset')   ?? '24',  10);
        const pos       = this.getAttribute('position') ?? 'bottom-right';
        const label     = this.getAttribute('label')    ?? 'Back to top';
        const threshold = parseInt(this.getAttribute('threshold') ?? '300', 10);
        const targetSel = this.getAttribute('target');

        this.style.setProperty('--_offset', `${offset}px`);
        if (pos !== 'bottom-right') this.dataset.pos = pos;
        this.btnEl.setAttribute('aria-label', label);

        this._scrollTarget = targetSel
            ? dom.query<HTMLElement>(targetSel) ?? window
            : window;

        const updateVisibility = () => {
            const scroll = this._scrollTarget instanceof Window
                ? this._scrollTarget.scrollY
                : (this._scrollTarget as HTMLElement).scrollTop;
            const visible = scroll > threshold;
            this.toggleAttribute('visible', visible);
            this.btnEl.tabIndex = visible ? 0 : -1;
        };

        this._removeScroll = addPassiveListener(this._scrollTarget, 'scroll', updateVisibility);
        updateVisibility();

        this.on(this.btnEl, 'click', () => {
            const smooth = this.getAttribute('smooth') !== 'false';
            this._scrollTarget.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
        });
    }

    onUnmount() {
        this._removeScroll?.();
    }
}

if (!customElements.get('nc-scroll-top')) customElements.define('nc-scroll-top', NcScrollTop);

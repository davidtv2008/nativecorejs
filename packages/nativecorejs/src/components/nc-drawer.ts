/**
 * NcDrawer Component
 *
 * Attributes:
 *   - open: boolean — visible state
 *   - placement: 'left'|'right'|'top'|'bottom' (default: 'right')
 *   - size: string — CSS width/height of the panel (default: '320px')
 *   - overlay: boolean — show backdrop overlay (default: true)
 *   - close-on-overlay: boolean — click overlay to close (default: true)
 *   - no-close-btn: boolean — hide the built-in close button
 *
 * Slots:
 *   - header — drawer header area
 *   - (default) — drawer body content
 *   - footer — drawer footer area
 *
 * Events:
 *   - open:  CustomEvent — after drawer opens
 *   - close: CustomEvent — after drawer closes
 *
 * Usage:
 *   <nc-drawer id="nav-drawer" placement="left">
 *     <span slot="header">Navigation</span>
 *     <p>Links go here</p>
 *   </nc-drawer>
 *
 *   document.getElementById('nav-drawer').setAttribute('open', '');
 */

import { CoreComponent } from '../../.nativecore/core/component.js';
import { css, html, trusted } from '../../.nativecore/utils/templates.js';
import { trapFocus } from '../a11y/index.js';

export class NcDrawer extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['open', 'placement', 'size', 'overlay', 'close-on-overlay', 'no-close-btn'];

    static attributeOptions = { placement: ['right', 'left', 'top', 'bottom'] };
    static attributePlaceholders = { size: '480px' };
    static attributeOrder = ['placement', 'size', 'open', 'overlay', 'close-on-overlay', 'no-close-btn'];

    // -- Refs -----------------------------------------------------------------
    declare panelEl:    HTMLDivElement;
    declare overlayEl:  HTMLDivElement;
    declare closeBtnEl: HTMLButtonElement;
    private _releaseFocus: (() => void) | null = null;

    static styles = css`
        :host { display: contents; }
        .overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,.45);
            z-index: 900; opacity: 0; pointer-events: none;
            transition: opacity var(--nc-transition-base);
        }
        :host([open]) .overlay { opacity: 1; pointer-events: auto; }
        .panel {
            position: fixed;
            background: var(--nc-bg);
            box-shadow: var(--nc-shadow-xl, 0 20px 60px rgba(0,0,0,.3));
            z-index: 901; display: flex; flex-direction: column;
            overflow: hidden;
            transform: var(--drawer-closed-transform, translateX(100%));
            transition: transform var(--nc-transition-base);
        }
        :host([open]) .panel { transform: none; }
        .panel__header {
            display: flex; align-items: center; justify-content: space-between;
            padding: var(--nc-spacing-md) var(--nc-spacing-lg);
            border-bottom: 1px solid var(--nc-border);
            font-family: var(--nc-font-family); font-weight: var(--nc-font-weight-semibold);
            font-size: var(--nc-font-size-lg); color: var(--nc-text); flex-shrink: 0;
        }
        .panel__body { flex: 1; overflow-y: auto; padding: var(--nc-spacing-lg); }
        .panel__footer { padding: var(--nc-spacing-md) var(--nc-spacing-lg); border-top: 1px solid var(--nc-border); flex-shrink: 0; }
        .panel__footer:empty { display: none; }
        .close-btn {
            background: none; border: none; cursor: pointer; padding: 4px;
            color: var(--nc-text-muted); border-radius: var(--nc-radius-sm, 4px); display: flex;
            transition: color var(--nc-transition-fast), background var(--nc-transition-fast);
        }
        .close-btn:hover { color: var(--nc-text); background: var(--nc-bg-secondary); }
        [hidden] { display: none !important; }
    `;

    template() {
        return html`            <div ref="overlayEl" class="overlay" aria-hidden="true"></div>
            <div ref="panelEl" class="panel" role="dialog" aria-modal="true" aria-hidden="true" tabindex="-1">
                <div class="panel__header">
                    <slot name="header"></slot>
                    <button ref="closeBtnEl" class="close-btn" type="button" aria-label="Close drawer">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="18" height="18">
                            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div class="panel__body"><slot></slot></div>
                <div class="panel__footer"><slot name="footer"></slot></div>
            </div>
        `;
    }

    onMount() {
        this.on(this.closeBtnEl, 'click', () => this._close());
        this.on(this.overlayEl, 'click', () => {
            if (this.getAttribute('close-on-overlay') !== 'false') this._close();
        });
        this.on(document as EventTarget, 'keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.hasAttribute('open')) this._close();
        });
        this._syncFromAttrs();
    }

    private _close() {
        this.removeAttribute('open');
        this.emit('close');
    }

    protected _handleAttributeUpdate(name: string, _val: string | null) {
        if (name === 'open') {
            const open      = this.hasAttribute('open');
            const placement = this.getAttribute('placement') || 'right';
            const translates: Record<string, string> = {
                left: 'translateX(-100%)', right: 'translateX(100%)',
                top:  'translateY(-100%)', bottom: 'translateY(100%)',
            };
            this.panelEl.style.transform = open ? 'none' : (translates[placement] ?? 'translateX(100%)');
            this.panelEl.setAttribute('aria-hidden', String(!open));
            if (open) {
                document.body.style.overflow = 'hidden';
                this._releaseFocus?.();
                this._releaseFocus = trapFocus(this.panelEl);
                this.emit('open');
            } else {
                this._releaseFocus?.();
                this._releaseFocus = null;
                document.body.style.overflow = '';
                this.emit('close');
            }
        } else {
            this._syncFromAttrs();
        }
    }

    private _syncFromAttrs() {
        const placement    = this.getAttribute('placement') || 'right';
        const size         = this.getAttribute('size') || '320px';
        const showOverlay  = this.getAttribute('overlay') !== 'false';
        const noCloseBtn   = this.hasAttribute('no-close-btn');
        const isHorizontal = placement === 'left' || placement === 'right';
        const translates: Record<string, string> = {
            left: 'translateX(-100%)', right: 'translateX(100%)',
            top:  'translateY(-100%)', bottom: 'translateY(100%)',
        };

        // CSS custom property: shadow DOM .panel inherits this for its closed-state transform
        this.style.setProperty('--drawer-closed-transform', translates[placement] ?? 'translateX(100%)');

        // Panel position + dimensions via inline style
        (['top', 'right', 'bottom', 'left'] as const).forEach(s => (this.panelEl.style as any)[s] = '');
        (this.panelEl.style as any)[placement] = '0';
        (this.panelEl.style as any)[isHorizontal ? 'top' : 'left'] = '0';
        this.panelEl.style.width  = isHorizontal ? size : '100%';
        this.panelEl.style.height = isHorizontal ? '100%' : size;

        this.overlayEl.style.display = showOverlay ? 'block' : 'none';
        this.closeBtnEl.hidden       = noCloseBtn;
    }

    onUnmount() {
        this._releaseFocus?.();
        this._releaseFocus = null;
        document.body.style.overflow = '';
    }
}

if (!customElements.get('nc-drawer')) customElements.define('nc-drawer', NcDrawer);


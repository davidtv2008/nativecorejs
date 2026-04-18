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

import { Component, defineComponent } from '@core/component.js';
import { html, trusted } from '@core-utils/templates.js';

export class NcDrawer extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['open', 'placement', 'size', 'overlay', 'close-on-overlay', 'no-close-btn'];
    }

    template() {
        const open = this.hasAttribute('open');
        const placement = this.getAttribute('placement') || 'right';
        const size = this.getAttribute('size') || '320px';
        const showOverlay = !this.hasAttribute('overlay') || this.getAttribute('overlay') !== 'false';
        const noCloseBtn = this.hasAttribute('no-close-btn');

        const isHorizontal = placement === 'left' || placement === 'right';
        const panelSize = isHorizontal
            ? `width: ${size}; height: 100%;`
            : `height: ${size}; width: 100%;`;

        const translateClosed = {
            left: 'translateX(-100%)',
            right: 'translateX(100%)',
            top: 'translateY(-100%)',
            bottom: 'translateY(100%)',
        }[placement];

        return html`
            <style>
                :host { display: contents; }

                .overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,.45);
                    z-index: 900;
                    opacity: ${open ? '1' : '0'};
                    pointer-events: ${open && showOverlay ? 'auto' : 'none'};
                    transition: opacity var(--nc-transition-base);
                    display: ${showOverlay ? 'block' : 'none'};
                }

                .panel {
                    position: fixed;
                    ${placement}: 0;
                    ${placement === 'left' || placement === 'right' ? 'top: 0;' : 'left: 0;'}
                    ${panelSize}
                    background: var(--nc-bg);
                    box-shadow: var(--nc-shadow-xl, 0 20px 60px rgba(0,0,0,.3));
                    z-index: 901;
                    display: flex;
                    flex-direction: column;
                    transform: ${open ? 'none' : translateClosed};
                    transition: transform var(--nc-transition-base);
                    overflow: hidden;
                }

                .panel__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--nc-spacing-md) var(--nc-spacing-lg);
                    border-bottom: 1px solid var(--nc-border);
                    font-family: var(--nc-font-family);
                    font-weight: var(--nc-font-weight-semibold);
                    font-size: var(--nc-font-size-lg);
                    color: var(--nc-text);
                    flex-shrink: 0;
                }

                .panel__body {
                    flex: 1;
                    overflow-y: auto;
                    padding: var(--nc-spacing-lg);
                }

                .panel__footer {
                    padding: var(--nc-spacing-md) var(--nc-spacing-lg);
                    border-top: 1px solid var(--nc-border);
                    flex-shrink: 0;
                }

                .panel__footer:empty { display: none; }

                .close-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    color: var(--nc-text-muted);
                    border-radius: var(--nc-radius-sm, 4px);
                    display: flex;
                    transition: color var(--nc-transition-fast), background var(--nc-transition-fast);
                }
                .close-btn:hover { color: var(--nc-text); background: var(--nc-bg-secondary); }
            </style>

            ${trusted(showOverlay ? `<div class="overlay" aria-hidden="true"></div>` : '')}

            <div
                class="panel"
                role="dialog"
                aria-modal="true"
                aria-hidden="${!open}"
                tabindex="-1"
            >
                <div class="panel__header">
                    <slot name="header"></slot>
                    ${!noCloseBtn ? `
                    <button class="close-btn" type="button" aria-label="Close drawer">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="18" height="18">
                            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>` : ''}
                </div>
                <div class="panel__body">
                    <slot></slot>
                </div>
                <div class="panel__footer">
                    <slot name="footer"></slot>
                </div>
            </div>
        `;
    }

    onMount() {
        this._bindEvents();
    }

    private _bindEvents() {
        const closeBtn = this.$<HTMLButtonElement>('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this._close());
        }

        const overlay = this.$<HTMLElement>('.overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                if (!this.hasAttribute('close-on-overlay') || this.getAttribute('close-on-overlay') !== 'false') {
                    this._close();
                }
            });
        }

        // Close on Escape
        this._onKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.hasAttribute('open')) this._close();
        };
        document.addEventListener('keydown', this._onKeydown);
    }

    private _onKeydown: ((e: KeyboardEvent) => void) | null = null;

    private _close() {
        this.removeAttribute('open');
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    onUnmount() {
        if (this._onKeydown) document.removeEventListener('keydown', this._onKeydown);
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        if (name === 'open' && this._mounted) {
            const open = this.hasAttribute('open');
            const panel = this.$<HTMLElement>('.panel');
            const overlay = this.$<HTMLElement>('.overlay');
            const placement = this.getAttribute('placement') || 'right';

            const translateClosed = {
                left: 'translateX(-100%)',
                right: 'translateX(100%)',
                top: 'translateY(-100%)',
                bottom: 'translateY(100%)',
            }[placement as 'left' | 'right' | 'top' | 'bottom'];

            if (panel) {
                panel.style.transform = open ? 'none' : (translateClosed ?? 'translateX(100%)');
                panel.setAttribute('aria-hidden', String(!open));
                if (open) panel.focus();
            }
            if (overlay) {
                overlay.style.opacity = open ? '1' : '0';
                overlay.style.pointerEvents = open ? 'auto' : 'none';
            }

            // Lock body scroll while open
            document.body.style.overflow = open ? 'hidden' : '';

            this.dispatchEvent(new CustomEvent(open ? 'open' : 'close', {
                bubbles: true, composed: true
            }));
            return;
        }
        if (this._mounted) { this.render(); this._bindEvents(); }
    }
}

defineComponent('nc-drawer', NcDrawer);


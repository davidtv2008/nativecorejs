/**
 * NcModal Component
 *
 * Attributes:
 *   - open: boolean — visible state
 *   - size: 'sm'|'md'|'lg'|'xl'|'full' (default: 'md')
 *   - no-close-btn: boolean — hide header × button
 *   - close-on-overlay: boolean — click backdrop to close (default: true)
 *   - no-overlay: boolean — skip backdrop rendering
 *   - sticky-header: boolean — header doesn't scroll with body
 *   - sticky-footer: boolean — footer stays at bottom
 *
 * Slots:
 *   - header — modal title / header area
 *   - (default) — modal body
 *   - footer — action buttons area
 *
 * Events:
 *   - open:  CustomEvent — after modal opens
 *   - close: CustomEvent — after modal closes
 *
 * Static API:
 *   NcModal.open(id)  — open a modal by id
 *   NcModal.close(id) — close a modal by id
 *
 * Usage:
 *   <nc-modal id="confirm-modal">
 *     <span slot="header">Confirm Delete</span>
 *     <p>Are you sure?</p>
 *     <div slot="footer">
 *       <nc-button variant="ghost" id="cancel-btn">Cancel</nc-button>
 *       <nc-button variant="danger" id="confirm-btn">Delete</nc-button>
 *     </div>
 *   </nc-modal>
 *
 *   NcModal.open('confirm-modal');
 */

import { Component, defineComponent } from '@core/component.js';
import { dom } from '@utils/dom.js';

export class NcModal extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['open', 'size', 'no-close-btn', 'close-on-overlay', 'no-overlay', 'sticky-header', 'sticky-footer'];
    }

    static open(id: string)  { dom.query<NcModal>(`#${id}`)?.setAttribute('open', ''); }
    static close(id: string) { dom.query<NcModal>(`#${id}`)?.removeAttribute('open'); }

    private _onKeydown: ((e: KeyboardEvent) => void) | null = null;

    template() {
        const open = this.hasAttribute('open');
        const size = this.getAttribute('size') || 'md';
        const noOverlay = this.hasAttribute('no-overlay');
        const noCloseBtn = this.hasAttribute('no-close-btn');

        const widths: Record<string, string> = {
            sm: '420px', md: '560px', lg: '720px', xl: '960px', full: '100vw'
        };
        const maxWidth = widths[size] ?? widths.md;

        return `
            <style>
                :host {
                    display: block;
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                    pointer-events: none;
                }

                .overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,.5);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: var(--nc-spacing-lg);
                    opacity: ${open ? '1' : '0'};
                    pointer-events: ${open ? 'auto' : 'none'};
                    transition: opacity var(--nc-transition-base);
                    ${noOverlay ? 'background: transparent;' : ''}
                }

                .dialog {
                    background: var(--nc-bg);
                    border-radius: var(--nc-radius-lg, 12px);
                    box-shadow: var(--nc-shadow-xl, 0 25px 60px rgba(0,0,0,.35));
                    width: 100%;
                    max-width: ${maxWidth};
                    max-height: calc(100vh - 2 * var(--nc-spacing-lg));
                    display: flex;
                    flex-direction: column;
                    transform: ${open ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)'};
                    transition: transform var(--nc-transition-base);
                    overflow: hidden;
                    ${size === 'full' ? 'height: calc(100vh - 2 * var(--nc-spacing-lg));' : ''}
                }

                .dialog__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--nc-spacing-md) var(--nc-spacing-lg);
                    border-bottom: 1px solid var(--nc-border);
                    flex-shrink: 0;
                    font-family: var(--nc-font-family);
                    font-weight: var(--nc-font-weight-semibold);
                    font-size: var(--nc-font-size-lg);
                    color: var(--nc-text);
                }

                .dialog__body {
                    flex: 1;
                    overflow-y: auto;
                    padding: var(--nc-spacing-lg);
                    font-family: var(--nc-font-family);
                    font-size: var(--nc-font-size-base);
                    color: var(--nc-text);
                    line-height: var(--nc-line-height-relaxed, 1.7);
                }

                .dialog__footer {
                    padding: var(--nc-spacing-md) var(--nc-spacing-lg);
                    border-top: 1px solid var(--nc-border);
                    flex-shrink: 0;
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--nc-spacing-sm);
                }
                .dialog__footer:empty { display: none; }

                .close-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    color: var(--nc-text-muted);
                    border-radius: var(--nc-radius-sm, 4px);
                    display: flex;
                    transition: color var(--nc-transition-fast), background var(--nc-transition-fast);
                    flex-shrink: 0;
                }
                .close-btn:hover { color: var(--nc-text); background: var(--nc-bg-secondary); }
            </style>

            <div
                class="overlay"
                role="dialog"
                aria-modal="true"
                aria-hidden="${!open}"
                tabindex="-1"
            >
                <div class="dialog">
                    <div class="dialog__header">
                        <slot name="header"></slot>
                        ${!noCloseBtn ? `
                        <button class="close-btn" type="button" aria-label="Close modal">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="18" height="18">
                                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                        </button>` : ''}
                    </div>
                    <div class="dialog__body">
                        <slot></slot>
                    </div>
                    <div class="dialog__footer">
                        <slot name="footer"></slot>
                    </div>
                </div>
            </div>
        `;
    }

    onMount() {
        this._bindEvents();
    }

    private _bindEvents() {
        const overlay = this.$<HTMLElement>('.overlay')!;
        const dialog = this.$<HTMLElement>('.dialog')!;
        const closeBtn = this.$<HTMLButtonElement>('.close-btn');

        if (closeBtn) closeBtn.addEventListener('click', () => this._close());

        overlay.addEventListener('click', (e) => {
            if (this.getAttribute('close-on-overlay') === 'false') return;
            if (!dialog.contains(e.target as Node)) this._close();
        });

        this._onKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.hasAttribute('open')) this._close();
        };
        document.addEventListener('keydown', this._onKeydown);
    }

    private _close() {
        this.removeAttribute('open');
    }

    onUnmount() {
        if (this._onKeydown) document.removeEventListener('keydown', this._onKeydown);
        document.body.style.overflow = '';
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        if (name === 'open' && this._mounted) {
            const open = this.hasAttribute('open');
            const overlay = this.$<HTMLElement>('.overlay');
            const dialog = this.$<HTMLElement>('.dialog');
            if (overlay) {
                overlay.style.opacity = open ? '1' : '0';
                overlay.style.pointerEvents = open ? 'auto' : 'none';
                overlay.setAttribute('aria-hidden', String(!open));
            }
            if (dialog) {
                dialog.style.transform = open
                    ? 'translateY(0) scale(1)'
                    : 'translateY(12px) scale(0.97)';
                if (open) (dialog as HTMLElement).focus();
            }
            document.body.style.overflow = open ? 'hidden' : '';
            this.dispatchEvent(new CustomEvent(open ? 'open' : 'close', {
                bubbles: true, composed: true
            }));
            return;
        }
        if (this._mounted) { this.render(); this._bindEvents(); }
    }
}

defineComponent('nc-modal', NcModal);

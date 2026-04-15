/**
 * NcCollapsible Component — single expand/collapse panel
 *
 * Attributes:
 *   open      — boolean — expanded state
 *   disabled  — boolean
 *   duration  — transition duration ms (default: 250)
 *   icon      — 'chevron'(default)|'plus'|'arrow'|'none'
 *
 * Slots:
 *   trigger  — the clickable header content
 *   (default) — collapsible body content
 *
 * Events:
 *   open   — CustomEvent — after opened
 *   close  — CustomEvent — after closed
 *   toggle — CustomEvent<{ open: boolean }>
 *
 * Usage:
 *   <nc-collapsible>
 *     <span slot="trigger">Section title</span>
 *     <p>Hidden content revealed on click.</p>
 *   </nc-collapsible>
 */
import { Component, defineComponent } from '@core/component.js';

export class NcCollapsible extends Component {
    static useShadowDOM = true;

    static get observedAttributes() { return ['open', 'disabled']; }

    template() {
        const open     = this.hasAttribute('open');
        const disabled = this.hasAttribute('disabled');
        const dur      = parseInt(this.getAttribute('duration') ?? '250', 10);
        const icon     = this.getAttribute('icon') ?? 'chevron';

        const iconSvg: Record<string, string> = {
            chevron: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                           viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="6 9 12 15 18 9"/>
                      </svg>`,
            plus:    `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                           viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          ${open ? '' : '<line x1="5" y1="12" x2="19" y2="12"/>'}
                      </svg>`,
            arrow:   `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                           viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="9 18 15 12 9 6"/>
                      </svg>`,
            none:    '',
        };

        return `
            <style>
                :host {
                    display: block;
                    border: 1px solid var(--nc-border);
                    border-radius: var(--nc-radius-md);
                    overflow: hidden;
                    font-family: var(--nc-font-family);
                }
                .trigger {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--nc-spacing-sm);
                    padding: var(--nc-spacing-md) var(--nc-spacing-lg);
                    background: var(--nc-bg);
                    border: none;
                    cursor: ${disabled ? 'not-allowed' : 'pointer'};
                    text-align: left;
                    font-family: inherit;
                    font-size: var(--nc-font-size-base);
                    font-weight: var(--nc-font-weight-medium);
                    color: ${disabled ? 'var(--nc-text-muted)' : 'var(--nc-text)'};
                    opacity: ${disabled ? 0.5 : 1};
                    transition: background var(--nc-transition-fast);
                    user-select: none;
                    outline: none;
                }
                .trigger:hover:not(:disabled) { background: var(--nc-bg-secondary); }
                .trigger:focus-visible { outline: 2px solid var(--nc-primary); outline-offset: -2px; }
                .icon {
                    flex-shrink: 0;
                    color: var(--nc-text-muted);
                    transform: rotate(${open ? '180' : '0'}deg);
                    transition: transform ${dur}ms var(--nc-ease-out);
                }
                :host([icon="arrow"]) .icon {
                    transform: rotate(${open ? '90' : '0'}deg);
                }
                .body {
                    display: grid;
                    grid-template-rows: ${open ? '1fr' : '0fr'};
                    transition: grid-template-rows ${dur}ms var(--nc-ease-out);
                }
                .body-inner {
                    overflow: hidden;
                }
                .body-content {
                    padding: var(--nc-spacing-md) var(--nc-spacing-lg) var(--nc-spacing-lg);
                    color: var(--nc-text-secondary);
                    font-size: var(--nc-font-size-sm);
                    line-height: var(--nc-line-height-relaxed, 1.7);
                    border-top: 1px solid var(--nc-border);
                }
            </style>
            <button
                class="trigger"
                type="button"
                aria-expanded="${open}"
                ${disabled ? 'disabled' : ''}
            >
                <slot name="trigger"></slot>
                ${iconSvg[icon] ?? iconSvg.chevron}
            </button>
            <div class="body" role="region">
                <div class="body-inner">
                    <div class="body-content">
                        <slot></slot>
                    </div>
                </div>
            </div>
        `;
    }

    onMount() {
        this.shadowRoot!.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('.trigger') && !this.hasAttribute('disabled')) {
                this._toggle();
            }
        });
    }

    private _toggle() {
        const nowOpen = !this.hasAttribute('open');
        if (nowOpen) this.setAttribute('open', '');
        else this.removeAttribute('open');
        this.dispatchEvent(new CustomEvent('toggle', { detail: { open: nowOpen }, bubbles: true, composed: true }));
        this.dispatchEvent(new CustomEvent(nowOpen ? 'open' : 'close', { bubbles: true, composed: true }));
    }

    attributeChangedCallback(name: string, oldVal: string, newVal: string) {
        if (oldVal !== newVal && this._mounted) this.render();
    }
}

defineComponent('nc-collapsible', NcCollapsible);

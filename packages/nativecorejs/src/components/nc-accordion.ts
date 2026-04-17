/**
 * NcAccordion + NcAccordionItem Components
 *
 * nc-accordion:
 *   - multiple: boolean - allow multiple items open simultaneously
 *   - variant: 'default'|'bordered'|'flush' (default: 'default')
 *
 * nc-accordion-item:
 *   - header: string - header text (or use slot[name="header"])
 *   - open: boolean - expanded state
 *   - disabled: boolean
 *
 * Events (on nc-accordion-item):
 *   - toggle: CustomEvent<{ open: boolean }>
 *
 * Usage:
 *   <nc-accordion>
 *     <nc-accordion-item header="Section 1" open>Content here</nc-accordion-item>
 *     <nc-accordion-item header="Section 2">More content</nc-accordion-item>
 *   </nc-accordion>
 */

import { Component, defineComponent } from '../../.nativecore/core/component.js';

// -- NcAccordionItem ----------------------------------------------------------

export class NcAccordionItem extends Component {
    static useShadowDOM = true;

    static get observedAttributes() { return ['header', 'open', 'disabled']; }

    template() {
        const header = this.getAttribute('header') || '';
        const open = this.hasAttribute('open');
        const disabled = this.hasAttribute('disabled');

        return `
            <style>
                :host { display: block; }

                .item {
                    border-bottom: 1px solid var(--nc-border);
                }

                .trigger {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--nc-spacing-sm);
                    padding: var(--nc-spacing-md) var(--nc-spacing-lg);
                    background: none;
                    border: none;
                    cursor: ${disabled ? 'not-allowed' : 'pointer'};
                    color: ${disabled ? 'var(--nc-text-muted)' : 'var(--nc-text)'};
                    font-family: var(--nc-font-family);
                    font-size: var(--nc-font-size-base);
                    font-weight: var(--nc-font-weight-medium);
                    text-align: left;
                    transition: background var(--nc-transition-fast), color var(--nc-transition-fast);
                    opacity: ${disabled ? '0.6' : '1'};
                }

                .trigger:hover:not([disabled]) { background: var(--nc-bg-secondary); }
                .trigger:focus-visible { outline: 2px solid var(--nc-primary); outline-offset: -2px; }

                .chevron {
                    flex-shrink: 0;
                    transition: transform var(--nc-transition-base);
                    transform: rotate(${open ? '180deg' : '0deg'});
                    color: var(--nc-text-muted);
                }

                .body {
                    display: ${open ? 'block' : 'none'};
                    padding: 0 var(--nc-spacing-lg) var(--nc-spacing-md);
                    font-size: var(--nc-font-size-sm);
                    color: var(--nc-text-secondary, var(--nc-text-muted));
                    line-height: var(--nc-line-height-relaxed, 1.7);
                }
            </style>
            <div class="item">
                <button
                    class="trigger"
                    type="button"
                    aria-expanded="${open}"
                    ${disabled ? 'disabled' : ''}
                >
                    <slot name="header">${header}</slot>
                    <svg class="chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="16" height="16">
                        <path d="M3 6l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <div class="body" role="region" aria-hidden="${!open}">
                    <slot></slot>
                </div>
            </div>
        `;
    }

    onMount() {
        this.$<HTMLButtonElement>('.trigger')!.addEventListener('click', () => {
            if (this.hasAttribute('disabled')) return;
            const nowOpen = !this.hasAttribute('open');
            if (nowOpen) {
                this.setAttribute('open', '');
            } else {
                this.removeAttribute('open');
            }
            this.dispatchEvent(new CustomEvent('toggle', {
                bubbles: true, composed: true,
                detail: { open: nowOpen }
            }));
        });
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        if (name === 'open' && this._mounted) {
            const open = this.hasAttribute('open');
            const body = this.$<HTMLElement>('.body');
            const chevron = this.$<HTMLElement>('.chevron');
            const trigger = this.$<HTMLButtonElement>('.trigger');
            if (body) { body.style.display = open ? 'block' : 'none'; body.setAttribute('aria-hidden', String(!open)); }
            if (chevron) chevron.style.transform = `rotate(${open ? 180 : 0}deg)`;
            if (trigger) trigger.setAttribute('aria-expanded', String(open));
            return;
        }
        if (this._mounted) { this.render(); this.onMount(); }
    }
}

// -- NcAccordion --------------------------------------------------------------

export class NcAccordion extends Component {
    static useShadowDOM = true;

    static get observedAttributes() { return ['multiple', 'variant']; }

    template() {
        return `
            <style>
                :host { display: block; }

                .accordion {
                    border-radius: var(--nc-radius-md, 8px);
                    overflow: hidden;
                }

                :host([variant="bordered"]) .accordion {
                    border: 1px solid var(--nc-border);
                }

                :host([variant="flush"]) .accordion {
                    border-radius: 0;
                }

                ::slotted(nc-accordion-item:last-child) {
                    border-bottom: none !important;
                }
            </style>
            <div class="accordion">
                <slot></slot>
            </div>
        `;
    }

    onMount() {
        // Collapse siblings unless multiple is set
        this.addEventListener('toggle', (e: Event) => {
            if (this.hasAttribute('multiple')) return;
            const opened = e.target as NcAccordionItem;
            if (!(opened as any).hasAttribute('open')) return;
            this.querySelectorAll<NcAccordionItem>('nc-accordion-item').forEach(item => {
                if (item !== opened) item.removeAttribute('open');
            });
        });
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) this.render();
    }
}

defineComponent('nc-accordion-item', NcAccordionItem);
defineComponent('nc-accordion', NcAccordion);



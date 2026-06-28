/**
 * NcAccordion + NcAccordionItem Components
 *
 * nc-accordion:
 *   - multiple: boolean � allow multiple items open simultaneously
 *   - variant: 'default'|'bordered'|'flush' (default: 'default')
 *
 * nc-accordion-item:
 *   - label: string � header text (or use slot[name="label"])
 *   - open: boolean � expanded state
 *   - disabled: boolean
 *
 * Events (on nc-accordion-item):
 *   - toggle: CustomEvent<{ open: boolean }>
 */

import { CoreComponent } from '@core/component.js';
import { html, css } from '@core-utils/templates.js';

export class NcAccordionItem extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['label', 'open', 'disabled', 'toggle-position', 'label-position'];

    // Dev tools sidebar controls
    static attributeOptions = {
        open: ['true'],
        disabled: ['true'],
        'toggle-position': ['left', 'right'],
        'label-position': ['left', 'right'],
    };

    static attributePlaceholders = {
        label: 'Accordion section title',
    };

    static styles = css`
        :host { display: block; }

        .item {
            border-bottom: 1px solid var(--nc-border, #e2e8f0);
        }

        .trigger {
            width: 100%;
            position: relative;
            display: block;
            padding: var(--nc-spacing-md, 0.75rem) var(--nc-spacing-lg, 1rem);
            background: none;
            border: none;
            cursor: pointer;
            color: var(--nc-text, #1e293b);
            font-family: var(--nc-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
            font-size: var(--nc-font-size-base, 1rem);
            font-weight: var(--nc-font-weight-medium, 600);
            text-align: left;
            transition: background var(--nc-transition-fast, 0.15s ease), color var(--nc-transition-fast, 0.15s ease);
            min-height: 42px;
        }

        .trigger:hover:not(:disabled) {
            background: var(--nc-bg-secondary, #f1f5f9);
        }

        .trigger:focus-visible {
            outline: 2px solid var(--nc-primary, #10b981);
            outline-offset: -2px;
        }

        .trigger:disabled {
            cursor: not-allowed;
            opacity: 0.6;
            color: var(--nc-text-muted, #94a3b8);
        }

        .chevron {
            position: absolute;
            right: var(--nc-spacing-lg, 1rem);
            top: 50%;
            transform: translateY(-50%);
            flex-shrink: 0;
            width: 16px;
            height: 16px;
            color: var(--nc-text-muted, #94a3b8);
            transition: transform var(--nc-transition-base, 0.3s ease);
        }

        .header-fallback {
            color: var(--nc-text-muted, #94a3b8);
            font-size: var(--nc-font-size-sm, 0.875rem);
            white-space: nowrap;
        }

        .label-wrap {
            position: absolute;
            left: var(--nc-spacing-lg, 1rem);
            right: auto;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            align-items: center;
            min-width: 0;
            max-width: calc(100% - 3.5rem);
            pointer-events: none;
        }

        .label-wrap ::slotted(*) {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        :host([toggle-position="left"]) .chevron {
            left: var(--nc-spacing-lg, 1rem);
            right: auto;
        }

        /* If both controls are on the left, push label inward past the chevron. */
        :host([toggle-position="left"]):not([label-position="right"]) .label-wrap {
            left: calc(var(--nc-spacing-lg, 1rem) + 16px + var(--nc-spacing-sm, 0.5rem));
            max-width: calc(100% - 5rem);
        }

        :host([label-position="right"]) .label-wrap {
            left: auto;
            right: var(--nc-spacing-lg, 1rem);
            justify-content: flex-end;
            text-align: right;
        }

        :host(.open) .chevron {
            transform: translateY(-50%) rotate(180deg);
        }

        .body {
            padding: 0 var(--nc-spacing-lg, 1rem) var(--nc-spacing-md, 0.75rem);
            font-size: var(--nc-font-size-sm, 0.875rem);
            color: var(--nc-text-secondary, #64748b);
            line-height: var(--nc-line-height-relaxed, 1.7);
            overflow: hidden;
            max-height: 600px;
            transition: max-height var(--nc-transition-base, 0.3s ease),
                        padding var(--nc-transition-base, 0.3s ease);
        }

        :host(.closed) .body {
            max-height: 0;
            padding-top: 0;
            padding-bottom: 0;
        }
    `;

    private trigger!: HTMLButtonElement;
    private body!: HTMLElement;
    private headerSlot!: HTMLSlotElement;
    private headerText!: HTMLSpanElement;

    private isOpen = this.state(this.hasAttribute('open'));
    private isDisabled = this.state(this.hasAttribute('disabled'));
    private togglePosition = this.state<'left' | 'right'>(this.getAttribute('toggle-position') === 'left' ? 'left' : 'right');
    private labelPosition = this.state<'left' | 'right'>(this.getAttribute('label-position') === 'right' ? 'right' : 'left');
    private labelText = this.state(this.getAttribute('label') || '');

    template() {
        return html`
            <div class="item">
                <button ref="trigger" class="trigger" type="button" aria-expanded="false">
                    <span class="label-wrap">
                        <slot ref="headerSlot" name="label"></slot>
                        <span ref="headerText" class="header-fallback"></span>
                    </span>
                    <svg class="chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M3 6l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <div ref="body" class="body" role="region" aria-hidden="true">
                    <slot></slot>
                </div>
            </div>
        `;
    }

    onMount() {
        this.isOpen.value = this.hasAttribute('open');
        this.isDisabled.value = this.hasAttribute('disabled');
        this.togglePosition.value = this.normalizeTogglePosition(this.getAttribute('toggle-position'));
        this.labelPosition.value = this.normalizeLabelPosition(this.getAttribute('label-position'));
        this.labelText.value = this.getAttribute('label') || '';

        // Canonicalize the position attribute for predictable styling.
        this.effect(() => {
            const pos = this.togglePosition.value;
            if (pos === 'right') {
                if (this.hasAttribute('toggle-position')) this.removeAttribute('toggle-position');
                return;
            }
            if (this.getAttribute('toggle-position') !== pos) this.setAttribute('toggle-position', pos);
        });

        // Keep label-position canonical. Default is left.
        this.effect(() => {
            const pos = this.labelPosition.value;
            if (pos === 'left') {
                if (this.hasAttribute('label-position')) this.removeAttribute('label-position');
                return;
            }
            if (this.getAttribute('label-position') !== pos) this.setAttribute('label-position', pos);
        });

        this.effect(() => {
            const open = this.isOpen.value;
            this.classList.toggle('open', open);
            this.classList.toggle('closed', !open);
            this.trigger.setAttribute('aria-expanded', String(open));
            // Keep aria-hidden in sync; visibility is handled by CSS max-height.
            this.body.setAttribute('aria-hidden', String(!open));
            this.body.inert = !open;
        });

        this.effect(() => {
            this.trigger.disabled = this.isDisabled.value;
        });

        const syncHeader = () => {
            const hasSlottedHeader = this.headerSlot.assignedNodes({ flatten: true }).length > 0;
            this.headerText.hidden = hasSlottedHeader;
            if (!hasSlottedHeader) {
                this.headerText.textContent = this.labelText.value;
            }
        };

        this.effect(syncHeader);
        this.on(this.headerSlot, 'slotchange', syncHeader);
    }

    protected _handleAttributeUpdate(name: string, val: string | null): void {
        if (name === 'open') this.isOpen.value = val !== null;
        if (name === 'disabled') this.isDisabled.value = val !== null;
        if (name === 'label') this.labelText.value = val || '';
        if (name === 'toggle-position') this.togglePosition.value = this.normalizeTogglePosition(val);
        if (name === 'label-position') this.labelPosition.value = this.normalizeLabelPosition(val);
    }

    private normalizeTogglePosition(value: string | null): 'left' | 'right' {
        return value === 'left' ? 'left' : 'right';
    }

    private normalizeLabelPosition(value: string | null): 'left' | 'right' {
        return value === 'right' ? 'right' : 'left';
    }

    events() {
        this.on(this.trigger, 'click', () => {
            if (this.isDisabled.value) return;

            const next = !this.isOpen.value;
            this.isOpen.value = next;

            if (next) {
                this.setAttribute('open', '');
            } else {
                this.removeAttribute('open');
            }

            this.emit('toggle', { open: next });
        });
    }
}

export class NcAccordion extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['multiple', 'variant', 'size'];

    // Dev tools sidebar controls
    static attributeOptions = {
        multiple: ['true'],
        variant: ['default', 'bordered', 'flush'],
        size: ['sm', 'md', 'lg', 'full'],
    };

    static styles = css`
        :host { display: block; }

        .accordion {
            border-radius: var(--nc-radius-md, 8px);
            overflow: hidden;
            width: 400px;
            max-width: 100%;
        }

        :host([variant="bordered"]) .accordion {
            border: 1px solid var(--nc-border, #e2e8f0);
        }

        :host([variant="flush"]) .accordion {
            border-radius: 0;
        }

        :host([size="sm"]) .accordion {
            width: 200px;
        }

        :host([size="md"]) .accordion {
            width: 400px;
        }

        :host([size="lg"]) .accordion {
            width: 600px;
        }   

        :host([size="full"]) .accordion {
            width: 100%;
        }

        ::slotted(nc-accordion-item:last-child) {
            border-bottom: none !important;
        }
    `;

    private allowMultiple = this.state(this.hasAttribute('multiple'));
    private variant = this.state('default');
    private size = this.state('md');


    template() {
        return html`
            <div class="accordion">
                <slot></slot>
            </div>
        `;
    }

    onMount() {
        this.allowMultiple.value = this.hasAttribute('multiple');
        this.variant.value = this.getAttribute('variant');
        this.size.value = this.getAttribute('size') || 'md';
        this.bind(this.variant, this, 'variant');
        this.bind(this.size, this, 'size');


        // Keep variant attribute canonical so styling stays predictable.
        this.effect(() => {
            const v = this.variant.value;
            if (v === 'default') {
                if (this.hasAttribute('variant')) this.removeAttribute('variant');
                return;
            }
            if (this.getAttribute('variant') !== v) this.setAttribute('variant', v);
        });

        // Keep size attribute canonical so styling stays predictable.
        this.effect(() => {
            const s = this.size.value;
            if (s === 'md') {
                if (this.hasAttribute('size')) this.removeAttribute('size');
                return;
            }
            if (this.getAttribute('size') !== s) this.setAttribute('size', s);
        });
    }

    protected _handleAttributeUpdate(name: string, val: string | null): void {
        if (name === 'multiple') this.allowMultiple.value = val !== null;
        if (name === 'variant') this.variant.value = val || 'default';
        if (name === 'size') this.size.value = val || 'md';
    }

    events() {
        this.on(this, 'toggle', (e: Event) => {
            const event = e as CustomEvent<{ open: boolean }>;
            const opened = event.target as NcAccordionItem;
            const allowMultiple = this.hasAttribute('multiple');

            if (allowMultiple) return;
            if (!event.detail.open) return;

            this.querySelectorAll<NcAccordionItem>('nc-accordion-item').forEach((item) => {
                if (item !== opened && item.hasAttribute('open')) {
                    item.removeAttribute('open');
                }
            });
        });
    }
}

if (!customElements.get('nc-accordion-item')) customElements.define('nc-accordion-item', NcAccordionItem);
if (!customElements.get('nc-accordion')) customElements.define('nc-accordion', NcAccordion);

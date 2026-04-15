/**
 * NcDropdown Component
 *
 * A generic trigger + floating-panel component. The trigger is whatever
 * is in slot[name="trigger"]; the content panel is the default slot.
 *
 * Attributes:
 *   - open: boolean - visible state
 *   - placement: 'bottom-start'|'bottom-end'|'bottom'|'top-start'|'top-end'|'top' (default: 'bottom-start')
 *   - close-on-select: boolean - close when a [data-value] child is clicked (default: true)
 *   - disabled: boolean
 *   - offset: number - gap in px between trigger and panel (default: 6)
 *   - width: string - CSS width of panel (default: 'auto'; use 'trigger' to match trigger width)
 *
 * Events:
 *   - open:   CustomEvent
 *   - close:  CustomEvent
 *   - select: CustomEvent<{ value: string; label: string }> - when a [data-value] child is clicked
 *
 * Usage:
 *   <nc-dropdown>
 *     <nc-button slot="trigger">Options</nc-button>
 *     <nc-menu>
 *       <nc-menu-item data-value="edit">Edit</nc-menu-item>
 *       <nc-menu-item data-value="delete">Delete</nc-menu-item>
 *     </nc-menu>
 *   </nc-dropdown>
 */

import { Component, defineComponent } from '../core/component.js';

export class NcDropdown extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['open', 'placement', 'close-on-select', 'disabled', 'offset', 'width'];
    }

    private _outsideClick: ((e: MouseEvent) => void) | null = null;

    template() {
        const open = this.hasAttribute('open');
        const placement = this.getAttribute('placement') || 'bottom-start';

        // Derive alignment classes from placement string
        const [vSide, hAlign] = placement.split('-') as [string, string | undefined];
        const above = vSide === 'top';

        return `
            <style>
                :host { display: inline-flex; position: relative; vertical-align: middle; }

                .trigger-slot {
                    display: contents;
                }

                .panel {
                    position: absolute;
                    ${above ? 'bottom: calc(100% + var(--dropdown-offset, 6px));' : 'top: calc(100% + var(--dropdown-offset, 6px));'}
                    ${!hAlign || hAlign === 'start' ? 'left: 0;' : hAlign === 'end' ? 'right: 0;' : 'left: 50%; transform: translateX(-50%);'}
                    z-index: 600;
                    background: var(--nc-bg);
                    border: 1px solid var(--nc-border);
                    border-radius: var(--nc-radius-md, 8px);
                    box-shadow: var(--nc-shadow-lg);
                    min-width: 160px;
                    overflow: hidden;
                    opacity: ${open ? '1' : '0'};
                    pointer-events: ${open ? 'auto' : 'none'};
                    transform-origin: ${above ? 'bottom' : 'top'} ${!hAlign || hAlign === 'start' ? 'left' : hAlign === 'end' ? 'right' : 'center'};
                    transform: ${open
                        ? (!hAlign || hAlign !== 'center' ? 'none' : 'translateX(-50%)')
                        : (!hAlign || hAlign !== 'center'
                            ? `scale(0.97) translateY(${above ? '4px' : '-4px'})`
                            : `translateX(-50%) scale(0.97) translateY(${above ? '4px' : '-4px'})`)};
                    transition: opacity var(--nc-transition-fast), transform var(--nc-transition-fast);
                }
            </style>
            <span class="trigger-slot">
                <slot name="trigger"></slot>
            </span>
            <div class="panel" role="menu" aria-hidden="${!open}">
                <slot></slot>
            </div>
        `;
    }

    onMount() {
        this._bindEvents();
    }

    private _bindEvents() {
        // Toggle on trigger click
        const triggerSlot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="trigger"]')!;
        triggerSlot.addEventListener('slotchange', () => this._hookTrigger());
        this._hookTrigger();

        // Close on outside click
        this._outsideClick = (e: MouseEvent) => {
            if (!this.contains(e.target as Node) && !this.shadowRoot!.contains(e.target as Node)) {
                this._setOpen(false);
            }
        };
        document.addEventListener('mousedown', this._outsideClick);

        // Close on Escape
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.hasAttribute('open')) this._setOpen(false);
        });

        // Select via [data-value] children in light DOM
        this.addEventListener('click', (e: Event) => {
            const target = (e.target as HTMLElement).closest<HTMLElement>('[data-value]');
            if (!target) return;
            const value = target.dataset.value ?? '';
            const label = target.textContent?.trim() ?? '';
            this.dispatchEvent(new CustomEvent('select', {
                bubbles: true, composed: true,
                detail: { value, label }
            }));
            if (this.getAttribute('close-on-select') !== 'false') {
                this._setOpen(false);
            }
        });
    }

    private _hookTrigger() {
        const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="trigger"]')!;
        const nodes = slot.assignedElements();
        nodes.forEach(node => {
            (node as HTMLElement).addEventListener('click', (e: Event) => {
                e.stopPropagation();
                if (!this.hasAttribute('disabled')) this._setOpen(!this.hasAttribute('open'));
            });
        });
    }

    private _setOpen(open: boolean) {
        if (open) {
            this.setAttribute('open', '');
        } else {
            this.removeAttribute('open');
        }
    }

    onUnmount() {
        if (this._outsideClick) document.removeEventListener('mousedown', this._outsideClick);
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        if (name === 'open' && this._mounted) {
            const open = this.hasAttribute('open');
            const panel = this.$<HTMLElement>('.panel');
            if (panel) {
                const placement = this.getAttribute('placement') || 'bottom-start';
                const [vSide, hAlign] = placement.split('-') as [string, string | undefined];
                const above = vSide === 'top';
                const center = hAlign === 'center';
                panel.style.opacity = open ? '1' : '0';
                panel.style.pointerEvents = open ? 'auto' : 'none';
                panel.style.transform = open
                    ? (center ? 'translateX(-50%)' : 'none')
                    : (center
                        ? `translateX(-50%) scale(0.97) translateY(${above ? '4px' : '-4px'})`
                        : `scale(0.97) translateY(${above ? '4px' : '-4px'})`);
                panel.setAttribute('aria-hidden', String(!open));
            }
            this.dispatchEvent(new CustomEvent(open ? 'open' : 'close', {
                bubbles: true, composed: true
            }));
            return;
        }
        if (this._mounted) { this.render(); this._bindEvents(); }
    }
}

defineComponent('nc-dropdown', NcDropdown);


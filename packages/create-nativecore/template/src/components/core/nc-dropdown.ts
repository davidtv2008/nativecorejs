/**
 * NcDropdown Component
 *
 * A generic trigger + floating-panel component. The trigger is whatever
 * is in slot[name="trigger"]; the content panel is the default slot.
 *
 * Attributes:
 *   - open: boolean — visible state
 *   - placement: 'bottom-start'|'bottom-end'|'bottom'|'top-start'|'top-end'|'top' (default: 'bottom-start')
 *   - close-on-select: boolean — close when a [data-value] child is clicked (default: true)
 *   - disabled: boolean
 *   - offset: number — gap in px between trigger and panel (default: 6)
 *   - width: string — CSS width of panel (default: 'auto'; use 'trigger' to match trigger width)
 *
 * Events:
 *   - open:   CustomEvent
 *   - close:  CustomEvent
 *   - select: CustomEvent<{ value: string; label: string }> — when a [data-value] child is clicked
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

import { CoreComponent } from '@core/component.js';
import { css, html } from '@core-utils/templates.js';

export class NcDropdown extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['open', 'placement', 'close-on-select', 'disabled', 'offset', 'width'];

    static attributeOptions  = { placement: ['bottom-start', 'bottom-end', 'bottom', 'top-start', 'top-end', 'top'] };
    static attributePlaceholders = { offset: '6', width: '200px' };
    static attributeOrder = ['placement', 'offset', 'width', 'close-on-select', 'open', 'disabled'];

    // -- Refs -----------------------------------------------------------------
    declare panelEl: HTMLDivElement;

    static styles = css`
        :host { display: inline-flex; position: relative; vertical-align: middle; }
        .trigger-slot { display: contents; }
        .panel {
            position: absolute;
            z-index: 600;
            background: var(--nc-bg);
            border: 1px solid var(--nc-border);
            border-radius: var(--nc-radius-md, 8px);
            box-shadow: var(--nc-shadow-lg);
            min-width: 160px;
            overflow: hidden;
            opacity: 0;
            pointer-events: none;
            transform: var(--dropdown-closed-transform, scale(0.97) translateY(-4px));
            transition: opacity var(--nc-transition-fast), transform var(--nc-transition-fast);
        }
        :host([open]) .panel {
            opacity: 1;
            pointer-events: auto;
            transform: var(--dropdown-open-transform, none);
        }
    `;

    template() {
        return html`            <span class="trigger-slot"><slot name="trigger"></slot></span>
            <div ref="panelEl" class="panel" role="menu" aria-hidden="true"><slot></slot></div>
        `;
    }

    onMount() {
        this._syncPlacement();
        // Toggle on trigger click
        const triggerSlot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="trigger"]')!;
        this.on(triggerSlot, 'slotchange', () => this._hookTrigger());
        this._hookTrigger();

        // Outside click closes
        this.on(document as EventTarget, 'mousedown', (e: MouseEvent) => {
            if (!this.contains(e.target as Node) && !this.shadowRoot!.contains(e.target as Node)) {
                this._setOpen(false);
            }
        });

        // Escape closes
        this.on(document as EventTarget, 'keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.hasAttribute('open')) this._setOpen(false);
        });

        // Select via [data-value] children in light DOM
        this.on(this, 'click', (e: Event) => {
            const target = (e.target as HTMLElement).closest<HTMLElement>('[data-value]');
            if (!target) return;
            this.emit('select', { value: target.dataset.value ?? '', label: target.textContent?.trim() ?? '' });
            if (this.getAttribute('close-on-select') !== 'false') this._setOpen(false);
        });
    }

    private _hookTrigger() {
        const slot  = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="trigger"]')!;
        slot.assignedElements().forEach(node => {
            this.on(node as EventTarget, 'click', (e: Event) => {
                e.stopPropagation();
                if (!this.hasAttribute('disabled')) this._setOpen(!this.hasAttribute('open'));
            });
        });
    }

    private _setOpen(open: boolean) {
        if (open) this.setAttribute('open', '');
        else      this.removeAttribute('open');
    }

    protected _handleAttributeUpdate(name: string, _val: string | null) {
        if (name === 'open') {
            const open = this.hasAttribute('open');
            this.panelEl.setAttribute('aria-hidden', String(!open));
            this.emit(open ? 'open' : 'close');
        } else {
            // placement changed — re-render so CSS origin/offset recalculates
            this.render();
            this._hookTrigger();
        }
    }

    private _syncPlacement() {
        const placement = this.getAttribute('placement') || 'bottom-start';
        const [vSide, hAlign] = placement.split('-') as [string, string | undefined];
        const above  = vSide === 'top';
        const center = hAlign === 'center';
        const end    = hAlign === 'end';

        this.panelEl.style.top    = '';
        this.panelEl.style.bottom = '';
        this.panelEl.style.left   = '';
        this.panelEl.style.right  = '';
        if (above) { this.panelEl.style.bottom = 'calc(100% + var(--dropdown-offset, 6px))'; }
        else       { this.panelEl.style.top    = 'calc(100% + var(--dropdown-offset, 6px))'; }
        if (center)   { this.panelEl.style.left  = '50%'; }
        else if (end) { this.panelEl.style.right = '0'; }
        else          { this.panelEl.style.left  = '0'; }
        this.panelEl.style.transformOrigin = `${above ? 'bottom' : 'top'} ${center ? 'center' : end ? 'right' : 'left'}`;

        const closedY = above ? '4px' : '-4px';
        this.style.setProperty('--dropdown-closed-transform', `${center ? 'translateX(-50%) ' : ''}scale(0.97) translateY(${closedY})`);
        this.style.setProperty('--dropdown-open-transform',   center ? 'translateX(-50%)' : 'none');
    }

    onUnmount() { /* this.on() listeners auto-cleaned by CoreComponent.destroy() */ }
}

if (!customElements.get('nc-dropdown')) customElements.define('nc-dropdown', NcDropdown);


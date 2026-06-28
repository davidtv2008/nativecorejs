/**
 * NcPopover Component â€” floating panel anchored to a trigger element
 *
 * More flexible than a dropdown: supports arbitrary slot content,
 * arrow pointer, multiple placement options, and click/hover triggers.
 *
 * Attributes:
 *   placement â€” 'top'|'bottom'(default)|'left'|'right'
 *               + '-start' or '-end' suffix: 'bottom-start'|'top-end' etc.
 *   trigger   â€” 'click'(default)|'hover'|'focus'|'manual'
 *   open      â€” boolean â€” controlled open state
 *   offset    â€” gap between anchor and popover in px (default: 8)
 *   arrow     â€” boolean â€” show arrow pointer (default: true)
 *   width     â€” popover width CSS value (default: 'auto')
 *   max-width â€” CSS value (default: '320px')
 *   close-on-outside â€” boolean(default true) â€” close on outside click
 *   disabled  â€” boolean
 *   hover-delay â€” ms before hover-trigger opens (default: 200)
 *
 * Slots:
 *   trigger  â€” the anchor element
 *   (default) â€” popover content
 *
 * Events:
 *   open  â€” popover opened
 *   close â€” popover closed
 *
 * Methods:
 *   el.show() / el.hide() / el.toggle()
 *
 * Usage:
 *   <nc-popover placement="bottom-start">
 *     <nc-button slot="trigger">Info</nc-button>
 *     <div style="padding:12px">
 *       <p>Popover content here.</p>
 *     </div>
 *   </nc-popover>
 */
import { CoreComponent } from '@core/component.js';
import { css } from '@core-utils/templates.js';

type Placement = 'top'|'top-start'|'top-end'|'bottom'|'bottom-start'|'bottom-end'|'left'|'left-start'|'left-end'|'right'|'right-start'|'right-end';

export class NcPopover extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['open', 'placement', 'disabled'];
    static attributeOptions   = { placement: ['top','top-start','top-end','bottom','bottom-start','bottom-end','left','right'], trigger: ['click','hover','focus','manual'] };
    static attributeOrder     = ['placement', 'trigger', 'open', 'arrow', 'width', 'max-width', 'offset', 'hover-delay', 'close-on-outside', 'disabled'];

    // -- Refs -----------------------------------------------------------------
    declare popoverEl: HTMLDivElement;
    declare arrowEl:   HTMLDivElement;

    private _hoverTimer: ReturnType<typeof setTimeout> | null = null;
    private _outside:    ((e: MouseEvent) => void)     | null = null;

    static styles = css`
        :host { display: inline-block; position: relative; }
        .trigger-wrap { display: contents; }
        .popover {
            position: absolute;
            z-index: 1000;
            background: var(--nc-bg-elevated, var(--nc-bg));
            border: 1px solid var(--nc-border);
            border-radius: var(--nc-radius-lg);
            box-shadow: var(--nc-shadow-lg);
            font-family: var(--nc-font-family);
            font-size: var(--nc-font-size-sm);
            color: var(--nc-text);
            opacity: 0;
            pointer-events: none;
            transform: scale(0.97) translateY(-4px);
            transform-origin: top center;
            transition:
                opacity var(--nc-transition-fast),
                transform var(--nc-transition-fast);
            white-space: normal;
            width: var(--_popover-width, auto);
            max-width: var(--_popover-max-width, 320px);
        }
        :host([open]) .popover {
            opacity: 1;
            pointer-events: auto;
            transform: scale(1) translateY(0);
        }
        .arrow {
            position: absolute;
            width: 8px; height: 8px;
            background: var(--nc-bg-elevated, var(--nc-bg));
            border: 1px solid var(--nc-border);
            transform: rotate(45deg);
            pointer-events: none;
        }
        [hidden] { display: none !important; }
    `;

    template() {
        return `            <div class="trigger-wrap">
                <slot name="trigger"></slot>
            </div>
            <div ref="popoverEl" class="popover" role="dialog" aria-modal="false">
                <div ref="arrowEl" class="arrow"></div>
                <slot></slot>
            </div>
        `;
    }

    onMount() {
        // Apply width / max-width as CSS custom properties
        const width    = this.getAttribute('width')    ?? 'auto';
        const maxWidth = this.getAttribute('max-width') ?? '320px';
        this.style.setProperty('--_popover-width',     width);
        this.style.setProperty('--_popover-max-width', maxWidth);

        // Arrow visibility
        if (this.getAttribute('arrow') === 'false') this.arrowEl.hidden = true;

        this._bindTrigger();
        if (this.hasAttribute('open')) { this._position(); this._setupOutside(); }
    }

    onUnmount() {
        this._cleanup();
    }

    // â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    show() {
        if (this.hasAttribute('open')) return;
        this.setAttribute('open', '');
        this._position();
        this._setupOutside();
        this.emit('open');
    }

    hide() {
        if (!this.hasAttribute('open')) return;
        this.removeAttribute('open');
        this._cleanupOutside();
        this.emit('close');
    }

    toggle() {
        if (this.hasAttribute('open')) this.hide();
        else this.show();
    }

    protected _handleAttributeUpdate(name: string, val: string | null) {
        if (name === 'open') {
            const isOpen = val !== null;
            if (isOpen) { this._position(); this._setupOutside(); }
            else { this._cleanupOutside(); }
            return;
        }
        if (name === 'placement') this._position();
    }

    // â”€â”€ Trigger binding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private _bindTrigger() {
        const triggerSlot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="trigger"]')!;
        const mode        = this.getAttribute('trigger') ?? 'click';
        const hoverDelay  = parseInt(this.getAttribute('hover-delay') ?? '200', 10);

        const getTrigger = (): HTMLElement | null =>
            (triggerSlot.assignedElements({ flatten: true })[0] as HTMLElement) ?? null;

        const bindOnSlotChange = (fn: (el: HTMLElement) => void) => {
            const handler = () => { const el = getTrigger(); if (el) fn(el); };
            triggerSlot.addEventListener('slotchange', handler);
            requestAnimationFrame(handler);
        };

        if (mode === 'click') {
            bindOnSlotChange(el => {
                this.on(el, 'click', () => {
                    if (!this.hasAttribute('disabled')) this.toggle();
                });
            });
        }

        if (mode === 'hover') {
            bindOnSlotChange(el => {
                this.on(el, 'mouseenter', () => {
                    if (this.hasAttribute('disabled')) return;
                    this._hoverTimer = setTimeout(() => this.show(), hoverDelay);
                });
                this.on(el, 'mouseleave', () => {
                    if (this._hoverTimer) { clearTimeout(this._hoverTimer); this._hoverTimer = null; }
                    this.hide();
                });
            });
        }

        if (mode === 'focus') {
            bindOnSlotChange(el => {
                this.on(el, 'focusin',  () => { if (!this.hasAttribute('disabled')) this.show(); });
                this.on(el, 'focusout', () => this.hide());
            });
        }
    }

    // â”€â”€ Positioning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private _position() {
        const popover   = this.popoverEl;
        const arrow     = this.arrowEl;
        const placement = (this.getAttribute('placement') ?? 'bottom') as Placement;
        const offset    = parseInt(this.getAttribute('offset') ?? '8', 10);
        const hasArrow  = this.getAttribute('arrow') !== 'false';
        const [side, align = 'center'] = placement.split('-') as [string, string?];

        // Reset
        (['top', 'bottom', 'left', 'right'] as const).forEach(s => { popover.style[s] = ''; });

        const arrowSz  = 8;
        const fullOff  = offset + (hasArrow ? arrowSz / 2 : 0);
        const isOpen   = this.hasAttribute('open');

        if (side === 'bottom') {
            popover.style.top = `calc(100% + ${fullOff}px)`;
            popover.style.transformOrigin = 'top center';
            if (align === 'start')       popover.style.left = '0';
            else if (align === 'end')    popover.style.right = '0';
            else { popover.style.left = '50%'; popover.style.transform = isOpen ? 'translateX(-50%)' : 'translateX(-50%) scale(0.97) translateY(-4px)'; }
            if (hasArrow) { arrow.style.top = `-${arrowSz/2}px`; arrow.style.left = '16px'; arrow.style.borderRight = 'none'; arrow.style.borderBottom = 'none'; }
        } else if (side === 'top') {
            popover.style.bottom = `calc(100% + ${fullOff}px)`;
            popover.style.transformOrigin = 'bottom center';
            if (align === 'start')       popover.style.left = '0';
            else if (align === 'end')    popover.style.right = '0';
            else { popover.style.left = '50%'; popover.style.transform = isOpen ? 'translateX(-50%)' : 'translateX(-50%) scale(0.97) translateY(4px)'; }
            if (hasArrow) { arrow.style.bottom = `-${arrowSz/2}px`; arrow.style.left = '16px'; arrow.style.borderLeft = 'none'; arrow.style.borderTop = 'none'; }
        } else if (side === 'right') {
            popover.style.left = `calc(100% + ${fullOff}px)`;
            popover.style.top  = '0';
            popover.style.transformOrigin = 'left center';
            if (hasArrow) { arrow.style.left = `-${arrowSz/2}px`; arrow.style.top = '12px'; arrow.style.borderRight = 'none'; arrow.style.borderTop = 'none'; }
        } else {
            popover.style.right = `calc(100% + ${fullOff}px)`;
            popover.style.top   = '0';
            popover.style.transformOrigin = 'right center';
            if (hasArrow) { arrow.style.right = `-${arrowSz/2}px`; arrow.style.top = '12px'; arrow.style.borderLeft = 'none'; arrow.style.borderBottom = 'none'; }
        }
    }

    private _setupOutside() {
        if (this.getAttribute('close-on-outside') === 'false') return;
        const handler = (e: MouseEvent) => {
            if (!this.contains(e.target as Node)) this.hide();
        };
        document.addEventListener('mousedown', handler as EventListener);
        this._outside = handler;
    }

    private _cleanupOutside() {
        if (this._outside) {
            document.removeEventListener('mousedown', this._outside as EventListener);
            this._outside = null;
        }
    }

    private _cleanup() {
        this._cleanupOutside();
        if (this._hoverTimer) clearTimeout(this._hoverTimer);
    }
}

if (!customElements.get('nc-popover')) customElements.define('nc-popover', NcPopover);

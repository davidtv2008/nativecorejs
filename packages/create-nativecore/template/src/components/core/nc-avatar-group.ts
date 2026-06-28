/**
 * NcAvatarGroup Component — stacked overlapping avatars with overflow count
 *
 * Slots the first `max` nc-avatar elements, then shows "+N" for the rest.
 *
 * Attributes:
 *   max      — max visible avatars (default: 4)
 *   size     — 'xs'|'sm'|'md'(default)|'lg'|'xl' — passed to overflow bubble
 *   overlap  — overlap amount in px (default: 10)
 *   total    — total count override (used when only some avatars are slotted)
 *              If not set, derived from slotted nc-avatars count.
 *
 * Usage:
 *   <nc-avatar-group max="3">
 *     <nc-avatar alt="Alice" variant="primary"></nc-avatar>
 *     <nc-avatar alt="Bob"   variant="success"></nc-avatar>
 *     <nc-avatar alt="Carol" variant="warning"></nc-avatar>
 *     <nc-avatar alt="Dave"  variant="danger"></nc-avatar>
 *     <nc-avatar alt="Eve"   variant="secondary"></nc-avatar>
 *   </nc-avatar-group>
 */
import { CoreComponent } from '@core/component.js';
import { css, html } from '@core-utils/templates.js';

export class NcAvatarGroup extends CoreComponent {
    static useShadowDOM = true;

    static observedAttributes = ['max', 'size', 'overlap', 'total'];

    static attributeOptions = {
        size: ['xs', 'sm', 'md', 'lg', 'xl'],
    };

    static attributeOrder = ['max', 'size', 'overlap', 'total'];

    static attributePlaceholders = {
        max:     '4',
        overlap: '10',
        total:   '',
    };

    // ── Refs ──────────────────────────────────────────────────────────────────
    declare slotEl: HTMLSlotElement;
    declare overflowEl: HTMLElement;

    // ── Template ──────────────────────────────────────────────────────────────
    // Layout values (overlap, size, bw) are set as CSS custom properties on
    // the host so they update reactively without re-rendering the template.
    static styles = css`
        :host { display: inline-block; }

        .group {
            display: flex;
            flex-direction: row;
            align-items: center;
        }

        ::slotted(*) {
            margin-left: calc(-1 * var(--_overlap, 10px));
            box-shadow: 0 0 0 var(--_bw, 2px) var(--nc-bg, #fff);
            border-radius: 50%;
            flex-shrink: 0;
            position: relative;
            transition: transform var(--nc-transition-fast), z-index 0s;
            z-index: 0;
        }

        ::slotted(*:first-child) { margin-left: 0; }
        ::slotted(*:hover)       { transform: translateY(-3px); z-index: 10; }

        .overflow {
            margin-left: calc(-1 * var(--_overlap, 10px));
            width: var(--_sz, 40px);
            height: var(--_sz, 40px);
            border-radius: 50%;
            background: var(--nc-bg-tertiary, #e5e7eb);
            color: var(--nc-text-secondary);
            font-family: var(--nc-font-family);
            font-size: var(--_fs, 13px);
            font-weight: var(--nc-font-weight-semibold);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 0 var(--_bw, 2px) var(--nc-bg, #fff);
            flex-shrink: 0;
            user-select: none;
        }
    `;

    template() {
        return html`            <div class="group" role="group" aria-label="Avatar group">
                <slot ref="slotEl"></slot>
                <div ref="overflowEl" class="overflow" style="display:none" aria-hidden="true"></div>
            </div>
        `;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    onMount() {
        this._applyLayout();
        this._update();
        this.on(this.slotEl, 'slotchange', () => this._update());
    }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._applyLayout();
        this._update();
    }

    // ── Private helpers ───────────────────────────────────────────────────────
    private _applyLayout() {
        const overlap = parseInt(this.getAttribute('overlap') ?? '10', 10);
        const size    = this.getAttribute('size') ?? 'md';
        const sizePx: Record<string, number> = { xs: 24, sm: 32, md: 40, lg: 48, xl: 56 };
        const sz = sizePx[size] ?? 40;
        this.style.setProperty('--_overlap', `${overlap}px`);
        this.style.setProperty('--_sz',      `${sz}px`);
        this.style.setProperty('--_fs',      `${Math.round(sz * 0.32)}px`);
        this.style.setProperty('--_bw',      `${Math.max(2, Math.round(sz * 0.06))}px`);
    }

    private _update() {
        const max   = parseInt(this.getAttribute('max')   ?? '4', 10);
        const total = parseInt(this.getAttribute('total') ?? '0', 10);
        const items = this.slotEl.assignedElements({ flatten: true }) as HTMLElement[];
        const count = total > 0 ? total : items.length;

        items.forEach((el, idx) => { el.style.display = idx < max ? '' : 'none'; });

        const extra = count - Math.min(max, items.length);
        if (extra > 0) {
            this.overflowEl.textContent   = `+${extra}`;
            this.overflowEl.style.display = 'flex';
        } else {
            this.overflowEl.style.display = 'none';
        }
    }
}

if (!customElements.get('nc-avatar-group')) customElements.define('nc-avatar-group', NcAvatarGroup);


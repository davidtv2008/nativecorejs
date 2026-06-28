/**
 * NativeCore Menu Item Component (nc-menu-item)
 *
 * A single selectable row inside an nc-menu. Renders an optional icon,
 * a label via the default slot, and an optional end slot for badges/shortcuts.
 *
 * Attributes:
 *   icon      — URL to a leading icon image (optional)
 *   alt       — Alt text for the icon (accessibility)
 *   disabled  — Boolean. Prevents selection and dims the row.
 *   active    — Boolean. Marks the row as currently selected. Set by nc-menu
 *               or manually for controlled menus.
 *   danger    — Boolean. Applies destructive/danger coloring.
 *
 * Slots:
 *   default   — Item label / content.
 *               You can nest <nc-menu-body> inside for side-panel menus.
 *   end       — Trailing content (badge, keyboard shortcut, chevron, etc.)
 *
 * Events emitted:
 *   nc-select — {} — fires when the item is clicked or activated via keyboard.
 *               Bubbles + composed so nc-menu can delegate.
 *
 * Usage:
 *   <nc-menu-item icon="/icons/edit.svg" alt="Edit">Edit</nc-menu-item>
 *   <nc-menu-item danger>Delete</nc-menu-item>
 *   <nc-menu-item disabled>Unavailable</nc-menu-item>
 *   <nc-menu-item active>Selected</nc-menu-item>
 *   <nc-menu-item>
 *     Save
 *     <span slot="end">Ctrl+S</span>
 *   </nc-menu-item>
 */

import { CoreComponent } from '@core/component.js';
import { css, html, sanitizeURL } from '@core-utils/templates.js';

export class NcMenuItem extends CoreComponent {
    static useShadowDOM = true;

    static observedAttributes = ['icon', 'alt', 'disabled', 'active', 'danger', 'body'];

    static attributeOrder = ['icon', 'alt', 'body', 'active', 'danger', 'disabled'];

    static attributePlaceholders = {
        icon: '/icons/item.svg',
        alt: 'Menu item icon',
        body: 'details-panel',
    };

    // ── Refs ──────────────────────────────────────────────────────────────────
    declare itemEl: HTMLElement;
    declare iconEl: HTMLImageElement;

    // ── Template ──────────────────────────────────────────────────────────────

    static styles = css`
        :host {
            display: block;
        }

        .item {
            display: flex;
            align-items: center;
            gap: var(--nc-spacing-sm);
            padding: var(--nc-spacing-sm) var(--nc-spacing-md);
            border-radius: var(--nc-radius-md);
            cursor: pointer;
            font-family: var(--nc-font-family);
            font-size: var(--nc-font-size-sm);
            font-weight: var(--nc-font-weight-medium);
            color: var(--nc-text);
            background: transparent;
            border: none;
            width: 100%;
            text-align: left;
            box-sizing: border-box;
            transition:
                background var(--nc-transition-fast),
                color var(--nc-transition-fast);
            user-select: none;
            outline: none;
        }

        .item:hover {
            background: var(--nc-bg-tertiary);
            color: var(--nc-text);
        }

        .item:focus-visible {
            outline: 2px solid var(--nc-primary);
            outline-offset: -2px;
        }

        /* Active / selected */
        :host([active]) .item {
            background: rgba(16, 185, 129, 0.1);
            color: var(--nc-primary);
            font-weight: var(--nc-font-weight-semibold);
        }

        :host([active]) .item:hover {
            background: rgba(16, 185, 129, 0.15);
        }

        /* Danger */
        :host([danger]) .item {
            color: var(--nc-danger);
        }

        :host([danger]) .item:hover {
            background: rgba(239, 68, 68, 0.08);
            color: var(--nc-danger);
        }

        /* Disabled */
        :host([disabled]) .item {
            opacity: 0.4;
            cursor: not-allowed;
            pointer-events: none;
        }

        .item__icon {
            width: 16px;
            height: 16px;
            object-fit: contain;
            flex-shrink: 0;
            opacity: 0.75;
        }

        :host([active]) .item__icon,
        :host([danger]) .item__icon {
            opacity: 1;
        }

        .item__label {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .item__end {
            flex-shrink: 0;
            font-size: var(--nc-font-size-xs, 0.7rem);
            color: var(--nc-text-muted, var(--nc-text-secondary));
            opacity: 0.65;
        }

        /* When used as nested content panel mapping, keep bodies out of label flow. */
        ::slotted(nc-menu-body) {
            display: none !important;
        }
    `;

    template(): string {
        return html`            <div ref="itemEl" class="item" role="menuitem" tabindex="0" aria-disabled="false">
                <img ref="iconEl" class="item__icon" alt="" style="display:none" />
                <span class="item__label"><slot></slot></span>
                <span class="item__end"><slot name="end"></slot></span>
            </div>
        `;
    }

    onMount(): void {
        this._syncAttrs();

        this.on(this.itemEl, 'click', (e: Event) => {
            if (this.hasAttribute('disabled')) { e.stopPropagation(); return; }
            this.emit('nc-select', {
                item: this,
                body: this.getAttribute('body') || '',
            });
        });

        this.on(this.itemEl, 'keydown', (e: Event) => {
            const ke = e as KeyboardEvent;
            if (ke.key === 'Enter' || ke.key === ' ') {
                e.preventDefault();
                this.itemEl.click();
            }
        });
    }

    protected _handleAttributeUpdate(_name: string, _val: string | null): void {
        this._syncAttrs();
    }

    private _syncAttrs(): void {
        const icon = this.getAttribute('icon') || '';
        const alt = this.getAttribute('alt') || '';
        const disabled = this.hasAttribute('disabled');

        if (icon) {
            this.iconEl.src = sanitizeURL(icon);
            this.iconEl.alt = alt;
            this.iconEl.style.display = 'block';
        } else {
            this.iconEl.removeAttribute('src');
            this.iconEl.alt = '';
            this.iconEl.style.display = 'none';
        }

        this.itemEl.setAttribute('tabindex', disabled ? '-1' : '0');
        this.itemEl.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    }
}

if (!customElements.get('nc-menu-item')) customElements.define('nc-menu-item', NcMenuItem);


/**
 * NativeCore Menu Component (nc-menu)
 *
 * A vertical command menu. Place nc-menu-item elements inside as direct children.
 * Supports grouped items (via nc-menu-divider or label attribute), a searchable
 * filter box, and several visual variants.
 *
 * Attributes:
 *   variant     — 'default' | 'compact' | 'inset' | 'bordered'  (default: 'default')
 *   searchable  — Boolean. Adds a filter input at the top that hides non-matching items.
 *   label       — Optional header label shown above the items.
 *   width       — CSS width value, e.g. '220px'. Defaults to 'fit-content'.
 *   auto-active — Boolean. Automatically moves the `active` attribute to whichever
 *                  item was last selected or navigated to. For nc-a items, also
 *                  matches the current path on mount.
 *
 * Slots:
 *   default    — nc-menu-item (and nc-menu-divider) elements.
 *
 * Events emitted:
 *   nc-menu-select — { item: HTMLElement, label: string } — fires when any
 *                    nc-menu-item inside emits nc-select.
 *
 * Keyboard:
 *   ArrowDown / ArrowUp — move focus between items.
 *   Home / End          — jump to first / last item.
 *   Escape              — blur the menu.
 *
 * Usage:
 *   <nc-menu label="Actions">
 *     <nc-menu-item icon="/icons/edit.svg">Edit</nc-menu-item>
 *     <nc-menu-item icon="/icons/copy.svg">Duplicate</nc-menu-item>
 *     <nc-menu-item danger icon="/icons/trash.svg">Delete</nc-menu-item>
 *   </nc-menu>
 *
 *   <nc-menu searchable variant="bordered" width="260px">
 *     <nc-menu-item>Dashboard</nc-menu-item>
 *     <nc-menu-item active>Components</nc-menu-item>
 *     <nc-menu-item>Settings</nc-menu-item>
 *   </nc-menu>
 *
 *   <!-- Navigation sidebar: nc-a items, active managed automatically -->
 *   <nc-menu auto-active variant="inset" width="220px">
 *     <nc-a href="/dashboard" variant="ghost">Dashboard</nc-a>
 *     <nc-a href="/components" variant="ghost">Components</nc-a>
 *     <nc-a href="/settings" variant="ghost">Settings</nc-a>
 *   </nc-menu>
 */
import { Component, defineComponent } from '@core/component.js';
import { html, trusted } from '@core-utils/templates.js';
export class NcMenu extends Component {
    static useShadowDOM = true;
    static attributeOptions = {
        variant: ['default', 'compact', 'inset', 'bordered'],
    };
    static get observedAttributes() {
        return ['variant', 'searchable', 'label', 'width', 'auto-active'];
    }
    _onSlotChange = null;
    _onSelect = null;
    _onNavigate = null;
    _onKeydown = null;
    _onSearchInput = null;
    template() {
        const label = this.getAttribute('label') || '';
        const searchable = this.hasAttribute('searchable');
        const width = this.getAttribute('width') || 'fit-content';
        const labelHTML = label
            ? `<div class="menu__label">${label}</div>`
            : '';
        const searchHTML = searchable
            ? `<div class="menu__search-wrap">
                   <svg class="menu__search-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                       <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.5"/>
                       <path d="M15 15l-3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                   </svg>
                   <input class="menu__search" type="text" placeholder="Search..." autocomplete="off" spellcheck="false" />
               </div>`
            : '';
        return html `
            <style>
                :host {
                    display: inline-block;
                    width: ${width};
                    font-family: var(--nc-font-family);
                    box-sizing: border-box;
                }

                .menu {
                    background: var(--nc-bg);
                    border-radius: var(--nc-radius-lg);
                    padding: var(--nc-spacing-xs);
                    min-width: 180px;
                    box-sizing: border-box;
                    width: 100%;
                }

                /* ── Variants ──────────────────────────────────────────────── */
                :host([variant="default"]) .menu,
                :host(:not([variant])) .menu {
                    background: var(--nc-bg);
                    padding: var(--nc-spacing-xs);
                }

                :host([variant="compact"]) .menu {
                    padding: 2px;
                }

                :host([variant="compact"]) ::slotted(nc-menu-item) {
                    --nc-menu-item-py: var(--nc-spacing-xs);
                }

                :host([variant="inset"]) .menu {
                    background: var(--nc-bg-secondary);
                    padding: var(--nc-spacing-sm);
                    border-radius: var(--nc-radius-xl);
                }

                :host([variant="bordered"]) .menu {
                    background: var(--nc-bg);
                    border: 1px solid var(--nc-border);
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
                    padding: var(--nc-spacing-xs);
                }

                /* ── Label ─────────────────────────────────────────────────── */
                .menu__label {
                    font-size: var(--nc-font-size-xs, 0.7rem);
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: var(--nc-text-secondary);
                    padding: var(--nc-spacing-xs) var(--nc-spacing-md) var(--nc-spacing-xs);
                    margin-bottom: 2px;
                }

                /* ── Search ────────────────────────────────────────────────── */
                .menu__search-wrap {
                    position: relative;
                    margin-bottom: var(--nc-spacing-xs);
                }

                .menu__search-icon {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 14px;
                    height: 14px;
                    color: var(--nc-text-secondary);
                    pointer-events: none;
                }

                .menu__search {
                    width: 100%;
                    box-sizing: border-box;
                    padding: var(--nc-spacing-xs) var(--nc-spacing-sm) var(--nc-spacing-xs) 30px;
                    font-family: var(--nc-font-family);
                    font-size: var(--nc-font-size-sm);
                    background: var(--nc-bg-secondary);
                    border: 1px solid var(--nc-border);
                    border-radius: var(--nc-radius-md);
                    color: var(--nc-text);
                    outline: none;
                    transition: border-color var(--nc-transition-fast);
                }

                .menu__search:focus {
                    border-color: var(--nc-primary);
                }

                .menu__search::placeholder {
                    color: var(--nc-text-secondary);
                    opacity: 0.6;
                }

                /* ── Empty state ───────────────────────────────────────────── */
                .menu__empty {
                    display: none;
                    font-size: var(--nc-font-size-sm);
                    color: var(--nc-text-secondary);
                    padding: var(--nc-spacing-md);
                    text-align: center;
                    opacity: 0.6;
                }

                .menu__empty.visible {
                    display: block;
                }
            </style>
            <div class="menu" role="menu">
                ${trusted(labelHTML)}
                ${trusted(searchHTML)}
                <slot></slot>
                <div class="menu__empty">No results</div>
            </div>
        `;
    }
    onMount() {
        // Delegate nc-select events from nc-menu-item children
        this._onSelect = (e) => {
            const item = e.target;
            if (item.tagName.toLowerCase() !== 'nc-menu-item')
                return;
            const label = item.textContent?.trim() ?? '';
            this.emitEvent('nc-menu-select', { item, label });
            // Always track active for nc-menu-item — no opt-in required
            this._setActive(item);
        };
        this.addEventListener('nc-select', this._onSelect);
        // Delegate nc-navigate events from nc-a children
        this._onNavigate = (e) => {
            const item = e.target;
            if (item.tagName.toLowerCase() !== 'nc-a')
                return;
            if (this.hasAttribute('auto-active'))
                this._setActive(item);
        };
        this.addEventListener('nc-navigate', this._onNavigate);
        // Arrow key navigation (supports both nc-menu-item and nc-a)
        this._onKeydown = (e) => {
            const ke = e;
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'].includes(ke.key))
                return;
            ke.preventDefault();
            const items = this._getEnabledItems();
            if (!items.length)
                return;
            const focused = document.activeElement;
            const idx = items.findIndex(el => el === focused || el.shadowRoot?.contains(focused));
            if (ke.key === 'Escape') {
                focused?.blur?.();
                return;
            }
            if (ke.key === 'Home') {
                this._focusItem(items[0]);
                return;
            }
            if (ke.key === 'End') {
                this._focusItem(items[items.length - 1]);
                return;
            }
            const next = ke.key === 'ArrowDown'
                ? items[Math.min(idx + 1, items.length - 1)]
                : items[Math.max(idx - 1, 0)];
            this._focusItem(next);
        };
        this.addEventListener('keydown', this._onKeydown);
        // Auto-active: match current path for nc-a items on mount
        if (this.hasAttribute('auto-active')) {
            Promise.resolve().then(() => this._syncActiveFromPath());
        }
        // Search filtering
        if (this.hasAttribute('searchable')) {
            this._attachSearch();
        }
        // Re-sync search + path when slot contents change
        const slot = this.$('slot');
        if (slot) {
            this._onSlotChange = () => {
                if (this.hasAttribute('searchable'))
                    this._filterItems('');
                if (this.hasAttribute('auto-active'))
                    this._syncActiveFromPath();
            };
            slot.addEventListener('slotchange', this._onSlotChange);
        }
    }
    onUnmount() {
        if (this._onSelect)
            this.removeEventListener('nc-select', this._onSelect);
        if (this._onNavigate)
            this.removeEventListener('nc-navigate', this._onNavigate);
        if (this._onKeydown)
            this.removeEventListener('keydown', this._onKeydown);
        const slot = this.$('slot');
        if (slot && this._onSlotChange)
            slot.removeEventListener('slotchange', this._onSlotChange);
        this._onSelect = null;
        this._onNavigate = null;
        this._onKeydown = null;
        this._onSlotChange = null;
        this._onSearchInput = null;
    }
    attributeChangedCallback(_name, oldValue, newValue) {
        if (this._mounted && oldValue !== newValue)
            this.render();
    }
    // ─── Private ────────────────────────────────────────────────────────────────
    _getEnabledItems() {
        return Array.from(this.querySelectorAll('nc-menu-item:not([disabled]), nc-a:not([disabled])'));
    }
    _focusItem(item) {
        const tag = item.tagName.toLowerCase();
        const selector = tag === 'nc-a' ? 'a' : '[role="menuitem"]';
        item.shadowRoot?.querySelector(selector)?.focus();
    }
    /** Moves `active` to `target`, removes it from all siblings. */
    _setActive(target) {
        const all = Array.from(this.querySelectorAll('nc-menu-item, nc-a'));
        all.forEach(el => {
            if (el === target) {
                el.setAttribute('active', '');
            }
            else {
                el.removeAttribute('active');
            }
        });
    }
    /**
     * For nc-a items with auto-active: set active on the item whose href
     * matches the current pathname. Handles exact and prefix matches.
     */
    _syncActiveFromPath() {
        const path = window.location.pathname;
        const links = Array.from(this.querySelectorAll('nc-a[href]'));
        if (!links.length)
            return;
        // Prefer exact match, fall back to longest prefix
        let best = null;
        let bestLen = 0;
        links.forEach(link => {
            const href = link.getAttribute('href') ?? '';
            if (href === path) {
                best = link;
                bestLen = Infinity;
                return;
            }
            if (bestLen < Infinity && path.startsWith(href) && href.length > bestLen) {
                best = link;
                bestLen = href.length;
            }
        });
        if (best)
            this._setActive(best);
    }
    _attachSearch() {
        const input = this.$('.menu__search');
        if (!input)
            return;
        this._onSearchInput = () => this._filterItems(input.value);
        input.addEventListener('input', this._onSearchInput);
    }
    _filterItems(query) {
        const q = query.toLowerCase().trim();
        const items = Array.from(this.querySelectorAll('nc-menu-item, nc-a'));
        let visible = 0;
        items.forEach(item => {
            const text = (item.textContent ?? '').toLowerCase();
            const show = !q || text.includes(q);
            item.style.display = show ? '' : 'none';
            if (show)
                visible++;
        });
        const empty = this.$('.menu__empty');
        if (empty)
            empty.classList.toggle('visible', visible === 0);
    }
}
defineComponent('nc-menu', NcMenu);

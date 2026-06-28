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
 *   width       — CSS width value for full component, e.g. '100%'. Defaults to 'fit-content'.
 *   menu-width  — Left menu column width, e.g. '260px'.
 *   panel-width — Right body panel width, e.g. '520px'.
 *   height      — Fixed height for both columns, e.g. '480px'.
 *   scrollable  — Boolean. Enables vertical scrolling in menu and body panel.
 *   auto-active — Boolean. Automatically moves the `active` attribute to whichever
 *                  item was last selected or navigated to. For nc-a items, also
 *                  matches the current path on mount.
 *
 * Slots:
 *   default    — nc-menu-item (and nc-menu-divider) elements.
 *
 * Body mapping:
 *   - Nested:   <nc-menu-item body="settings"><nc-menu-body>...</nc-menu-body></nc-menu-item>
 *   - External: <nc-menu-item body="settings">...</nc-menu-item>
 *               <nc-menu-body name="settings">...</nc-menu-body>
 *   Optional scoping for external bodies:
 *               <nc-menu id="account-menu">...</nc-menu>
 *               <nc-menu-body menu="account-menu" name="settings">...</nc-menu-body>
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

import { CoreComponent } from '@core/component.js';
import { css, html } from '@core-utils/templates.js';

export class NcMenu extends CoreComponent {
    static useShadowDOM = true;

    static observedAttributes = ['variant', 'searchable', 'label', 'width', 'menu-width', 'panel-width', 'height', 'scrollable', 'auto-active', 'toggleable', 'collapsed'];

    static attributeOptions = {
        variant: ['default', 'compact', 'inset', 'bordered'],
        searchable: ['true'],
        scrollable: ['true'],
        'auto-active': ['true'],
        toggleable: ['true'],
    };

    static attributeOrder = ['variant', 'searchable', 'scrollable', 'label', 'width', 'menu-width', 'panel-width', 'height', 'auto-active', 'toggleable'];

    static attributePlaceholders = {
        label: 'Menu',
        width: 'fit-content',
        'menu-width': '260px',
        'panel-width': '520px',
        height: '480px',
    };

    // ── Refs ──────────────────────────────────────────────────────────────────
    declare menuHeaderEl: HTMLElement;
    declare labelTextEl: HTMLElement;
    declare searchWrapEl: HTMLElement;
    declare searchInputEl: HTMLInputElement;
    declare slotEl: HTMLSlotElement;
    declare emptyEl: HTMLElement;
    declare mobileToggleEl: HTMLButtonElement;
    declare menuRootEl: HTMLElement;
    declare panelEl: HTMLElement;
    declare panelContentEl: HTMLElement;
    declare panelEmptyEl: HTMLElement;

    private _itemBodies = new WeakMap<HTMLElement, HTMLElement>();
    private _bodyOwners = new WeakMap<HTMLElement, HTMLElement>();
    private _activeBody: HTMLElement | null = null;
    private _mq: MediaQueryList | null = null;

    private _menuIdentity(): string {
        return this.id || this.getAttribute('name') || '';
    }

    static styles = css`
        :host {
            --_menu-col: 260px;
            --_panel-col: minmax(320px, 1fr);
            --_toggle-size: 44px;
            display: grid;
            grid-template-columns: var(--_menu-col) var(--_panel-col);
            gap: var(--nc-spacing-md);
            width: fit-content;
            font-family: var(--nc-font-family);
            box-sizing: border-box;
            align-items: start;
            position: relative;
            /* Own stacking context so child z-index values are self-contained */
            isolation: isolate;
        }

        /* Collapsed: panel takes full width.
           .menu-shell escapes grid flow → becomes floating pill. */
        :host([collapsed]) {
            grid-template-columns: 1fr;
        }

        :host([collapsed]) .menu-shell {
            position: absolute;
            /* Above the panel so the toggle pill is always clickable */
            z-index: 30;
            top: 0;
            left: 0;
            width: var(--_toggle-size);
            height: var(--_toggle-size);
            overflow: hidden;
            border-radius: var(--nc-radius-lg);
            background: color-mix(in srgb, var(--nc-bg-secondary) 55%, transparent);
            border: 1px solid color-mix(in srgb, var(--nc-border) 50%, transparent);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
        }

        .menu-shell {
            position: relative;
            min-width: 0;
            overflow: hidden;
        }

        .menu {
            background: var(--nc-bg);
            border-radius: var(--nc-radius-lg);
            padding: var(--nc-spacing-xs);
            min-width: 180px;
            box-sizing: border-box;
            width: 100%;
        }

        .menu-panel {
            position: relative;
            z-index: 1;
            min-width: 240px;
            min-height: 120px;
            background: var(--nc-bg);
            border-radius: var(--nc-radius-lg);
            border: 1px solid var(--nc-border);
            box-sizing: border-box;
            overflow: hidden;
        }

        .menu-panel__content {
            min-height: 100%;
        }

        .menu-panel__empty {
            display: none;
            padding: var(--nc-spacing-md);
            color: var(--nc-text-secondary);
            font-size: var(--nc-font-size-sm);
        }

        .menu-panel__empty.visible {
            display: block;
        }

        /* ── Toggle button ───────────────────────────────────────── */
        /* Pinned to shell's top-right corner via position:absolute.
           Stays visible at any shell width, including the 44px pill. */
        .menu__toggle {
            display: none;
            position: absolute;
            top: 7px;
            right: 7px;
            width: 30px;
            height: 30px;
            padding: 0;
            border: 1px solid var(--nc-border);
            border-radius: 999px;
            background: var(--nc-bg-secondary);
            color: var(--nc-text);
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 2;
            flex-shrink: 0;
            transition: background var(--nc-transition-fast), border-color var(--nc-transition-fast);
        }

        :host([toggleable]) .menu__toggle {
            display: inline-flex;
        }

        .menu__toggle:hover {
            background: var(--nc-bg-tertiary);
            border-color: var(--nc-primary);
        }

        /* Two SVG icons: one per state, toggled by [collapsed] */
        .menu__toggle svg {
            width: 15px;
            height: 15px;
            pointer-events: none;
            flex-shrink: 0;
        }

        /* Show open-icon when collapsed (burger = open the menu) */
        .menu__toggle .icon-open  { display: block; }
        .menu__toggle .icon-close { display: none; }

        /* Show close-icon when expanded */
        :host([toggleable]:not([collapsed])) .menu__toggle .icon-open  { display: none; }
        :host([toggleable]:not([collapsed])) .menu__toggle .icon-close { display: block; }

        /* ── Mobile ─────────────────────────────────────────────────── */
        @media (max-width: 768px) {
            :host([toggleable]) {
                /* Let CSS own the width — don't let _syncLayout inline override */
                width: 100% !important;
                max-width: 100%;
                box-sizing: border-box;
            }
            /* Expanded on mobile: kill the 320px panel minimum */
            :host([toggleable]:not([collapsed])) {
                --_panel-col: minmax(0, 1fr);
                grid-template-columns: var(--_menu-col) minmax(0, 1fr);
            }
            .menu-panel {
                min-width: 0;
                overflow: hidden;
            }
            .menu {
                min-width: 0;
            }
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

        /* ── Header row (title + toggle placeholder) ─────────────── */
        .menu__header {
            display: flex;
            align-items: center;
            min-height: var(--_toggle-size);
            padding: 0 var(--nc-spacing-sm);
            /* Right gap leaves room for the absolutely-positioned toggle */
            padding-right: calc(30px + var(--nc-spacing-sm) + 4px);
            border-bottom: 1px solid var(--nc-border);
            margin-bottom: 2px;
            box-sizing: border-box;
        }

        .menu__header-label {
            flex: 1;
            font-size: var(--nc-font-size-sm);
            font-weight: 600;
            color: var(--nc-text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: 0;
            transition: opacity var(--nc-transition-fast);
        }

        :host([collapsed]) .menu__header-label {
            opacity: 0;
            pointer-events: none;
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
    `;

    template(): string {
        return html`            <div class="menu-shell">
                <button ref="mobileToggleEl" class="menu__toggle" type="button" aria-label="Toggle menu" aria-expanded="true">
                    <!-- panel-left: open the sidebar -->
                    <svg class="icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M9 3v18"/>
                        <path d="m14 9 3 3-3 3"/>
                    </svg>
                    <!-- panel-left-close: close the sidebar -->
                    <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M9 3v18"/>
                        <path d="m17 9-3 3 3 3"/>
                    </svg>
                </button>
                <div ref="menuRootEl" class="menu" role="menu">
                    <div ref="menuHeaderEl" class="menu__header" style="display:none">
                        <span ref="labelTextEl" class="menu__header-label"></span>
                    </div>
                    <div ref="searchWrapEl" class="menu__search-wrap" style="display:none">
                        <svg class="menu__search-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.5"/>
                            <path d="M15 15l-3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        <input ref="searchInputEl" class="menu__search" type="text" placeholder="Search..." autocomplete="off" spellcheck="false" />
                    </div>
                    <slot ref="slotEl"></slot>
                    <div ref="emptyEl" class="menu__empty">No results</div>
                </div>
            </div>
            <div ref="panelEl" class="menu-panel" role="region" aria-label="Menu content panel">
                <div ref="panelContentEl" class="menu-panel__content"></div>
                <div ref="panelEmptyEl" class="menu-panel__empty visible">Select a menu item</div>
            </div>
        `;
    }

    onMount(): void {
        this._syncLayout();
        this._setupToggleBehavior();

        this.on(this.mobileToggleEl, 'click', () => {
            this._toggleCollapsed();
        });

        this.on(this, 'nc-select', (e: Event) => {
            const item = e.target as HTMLElement;
            if (item.tagName.toLowerCase() !== 'nc-menu-item') return;
            const label = item.textContent?.trim() ?? '';
            this.emit('nc-menu-select', { item, label });
            this._setActive(item);
            this._syncBodiesFromItem(item);
            // On mobile with toggleable, collapse after picking to show the panel
            if (this.hasAttribute('toggleable') && this._mq?.matches) {
                this.setAttribute('collapsed', '');
                this.mobileToggleEl.setAttribute('aria-expanded', 'false');
            }
        });

        this.on(this, 'nc-navigate', (e: Event) => {
            const item = e.target as HTMLElement;
            if (item.tagName.toLowerCase() !== 'nc-a') return;
            if (this.hasAttribute('auto-active')) {
                this._setActive(item);
                this._syncBodiesFromItem(item);
            }
        });

        this.on(this, 'keydown', (e: Event) => {
            const ke = e as KeyboardEvent;
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'].includes(ke.key)) return;
            ke.preventDefault();

            const items = this._getEnabledItems();
            if (!items.length) return;

            const focused = document.activeElement;
            const idx = items.findIndex(el => el === focused || el.shadowRoot?.contains(focused));

            if (ke.key === 'Escape') { (focused as HTMLElement)?.blur?.(); return; }
            if (ke.key === 'Home')   { this._focusItem(items[0]); return; }
            if (ke.key === 'End')    { this._focusItem(items[items.length - 1]); return; }

            const next = ke.key === 'ArrowDown'
                ? items[Math.min(idx + 1, items.length - 1)]
                : items[Math.max(idx - 1, 0)];
            this._focusItem(next);
        });

        if (this.hasAttribute('auto-active')) {
            Promise.resolve().then(() => this._syncActiveFromPath());
        }

        this.on(this.searchInputEl, 'input', () => this._filterItems(this.searchInputEl.value));

        this.on(this.slotEl, 'slotchange', () => {
            this._indexItemBodies();
            if (this.hasAttribute('searchable')) this._filterItems(this.searchInputEl.value || '');
            if (this.hasAttribute('auto-active')) this._syncActiveFromPath();
            const active = this.querySelector<HTMLElement>('nc-menu-item[active], nc-a[active]');
            if (active) this._syncBodiesFromItem(active);
        });

        this._indexItemBodies();

        const activeItem = this.querySelector<HTMLElement>('nc-menu-item[active], nc-a[active]');
        if (activeItem) this._syncBodiesFromItem(activeItem);
    }

    protected _handleAttributeUpdate(name: string, _val: string | null): void {
        if (name === 'label' || name === 'searchable' || name === 'width' || name === 'menu-width' || name === 'panel-width' || name === 'height' || name === 'scrollable') {
            this._syncLayout();
        }
        if (name === 'searchable' && !this.hasAttribute('searchable')) {
            this.searchInputEl.value = '';
            this._filterItems('');
        }
        if (name === 'auto-active' && this.hasAttribute('auto-active')) {
            this._syncActiveFromPath();
        }
        if (name === 'collapsed') {
            const isCollapsed = this.hasAttribute('collapsed');
            this.mobileToggleEl.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
        }
    }

    // ─── Private ────────────────────────────────────────────────────────────────

    private _getEnabledItems(): HTMLElement[] {
        return Array.from(
            this.querySelectorAll<HTMLElement>(
                'nc-menu-item:not([disabled]), nc-a:not([disabled])'
            )
        );
    }

    private _focusItem(item: HTMLElement): void {
        const tag = item.tagName.toLowerCase();
        const selector = tag === 'nc-a' ? 'a' : '[role="menuitem"]';
        item.shadowRoot?.querySelector<HTMLElement>(selector)?.focus();
    }

    /** Moves `active` to `target`, removes it from all siblings. */
    private _setActive(target: HTMLElement): void {
        const all = Array.from(
            this.querySelectorAll<HTMLElement>('nc-menu-item, nc-a')
        );
        all.forEach(el => {
            if (el === target) {
                el.setAttribute('active', '');
            } else {
                el.removeAttribute('active');
            }
        });
    }

    /**
     * For nc-a items with auto-active: set active on the item whose href
     * matches the current pathname. Handles exact and prefix matches.
     */
    private _syncActiveFromPath(): void {
        const path = window.location.pathname;
        const links = Array.from(this.querySelectorAll<HTMLElement>('nc-a[href]'));
        if (!links.length) return;

        // Prefer exact match, fall back to longest prefix
        let best: HTMLElement | null = null;
        let bestLen = 0;

        links.forEach(link => {
            const href = link.getAttribute('href') ?? '';
            if (href === path) { best = link; bestLen = Infinity; return; }
            if (bestLen < Infinity && path.startsWith(href) && href.length > bestLen) {
                best = link;
                bestLen = href.length;
            }
        });

        if (best) this._setActive(best);
    }

    private _syncLayout(): void {
        const label = this.getAttribute('label') || '';
        const searchable = this.hasAttribute('searchable');
        const width = this.getAttribute('width') || 'fit-content';
        const menuWidth = this.getAttribute('menu-width') || '260px';
        const panelWidth = this.getAttribute('panel-width') || 'minmax(320px, 1fr)';
        const height = this.getAttribute('height') || '';
        const scrollable = this.hasAttribute('scrollable');

        const onMobile = this.hasAttribute('toggleable') && window.matchMedia('(max-width: 768px)').matches;
        this.style.width = onMobile ? '' : width;
        this.style.setProperty('--_menu-col', menuWidth);
        // On mobile the media-query fixes --_panel-col to minmax(0,1fr); don't override it.
        if (!onMobile) {
            this.style.setProperty('--_panel-col', panelWidth);
        } else {
            this.style.removeProperty('--_panel-col');
        }

        // Show header row whenever there is a label OR the menu is toggleable
        if (label || this.hasAttribute('toggleable')) {
            this.menuHeaderEl.style.display = 'flex';
            this.labelTextEl.textContent = label;
        } else {
            this.menuHeaderEl.style.display = 'none';
            this.labelTextEl.textContent = '';
        }

        this.searchWrapEl.style.display = searchable ? 'block' : 'none';

        if (height) {
            this.menuRootEl.style.height = height;
            this.panelEl.style.height = height;
        } else {
            this.menuRootEl.style.removeProperty('height');
            this.panelEl.style.removeProperty('height');
        }

        this.menuRootEl.style.overflowY = scrollable ? 'auto' : 'visible';
        this.panelContentEl.style.overflowY = scrollable ? 'auto' : 'visible';
    }

    private _setupToggleBehavior(): void {
        if (!this.hasAttribute('toggleable')) return;

        this._mq = window.matchMedia('(max-width: 768px)');

        // Auto-collapse on mobile, expand on desktop
        if (this._mq.matches) {
            this.setAttribute('collapsed', '');
            this.mobileToggleEl.setAttribute('aria-expanded', 'false');
        }

        const onChange = (e: MediaQueryListEvent): void => {
            if (!this.hasAttribute('toggleable')) return;
            if (e.matches) {
                this.setAttribute('collapsed', '');
                this.mobileToggleEl.setAttribute('aria-expanded', 'false');
            } else {
                this.removeAttribute('collapsed');
                this.mobileToggleEl.setAttribute('aria-expanded', 'true');
            }
        };

        if ('addEventListener' in this._mq) {
            this._mq.addEventListener('change', onChange);
        } else {
            (this._mq as any).addListener(onChange);
        }
    }

    private _toggleCollapsed(): void {
        if (!this.hasAttribute('toggleable')) return;
        if (this.hasAttribute('collapsed')) {
            this.removeAttribute('collapsed');
            this.mobileToggleEl.setAttribute('aria-expanded', 'true');
        } else {
            this.setAttribute('collapsed', '');
            this.mobileToggleEl.setAttribute('aria-expanded', 'false');
        }
    }

    private _indexItemBodies(): void {
        const items = Array.from(this.querySelectorAll<HTMLElement>('nc-menu-item, nc-a'));
        items.forEach(item => {
            const nestedBody = item.querySelector<HTMLElement>('nc-menu-body');
            if (!nestedBody) return;
            this._itemBodies.set(item, nestedBody);
            this._bodyOwners.set(nestedBody, item);
            if (nestedBody !== this._activeBody && nestedBody.parentElement !== item) {
                item.appendChild(nestedBody);
            }
            if (nestedBody !== this._activeBody) nestedBody.removeAttribute('active');
        });
    }

    private _filterItems(query: string): void {
        const q = query.toLowerCase().trim();
        const items = Array.from(
            this.querySelectorAll<HTMLElement>('nc-menu-item, nc-a')
        );
        let visible = 0;

        items.forEach(item => {
            const text = (item.textContent ?? '').toLowerCase();
            const show = !q || text.includes(q);
            item.style.display = show ? '' : 'none';
            if (show) visible++;
        });

        this.emptyEl.classList.toggle('visible', visible === 0);
    }

    private _syncBodiesFromItem(item: HTMLElement): void {
        let targetBody = this._itemBodies.get(item) || null;

        if (!targetBody) {
            const bodyName = item.getAttribute('body') || item.getAttribute('menu-body') || '';
            if (bodyName) {
                targetBody = this._resolveBodyByName(bodyName, item);
                if (targetBody) {
                    this._itemBodies.set(item, targetBody);
                    if (targetBody.parentElement) {
                        this._bodyOwners.set(targetBody, targetBody.parentElement as HTMLElement);
                    }
                }
            }
        }

        if (this._activeBody && this._activeBody !== targetBody) {
            this._activeBody.removeAttribute('active');
            const owner = this._bodyOwners.get(this._activeBody);
            if (owner && owner.isConnected) owner.appendChild(this._activeBody);
            this._activeBody = null;
        }

        if (!targetBody) {
            this.panelContentEl.replaceChildren();
            this.panelEmptyEl.classList.add('visible');
            return;
        }

        targetBody.setAttribute('active', '');
        if (targetBody.parentElement !== this.panelContentEl) {
            this.panelContentEl.replaceChildren(targetBody);
        }
        this.panelEmptyEl.classList.remove('visible');
        this._activeBody = targetBody;

        this.emit('nc-menu-body-change', {
            name: targetBody.getAttribute('name') || item.getAttribute('body') || '',
            item,
            body: targetBody,
        });
    }

    private _resolveBodyByName(name: string, ownerItem: HTMLElement): HTMLElement | null {
        // 1) Nested inside the selected item has highest priority.
        const nested = ownerItem.querySelector<HTMLElement>('nc-menu-body');
        if (nested) return nested;

        const menuId = this._menuIdentity();
        const scopeFilter = (body: HTMLElement): boolean => {
            const scopedTo = body.getAttribute('menu');
            if (!scopedTo) return true;
            return !!menuId && scopedTo === menuId;
        };

        // 2) Bodies inside this nc-menu instance.
        const inMenu = Array.from(this.querySelectorAll<HTMLElement>('nc-menu-body'))
            .find(body => body.getAttribute('name') === name && scopeFilter(body));
        if (inMenu) return inMenu;

        // 3) Bodies adjacent to this menu in the same parent container.
        const parent = this.parentElement;
        if (parent) {
            const sibling = Array.from(parent.querySelectorAll<HTMLElement>(':scope > nc-menu-body'))
                .find(body => body.getAttribute('name') === name && scopeFilter(body));
            if (sibling) return sibling;
        }

        // 4) Explicit global body mapping: nc-menu-body[menu="<menu-id>"][name="..."]
        if (menuId) {
            const global = document.querySelector<HTMLElement>(`nc-menu-body[menu="${menuId}"][name="${name}"]`);
            if (global) return global;
        }

        return null;
    }
}

if (!customElements.get('nc-menu')) customElements.define('nc-menu', NcMenu);


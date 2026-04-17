/**
 * NativeCore Tabs Component (nc-tabs)
 *
 * Container that manages a group of nc-tab-item panels. Renders the tab bar,
 * handles selection, keyboard navigation, and emits change events.
 *
 * Attributes:
 *   variant    — 'line' | 'pills' | 'boxed'  (default: 'line')
 *   active     — Zero-based index of the currently active tab (default: 0).
 *                Can be set externally to programmatically switch tabs.
 *   persist    — Boolean. When present, persist the selected tab in sessionStorage.
 *                Uses `persist-key` if provided, else falls back to path + element id.
 *   persist-key — Optional storage key override for tab persistence.
 *   transition — Panel enter animation.
 *                'fade' | 'slide-up' | 'slide-down' | 'slide-right' | 'slide-left' | 'none'  (default: 'fade')
 *
 * Slots:
 *   default  — Place nc-tab-item elements here.
 *
 * Events emitted:
 *   nc-tab-change  — { index: number, label: string | null }
 *                    Fires whenever the active tab changes.
 *
 * Keyboard support:
 *   ArrowRight / ArrowLeft — next / previous tab
 *   Home / End             — first / last tab
 *
 * Usage:
 *   <nc-tabs variant="line" active="0">
 *     <nc-tab-item label="Overview">Overview content</nc-tab-item>
 *     <nc-tab-item label="Activity">Activity content</nc-tab-item>
 *     <nc-tab-item label="Settings" disabled>Settings</nc-tab-item>
 *   </nc-tabs>
 *
 *   // Programmatic control
 *   document.querySelector('nc-tabs').setAttribute('active', '1');
 *
 *   // Listen for changes
 *   document.querySelector('nc-tabs').addEventListener('nc-tab-change', e => {
 *       console.log(e.detail.index, e.detail.label);
 *   });
 */

import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

export class NcTabs extends Component {
    static useShadowDOM = true;

    static attributeOptions = {
        variant: ['line', 'pills', 'boxed'],
        transition: ['fade', 'slide-up', 'slide-down', 'slide-right', 'slide-left', 'none'],
    };

    static get observedAttributes() {
        return ['variant', 'active', 'transition', 'persist', 'persist-key'];
    }

    // ─── internal state ────────────────────────────────────────────────────────
    private _activeIndex: number = 0;

    // ─── cleanup refs ──────────────────────────────────────────────────────────
    private _onSlotChange: (() => void) | null = null;
    private _onShadowClick: ((e: Event) => void) | null = null;
    private _onShadowKeydown: ((e: Event) => void) | null = null;

    // ─── scroll arrow state ────────────────────────────────────────────────────
    private _scrollListenerSet = false;
    private _resizeObserver: ResizeObserver | null = null;

    // ────────────────────────────────────────────────────────────────────────────

    template(): string {
        const variant = this.attr('variant', 'line');

        return html`
            <style>
                /* ── Host layout ─────────────────────────────────────────────── */
                :host {
                    display: block;
                    width: 100%;
                    font-family: var(--nc-font-family);
                    box-sizing: border-box;
                }

                .nc-tabs {
                    width: 100%;
                }

                /* ── Tab bar ─────────────────────────────────────────────────── */
                .nc-tabs__bar {
                    display: flex;
                    align-items: flex-end;
                    position: relative;
                    /* line variant default: bottom border */
                    border-bottom: 2px solid var(--nc-border);
                    gap: 0;
                    /* — critical for scroll: width must be bounded, not grow to content — */
                    width: 100%;
                    overflow-x: auto;
                    scrollbar-width: none;
                    -webkit-overflow-scrolling: touch;
                }

                .nc-tabs__bar::-webkit-scrollbar {
                    display: none;
                }

                /* ── Tab buttons ─────────────────────────────────────────────── */
                .nc-tabs__btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--nc-spacing-xs);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: var(--nc-font-size-sm);
                    font-weight: var(--nc-font-weight-medium);
                    color: var(--nc-text-secondary);
                    padding: var(--nc-spacing-sm) var(--nc-spacing-md);
                    position: relative;
                    margin-bottom: -2px;
                    white-space: nowrap;
                    outline: none;
                    transition:
                        color var(--nc-transition-fast),
                        background var(--nc-transition-fast);
                    border-radius: var(--nc-radius-sm) var(--nc-radius-sm) 0 0;
                    user-select: none;
                }

                /* Sliding underline indicator (line variant) */
                .nc-tabs__btn::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: var(--nc-primary);
                    border-radius: 2px 2px 0 0;
                    transform: scaleX(0);
                    transition: transform var(--nc-transition-fast) var(--nc-ease-out);
                }

                .nc-tabs__btn:hover:not([disabled]) {
                    color: var(--nc-text);
                    background: rgba(0, 0, 0, 0.03);
                }

                .nc-tabs__btn--active {
                    color: var(--nc-primary);
                    font-weight: var(--nc-font-weight-semibold);
                }

                .nc-tabs__btn--active::after {
                    transform: scaleX(1);
                }

                .nc-tabs__btn--disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                    pointer-events: none;
                }

                .nc-tabs__btn:focus-visible {
                    outline: 2px solid var(--nc-primary);
                    outline-offset: -2px;
                    border-radius: var(--nc-radius-sm);
                }

                /* ── Pills variant ───────────────────────────────────────────── */
                :host([variant="pills"]) .nc-tabs__bar {
                    border-bottom: none;
                    gap: var(--nc-spacing-xs);
                    padding: var(--nc-spacing-xs);
                    background: var(--nc-bg-secondary);
                    border-radius: var(--nc-radius-lg);
                    /* width: 100% inherited from base — pills scrolls rather than spills */
                }

                :host([variant="pills"]) .nc-tabs__btn {
                    border-radius: var(--nc-radius-md);
                    margin-bottom: 0;
                }

                :host([variant="pills"]) .nc-tabs__btn::after {
                    display: none;
                }

                :host([variant="pills"]) .nc-tabs__btn--active {
                    background: var(--nc-primary);
                    color: var(--nc-white);
                }

                :host([variant="pills"]) .nc-tabs__btn:hover:not([disabled]):not(.nc-tabs__btn--active) {
                    background: var(--nc-bg-tertiary);
                }

                /* ── Boxed variant ───────────────────────────────────────────── */
                :host([variant="boxed"]) .nc-tabs__bar {
                    border-bottom: 1px solid var(--nc-border);
                    gap: 2px;
                }

                :host([variant="boxed"]) .nc-tabs__btn {
                    border: 1px solid transparent;
                    border-bottom: none;
                    border-radius: var(--nc-radius-md) var(--nc-radius-md) 0 0;
                    margin-bottom: -1px;
                }

                :host([variant="boxed"]) .nc-tabs__btn::after {
                    display: none;
                }

                :host([variant="boxed"]) .nc-tabs__btn--active {
                    border-color: var(--nc-border);
                    background: var(--nc-bg);
                    color: var(--nc-primary);
                }

                /* ── Content panels ──────────────────────────────────────────── */
                .nc-tabs__panels {
                    padding-top: var(--nc-spacing-sm);
                }

                /* ── Bar wrapper (anchors scroll arrows) ─────────────────────── */
                .nc-tabs__bar-wrap {
                    position: relative;
                    /* contain the bar so overflow-x:auto has a definite boundary */
                    min-width: 0;
                    overflow: hidden;
                }

                /* ── Scroll arrow buttons ────────────────────────────────────── */
                .nc-tabs__scroll-btn {
                    display: none; /* JS sets to flex when scrollable */
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 36px;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    padding: 0;
                    cursor: pointer;
                    z-index: 2;
                    color: var(--nc-text-muted);
                    transition: color var(--nc-transition-fast);
                }
                .nc-tabs__scroll-btn:hover { color: var(--nc-text); }

                .nc-tabs__scroll-btn--prev {
                    left: 0;
                    background: linear-gradient(to right, var(--nc-bg) 45%, transparent 100%);
                }
                .nc-tabs__scroll-btn--next {
                    right: 0;
                    background: linear-gradient(to left, var(--nc-bg) 45%, transparent 100%);
                }

                /* ── Responsive ──────────────────────────────────────────────── */
                @media (max-width: 640px) {
                    .nc-tabs__panels {
                        padding-top: 0;
                    }
                }
            </style>

            <div class="nc-tabs nc-tabs--${variant}">
                <div class="nc-tabs__bar-wrap">
                    <button class="nc-tabs__scroll-btn nc-tabs__scroll-btn--prev" type="button" aria-label="Scroll tabs back" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M8 2L4 6l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <div class="nc-tabs__bar" role="tablist" aria-label="Tabs"></div>
                    <button class="nc-tabs__scroll-btn nc-tabs__scroll-btn--next" type="button" aria-label="Scroll tabs forward" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
                <div class="nc-tabs__panels">
                    <slot></slot>
                </div>
            </div>
        `;
    }

    onMount(): void {
        this._activeIndex = parseInt(this.attr('active', '0') ?? '0', 10);

        const persistedIndex = this._readPersistedIndex();
        if (persistedIndex !== null) {
            this._activeIndex = persistedIndex;
            this.setAttribute('active', String(persistedIndex));
        }

        // Defer first build one tick — child nc-tab-item elements upgrade after parent
        Promise.resolve().then(() => this._buildTabBar());

        // Re-build when tab items are added or removed dynamically
        const slot = this.$<HTMLSlotElement>('slot');
        if (slot) {
            this._onSlotChange = () => this._buildTabBar();
            slot.addEventListener('slotchange', this._onSlotChange);
        }

        // Click delegation on shadow root — handles all tab button clicks
        this._onShadowClick = (e: Event) => {
            const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-tab-index]');
            if (!btn || btn.hasAttribute('disabled')) return;
            const index = parseInt(btn.dataset.tabIndex!, 10);
            if (!isNaN(index)) this._selectTab(index);
        };
        this.shadowRoot!.addEventListener('click', this._onShadowClick);

        // Keyboard navigation on the tab bar
        this._onShadowKeydown = (e: Event) => {
            const ke = e as KeyboardEvent;
            if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(ke.key)) return;
            ke.preventDefault();

            const tabs = this._getTabItems();
            const len = tabs.length;
            if (len === 0) return;

            let next = this._activeIndex;

            if (ke.key === 'ArrowRight') {
                next = (this._activeIndex + 1) % len;
            } else if (ke.key === 'ArrowLeft') {
                next = (this._activeIndex - 1 + len) % len;
            } else if (ke.key === 'Home') {
                next = 0;
            } else if (ke.key === 'End') {
                next = len - 1;
            }

            // Skip disabled tabs
            let attempts = 0;
            while (tabs[next]?.hasAttribute('disabled') && attempts < len) {
                next = ke.key === 'ArrowLeft'
                    ? (next - 1 + len) % len
                    : (next + 1) % len;
                attempts++;
            }

            this._selectTab(next);

            // Focus the newly active button
            const activeBtn = this.shadowRoot?.querySelector<HTMLElement>(
                `[data-tab-index="${next}"]`
            );
            activeBtn?.focus();
        };
        this.shadowRoot!.addEventListener('keydown', this._onShadowKeydown);
    }

    onUnmount(): void {
        const slot = this.$<HTMLSlotElement>('slot');
        if (slot && this._onSlotChange) {
            slot.removeEventListener('slotchange', this._onSlotChange);
        }
        if (this._onShadowClick) {
            this.shadowRoot?.removeEventListener('click', this._onShadowClick);
        }
        if (this._onShadowKeydown) {
            this.shadowRoot?.removeEventListener('keydown', this._onShadowKeydown);
        }
        this._onSlotChange = null;
        this._onShadowClick = null;
        this._onShadowKeydown = null;
        this._resizeObserver?.disconnect();
        this._resizeObserver = null;
        this._scrollListenerSet = false;
    }

    /**
     * Attribute changes from outside (e.g. setting active="2" programmatically).
     * variant change is handled automatically by :host([variant]) CSS selectors.
     */
    attributeChangedCallback(
        name: string,
        oldValue: string | null,
        newValue: string | null
    ): void {
        if (!this._mounted || oldValue === newValue) return;
        if (name === 'active') {
            const index = parseInt(newValue ?? '0', 10);
            if (!isNaN(index) && index !== this._activeIndex) {
                this._activeIndex = index;
                this._buildTabBar();
            }
        }
        // variant + transition: :host([attr="..."]) CSS handles appearance — no JS needed
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    /** Returns all direct nc-tab-item children (light DOM). */
    private _getTabItems(): HTMLElement[] {
        return Array.from(this.querySelectorAll<HTMLElement>(':scope > nc-tab-item'));
    }

    /**
     * Rebuilds the tab bar buttons from child nc-tab-item labels,
     * then syncs the active attribute on each tab item panel.
     */
    private _buildTabBar(): void {
        const bar = this.$('.nc-tabs__bar');
        if (!bar) return;

        const tabs = this._getTabItems();

        // Clamp active index to valid range
        if (this._activeIndex >= tabs.length) {
            this._activeIndex = Math.max(0, tabs.length - 1);
        }

        this._persistActiveIndex();

        bar.innerHTML = tabs.map((tab, i) => {
            const label = tab.getAttribute('label') ?? `Tab ${i + 1}`;
            const disabled = tab.hasAttribute('disabled');
            const isActive = i === this._activeIndex;
            const classes = [
                'nc-tabs__btn',
                isActive ? 'nc-tabs__btn--active' : '',
                disabled ? 'nc-tabs__btn--disabled' : '',
            ].filter(Boolean).join(' ');

            return `<button
                class="${classes}"
                role="tab"
                aria-selected="${isActive}"
                aria-disabled="${disabled}"
                tabindex="${isActive ? 0 : -1}"
                data-tab-index="${i}"
                ${disabled ? 'disabled' : ''}
            >${label}</button>`;
        }).join('');

        // Sync active attribute on each panel (drives :host([active]) CSS in nc-tab-item)
        // Also sync data-nc-transition so nc-tab-item picks the correct animation variant
        const transition = this.getAttribute('transition') || 'fade';
        tabs.forEach((tab, i) => {
            tab.setAttribute('data-nc-transition', transition);
            if (i === this._activeIndex) {
                tab.setAttribute('active', '');
            } else {
                tab.removeAttribute('active');
            }
        });

        this._setupScrollArrows();
    }

    // ─── Scroll arrow helpers ───────────────────────────────────────────────────

    private _setupScrollArrows(): void {
        const bar = this.$<HTMLElement>('.nc-tabs__bar');
        if (!bar) return;

        if (!this._scrollListenerSet) {
            bar.addEventListener('scroll', () => this._updateScrollBtns(), { passive: true });

            this.$<HTMLButtonElement>('.nc-tabs__scroll-btn--prev')
                ?.addEventListener('click', () => { bar.scrollBy({ left: -150, behavior: 'smooth' }); });
            this.$<HTMLButtonElement>('.nc-tabs__scroll-btn--next')
                ?.addEventListener('click', () => { bar.scrollBy({ left: 150, behavior: 'smooth' }); });

            if (typeof ResizeObserver !== 'undefined') {
                this._resizeObserver = new ResizeObserver(() => this._updateScrollBtns());
                this._resizeObserver.observe(bar);
            }

            this._scrollListenerSet = true;
        }

        this._updateScrollBtns();
        // Scroll the active tab into view after rebuilding the bar
        requestAnimationFrame(() => {
            this.shadowRoot?.querySelector<HTMLElement>('.nc-tabs__btn--active')
                ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
    }

    private _updateScrollBtns(): void {
        const bar = this.$<HTMLElement>('.nc-tabs__bar');
        const prevBtn = this.$<HTMLElement>('.nc-tabs__scroll-btn--prev');
        const nextBtn = this.$<HTMLElement>('.nc-tabs__scroll-btn--next');
        if (!bar || !prevBtn || !nextBtn) return;

        const canScrollLeft  = bar.scrollLeft > 1;
        const canScrollRight = bar.scrollLeft < bar.scrollWidth - bar.clientWidth - 1;

        prevBtn.style.display = canScrollLeft  ? 'flex' : 'none';
        nextBtn.style.display = canScrollRight ? 'flex' : 'none';
    }

    /** Selects a tab by index — updates state, DOM, host attribute, and emits event. */
    private _selectTab(index: number): void {
        const tabs = this._getTabItems();
        if (index < 0 || index >= tabs.length) return;
        if (tabs[index]?.hasAttribute('disabled')) return;
        if (index === this._activeIndex) return;

        this._activeIndex = index;
        this._buildTabBar();

        // Keep host attribute in sync so external code can read it
        // Use setAttribute silently — attributeChangedCallback guard (oldValue !== newValue) prevents loops
        this.setAttribute('active', String(index));

        this.emitEvent<{ index: number; label: string | null }>('nc-tab-change', {
            index,
            label: tabs[index].getAttribute('label'),
        });
    }

    private _storageKey(): string | null {
        if (!this.hasAttribute('persist')) return null;
        const explicit = this.getAttribute('persist-key');
        if (explicit) return explicit;
        if (this.id) return `nc-tabs:${window.location.pathname}:${this.id}`;
        return null;
    }

    private _readPersistedIndex(): number | null {
        const key = this._storageKey();
        if (!key) return null;
        try {
            const raw = sessionStorage.getItem(key);
            if (raw === null) return null;
            const index = parseInt(raw, 10);
            return Number.isNaN(index) ? null : index;
        } catch {
            return null;
        }
    }

    private _persistActiveIndex(): void {
        const key = this._storageKey();
        if (!key) return;
        try {
            sessionStorage.setItem(key, String(this._activeIndex));
        } catch {
            // Ignore storage failures (private mode / quota / disabled storage)
        }
    }
}

defineComponent('nc-tabs', NcTabs);


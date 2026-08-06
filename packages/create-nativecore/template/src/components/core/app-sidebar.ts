/**
 * app-sidebar — application shell sidebar component
 *
 * Uses shadow DOM with a native <slot> for nav item projection.
 * Reactive state via CoreComponent: state(), compute(), effect(), on().
 * Auto-cleanup on disconnect via this.on().
 */
import { CoreComponent } from '@core/component.js';
import { html, css } from '@core-utils/templates.js';
import { dom } from '@core-utils/dom.js';
import router from '@core/router.js';
import { uiStore } from '@stores/uiStore.js';

export class AppSidebar extends CoreComponent {

    static useShadowDOM = true;

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
        }

        .app-sidebar {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: var(--nc-bg-secondary, #f1f5f9);
            border-right: 1px solid var(--nc-border, #e2e8f0);
        }

        .sidebar-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            gap: 1rem;
            border-bottom: 1px solid var(--nc-border, #e2e8f0);
            flex-shrink: 0;
        }

        .sidebar-branding {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            flex: 1;
            min-width: 0;
        }

        .sidebar-branding__eyebrow {
            font-size: 0.625rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--nc-text-muted, #94a3b8);
        }

        .sidebar-branding__title {
            font-size: 1rem;
            color: var(--nc-text, #1e293b);
        }

        :host(.collapsed) .sidebar-branding {
            display: none;
        }

        .sidebar-collapse-btn {
            background: var(--nc-gray-200, #e2e8f0);
            border: 1px solid var(--nc-border, #cbd5e1);
            cursor: pointer;
            padding: 0.5rem;
            color: var(--nc-text-muted, #64748b);
            transition: all 0.2s ease;
            width: 40px;
            height: 40px;
            min-width: 40px;
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border-radius: 6px;
        }

        .sidebar-collapse-btn svg {
            width: 20px;
            height: 20px;
            stroke: currentColor;
        }

        .sidebar-collapse-btn:hover {
            background: var(--nc-gray-300, #cbd5e1);
            color: var(--nc-text, #1e293b);
        }

        .sidebar-collapse-btn:active {
            transform: scale(0.95);
        }

        .sidebar-nav {
            flex: 1;
            overflow-y: auto;
            padding: 1rem 0;
        }

        .sidebar-footer {
            padding: 1rem;
            border-top: 1px solid var(--nc-border, #e2e8f0);
        }

        .sidebar-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            background: none;
            border: none;
            cursor: pointer;
            color: var(--nc-text-secondary, #64748b);
            text-decoration: none;
            transition: all 0.2s ease;
            width: 100%;
        }

        .sidebar-item:hover {
            background: rgba(0, 0, 0, 0.05);
            color: var(--nc-text, #1e293b);
        }

        .sidebar-item.active {
            background: var(--nc-primary-rgb, rgba(16, 185, 129, 0.1));
            color: var(--nc-primary, #10b981);
            font-weight: 600;
        }

        :host(.collapsed) .sidebar-item {
            justify-content: center;
            padding: 0.75rem;
        }

        .sidebar-icon {
            min-width: 1.25rem;
            width: 1.25rem;
            height: 1.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .sidebar-text {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        :host(.collapsed) .sidebar-text {
            display: none;
        }
    `;

    // ── DOM REFS ──────────────────────────────────────────────────────────────
    private sidebarRoot!: HTMLElement;
    private collapseBtn!: HTMLElement;

    // ── STATE ─────────────────────────────────────────────────────────────────
    private isMobileOpen = this.state(false);
    private collapseLabelText = this.compute(() =>
        uiStore.sidebarCollapsed.value ? 'Expand sidebar' : 'Collapse sidebar'
    );


    // ── Private runtime resources ─────────────────────────────────────────────
    private _overlayEl: HTMLDivElement | null = null;
    private _resizeTimer: ReturnType<typeof setTimeout> | null = null;

    // ── TEMPLATE ──────────────────────────────────────────────────────────────
    template() {
        return html`
            <div ref="sidebarRoot" class="app-sidebar" role="navigation" aria-label="Application sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-branding">
                        <span class="sidebar-branding__eyebrow">App</span>
                        <strong class="sidebar-branding__title">Navigation</strong>
                    </div>
                    <button ref="collapseBtn" class="sidebar-collapse-btn" type="button" aria-label="Toggle sidebar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="4" y="5" width="16" height="14" rx="3"></rect>
                            <path d="M9 5v14"></path>
                            <path d="M15 9l-3 3 3 3"></path>
                        </svg>
                    </button>
                </div>
                <nav class="sidebar-nav">
                    <slot></slot>
                </nav>
            </div>
        `;
    }


    // ── LIFECYCLE ────────────────────────────────────────────────────────────
    onMount() {
        // Create mobile overlay
        this.ensureOverlay();

        // uiStore uses the standalone useState system — must use .watch() not this.effect()
        const unwatchCollapsed = uiStore.sidebarCollapsed.watch((collapsed) => {
            this.classList.toggle('collapsed', collapsed);
            this.sidebarRoot.classList.toggle('collapsed', collapsed);
        });
        this._unsubs.add(unwatchCollapsed);
        // Initial sync
        this.classList.toggle('collapsed', uiStore.sidebarCollapsed.value);
        this.sidebarRoot.classList.toggle('collapsed', uiStore.sidebarCollapsed.value);

        // isMobileOpen is a CoreComponent state — effect() works here
        this.effect(() => {
            this.classList.toggle('mobile-open', this.isMobileOpen.value);
            if (this._overlayEl) this._overlayEl.classList.toggle('active', this.isMobileOpen.value);
            document.body.classList.toggle('sidebar-open', this.isMobileOpen.value);
        });

        // Collapse button aria-label via computed (also CoreComponent state)
        this.effect(() => {
            this.collapseBtn.setAttribute('aria-label', this.collapseLabelText.value);
        });

        // Sync active nav link on mount
        this.syncActiveLink();
    }

    events() {
        // Direct button listeners
        this.on(this.collapseBtn, 'click', (e) => {
            console.log('Collapse button clicked'); // Debug log
            e.stopPropagation();
            this.toggle();
        });

        // General sidebar click for nav links
        this.on(this, 'click', this.handleSidebarClick);
        
        // Window events
        this.on(window, 'sidebar-toggle', this.handleSidebarToggle);
        this.on(window, 'pageloaded', this.handlePageLoaded);
        this.on(window, 'resize', this.handleWindowResize);
    }

    onUnmount() {
        // Cleanup overlay
        if (this._overlayEl) {
            this._overlayEl.remove();
            this._overlayEl = null;
        }
        // Clear resize timer if running
        if (this._resizeTimer !== null) {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = null;
        }
        // Note: this.on() auto-cleanup and effect() auto-cleanup handled by CoreComponent
    }


    // ── Public API ────────────────────────────────────────────────────────────

    /** Toggles collapsed on desktop, toggles mobile drawer on mobile. */
    toggle() {

        console.log('Toggling sidebar. Current state:', this.isMobileViewport());
        if (this.isMobileViewport()) {
            this.isMobileOpen.value = !this.isMobileOpen.value;
            return;
        }

        uiStore.toggleSidebarCollapsed();
    }


    // ── EVENT HANDLERS ───────────────────────────────────────────────────────
    private readonly handleSidebarClick = (event: Event) => {
        const path = event.composedPath() as Element[];
        const isCollapseBtn = path.some(el => el === this.collapseBtn);
        const isNavLink = path.some(el => el instanceof Element && el.hasAttribute('data-link'));

        if (isCollapseBtn) {
            this.toggle();
            return;
        }

        if (isNavLink && this.isMobileViewport()) {
            this.isMobileOpen.value = false;
        }
    };

    private readonly handleSidebarToggle = () => this.toggle();

    private readonly handlePageLoaded = () => {
        this.syncActiveLink();
        if (this.isMobileViewport()) this.isMobileOpen.value = false;
    };

    private readonly handleWindowResize = () => {
        if (this._resizeTimer !== null) clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => {
            this._resizeTimer = null;
            if (!this.isMobileViewport()) this.isMobileOpen.value = false;
        }, 150);
    };


    // ── HELPERS ──────────────────────────────────────────────────────────────
    private isMobileViewport(): boolean {
        return window.innerWidth <= 768;
    }

    /** Highlights the nav link matching the current route. */
    private syncActiveLink() {
        const currentPath = router.getCurrentRoute()?.path ?? window.location.pathname;
        this.querySelectorAll<Element>('[data-link]').forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === currentPath);
        });
    }

    /** Creates/caches the mobile overlay backdrop and binds click handler. */
    private ensureOverlay() {
        let overlay = dom.query<HTMLDivElement>('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }
        this.on(overlay, 'click', () => { this.isMobileOpen.value = false; });
        this._overlayEl = overlay;
    }
}

if (!customElements.get('app-sidebar')) customElements.define('app-sidebar', AppSidebar);

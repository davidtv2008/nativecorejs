/**
 * app-sidebar — application shell sidebar component
 *
 * Uses shadow DOM with a native <slot> for nav item projection.
 * Nav items are provided as children of <app-sidebar> in index.html:
 *
 *   <app-sidebar>
 *     <a href="/dashboard" data-link class="sidebar-item">
 *       <span class="sidebar-icon">…</span>
 *       <span class="sidebar-text">Dashboard</span>
 *     </a>
 *   </app-sidebar>
 *
 * Slotted elements stay in the light DOM so the page's global CSS styles
 * them automatically. The shadow root includes <link> tags for its own
 * internal elements — browsers reuse the cached stylesheets at no extra cost.
 *
 * Wire-first: template carries wire-class and wire-attribute attributes.
 * A single this.wires() call binds all reactive state in onMount().
 */
import { Component, defineComponent } from '@core/component.js';
import { computed, useState } from '@core/state.js';
import type { State, ComputedState } from '@core/state.js';
import { html } from '@core-utils/templates.js';
import { dom } from '@core-utils/dom.js';
import auth from '@services/auth.service.js';
import router from '@core/router.js';
import { uiStore } from '@stores/uiStore.js';


export class AppSidebar extends Component {

    // Shadow DOM: internal elements are encapsulated; slotted nav items
    // remain in the light DOM and are styled by the page's global CSS.
    static useShadowDOM = true;


    // ── Reactive state ────────────────────────────────────────────────────────

    /** Collapsed state — backed by uiStore so it persists across navigation. */
    get isCollapsed(): State<boolean> {
        return uiStore.sidebarCollapsed;
    }

    /** Transient mobile drawer state — not persisted. */
    isMobileOpen: State<boolean> = useState(false);

    /**
     * Computed toggle button label — created in onMount(), disposed in onUnmount().
     * Declared here so wireAttributes() can resolve it by name at scan time.
     */
    collapseLabel!: ComputedState<string>;


    // ── Private runtime resources ─────────────────────────────────────────────

    private _overlayEl:           HTMLDivElement | null = null;
    private _resizeTimer:         ReturnType<typeof setTimeout> | null = null;
    private _unwatchMobileForBody?: () => void;


    // ── Template ──────────────────────────────────────────────────────────────

    template() {
        return html`
            <link rel="stylesheet" href="/src/styles/core-variables.css">
            <link rel="stylesheet" href="/src/styles/core.css">
            <link rel="stylesheet" href="/src/styles/variables.css">
            <link rel="stylesheet" href="/src/styles/main.css">

            <div class="app-sidebar"
                wire-class="isCollapsed:collapsed">

                <div class="sidebar-header">

                    <div class="sidebar-branding">
                        <span class="sidebar-branding__eyebrow">Protected</span>
                        <strong class="sidebar-branding__title">Workspace</strong>
                    </div>

                    <button
                        class="sidebar-collapse-btn"
                        type="button"
                        aria-label="Toggle sidebar"
                        wire-class="isCollapsed:is-collapsed"
                        wire-attribute="collapseLabel:aria-label"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="4" y="5" width="16" height="14" rx="3"></rect>
                            <path d="M9 5v14" class="sidebar-collapse-btn__divider"></path>
                            <path d="M15 9l-3 3 3 3" class="sidebar-collapse-btn__chevron"></path>
                        </svg>
                    </button>

                </div>

                <nav class="sidebar-nav">
                    <slot></slot>
                </nav>

                <div class="sidebar-footer">
                    <button class="sidebar-item logout-link" id="sidebarLogoutBtn" type="button">
                        <span class="sidebar-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                        </span>
                        <span class="sidebar-text">Logout</span>
                    </button>
                </div>

            </div>
        `;
    }

    /**
     * Prevent re-renders after initial mount.
     * The shadow root template is static — all state changes go through
     * wire bindings. Re-rendering would reload the stylesheet links unnecessarily.
     */
    render() {
        if (this._mounted) return;
        super.render();
    }


    // ── Lifecycle ─────────────────────────────────────────────────────────────

    onMount() {

        // ── Setup ─────────────────────────────────────────────────────────────

        this.ensureOverlay();

        // Computed must be assigned before this.wires() so wireAttributes()
        // can resolve it by name.
        this.collapseLabel = computed(() =>
            uiStore.sidebarCollapsed.value ? 'Expand sidebar' : 'Collapse sidebar',
        );


        // ── Wire-first: declarative bindings from template attributes ─────────
        //
        // this.wires() scans the shadow root for wire-* attributes:
        //
        //   .app-sidebar          wire-class="isCollapsed:collapsed"
        //   .sidebar-collapse-btn wire-class="isCollapsed:is-collapsed"
        //   .sidebar-collapse-btn wire-attribute="ariaLabel:aria-label"
        this.wires();


        // ── Explicit bindings for elements outside the shadow root ─────────────

        // Host element <app-sidebar> carries .collapsed for CSS layout selectors
        // (e.g. #app.sidebar-collapsed grid rules). It lives in the light DOM.
        this.bindClass(uiStore.sidebarCollapsed, this,             'collapsed');
        this.bindClass(this.isMobileOpen,        this,             'mobile-open');
        this.bindClass(this.isMobileOpen,        this._overlayEl!, 'active');

        // document.body is external — watch manually.
        this._unwatchMobileForBody = this.isMobileOpen.watch((isOpen) => {
            document.body.classList.toggle('sidebar-open', isOpen);
        });


        // ── Initial sync ──────────────────────────────────────────────────────

        this.syncActiveLink();


        // ── Events ────────────────────────────────────────────────────────────

        // Events on the host element bubble from both shadow and light DOM,
        // so clicks on slotted nav items are correctly captured here.
        this.addEventListener('click',             this.onSidebarClick);
        window.addEventListener('sidebar-toggle',  this.onSidebarToggle);
        window.addEventListener('pageloaded',      this.onPageLoaded);
        window.addEventListener('resize',          this.onWindowResize);

    }

    onUnmount() {

        // Events
        this.removeEventListener('click',            this.onSidebarClick);
        window.removeEventListener('sidebar-toggle', this.onSidebarToggle);
        window.removeEventListener('pageloaded',     this.onPageLoaded);
        window.removeEventListener('resize',         this.onWindowResize);

        // Manual watch (body class — external)
        this._unwatchMobileForBody?.();

        // Computed states
        this.collapseLabel?.dispose();

        // Resize debounce timer
        if (this._resizeTimer !== null) {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = null;
        }

        // Mobile overlay backdrop
        if (this._overlayEl) {
            this._overlayEl.removeEventListener('click', this.onOverlayClick);
            this._overlayEl.remove();
            this._overlayEl = null;
        }

    }


    // ── Public API ────────────────────────────────────────────────────────────

    /** Toggles collapsed on desktop, toggles mobile drawer on mobile. */
    toggle() {
        if (this.isMobileViewport()) {
            this.isMobileOpen.value = !this.isMobileOpen.value;
            return;
        }

        uiStore.toggleSidebarCollapsed();
    }


    // ── Event handlers ────────────────────────────────────────────────────────

    private readonly onSidebarClick = (event: Event) => {
        // With shadow DOM, event.target is retargeted to the host element when
        // observed from outside the shadow boundary. Use composedPath() to get
        // the full path including elements inside the shadow root.
        const path = event.composedPath() as Element[];

        const inCollapseBtn = path.some(el => el instanceof Element && el.classList?.contains('sidebar-collapse-btn'));
        const inLogoutBtn   = path.some(el => el instanceof Element && el.id === 'sidebarLogoutBtn');
        const inNavLink     = path.some(el => el instanceof Element && el.hasAttribute?.('data-link'));

        if (inCollapseBtn) {
            this.toggle();
            return;
        }

        if (inLogoutBtn) {
            auth.logout();
            return;
        }

        // Close the mobile drawer when the user taps a nav link.
        if (inNavLink && this.isMobileViewport()) {
            this.isMobileOpen.value = false;
        }
    };

    private readonly onSidebarToggle = () => this.toggle();

    private readonly onOverlayClick = () => {
        this.isMobileOpen.value = false;
    };

    private readonly onPageLoaded = () => {
        this.syncActiveLink();

        if (this.isMobileViewport()) {
            this.isMobileOpen.value = false;
        }
    };

    private readonly onWindowResize = () => {
        if (this._resizeTimer !== null) clearTimeout(this._resizeTimer);

        this._resizeTimer = setTimeout(() => {
            this._resizeTimer = null;

            if (!this.isMobileViewport()) {
                this.isMobileOpen.value = false;
            }
        }, 150);
    };


    // ── Helpers ───────────────────────────────────────────────────────────────

    private isMobileViewport(): boolean {
        return window.innerWidth <= 768;
    }

    /**
     * Highlights the nav link matching the current route.
     *
     * Slotted elements live in the light DOM — shadowRoot.querySelectorAll()
     * cannot see them. We query the host element directly (this.querySelectorAll)
     * which traverses the light DOM children including all slotted items.
     */
    private syncActiveLink() {
        const currentPath = router.getCurrentRoute()?.path ?? window.location.pathname;

        this.querySelectorAll<Element>('[data-link]').forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === currentPath);
        });
    }

    /**
     * Creates the mobile overlay backdrop if it doesn't exist yet,
     * then attaches the click-to-close handler.
     */
    private ensureOverlay() {
        let overlay = dom.query<HTMLDivElement>('.sidebar-overlay');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }

        overlay.removeEventListener('click', this.onOverlayClick);
        overlay.addEventListener('click', this.onOverlayClick);
        this._overlayEl = overlay;
    }

}

defineComponent('app-sidebar', AppSidebar);

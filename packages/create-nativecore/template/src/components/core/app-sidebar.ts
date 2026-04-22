import { Component, defineComponent } from '@core/component.js';
import { useState } from '@core/state.js';
import type { State } from '@core/state.js';
import { html } from '@core-utils/templates.js';
import { dom } from '@core-utils/dom.js';
import auth from '@services/auth.service.js';
import router from '@core/router.js';

export class AppSidebar extends Component {
    isCollapsed: State<boolean>;
    isMobileOpen: State<boolean>;

    private _unwatchCollapsed?: () => void;
    private _unwatchMobileOpen?: () => void;
    private _overlayEl: HTMLDivElement | null = null;
    private _resizeTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly _handleClick = (e: Event) => {
        const target = e.target as HTMLElement;

        if (target.closest('.sidebar-collapse-btn')) {
            this.toggle();
            return;
        }

        if (target.closest('#sidebarLogoutBtn')) {
            auth.logout();
            return;
        }

        const sidebarLink = target.closest('.sidebar-item[data-link]') as HTMLAnchorElement | null;
        if (sidebarLink && this.isMobileViewport()) {
            this.closeMobileSidebar();
        }
    };
    private readonly _onSidebarToggle = () => {
        if (this.isMobileViewport()) {
            this.toggleMobileSidebar();
            return;
        }
        this.toggle();
    };
    private readonly _onOverlayClick = () => this.closeMobileSidebar();
    private readonly _onPageLoaded = () => {
        this.updateActiveLink();
        if (this.isMobileViewport()) {
            this.closeMobileSidebar();
        }
    };
    private readonly _onResize = () => {
        if (this._resizeTimer !== null) clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => {
            this._resizeTimer = null;
            if (!this.isMobileViewport()) {
                this.closeMobileSidebar();
            }
        }, 150);
    };

    static get observedAttributes() {
        return ['collapsed', 'width', 'sticky'];
    }

    constructor() {
        super();
        this.isCollapsed = useState(this.hasAttribute('collapsed'));
        this.isMobileOpen = useState(false);
    }

    template() {
        return html`
            <div class="app-sidebar ${this.isCollapsed.value ? 'collapsed' : ''}">
                <div class="sidebar-header">
                    <div class="sidebar-branding">
                        <span class="sidebar-branding__eyebrow">Protected</span>
                        <strong class="sidebar-branding__title">Workspace</strong>
                    </div>

                    <button
                        class="sidebar-collapse-btn ${this.isCollapsed.value ? 'is-collapsed' : 'is-expanded'}"
                        type="button"
                        aria-label="${this.isCollapsed.value ? 'Expand sidebar' : 'Collapse sidebar'}"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="4" y="5" width="16" height="14" rx="3"></rect>
                            <path d="M9 5v14" class="sidebar-collapse-btn__divider"></path>
                            <path d="M15 9l-3 3 3 3" class="sidebar-collapse-btn__chevron"></path>
                        </svg>
                    </button>
                </div>

                <nav class="sidebar-nav">
                    <a href="/dashboard" data-link class="sidebar-item dashboard-link">
                        <span class="sidebar-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="3" y1="9" x2="21" y2="9"></line>
                                <line x1="9" y1="21" x2="9" y2="9"></line>
                            </svg>
                        </span>
                        <span class="sidebar-text">Dashboard</span>
                    </a>
                </nav>

                <div class="sidebar-footer">
                    <button class="sidebar-item logout-link" id="sidebarLogoutBtn" type="button">
                        <span class="sidebar-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
        if (name === 'collapsed') {
            this.isCollapsed.value = newValue !== null;
        } else if (this._mounted) {
            this.render();
        }
    }

    onMount() {
        // Restore saved collapsed state
        const savedCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        if (savedCollapsed) {
            this.isCollapsed.value = true;
            this.setAttribute('collapsed', '');
        }

        // Watch state — update classes without full re-render
        this._unwatchCollapsed = this.isCollapsed.watch(() => {
            this.updateSidebar();
        });
        this._unwatchMobileOpen = this.isMobileOpen.watch(() => {
            this.updateMobileState();
        });

        this.ensureOverlay();
        this.updateSidebar();
        this.updateMobileState();
        this.updateActiveLink();

        this.addEventListener('click', this._handleClick);
        window.addEventListener('sidebar-toggle', this._onSidebarToggle);
        window.addEventListener('pageloaded', this._onPageLoaded);
        window.addEventListener('resize', this._onResize);
    }

    onUnmount() {
        this.removeEventListener('click', this._handleClick);
        window.removeEventListener('sidebar-toggle', this._onSidebarToggle);
        window.removeEventListener('pageloaded', this._onPageLoaded);
        window.removeEventListener('resize', this._onResize);
        if (this._resizeTimer !== null) {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = null;
        }
        this._unwatchCollapsed?.();
        this._unwatchMobileOpen?.();
        if (this._overlayEl) {
            this._overlayEl.removeEventListener('click', this._onOverlayClick);
            this._overlayEl.remove();
            this._overlayEl = null;
        }
    }

    toggle() {
        if (this.isMobileViewport()) {
            this.toggleMobileSidebar();
            return;
        }

        this.isCollapsed.value = !this.isCollapsed.value;

        if (this.isCollapsed.value) {
            this.setAttribute('collapsed', '');
        } else {
            this.removeAttribute('collapsed');
        }

        localStorage.setItem('sidebar-collapsed', this.isCollapsed.value.toString());

        this.emitEvent('toggle', { collapsed: this.isCollapsed.value }, {
            bubbles: true,
            composed: true
        });
    }

    private isMobileViewport(): boolean {
        return window.innerWidth <= 768;
    }

    private toggleMobileSidebar() {
        this.isMobileOpen.value = !this.isMobileOpen.value;
    }

    private closeMobileSidebar() {
        this.isMobileOpen.value = false;
    }

    private ensureOverlay() {
        let overlay = dom.query<HTMLDivElement>('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }

        overlay.removeEventListener('click', this._onOverlayClick);
        overlay.addEventListener('click', this._onOverlayClick);
        this._overlayEl = overlay;
    }

    private updateActiveLink() {
        const currentPath = router.getCurrentRoute()?.path ?? window.location.pathname;
        this.$$('.sidebar-item[data-link]').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }

    updateSidebar() {
        const sidebar = this.$('.app-sidebar');
        sidebar?.classList.toggle('collapsed', this.isCollapsed.value);
        this.classList.toggle('collapsed', this.isCollapsed.value);

        // Drive the grid column via a class on #app
        const app = dom.query<HTMLElement>('#app');
        app?.classList.toggle('sidebar-collapsed', this.isCollapsed.value);
    }

    private updateMobileState() {
        this.classList.toggle('mobile-open', this.isMobileOpen.value);
        document.body.classList.toggle('sidebar-open', this.isMobileOpen.value);
        this._overlayEl?.classList.toggle('active', this.isMobileOpen.value);
    }
}

defineComponent('app-sidebar', AppSidebar);


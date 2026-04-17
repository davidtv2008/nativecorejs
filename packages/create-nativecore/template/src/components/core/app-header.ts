/**
 * App Header Component
 * Beautiful responsive header with mobile side drawer
 */
import { Component, defineComponent } from '@core/component.js';
import router from '@core/router.js';
import auth from '@services/auth.service.js';
import './nc-avatar.js';
import { html } from '@utils/templates.js';

class AppHeader extends Component {
    // Bound references so addEventListener and removeEventListener use the same fn
    private readonly _handleClick = (e: Event) => this._onClick(e);
    private readonly _onAuthChange = () => this.updateAuthSection();
    private readonly _onUnauthorized = () => this.updateAuthSection();
    private readonly _onPageLoaded = (event: Event) => {
        const routeEvent = event as CustomEvent<{ path?: string }>;
        this.updateActiveLink(routeEvent.detail?.path);
    };
    private _onScroll: (() => void) | null = null;

    constructor() {
        super();
    }

    private renderUserMenu(): string {
        const user = auth.getUser();
        const userName = user?.name || 'User';

        return `
            <div class="user-menu desktop-only">
                <nc-avatar alt="${userName}" size="sm" variant="primary"></nc-avatar>
                <span class="user-name">${userName}</span>
                <button class="header-logout-btn" id="logoutBtn">Sign out</button>
            </div>
        `;
    }

    template() {
        const isAuthenticated = auth.isAuthenticated();
        const logoHref = isAuthenticated ? '/dashboard' : '/';

        return html`
                <div class="header-container">
                    <div class="header-left">
                        ${isAuthenticated ? `
                            <button class="mobile-menu-toggle" id="mobileMenuToggle" aria-label="Toggle sidebar">
                                <span class="burger-line"></span>
                                <span class="burger-line"></span>
                                <span class="burger-line"></span>
                            </button>
                        ` : ''}

                        <a href="${logoHref}" class="logo" id="logoLink">
                            <img class="logo-mark" src="/assets/logo.svg" alt="NativeCore logo">
                            <span class="logo-title">NativeCore</span>
                        </a>
                    </div>

                    <nav class="header-nav desktop-nav">
                        ${!isAuthenticated ? `
                            <a href="/" data-link class="nanc-link">Home</a>
                            <a href="/docs" data-link class="nanc-link">Docs</a>
                            <a href="/components" data-link class="nanc-link">Components</a>
                        ` : ''}
                    </nav>

                    <div class="header-right">
                        ${isAuthenticated ? `
                            ${this.renderUserMenu()}
                        ` : `
                            <a href="/login" data-link class="header-login-btn desktop-only">Sign in</a>
                        `}
                    </div>
                </div>
        `;
    }

    onMount() {
        // Single delegated click handler — covers all interactive elements,
        // even those re-rendered by updateAuthSection()
        this.addEventListener('click', this._handleClick);

        window.addEventListener('auth-change', this._onAuthChange);
        window.addEventListener('unauthorized', this._onUnauthorized);
        window.addEventListener('pageloaded', this._onPageLoaded);

        this._onScroll = () => {
            this.classList.toggle('scrolled', window.scrollY > 10);
        };
        window.addEventListener('scroll', this._onScroll, { passive: true });
        this._onScroll();

        this.updateActiveLink(router.getCurrentRoute()?.path);
    }

    onUnmount() {
        this.removeEventListener('click', this._handleClick);
        window.removeEventListener('auth-change', this._onAuthChange);
        window.removeEventListener('unauthorized', this._onUnauthorized);
        window.removeEventListener('pageloaded', this._onPageLoaded);
        if (this._onScroll) window.removeEventListener('scroll', this._onScroll);
    }

    private _onClick(e: Event) {
        const target = e.target as HTMLElement;

        if (target.closest('#logoutBtn')) {
            auth.logout();
            return;
        }

        if (target.closest('#logoLink')) {
            e.preventDefault();
            router.navigate(auth.isAuthenticated() ? '/dashboard' : '/');
            return;
        }

        if (target.closest('#mobileMenuToggle')) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('sidebar-toggle'));
            return;
        }
    }

    updateAuthSection() {
        const isAuthenticated = auth.isAuthenticated();
        const headerRight = this.$('.header-right');
        const headerNav = this.$('.header-nav');
        const logoLink = this.$<HTMLAnchorElement>('#logoLink');

        if (logoLink) {
            logoLink.setAttribute('href', isAuthenticated ? '/dashboard' : '/');
        }

        if (headerRight) {
            headerRight.innerHTML = isAuthenticated ? `
                ${this.renderUserMenu()}
            ` : `
                <a href="/login" data-link class="header-login-btn desktop-only">Sign in</a>
            `;
        }

        if (headerNav) {
            headerNav.innerHTML = !isAuthenticated ? `
                <a href="/" data-link class="nanc-link">Home</a>
                <a href="/docs" data-link class="nanc-link">Docs</a>
                <a href="/components" data-link class="nanc-link">Components</a>
            ` : '';
        }

        this.updateActiveLink(router.getCurrentRoute()?.path);
    }

    private normalizePath(path: string | null | undefined): string {
        if (!path || path === '/') {
            return '/';
        }

        const normalizedPath = path.replace(/[?#].*$/, '').replace(/\/+$/, '');
        return normalizedPath || '/';
    }

    updateActiveLink(routePath?: string) {
        const currentPath = this.normalizePath(routePath ?? router.getCurrentRoute()?.path ?? window.location.pathname);
        this.$$('.nanc-link').forEach(link => {
            link.classList.remove('active');
            const href = this.normalizePath(link.getAttribute('href'));
            if (href === currentPath) {
                link.classList.add('active');
            }
        });
    }
}

defineComponent('app-header', AppHeader);

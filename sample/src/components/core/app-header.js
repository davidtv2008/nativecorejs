/**
 * App Header Component
 * Beautiful responsive header with mobile side drawer
 */
import { Component, defineComponent } from '@core/component.js';
import router from '@core/router.js';
import auth from '@services/auth.service.js';
import './nc-avatar.js';
import { html, trusted, escapeHtml } from '@core-utils/templates.js';
class AppHeader extends Component {
    // Bound references so addEventListener and removeEventListener use the same fn
    _handleClick = (e) => this._onClick(e);
    _onAuthChange = () => this.updateAuthSection();
    _onUnauthorized = () => this.updateAuthSection();
    _onPageLoaded = (event) => {
        const routeEvent = event;
        this.updateActiveLink(routeEvent.detail?.path);
    };
    _onScroll = null;
    constructor() {
        super();
    }
    renderUserMenu() {
        const user = auth.getUser();
        const userName = escapeHtml(user?.name || 'User');
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
        return html `
                <div class="header-container">
                    <div class="header-left">
                        ${trusted(isAuthenticated ? `
                            <button class="mobile-menu-toggle" id="mobileMenuToggle" aria-label="Toggle sidebar">
                                <span class="burger-line"></span>
                                <span class="burger-line"></span>
                                <span class="burger-line"></span>
                            </button>
                        ` : '')}

                        <a href="${logoHref}" class="logo" id="logoLink">
                            <img class="logo-mark" src="/assets/logo.svg" alt="NativeCore logo">
                            <span class="logo-title">NativeCore</span>
                        </a>
                    </div>

                    <nav class="header-nav desktop-nav">
                        ${trusted(!isAuthenticated ? `
                            <a href="/" data-link class="nanc-link">Home</a>
                            ` : '')}
                    </nav>

                    <div class="header-right">
                        ${trusted(isAuthenticated ? `
                            ${this.renderUserMenu()}
                        ` : `
                            <a href="/login" data-link class="header-login-btn desktop-only">Sign in</a>
                        `)}
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
        if (this._onScroll)
            window.removeEventListener('scroll', this._onScroll);
    }
    _onClick(e) {
        const target = e.target;
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
        const logoLink = this.$('#logoLink');
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
                ` : '';
        }
        this.updateActiveLink(router.getCurrentRoute()?.path);
    }
    normalizePath(path) {
        if (!path || path === '/') {
            return '/';
        }
        const normalizedPath = path.replace(/[?#].*$/, '').replace(/\/+$/, '');
        return normalizedPath || '/';
    }
    updateActiveLink(routePath) {
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

import { CoreComponent } from '@core/component.js';
import { css, html, escapeHtml, sanitizeURL } from '@core-utils/templates.js';
import router from '@core/router.js';
import auth from '@services/auth.service.js';
import './nc-avatar.js';

export class AppHeader extends CoreComponent {

    // --- STATIC CONFIG ---
    static useShadowDOM = true;

    static styles = css`
        :host {
            display: block;
            grid-area: header;
            position: sticky;
            top: 0;
            z-index: 1002;
            width: 100%;
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s ease, background 0.2s ease;
        }

        :host(.scrolled) {
            border-bottom-color: rgba(255, 255, 255, 0.08);
        }

        .header-container {
            max-width: 100%;
            margin: 0 auto;
            height: var(--header-height);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--spacing-lg);
            padding: 0 var(--spacing-xl);
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            text-decoration: none;
        }

        .logo-mark {
            width: 28px;
            height: 28px;
            flex-shrink: 0;
        }

        .logo-title {
            font-size: 1.15rem;
            font-weight: 700;
            color: #fff;
            letter-spacing: -0.3px;
        }

        .header-nav {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        .nanc-link {
            color: rgba(255, 255, 255, 0.7);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            padding: 0.4rem 0.85rem;
            border-radius: 6px;
            transition: color 0.15s ease, background 0.15s ease;
        }

        .nanc-link:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.08);
        }

        .nanc-link.active {
            color: #10b981;
            background: rgba(16, 185, 129, 0.12);
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
        }

        .user-menu {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }

        .user-name {
            color: rgba(255, 255, 255, 0.85);
            font-size: 0.875rem;
            font-weight: 500;
        }

        .header-logout-btn {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.8rem;
            font-weight: 500;
            padding: 0.3rem 0.75rem;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease;
        }

        .header-logout-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
        }

        .header-login-btn {
            display: inline-block;
            background: var(--gradient-primary);
            color: #fff;
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 600;
            padding: 0.45rem 1.1rem;
            border-radius: 8px;
            transition: opacity 0.15s ease, transform 0.15s ease;
        }

        .header-login-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        .mobile-menu-toggle {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 5px;
            width: 36px;
            height: 36px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 6px;
            border-radius: 6px;
            transition: background 0.15s ease;
        }

        .mobile-menu-toggle:hover {
            background: rgba(255, 255, 255, 0.08);
        }

        .burger-line {
            display: block;
            width: 18px;
            height: 2px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 2px;
        }

        .desktop-only { display: flex; }

        @media (max-width: 768px) {
            .desktop-only { display: none !important; }
        }

        [hidden] { display: none !important; }
    `;

    // --- TEMPLATE ---
    // Must be fully static - CoreComponent caches it after the first render.
    // All auth-dependent content is injected via refs in _applyAuthState().
    template() {
        return html`
            <div class="header-container">
                <div class="header-left">
                    <button ref="mobileToggle" class="mobile-menu-toggle" aria-label="Toggle sidebar" hidden>
                        <span class="burger-line"></span>
                        <span class="burger-line"></span>
                        <span class="burger-line"></span>
                    </button>
                    <a ref="logoLink" href="/" class="logo">
                        <img class="logo-mark" src="/assets/logo.svg" alt="NativeCore logo">
                        <span class="logo-title">NativeCore</span>
                    </a>
                </div>
                <nav ref="headerNav" class="header-nav desktop-nav"></nav>
                <div ref="headerRight" class="header-right"></div>
            </div>
        `;
    }

    // --- REFS ---
    private logoLink!: HTMLAnchorElement;
    private mobileToggle!: HTMLButtonElement;
    private headerNav!: HTMLElement;
    private headerRight!: HTMLElement;

    // --- LIFECYCLE ---
    onMount() {
        this._applyAuthState();

        this.on(window, 'auth-change', () => this._applyAuthState());
        this.on(window, 'unauthorized', () => this._applyAuthState());
        this.on(window, 'pageloaded', (e: Event) => {
            this._updateActiveLink((e as CustomEvent<{ path?: string }>).detail?.path);
        });
        this.on(window, 'scroll', () => {
            this.classList.toggle('scrolled', window.scrollY > 10);
        });

        this.classList.toggle('scrolled', window.scrollY > 10);
        this._updateActiveLink(router.getCurrentRoute()?.path);
    }

    // --- EVENTS ---
    events() {
        this.on(this.root, 'click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            if (target.closest('#logoutBtn')) {
                auth.logout();
                return;
            }

            if (target.closest('.logo')) {
                e.preventDefault();
                router.navigate(auth.isAuthenticated() ? '/dashboard' : '/');
                return;
            }

            if (target.closest('.mobile-menu-toggle')) {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('sidebar-toggle'));
                return;
            }
        });
    }

    // --- PRIVATE ---
    private _applyAuthState(): void {
        const isAuthenticated = auth.isAuthenticated();
        const user = auth.getUser();
        const userName = escapeHtml(user?.name || 'User');

        this.logoLink.setAttribute('href', sanitizeURL(isAuthenticated ? '/dashboard' : '/') || '/');
        this.mobileToggle.hidden = !isAuthenticated;

        this.headerNav.innerHTML = !isAuthenticated
            ? ''
            : '';

        this.headerRight.innerHTML = isAuthenticated
            ? `<div class="user-menu desktop-only">
                   <nc-avatar alt="${userName}" size="sm" variant="primary"></nc-avatar>
                   <span class="user-name">${userName}</span>
                   <button class="header-logout-btn" id="logoutBtn">Sign out</button>
               </div>`
            : `<a href="/login" data-link class="header-login-btn desktop-only">Sign in</a>`;

        this._updateActiveLink(router.getCurrentRoute()?.path);
    }

    private _normalizePath(path: string | null | undefined): string {
        if (!path || path === '/') return '/';
        return path.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';
    }

    private _updateActiveLink(routePath?: string): void {
        const current = this._normalizePath(routePath ?? router.getCurrentRoute()?.path ?? window.location.pathname);
        this.$$<HTMLElement>('.nanc-link').forEach(link => {
            link.classList.toggle('active', this._normalizePath(link.getAttribute('href')) === current);
        });
    }
}

if (!customElements.get('app-header')) customElements.define('app-header', AppHeader);

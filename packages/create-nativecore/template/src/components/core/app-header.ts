import { CoreComponent } from '@core/component.js';
import { css, html } from '@core-utils/templates.js';
import router from '@core/router.js';

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
            background: rgba(15, 23, 42, 0.42);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s ease, background 0.2s ease, backdrop-filter 0.2s ease, -webkit-backdrop-filter 0.2s ease;
        }

        :host(.scrolled) {
            background: rgba(15, 23, 42, 0.68);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
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

        .mobile-menu-toggle {
            display: none;
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

        body.sidebar-enabled .mobile-menu-toggle {
            display: flex;
        }

        [hidden] { display: none !important; }
    `;

    template() {
        return html`
            <div class="header-container">
                <div class="header-left">
                    <button ref="mobileToggle" class="mobile-menu-toggle" aria-label="Toggle sidebar" type="button">
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

            if (target.closest('.logo')) {
                e.preventDefault();
                router.navigate('/');
                return;
            }

            if (target.closest('.mobile-menu-toggle')) {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('sidebar-toggle'));
            }
        });
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

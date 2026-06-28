import { CoreComponent } from '@core/component.js';
import { css, html } from '@core-utils/templates.js';

export class AppFooter extends CoreComponent {

    // --- STATIC CONFIG ---
    static useShadowDOM = true;

    static styles = css`
        :host {
            display: block;
            background: var(--color-bg-secondary);
            border-top: 1px solid var(--color-border);
        }
        footer {
            background: var(--color-bg-secondary);
            padding: var(--spacing-xl) 0;
        }
        .container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: var(--container-max-width, 1200px);
            margin: 0 auto;
            padding: 0 var(--spacing-lg);
        }
        p {
            color: var(--color-text-secondary);
            margin: 0;
        }
        .footer-links {
            display: flex;
            gap: var(--spacing-lg);
        }
        .footer-links a {
            color: var(--color-text);
            font-weight: 500;
            text-decoration: underline;
            text-underline-offset: 0.18em;
        }
        .footer-links a:hover,
        .footer-links a:focus-visible {
            color: var(--color-primary-dark);
        }
    `;

    // --- TEMPLATE ---
    template() {
        const year = new Date().getFullYear();
        return html`
            <footer>
                <div class="container">
                    <p>&copy; ${year} MyApp. All rights reserved.</p>
                    <div class="footer-links">
                        <a href="/privacy" data-link>Privacy</a>
                        <a href="/terms" data-link>Terms</a>
                    </div>
                </div>
            </footer>
        `;
    }

    // --- CLEANUP ---
    // onUnmount() {}
}

if (!customElements.get('app-footer')) customElements.define('app-footer', AppFooter);



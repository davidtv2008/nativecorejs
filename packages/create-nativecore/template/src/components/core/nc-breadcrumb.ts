/**
 * NcBreadcrumb Component
 *
 * Attributes:
 *   - separator: string — separator character/text (default: '/')
 *
 * Usage — place nc-a or plain <a> / <span> children inside:
 *   <nc-breadcrumb>
 *     <nc-a href="/">Home</nc-a>
 *     <nc-a href="/settings">Settings</nc-a>
 *     <span>Profile</span>
 *   </nc-breadcrumb>
 */

import { CoreComponent } from '@core/component.js';
import { css, html } from '@core-utils/templates.js';

export class NcBreadcrumb extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['separator'];
    static attributePlaceholders = { separator: '›' };

    private _observer: MutationObserver | null = null;
    private _sep = this.state('/');
    private _inserting = false;

    static styles = css`
        :host { display: block; font-family: var(--nc-font-family); }

        nav {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 2px;
        }

        ::slotted(*) {
            font-size: var(--nc-font-size-sm);
            color: var(--nc-text-muted);
            --nc-a-color: var(--nc-text-muted);
            text-decoration: none;
            white-space: nowrap;
        }
        ::slotted(*:last-child) {
            color: var(--nc-text);
            --nc-a-color: var(--nc-text);
            font-weight: var(--nc-font-weight-medium);
            pointer-events: none;
        }
        ::slotted(*:not(:last-child):hover) { color: var(--nc-primary); --nc-a-color: var(--nc-primary); }

        ::slotted(.nc-breadcrumb-sep) {
            color: var(--nc-text-muted);
            font-size: var(--nc-font-size-sm);
            padding: 0 4px;
            user-select: none;
            pointer-events: none;
        }
    `;

    template() {
        return html`            <nav aria-label="Breadcrumb">
                <slot></slot>
            </nav>
        `;
    }

    onMount() {
        // effect re-runs whenever _sep changes (reactive tracking)
        this.effect(() => this._insertSeparators(this._sep.value));

        // MutationObserver handles slotted children being added/removed
        this._observer = new MutationObserver(() => this._insertSeparators(this._sep.value));
        this._observer.observe(this, { childList: true });
    }

    onUnmount() {
        this._observer?.disconnect();
        this._observer = null;
    }

    protected _handleAttributeUpdate(name: string, val: string | null) {
        if (name === 'separator') this._sep.value = val || '/';
    }

    private _insertSeparators(sep: string) {
        if (this._inserting) return;
        this._inserting = true;

        this.querySelectorAll('.nc-breadcrumb-sep').forEach(el => el.remove());

        const children = Array.from(this.children).filter(
            el => !el.classList.contains('nc-breadcrumb-sep'),
        );
        children.slice(0, -1).forEach(child => {
            const span = document.createElement('span');
            span.className = 'nc-breadcrumb-sep';
            span.setAttribute('aria-hidden', 'true');
            span.textContent = sep;
            child.after(span);
        });

        this._inserting = false;
    }
}

if (!customElements.get('nc-breadcrumb')) customElements.define('nc-breadcrumb', NcBreadcrumb);


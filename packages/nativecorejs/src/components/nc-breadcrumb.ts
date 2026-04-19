import { Component, defineComponent } from '../../.nativecore/core/component.js';

export class NcBreadcrumb extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['separator'];
    }

    template() {
        return html`
            <style>
                :host { display: block; font-family: var(--nc-font-family); }

                nav { display: flex; align-items: center; flex-wrap: wrap; gap: 2px; }

                .sep {
                    color: var(--nc-text-muted, #6b7280);
                    font-size: var(--nc-font-size-sm, 0.875rem);
                    padding: 0 4px;
                    user-select: none;
                }

                ::slotted(*) {
                    font-size: var(--nc-font-size-sm, 0.875rem);
                    color: var(--nc-text-muted, #6b7280);
                    text-decoration: none;
                    white-space: nowrap;
                }

                ::slotted(*:last-child) {
                    color: var(--nc-text, #111827);
                    font-weight: var(--nc-font-weight-medium, 500);
                    pointer-events: none;
                }

                ::slotted(*:not(:last-child):hover) {
                    color: var(--nc-primary, #10b981);
                }
            </style>
            <nav aria-label="Breadcrumb">
                <slot></slot>
            </nav>
        `;
    }

    onMount() {
        this.insertSeparators();
        const observer = new MutationObserver(() => this.insertSeparators());
        observer.observe(this, { childList: true });
        (this as any)._breadcrumbObserver = observer;
    }

    onUnmount() {
        (this as any)._breadcrumbObserver?.disconnect();
    }

    private insertSeparators() {
        const separator = this.getAttribute('separator') || '/';
        const existing = Array.from(this.querySelectorAll('.nc-breadcrumb-sep'));
        existing.forEach(node => node.remove());

        const children = Array.from(this.children).filter(
            element => !element.classList.contains('nc-breadcrumb-sep')
        );

        children.slice(0, -1).forEach(child => {
            const span = document.createElement('span');
            span.className = 'nc-breadcrumb-sep';
            span.setAttribute('aria-hidden', 'true');
            span.textContent = separator;
            child.after(span);
        });
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) {
            this.insertSeparators();
        }
    }
}

defineComponent('nc-breadcrumb', NcBreadcrumb);


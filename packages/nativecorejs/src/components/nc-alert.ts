import { Component, defineComponent } from '../core/component.js';
import { escapeHTML } from '../utils/templates.js';

const ICONS: Record<string, string> = {
    info: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
    success: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
    danger: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
    neutral: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`
};

export class NcAlert extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['variant', 'title', 'dismissible', 'duration', 'icon', 'open'];
    }

    private dismissTimer: ReturnType<typeof setTimeout> | null = null;

    template() {
        const variant = this.getAttribute('variant') || 'info';
        const title = this.getAttribute('title') || '';
        const dismissible = this.hasAttribute('dismissible');
        const showIcon = this.getAttribute('icon') !== 'false';
        const open = !this.hasAttribute('open') || this.getAttribute('open') !== 'false';

        return `
            <style>
                :host { display: block; font-family: var(--nc-font-family); }

                .alert {
                    display: ${open ? 'flex' : 'none'};
                    align-items: flex-start;
                    gap: var(--nc-spacing-sm, 0.5rem);
                    padding: var(--nc-spacing-md, 1rem) var(--nc-spacing-lg, 1.5rem);
                    border-radius: var(--nc-radius-md, 8px);
                    border: 1px solid transparent;
                    line-height: 1.5;
                    animation: nc-alert-in 0.2s ease;
                }

                @keyframes nc-alert-in {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .alert.out {
                    animation: nc-alert-out 0.18s ease forwards;
                }
                @keyframes nc-alert-out {
                    to { opacity: 0; transform: scale(0.97); }
                }

                .alert--info { background: #eff6ff; color: #1e40af; border-color: #93c5fd; }
                .alert--success { background: #f0fdf4; color: #166534; border-color: #86efac; }
                .alert--warning { background: #fffbeb; color: #92400e; border-color: #fcd34d; }
                .alert--danger { background: #fef2f2; color: #991b1b; border-color: #fca5a5; }
                .alert--neutral { background: var(--nc-bg-secondary, #f8fafc); color: var(--nc-text, #111827); border-color: var(--nc-border, #e5e7eb); }

                .alert__icon { flex-shrink: 0; margin-top: 1px; }
                .alert__body { flex: 1; font-size: var(--nc-font-size-sm, 0.875rem); }
                .alert__title {
                    font-weight: var(--nc-font-weight-semibold, 600);
                    font-size: var(--nc-font-size-base, 1rem);
                    margin-bottom: 2px;
                    display: block;
                }
                .alert__close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    flex-shrink: 0;
                    padding: 2px;
                    color: inherit;
                    opacity: 0.5;
                    transition: opacity var(--nc-transition-fast, 160ms ease);
                    display: flex;
                    line-height: 1;
                    border-radius: var(--nc-radius-sm, 4px);
                }
                .alert__close:hover { opacity: 1; }
            </style>
            <div class="alert alert--${variant}" role="alert" aria-live="polite">
                ${showIcon ? `<span class="alert__icon">${ICONS[variant] ?? ICONS.info}</span>` : ''}
                <div class="alert__body">
                    ${title ? `<strong class="alert__title">${escapeHTML(title)}</strong>` : ''}
                    <slot></slot>
                </div>
                ${dismissible ? `
                <button class="alert__close" type="button" aria-label="Close alert">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none" width="14" height="14">
                        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>` : ''}
            </div>
        `;
    }

    onMount() {
        const closeButton = this.$<HTMLButtonElement>('.alert__close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.dismiss());
        }

        const duration = Number(this.getAttribute('duration') || 0);
        if (duration > 0) {
            this.dismissTimer = setTimeout(() => this.dismiss(), duration);
        }
    }

    onUnmount() {
        if (this.dismissTimer) {
            clearTimeout(this.dismissTimer);
        }
    }

    private dismiss() {
        if (this.dismissTimer) {
            clearTimeout(this.dismissTimer);
            this.dismissTimer = null;
        }
        const alertElement = this.$<HTMLElement>('.alert');
        if (alertElement) {
            alertElement.classList.add('out');
            alertElement.addEventListener('animationend', () => {
                alertElement.style.display = 'none';
                this.dispatchEvent(new CustomEvent('dismiss', { bubbles: true, composed: true }));
            }, { once: true });
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) {
            this.render();
            this.onMount();
        }
    }
}

defineComponent('nc-alert', NcAlert);

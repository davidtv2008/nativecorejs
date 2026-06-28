/**
 * NcAlert Component
 *
 * Attributes:
 *   - variant: 'info'|'success'|'warning'|'danger'|'neutral' (default: 'info')
 *   - title: string — optional bold heading
 *   - dismissible: boolean — show close button
 *   - duration: number — ms before auto-dismiss (0 = sticky)
 *   - icon: boolean — show variant icon (default: true)
 *   - open: boolean — visible state (default: true; remove to hide)
 *
 * Events:
 *   - dismiss: CustomEvent — fired when closed
 *
 * Usage:
 *   <nc-alert variant="success" title="Saved!" dismissible>Your changes have been saved.</nc-alert>
 *   <nc-alert variant="warning">Your session expires in 5 minutes.</nc-alert>
 */

import { CoreComponent } from '@core/component.js';
import { html, css } from '@core-utils/templates.js';

const ICONS: Record<string, string> = {
    info:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
    success: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
    danger:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
    neutral: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
};

export class NcAlert extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['variant', 'title', 'dismissible', 'duration', 'icon', 'open'];

    static attributeOptions = {
        variant: ['info', 'success', 'warning', 'danger', 'neutral'],
        dismissible: ['true'],
        icon: ['true', 'false'],
        open: ['true', 'false'],
    };

    static styles = css`
        :host { display: block; font-family: var(--nc-font-family); }

        .alert {
            display: flex;
            align-items: flex-start;
            gap: var(--nc-spacing-sm);
            padding: var(--nc-spacing-md) var(--nc-spacing-lg);
            border-radius: var(--nc-radius-md, 8px);
            border: 1px solid transparent;
            line-height: 1.5;
            animation: nc-alert-in 0.2s ease;
        }

        :host(.closed) .alert {
            display: none;
        }

        @keyframes nc-alert-in {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .alert.out {
            animation: nc-alert-out 0.18s ease forwards;
        }

        @keyframes nc-alert-out {
            to { opacity: 0; transform: scale(0.97); }
        }

        :host([variant="info"]) .alert    { background: #eff6ff; color: #1e40af; border-color: #93c5fd; }
        :host([variant="success"]) .alert { background: #f0fdf4; color: #166534; border-color: #86efac; }
        :host([variant="warning"]) .alert { background: #fffbeb; color: #92400e; border-color: #fcd34d; }
        :host([variant="danger"]) .alert  { background: #fef2f2; color: #991b1b; border-color: #fca5a5; }
        :host([variant="neutral"]) .alert { background: var(--nc-bg-secondary); color: var(--nc-text); border-color: var(--nc-border); }

        .alert__icon { flex-shrink: 0; margin-top: 1px; }
        .alert__body { flex: 1; font-size: var(--nc-font-size-sm); }

        .alert__title {
            font-weight: var(--nc-font-weight-semibold);
            font-size: var(--nc-font-size-base);
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
            transition: opacity var(--nc-transition-fast);
            display: flex;
            line-height: 1;
            border-radius: var(--nc-radius-sm, 4px);
        }

        .alert__close:hover { opacity: 1; }
    `;

    private alertEl!: HTMLElement;
    private iconEl!: HTMLElement;
    private titleEl!: HTMLElement;
    private closeBtn!: HTMLButtonElement;

    private variant = this.state<'info' | 'success' | 'warning' | 'danger' | 'neutral'>('info');
    private titleText = this.state('');
    private dismissible = this.state(false);
    private duration = this.state(0);
    private showIcon = this.state(true);
    private isOpen = this.state(true);

    private _dismissTimer: ReturnType<typeof setTimeout> | null = null;

    template() {
        return html`
            <div ref="alertEl" class="alert" role="alert" aria-live="polite">
                <span ref="iconEl" class="alert__icon" aria-hidden="true"></span>
                <div class="alert__body">
                    <strong ref="titleEl" class="alert__title"></strong>
                    <slot></slot>
                </div>
                <button ref="closeBtn" class="alert__close" type="button" aria-label="Close alert">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none" width="14" height="14">
                        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        `;
    }

    onMount() {
        this.variant.value = this.normalizeVariant(this.getAttribute('variant'));
        this.titleText.value = this.getAttribute('title') || '';
        this.dismissible.value = this.hasAttribute('dismissible');
        this.duration.value = this.parseDuration(this.getAttribute('duration'));
        this.showIcon.value = this.getAttribute('icon') !== 'false';
        this.isOpen.value = this.normalizeOpen(this.getAttribute('open'));

        this.bind(this.variant, this, 'variant');

        this.effect(() => {
            this.classList.toggle('closed', !this.isOpen.value);
        });

        this.effect(() => {
            const icon = ICONS[this.variant.value] ?? ICONS.info;
            this.iconEl.innerHTML = icon;
            this.iconEl.hidden = !this.showIcon.value;
        });

        this.effect(() => {
            this.titleEl.textContent = this.titleText.value;
            this.titleEl.hidden = this.titleText.value.length === 0;
        });

        this.effect(() => {
            this.closeBtn.hidden = !this.dismissible.value;
            this.closeBtn.disabled = !this.dismissible.value;
        });

        this.effect(() => {
            this.syncOpenAttribute();
            this.resetDismissTimer();
        });
    }

    onUnmount() {
        this.clearDismissTimer();
    }

    protected _handleAttributeUpdate(name: string, val: string | null): void {
        if (name === 'variant') this.variant.value = this.normalizeVariant(val);
        if (name === 'title') this.titleText.value = val || '';
        if (name === 'dismissible') this.dismissible.value = val !== null;
        if (name === 'duration') this.duration.value = this.parseDuration(val);
        if (name === 'icon') this.showIcon.value = val !== 'false';
        if (name === 'open') this.isOpen.value = this.normalizeOpen(val);
    }

    events() {
        this.on(this.closeBtn, 'click', () => this.dismiss());
    }

    private dismiss() {
        this.clearDismissTimer();

        if (!this.isOpen.value) return;

        this.alertEl.classList.add('out');
        this.alertEl.addEventListener('animationend', () => {
            this.alertEl.classList.remove('out');
            this.isOpen.value = false;
            this.emit('dismiss');
        }, { once: true });
    }

    private clearDismissTimer(): void {
        if (this._dismissTimer) {
            clearTimeout(this._dismissTimer);
            this._dismissTimer = null;
        }
    }

    private resetDismissTimer(): void {
        this.clearDismissTimer();
        if (!this.isOpen.value) return;
        if (this.duration.value <= 0) return;
        this._dismissTimer = setTimeout(() => this.dismiss(), this.duration.value);
    }

    private syncOpenAttribute(): void {
        // Preserve previous API semantics:
        // - no `open` attribute => open (default)
        // - `open="false"` => closed
        if (this.isOpen.value) {
            if (this.getAttribute('open') === 'false') this.removeAttribute('open');
        } else {
            if (this.getAttribute('open') !== 'false') this.setAttribute('open', 'false');
        }
    }

    private parseDuration(value: string | null): number {
        const n = Number(value || 0);
        return Number.isFinite(n) && n > 0 ? n : 0;
    }

    private normalizeVariant(value: string | null): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
        if (value === 'success' || value === 'warning' || value === 'danger' || value === 'neutral') return value;
        return 'info';
    }

    private normalizeOpen(value: string | null): boolean {
        if (value === null) return true;
        return value !== 'false';
    }
}

if (!customElements.get('nc-alert')) customElements.define('nc-alert', NcAlert);


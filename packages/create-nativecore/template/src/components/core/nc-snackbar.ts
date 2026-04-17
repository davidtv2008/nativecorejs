/**
 * NcSnackbar Component
 *
 * A singleton toast notification manager. Attach once to the app shell;
 * dispatch 'nc-toast' events from anywhere to show notifications.
 *
 * Attributes:
 *   - position: 'top-right'|'top-center'|'top-left'|'bottom-right'|'bottom-center'|'bottom-left'
 *               (default: 'bottom-right')
 *   - max: number — max visible toasts (default: 5)
 *
 * Programmatic API (after import):
 *   NcSnackbar.show({ message, variant?, duration?, dismissible? })
 *
 * Event-based API (no import needed):
 *   document.dispatchEvent(new CustomEvent('nc-toast', {
 *     detail: { message: 'Saved!', variant: 'success', duration: 3000 }
 *   }));
 *
 * Toast options:
 *   - message: string
 *   - variant: 'default'|'success'|'warning'|'danger'|'info' (default: 'default')
 *   - duration: number — ms before auto-dismiss (default: 4000, 0 = sticky)
 *   - dismissible: boolean — show close button (default: true)
 *   - icon: boolean — show variant icon (default: true)
 */

import { Component, defineComponent } from '@core/component.js';
import { dom } from '@core-utils/dom.js';
import { html } from '@core-utils/templates.js';

interface ToastOptions {
    message: string;
    variant?: string;
    duration?: number;
    dismissible?: boolean;
    icon?: boolean;
}

interface Toast extends Required<ToastOptions> {
    id: number;
}

const ICONS: Record<string, string> = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
    danger:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
    info:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
    default: '',
};

let _seq = 0;

export class NcSnackbar extends Component {
    static useShadowDOM = true;

    private _toasts: Toast[] = [];
    private _timers = new Map<number, ReturnType<typeof setTimeout>>();

    static get observedAttributes() { return ['position', 'max']; }

    // Static helper so other modules can call NcSnackbar.show({...})
    static show(opts: ToastOptions) {
        const el = dom.query<NcSnackbar>('nc-snackbar');
        el?._add(opts);
    }

    template() {
        const position = this.getAttribute('position') || 'bottom-right';
        const [vPos, hPos] = position.split('-');

        return html`
            <style>
                :host {
                    position: fixed;
                    ${vPos === 'top' ? 'top: var(--nc-spacing-lg, 1.5rem);' : 'bottom: var(--nc-spacing-lg, 1.5rem);'}
                    ${hPos === 'right' ? 'right: var(--nc-spacing-lg, 1.5rem);' : hPos === 'left' ? 'left: var(--nc-spacing-lg, 1.5rem);' : 'left: 50%; transform: translateX(-50%);'}
                    z-index: 10000;
                    display: flex;
                    flex-direction: ${vPos === 'top' ? 'column' : 'column-reverse'};
                    gap: var(--nc-spacing-sm);
                    pointer-events: none;
                    max-width: min(380px, calc(100vw - 2rem));
                    width: max-content;
                }

                .toast {
                    display: flex;
                    align-items: flex-start;
                    gap: var(--nc-spacing-sm);
                    padding: var(--nc-spacing-sm) var(--nc-spacing-md);
                    border-radius: var(--nc-radius-md, 8px);
                    box-shadow: var(--nc-shadow-lg);
                    font-family: var(--nc-font-family);
                    font-size: var(--nc-font-size-sm);
                    pointer-events: all;
                    animation: nc-toast-in 0.22s ease forwards;
                    min-width: 240px;
                    max-width: 380px;
                    border: 1px solid transparent;
                }

                .toast.out { animation: nc-toast-out 0.18s ease forwards; }

                @keyframes nc-toast-in {
                    from { opacity: 0; transform: ${vPos === 'top' ? 'translateY(-8px)' : 'translateY(8px)'}; }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes nc-toast-out {
                    to { opacity: 0; transform: scale(0.95); }
                }

                .toast--default { background: var(--nc-bg); color: var(--nc-text); border-color: var(--nc-border); }
                .toast--success { background: #f0fdf4; color: #166534; border-color: #86efac; }
                .toast--danger  { background: #fef2f2; color: #991b1b; border-color: #fca5a5; }
                .toast--warning { background: #fffbeb; color: #92400e; border-color: #fcd34d; }
                .toast--info    { background: #eff6ff; color: #1e40af; border-color: #93c5fd; }

                .toast__icon { flex-shrink: 0; margin-top: 1px; }
                .toast__msg  { flex: 1; line-height: 1.5; }

                .toast__close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    color: inherit;
                    opacity: 0.5;
                    flex-shrink: 0;
                    line-height: 1;
                    transition: opacity var(--nc-transition-fast);
                }
                .toast__close:hover { opacity: 1; }
            </style>
            ${this._toasts.map(t => this._renderToast(t)).join('')}
        `;
    }

    private _renderToast(t: Toast): string {
        const icon = ICONS[t.variant] || '';
        return `
            <div class="toast toast--${t.variant}" data-id="${t.id}" role="alert" aria-live="polite">
                ${icon && t.icon ? `<span class="toast__icon">${icon}</span>` : ''}
                <span class="toast__msg">${t.message}</span>
                ${t.dismissible ? `
                <button class="toast__close" data-dismiss="${t.id}" type="button" aria-label="Dismiss">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="12" height="12">
                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>` : ''}
            </div>`;
    }

    onMount() {
        this._bindEvents();

        // Global event listener
        document.addEventListener('nc-toast', (e: Event) => {
            this._add((e as CustomEvent<ToastOptions>).detail);
        });
    }

    private _bindEvents() {
        this.shadowRoot!.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-dismiss]');
            if (btn) {
                const id = Number(btn.dataset.dismiss);
                this._dismiss(id);
            }
        });
    }

    _add(opts: ToastOptions) {
        const max = Number(this.getAttribute('max') || 5);
        const toast: Toast = {
            id: ++_seq,
            message: opts.message,
            variant: opts.variant || 'default',
            duration: opts.duration ?? 4000,
            dismissible: opts.dismissible ?? true,
            icon: opts.icon ?? true,
        };

        this._toasts.push(toast);

        // Cap to max
        while (this._toasts.length > max) {
            const removed = this._toasts.shift()!;
            this._clearTimer(removed.id);
        }

        this.render();
        this._bindEvents();

        if (toast.duration > 0) {
            const timer = setTimeout(() => this._dismiss(toast.id), toast.duration);
            this._timers.set(toast.id, timer);
        }
    }

    private _dismiss(id: number) {
        this._clearTimer(id);
        const el = this.shadowRoot!.querySelector<HTMLElement>(`[data-id="${id}"]`);
        if (el) {
            el.classList.add('out');
            el.addEventListener('animationend', () => {
                this._toasts = this._toasts.filter(t => t.id !== id);
                this.render();
                this._bindEvents();
            }, { once: true });
        } else {
            this._toasts = this._toasts.filter(t => t.id !== id);
        }
    }

    private _clearTimer(id: number) {
        const t = this._timers.get(id);
        if (t) { clearTimeout(t); this._timers.delete(id); }
    }

    onUnmount() {
        this._timers.forEach(t => clearTimeout(t));
        this._timers.clear();
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) this.render();
    }
}

defineComponent('nc-snackbar', NcSnackbar);


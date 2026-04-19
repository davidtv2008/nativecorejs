/**
 * NcErrorBoundary Component
 *
 * Catches errors from child components, controller failures, and unhandled
 * promise rejections. Renders a dev-friendly debug panel in dev mode and a
 * graceful fallback in production mode.
 *
 * Attributes:
 *   mode             - "dev" (default) | "production"
 *   fallback         - Custom fallback heading (default: "Something went wrong")
 *
 * Events:
 *   nc-error         - CustomEvent<NcErrorDetail> — fires when any error is caught
 *   nc-error-reset   - CustomEvent<{}> — fires after a successful reset
 *
 * Framework events listened for (when placed at root):
 *   nativecore:component-error  - from component lifecycle failures
 *   nativecore:route-error      - from router/controller failures
 *   window.onerror              - global JS errors
 *   window.unhandledrejection   - unhandled promise rejections
 *
 * Usage:
 *   <!-- Dev mode (auto-set by scaffolding, swapped to "production" at build time) -->
 *   <nc-error-boundary mode="dev">
 *     <div id="main-content"></div>
 *   </nc-error-boundary>
 *
 *   <!-- Custom production fallback -->
 *   <nc-error-boundary mode="production" fallback="App failed to load">
 *     <div id="main-content"></div>
 *   </nc-error-boundary>
 *
 * Programmatic reset:
 *   document.querySelector('nc-error-boundary').reset();
 */
import { Component, defineComponent } from '../../.nativecore/core/component.js';

export interface NcErrorDetail {
    error: unknown;
    message: string;
    stack?: string;
    component?: string;
    route?: string;
    source?: 'component' | 'route' | 'global' | 'promise';
}

export class NcErrorBoundary extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['mode', 'fallback'];
    }

    private _error: NcErrorDetail | null = null;
    private _originalHTML = '';
    private _isRoot = false;

    // Bound handlers stored so we can remove them on unmount
    private _onComponentError = (e: Event) => {
        const detail = (e as CustomEvent).detail ?? {};
        this._capture({
            error: detail.error,
            message: detail.error instanceof Error ? detail.error.message : String(detail.error ?? 'Component error'),
            stack: detail.error instanceof Error ? detail.error.stack : undefined,
            component: detail.component,
            route: detail.route,
            source: 'component',
        });
        e.stopPropagation();
    };

    private _onRouteError = (e: Event) => {
        const detail = (e as CustomEvent).detail ?? {};
        this._capture({
            error: detail.error,
            message: detail.error instanceof Error ? detail.error.message : String(detail.error ?? 'Route error'),
            stack: detail.error instanceof Error ? detail.error.stack : undefined,
            route: detail.route,
            source: 'route',
        });
    };

    private _onWindowError = (event: ErrorEvent) => {
        this._capture({
            error: event.error,
            message: event.message,
            stack: event.error instanceof Error ? event.error.stack : undefined,
            source: 'global',
        });
    };

    private _onUnhandledRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        this._capture({
            error: reason,
            message: reason instanceof Error ? reason.message : String(reason ?? 'Unhandled promise rejection'),
            stack: reason instanceof Error ? reason.stack : undefined,
            source: 'promise',
        });
    };

    template(): string {
        if (this._error !== null) {
            const mode = this.getAttribute('mode') ?? 'dev';
            const fallback = this.getAttribute('fallback') ?? 'Something went wrong';

            if (mode === 'dev') {
                return this._devTemplate(this._error);
            }

            return this._productionTemplate(fallback);
        }

        return html`
            <style>:host { display: contents; }</style>
            <slot></slot>
        `;
    }

    private _devTemplate(detail: NcErrorDetail): string {
        const source = detail.source ?? 'unknown';
        const sourceBadge: Record<string, string> = {
            component: '#7c3aed',
            route: '#2563eb',
            global: '#dc2626',
            promise: '#d97706',
            unknown: '#6b7280',
        };
        const badgeColor = sourceBadge[source] ?? sourceBadge.unknown;

        const stackLines = detail.stack
            ? detail.stack
                .split('\n')
                .slice(0, 12)
                .map(l => `<span class="stack-line">${this._escapeHtml(l)}</span>`)
                .join('\n')
            : '<span class="stack-line">(no stack available)</span>';

        return `
            <style>
                :host { display: block; }
                .eb {
                    font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
                    font-size: 0.875rem;
                    background: #0f0f0f;
                    color: #e5e5e5;
                    border: 1px solid #dc2626;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    margin: 1rem;
                }
                .eb__header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    background: #1a0000;
                    border-bottom: 1px solid #dc2626;
                }
                .eb__title {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #f87171;
                    margin: 0;
                    flex: 1;
                }
                .eb__badge {
                    font-size: 0.7rem;
                    font-weight: 600;
                    padding: 0.15rem 0.5rem;
                    border-radius: 999px;
                    color: #fff;
                    background: ${badgeColor};
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .eb__body { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
                .eb__message {
                    color: #fca5a5;
                    font-size: 1rem;
                    font-weight: 500;
                    word-break: break-word;
                }
                .eb__meta { display: flex; flex-wrap: wrap; gap: 0.5rem; }
                .eb__tag {
                    font-size: 0.75rem;
                    padding: 0.15rem 0.6rem;
                    border-radius: 0.25rem;
                    background: #1f1f1f;
                    color: #a3a3a3;
                    border: 1px solid #333;
                }
                .eb__tag span { color: #e5e5e5; }
                .eb__stack {
                    background: #111;
                    border: 1px solid #333;
                    border-radius: 0.375rem;
                    padding: 0.75rem 1rem;
                    overflow-x: auto;
                    max-height: 260px;
                    overflow-y: auto;
                }
                .stack-line {
                    display: block;
                    white-space: pre;
                    color: #a3a3a3;
                    line-height: 1.6;
                }
                .stack-line:first-child { color: #fbbf24; }
                .eb__footer {
                    padding: 0.75rem 1rem;
                    border-top: 1px solid #222;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .eb__mode-note { font-size: 0.75rem; color: #525252; }
                .eb__reset {
                    padding: 0.35rem 0.9rem;
                    font-size: 0.8rem;
                    font-family: inherit;
                    background: #1a1a1a;
                    color: #e5e5e5;
                    border: 1px solid #404040;
                    border-radius: 0.375rem;
                    cursor: pointer;
                }
                .eb__reset:hover { background: #262626; border-color: #525252; }
            </style>
            <div class="eb" role="alert">
                <div class="eb__header">
                    <p class="eb__title">Runtime Error</p>
                    <span class="eb__badge">${source}</span>
                </div>
                <div class="eb__body">
                    <p class="eb__message">${this._escapeHtml(detail.message)}</p>
                    <div class="eb__meta">
                        ${raw(detail.component ? `<div class="eb__tag">component <span>${this._escapeHtml(detail.component)}</span></div>` : '')}
                        ${raw(detail.route ? `<div class="eb__tag">route <span>${this._escapeHtml(detail.route)}</span></div>` : '')}
                        <div class="eb__tag">url <span>${this._escapeHtml(window.location.pathname)}</span></div>
                    </div>
                    <div class="eb__stack">${raw(stackLines)}</div>
                </div>
                <div class="eb__footer">
                    <span class="eb__mode-note">This panel is only visible in dev mode.</span>
                    <button class="eb__reset" type="button" data-action="reset">Try again</button>
                </div>
            </div>
        `;
    }

    private _productionTemplate(fallback: string): string {
        return `
            <style>
                :host { display: block; }
                .eb {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 60vh;
                    text-align: center;
                    padding: var(--spacing-xl, 2rem);
                    font-family: inherit;
                    color: var(--text-secondary, #6b7280);
                }
                .eb__title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary, #111827);
                    margin: 0 0 0.5rem;
                }
                .eb__sub { margin: 0 0 1.5rem; font-size: 0.95rem; }
                .eb__reset {
                    padding: 0.5rem 1.25rem;
                    font-size: 0.9rem;
                    font-family: inherit;
                    background: var(--primary, #2563eb);
                    color: #fff;
                    border: none;
                    border-radius: var(--radius-md, 0.5rem);
                    cursor: pointer;
                    font-weight: 500;
                }
                .eb__reset:hover { opacity: 0.9; }
            </style>
            <div class="eb" role="alert">
                <p class="eb__title">${this._escapeHtml(fallback)}</p>
                <p class="eb__sub">Please try again. If the problem persists, contact support.</p>
                <button class="eb__reset" type="button" data-action="reset">Try again</button>
            </div>
        `;
    }

    connectedCallback(): void {
        this._originalHTML = this.innerHTML;

        // Listen for bubbling component errors (light-DOM children)
        this.addEventListener('nativecore:component-error', this._onComponentError);

        // When placed at root, also catch router errors and global errors
        this._isRoot = this.parentElement?.tagName === 'BODY' || !this.closest('nc-error-boundary:not(:scope)');
        if (this._isRoot) {
            window.addEventListener('nativecore:route-error', this._onRouteError);
            window.addEventListener('error', this._onWindowError as EventListener);
            window.addEventListener('unhandledrejection', this._onUnhandledRejection);
        }

        super.connectedCallback();
    }

    onMount(): void {
        this.shadowRoot!.addEventListener('click', (e: Event) => {
            if ((e.target as HTMLElement).closest('[data-action="reset"]')) {
                this.reset();
            }
        });
    }

    onUnmount(): void {
        this.removeEventListener('nativecore:component-error', this._onComponentError);
        if (this._isRoot) {
            window.removeEventListener('nativecore:route-error', this._onRouteError);
            window.removeEventListener('error', this._onWindowError as EventListener);
            window.removeEventListener('unhandledrejection', this._onUnhandledRejection);
        }
        this._error = null;
    }

    catchError(error: unknown, meta: Partial<NcErrorDetail> = {}): void {
        this._capture({
            error,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            source: 'component',
            ...meta,
        });
    }

    reset(): void {
        this._error = null;
        this.innerHTML = this._originalHTML;
        this.render();
        this.emitEvent('nc-error-reset', {});
    }

    private _capture(detail: NcErrorDetail): void {
        this._error = detail;
        this.render();
        this.emitEvent('nc-error', detail);
    }

    private _escapeHtml(str: string): string {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

defineComponent('nc-error-boundary', NcErrorBoundary);


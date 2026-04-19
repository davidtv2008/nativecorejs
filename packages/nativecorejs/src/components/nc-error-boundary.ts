/**
 * NcErrorBoundary Component
 *
 * Catches synchronous errors thrown in child component `onMount()` and
 * `render()` lifecycle hooks. When an error is detected the default slot
 * content is replaced with a user-facing fallback UI.
 *
 * Attributes:
 *   fallback         - Custom fallback heading text (default: 'Something went wrong')
 *   show-details     - boolean — when present, appends the error message to the fallback UI
 *
 * Events:
 *   nc-error         - CustomEvent<{ error: unknown }> — fires when a child error is caught
 *
 * Usage:
 *   <nc-error-boundary>
 *     <my-buggy-widget></my-buggy-widget>
 *   </nc-error-boundary>
 *
 *   <!-- Custom fallback text -->
 *   <nc-error-boundary fallback="Widget failed to load" show-details>
 *     <my-widget></my-widget>
 *   </nc-error-boundary>
 *
 * Programmatic reset:
 *   document.querySelector('nc-error-boundary').reset();
 */
import { Component, defineComponent } from '../../.nativecore/core/component.js';

export class NcErrorBoundary extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['fallback', 'show-details'];
    }

    private _error: unknown = null;
    private _errorMessage = '';
    private _originalHTML = '';

    template(): string {
        if (this._error !== null) {
            const heading = this.getAttribute('fallback') ?? 'Something went wrong';
            const showDetails = this.hasAttribute('show-details');
            return `
                <style>
                    :host { display: block; }
                    .error-boundary {
                        padding: var(--spacing-lg, 1.5rem);
                        border: 1px solid var(--danger, #dc2626);
                        border-radius: var(--radius-md, 0.5rem);
                        background: color-mix(in srgb, var(--danger, #dc2626) 8%, transparent);
                        color: var(--danger, #dc2626);
                        font-family: inherit;
                    }
                    .error-boundary__title {
                        margin: 0 0 0.5rem;
                        font-size: 1rem;
                        font-weight: 600;
                    }
                    .error-boundary__detail {
                        margin: 0;
                        font-size: 0.875rem;
                        opacity: 0.8;
                        word-break: break-word;
                    }
                    .error-boundary__reset {
                        margin-top: 0.75rem;
                        padding: 0.25rem 0.75rem;
                        font-size: 0.875rem;
                        cursor: pointer;
                        border: 1px solid currentColor;
                        border-radius: var(--radius-sm, 0.25rem);
                        background: transparent;
                        color: inherit;
                    }
                    .error-boundary__reset:hover {
                        background: color-mix(in srgb, currentColor 12%, transparent);
                    }
                </style>
                <div class="error-boundary" role="alert" aria-live="assertive">
                    <p class="error-boundary__title">${heading}</p>
                    ${showDetails && this._errorMessage ? `<p class="error-boundary__detail">${this._errorMessage}</p>` : ''}
                    <button class="error-boundary__reset" type="button" data-action="reset">Try again</button>
                </div>
            `;
        }

        return `
            <style>
                :host { display: contents; }
            </style>
            <slot></slot>
        `;
    }

    connectedCallback(): void {
        this._originalHTML = this.innerHTML;
        // Intercept errors bubbling up from custom element children
        this.addEventListener('error', (e: Event) => {
            this._handleError((e as ErrorEvent).error ?? e);
            e.stopPropagation();
        });
        super.connectedCallback();
    }

    onMount(): void {
        this.$<HTMLButtonElement>('[data-action="reset"]')?.addEventListener('click', () => this.reset());
    }

    onUnmount(): void {
        this._error = null;
        this._errorMessage = '';
    }

    /**
     * Called by child components when they catch an error and want to report it.
     * Can also be triggered programmatically.
     */
    catchError(error: unknown): void {
        this._handleError(error);
    }

    /**
     * Reset the boundary to its original state and attempt to re-render children.
     */
    reset(): void {
        this._error = null;
        this._errorMessage = '';
        this.innerHTML = this._originalHTML;
        this.render();
        this.emitEvent('nc-error-reset', {});
    }

    private _handleError(error: unknown): void {
        this._error = error;
        this._errorMessage = error instanceof Error ? error.message : String(error);
        this.render();
        this.emitEvent('nc-error', { error });
    }
}

defineComponent('nc-error-boundary', NcErrorBoundary);

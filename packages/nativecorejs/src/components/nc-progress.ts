import { Component, defineComponent } from '../core/component.js';

export class NcProgress extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['value', 'max', 'variant', 'size', 'label', 'show-value', 'indeterminate', 'striped', 'animated'];
    }

    template() {
        const max = Number(this.getAttribute('max') || 100);
        const value = Math.min(max, Math.max(0, Number(this.getAttribute('value') || 0)));
        const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
        const variant = this.getAttribute('variant') || 'primary';
        const showValue = this.hasAttribute('show-value');
        const indeterminate = this.hasAttribute('indeterminate');
        const striped = this.hasAttribute('striped');
        const animated = this.hasAttribute('animated');
        const label = this.getAttribute('label') || `${percentage}%`;

        return `
            <style>
                :host { display: block; width: 100%; font-family: var(--nc-font-family); }

                .wrap { display: flex; align-items: center; gap: var(--nc-spacing-sm, 0.5rem); }

                .track {
                    flex: 1;
                    background: var(--nc-bg-tertiary, #e5e7eb);
                    border-radius: 999px;
                    overflow: hidden;
                    position: relative;
                }

                :host([size="xs"]) .track { height: 4px; }
                :host([size="sm"]) .track,
                :host .track { height: 6px; }
                :host([size="md"]) .track { height: 10px; }
                :host([size="lg"]) .track { height: 16px; }

                .bar {
                    height: 100%;
                    border-radius: 999px;
                    transition: width 0.4s ease;
                    width: ${indeterminate ? '40%' : `${percentage}%`};
                }

                .bar--primary { background: var(--nc-primary, #10b981); }
                .bar--success { background: var(--nc-success, #10b981); }
                .bar--warning { background: var(--nc-warning, #f59e0b); }
                .bar--danger { background: var(--nc-danger, #ef4444); }
                .bar--neutral { background: var(--nc-text-muted, #6b7280); }

                ${striped ? `
                .bar {
                    background-image: linear-gradient(
                        45deg,
                        rgba(255,255,255,.15) 25%,
                        transparent 25%,
                        transparent 50%,
                        rgba(255,255,255,.15) 50%,
                        rgba(255,255,255,.15) 75%,
                        transparent 75%,
                        transparent
                    );
                    background-size: 1rem 1rem;
                }` : ''}

                ${animated ? `
                @keyframes nc-progress-stripes {
                    from { background-position: 1rem 0; }
                    to { background-position: 0 0; }
                }
                .bar { animation: nc-progress-stripes 1s linear infinite; }` : ''}

                ${indeterminate ? `
                @keyframes nc-indeterminate {
                    0% { left: -40%; }
                    100% { left: 100%; }
                }
                .bar {
                    position: absolute;
                    animation: nc-indeterminate 1.4s ease infinite;
                }` : ''}

                .value-label {
                    font-size: var(--nc-font-size-xs, 0.75rem);
                    color: var(--nc-text-muted, #6b7280);
                    min-width: 2.8ch;
                    text-align: right;
                }
            </style>
            <div class="wrap">
                <div
                    class="track"
                    role="progressbar"
                    aria-label="${label}"
                    aria-valuenow="${indeterminate ? '' : value}"
                    aria-valuemin="0"
                    aria-valuemax="${max}"
                >
                    <div class="bar bar--${variant}"></div>
                </div>
                ${showValue && !indeterminate ? `<span class="value-label">${percentage}%</span>` : ''}
            </div>
        `;
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) this.render();
    }
}

defineComponent('nc-progress', NcProgress);

/**
 * NcProgressCircular Component
 *
 * Circular/ring progress indicator.
 *
 * Attributes:
 *   - value: number — 0–max (required; omit or set indeterminate for spinner)
 *   - max: number — maximum value (default: 100)
 *   - size: number|string — diameter in px, or CSS size string (default: 48)
 *   - thickness: number — stroke width in px (default: 4)
 *   - variant: 'primary'|'success'|'warning'|'danger'|'neutral' (default: 'primary')
 *   - show-value: boolean — display percentage in centre
 *   - indeterminate: boolean — animated spinner mode
 *   - label: string — aria-label override
 *
 * Usage:
 *   <nc-progress-circular value="72"></nc-progress-circular>
 *   <nc-progress-circular indeterminate size="32"></nc-progress-circular>
 *   <nc-progress-circular value="45" show-value variant="success" size="64"></nc-progress-circular>
 */

import { Component, defineComponent } from '@core/component.js';
import { html, trusted } from '@core-utils/templates.js';

const VARIANT_COLORS: Record<string, string> = {
    primary: 'var(--nc-primary)',
    success: 'var(--nc-success, #10b981)',
    warning: 'var(--nc-warning, #f59e0b)',
    danger:  'var(--nc-danger, #ef4444)',
    neutral: 'var(--nc-text-muted)',
};

export class NcProgressCircular extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['value', 'max', 'size', 'thickness', 'variant', 'show-value', 'indeterminate', 'label'];
    }

    template() {
        const max = Number(this.getAttribute('max') || 100);
        const value = Math.min(max, Math.max(0, Number(this.getAttribute('value') || 0)));
        const pct = max > 0 ? Math.round((value / max) * 100) : 0;
        const sizeAttr = this.getAttribute('size') || '48';
        const size = Number(sizeAttr) || 48;
        const thickness = Number(this.getAttribute('thickness') || 4);
        const variant = this.getAttribute('variant') || 'primary';
        const showValue = this.hasAttribute('show-value');
        const indeterminate = this.hasAttribute('indeterminate');
        const label = this.getAttribute('label') || (indeterminate ? 'Loading' : `${pct}%`);
        const color = VARIANT_COLORS[variant] ?? VARIANT_COLORS.primary;

        const r = (size - thickness) / 2;
        const circumference = 2 * Math.PI * r;
        const dashOffset = indeterminate ? circumference * 0.25 : circumference * (1 - pct / 100);
        const cx = size / 2;
        const cy = size / 2;
        const fontSize = Math.max(10, Math.round(size * 0.22));

        return html`
            <style>
                :host { display: inline-flex; align-items: center; justify-content: center; }

                svg { display: block; }

                .track { fill: none; stroke: var(--nc-bg-tertiary); }
                .fill  { fill: none; stroke: ${color}; stroke-linecap: round; transition: stroke-dashoffset 0.4s ease; }

                ${indeterminate ? `
                @keyframes nc-spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                svg { animation: nc-spin 1s linear infinite; transform-origin: center; }
                .fill { stroke-dashoffset: ${dashOffset}; }
                ` : ''}

                .label {
                    font-family: var(--nc-font-family);
                    font-size: ${fontSize}px;
                    font-weight: var(--nc-font-weight-semibold);
                    fill: var(--nc-text);
                    dominant-baseline: central;
                    text-anchor: middle;
                }
            </style>
            <svg
                width="${size}"
                height="${size}"
                viewBox="0 0 ${size} ${size}"
                role="progressbar"
                aria-label="${label}"
                aria-valuenow="${indeterminate ? '' : value}"
                aria-valuemin="0"
                aria-valuemax="${max}"
            >
                <circle
                    class="track"
                    cx="${cx}" cy="${cy}" r="${r}"
                    stroke-width="${thickness}"
                />
                <circle
                    class="fill"
                    cx="${cx}" cy="${cy}" r="${r}"
                    stroke-width="${thickness}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${dashOffset}"
                    transform="rotate(-90 ${cx} ${cy})"
                />
                ${trusted(showValue && !indeterminate ? `<text class="label" x="${cx}" y="${cy}">${pct}%</text>` : '')}
            </svg>
        `;
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) this.render();
    }
}

defineComponent('nc-progress-circular', NcProgressCircular);


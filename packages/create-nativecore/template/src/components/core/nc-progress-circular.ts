/**
 * NcProgressCircular Component
 *
 * Circular/ring progress indicator.
 *
 * Attributes:
 *   - value: number â€” 0â€“max (required; omit or set indeterminate for spinner)
 *   - max: number â€” maximum value (default: 100)
 *   - size: number|string â€” diameter in px, or CSS size string (default: 48)
 *   - thickness: number â€” stroke width in px (default: 4)
 *   - variant: 'primary'|'success'|'warning'|'danger'|'neutral' (default: 'primary')
 *   - show-value: boolean â€” display percentage in centre
 *   - indeterminate: boolean â€” animated spinner mode
 *   - label: string â€” aria-label override
 *
 * Usage:
 *   <nc-progress-circular value="72"></nc-progress-circular>
 *   <nc-progress-circular indeterminate size="32"></nc-progress-circular>
 *   <nc-progress-circular value="45" show-value variant="success" size="64"></nc-progress-circular>
 */

import { CoreComponent } from '@core/component.js';
import { css } from '@core-utils/templates.js';

const VARIANT_COLORS: Record<string, string> = {
    primary: 'var(--nc-primary)',
    success: 'var(--nc-success, #10b981)',
    warning: 'var(--nc-warning, #f59e0b)',
    danger:  'var(--nc-danger, #ef4444)',
    neutral: 'var(--nc-text-muted)',
};

export class NcProgressCircular extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['value', 'max', 'size', 'thickness', 'variant', 'show-value', 'indeterminate', 'label'];
    static attributeOptions = { variant: ['primary', 'success', 'warning', 'danger', 'neutral'] };
    static attributeOrder   = ['value', 'max', 'size', 'thickness', 'variant', 'show-value', 'indeterminate', 'label'];

    // -- Refs -----------------------------------------------------------------
    declare svgContainerEl: HTMLDivElement;

    static styles = css`
        :host { display: inline-flex; align-items: center; justify-content: center; }
        :host, :host([variant="primary"]) { --_color: var(--nc-primary); }
        :host([variant="success"])  { --_color: var(--nc-success, #10b981); }
        :host([variant="warning"])  { --_color: var(--nc-warning, #f59e0b); }
        :host([variant="danger"])   { --_color: var(--nc-danger, #ef4444); }
        :host([variant="neutral"])  { --_color: var(--nc-text-muted); }

        svg { display: block; }
        :host([indeterminate]) svg {
            animation: nc-spin 1s linear infinite;
            transform-origin: center;
        }
        @keyframes nc-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
        }
        .track { fill: none; stroke: var(--nc-bg-tertiary); }
        .fill  { fill: none; stroke: var(--_color); stroke-linecap: round; transition: stroke-dashoffset 0.4s ease; }
        .label {
            font-family: var(--nc-font-family);
            font-weight: var(--nc-font-weight-semibold);
            fill: var(--nc-text);
            dominant-baseline: central;
            text-anchor: middle;
        }
    `;

    template() {
        return `            <div ref="svgContainerEl"></div>
        `;
    }

    onMount() {
        this._syncFromAttrs();
    }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const max         = Number(this.getAttribute('max') || 100);
        const value       = Math.min(max, Math.max(0, Number(this.getAttribute('value') || 0)));
        const pct         = max > 0 ? Math.round((value / max) * 100) : 0;
        const size        = Number(this.getAttribute('size') || 48);
        const thickness   = Number(this.getAttribute('thickness') || 4);
        const showValue   = this.hasAttribute('show-value');
        const indeterminate = this.hasAttribute('indeterminate');
        const label       = this.getAttribute('label') || (indeterminate ? 'Loading' : `${pct}%`);

        const r           = (size - thickness) / 2;
        const circumference = 2 * Math.PI * r;
        const dashOffset  = indeterminate ? circumference * 0.25 : circumference * (1 - pct / 100);
        const cx = size / 2;
        const cy = size / 2;
        const fontSize    = Math.max(10, Math.round(size * 0.22));

        this.svgContainerEl.innerHTML = `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"
                 role="progressbar" aria-label="${label}"
                 aria-valuenow="${indeterminate ? '' : value}"
                 aria-valuemin="0" aria-valuemax="${max}">
                <circle class="track" cx="${cx}" cy="${cy}" r="${r}" stroke-width="${thickness}"/>
                <circle class="fill"  cx="${cx}" cy="${cy}" r="${r}" stroke-width="${thickness}"
                    stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
                    transform="rotate(-90 ${cx} ${cy})"/>
                ${showValue && !indeterminate ? `<text class="label" x="${cx}" y="${cy}" font-size="${fontSize}">${pct}%</text>` : ''}
            </svg>`;
    }
}

if (!customElements.get('nc-progress-circular')) customElements.define('nc-progress-circular', NcProgressCircular);

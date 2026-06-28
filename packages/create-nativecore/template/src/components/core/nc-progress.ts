/**
 * NcProgress Component
 *
 * Attributes:
 *   - value: number — current value (0-100, or 0-max)
 *   - max: number — maximum value (default: 100)
 *   - variant: 'primary'|'success'|'warning'|'danger'|'neutral' (default: 'primary')
 *   - size: 'xs'|'sm'|'md'|'lg' (default: 'sm')
 *   - label: string — accessible label
 *   - show-value: boolean — display percentage text
 *   - indeterminate: boolean — animated indeterminate state (no value needed)
 *   - striped: boolean — striped fill
 *   - animated: boolean — animates the stripes (requires striped)
 *
 * Usage:
 *   <nc-progress value="60"></nc-progress>
 *   <nc-progress value="30" variant="success" show-value></nc-progress>
 *   <nc-progress indeterminate></nc-progress>
 */

import { CoreComponent } from '@core/component.js';
import { css } from '@core-utils/templates.js';

export class NcProgress extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['value', 'max', 'variant', 'size', 'label', 'show-value', 'indeterminate', 'striped', 'animated'];
    static attributeOptions = {
        variant: ['primary', 'success', 'warning', 'danger', 'neutral'],
        size:    ['xs', 'sm', 'md', 'lg'],
    };
    static attributePlaceholders = { value: '60', max: '100', label: 'Loading...' };
    static attributeOrder = ['value', 'max', 'variant', 'size', 'label', 'show-value', 'indeterminate', 'striped', 'animated'];

    // -- Refs -----------------------------------------------------------------
    declare trackEl:      HTMLDivElement;
    declare barEl:        HTMLDivElement;
    declare valueLabelEl: HTMLSpanElement;

    static styles = css`
        :host { display: block; width: 100%; font-family: var(--nc-font-family); }
        .wrap { display: flex; align-items: center; gap: var(--nc-spacing-sm); }
        .track {
            flex: 1; background: var(--nc-bg-tertiary);
            border-radius: 999px; overflow: hidden; position: relative;
            height: 6px;
        }
        :host([size="xs"]) .track { height: 4px; }
        :host([size="md"]) .track { height: 10px; }
        :host([size="lg"]) .track { height: 16px; }
        .bar {
            height: 100%; border-radius: 999px;
            width: var(--progress-pct, 0%);
            transition: width 0.4s ease;
        }
        .bar--primary { background: var(--nc-primary); }
        .bar--success { background: var(--nc-success, #10b981); }
        .bar--warning { background: var(--nc-warning, #f59e0b); }
        .bar--danger  { background: var(--nc-danger,  #ef4444); }
        .bar--neutral { background: var(--nc-text-muted); }
        .bar.striped {
            background-image: linear-gradient(
                45deg,
                rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%,
                rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent
            );
            background-size: 1rem 1rem;
        }
        @keyframes nc-progress-stripes {
            from { background-position: 1rem 0; }
            to   { background-position: 0 0; }
        }
        .bar.striped.animated { animation: nc-progress-stripes 1s linear infinite; }
        @keyframes nc-indeterminate {
            0%   { left: -40%; }
            100% { left: 100%; }
        }
        .bar.indeterminate {
            position: absolute; width: 40%;
            animation: nc-indeterminate 1.4s ease infinite;
        }
        .value-label {
            font-size: var(--nc-font-size-xs); color: var(--nc-text-muted);
            min-width: 2.8ch; text-align: right;
        }
        [hidden] { display: none; }
    `;

    template() {
        return `            <div class="wrap">
                <div ref="trackEl" class="track" role="progressbar" aria-valuemin="0">
                    <div ref="barEl" class="bar bar--primary"></div>
                </div>
                <span ref="valueLabelEl" class="value-label" hidden></span>
            </div>
        `;
    }

    onMount() { this._syncFromAttrs(); }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const max           = Number(this.getAttribute('max') || 100);
        const value         = Math.min(max, Math.max(0, Number(this.getAttribute('value') || 0)));
        const pct           = max > 0 ? Math.round((value / max) * 100) : 0;
        const variant       = this.getAttribute('variant') || 'primary';
        const showValue     = this.hasAttribute('show-value');
        const indeterminate = this.hasAttribute('indeterminate');
        const striped       = this.hasAttribute('striped');
        const animated      = this.hasAttribute('animated');
        const label         = this.getAttribute('label') || `${pct}%`;

        this.style.setProperty('--progress-pct', indeterminate ? '40%' : `${pct}%`);

        this.barEl.className = [
            'bar',
            `bar--${variant}`,
            indeterminate ? 'indeterminate' : '',
            striped       ? 'striped'       : '',
            animated      ? 'animated'      : '',
        ].filter(Boolean).join(' ');

        this.trackEl.setAttribute('aria-label',    label);
        this.trackEl.setAttribute('aria-valuenow', indeterminate ? '' : String(value));
        this.trackEl.setAttribute('aria-valuemax', String(max));

        if (showValue && !indeterminate) {
            this.valueLabelEl.textContent = `${pct}%`;
            this.valueLabelEl.hidden = false;
        } else {
            this.valueLabelEl.hidden = true;
        }
    }
}

if (!customElements.get('nc-progress')) customElements.define('nc-progress', NcProgress);


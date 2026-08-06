/**
 * NcDivider Component
 *
 * Attributes:
 *   - orientation: 'horizontal' | 'vertical' (default: 'horizontal')
 *   - variant: 'solid' | 'dashed' | 'dotted' (default: 'solid')
 *   - label: string — optional centered label text
 *   - thickness: string — CSS border-width (default: '1px')
 *   - color: string — CSS color override
 *   - spacing: string — CSS margin override
 *
 * Usage:
 *   <nc-divider></nc-divider>
 *   <nc-divider label="or"></nc-divider>
 *   <nc-divider orientation="vertical"></nc-divider>
 *   <nc-divider variant="dashed" label="Settings"></nc-divider>
 */

import { CoreComponent } from '../../.nativecore/core/component.js';
import { css, html } from '../../.nativecore/utils/templates.js';

export class NcDivider extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['orientation', 'variant', 'label', 'thickness', 'color', 'spacing'];

    static attributeOptions = {
        orientation: ['horizontal', 'vertical'],
        variant: ['solid', 'dashed', 'dotted'],
    };

    static attributePlaceholders = {
        label: 'or',
        thickness: '2px',
        color: '#cccccc',
        spacing: '1.5rem 0',
    };

    static attributeOrder = ['orientation', 'variant', 'label', 'thickness', 'color', 'spacing'];

    // ── Refs ──────────────────────────────────────────────────────────────────
    declare dividerEl: HTMLDivElement;
    declare labelEl:   HTMLSpanElement;
    declare line2El:   HTMLSpanElement;

    // ── State ─────────────────────────────────────────────────────────────────
    private label         = this.state('');
    private isLabelHidden = this.state(true);

    static styles = css`
        :host {
            display: block;
            --_thickness: 1px;
            --_color: var(--nc-border);
            --_spacing: var(--nc-spacing-md) 0;
        }
        :host([orientation="vertical"]) {
            display: inline-flex;
            align-self: stretch;
            --_spacing: 0 var(--nc-spacing-md);
        }

        .divider {
            display: flex;
            align-items: center;
            margin: var(--_spacing);
            width: 100%;
            font-family: var(--nc-font-family);
        }
        :host([orientation="vertical"]) .divider {
            flex-direction: column;
            height: 100%;
            width: auto;
        }

        .line {
            flex: 1;
            height: 0;
            border: none;
            border-top: var(--_thickness) solid var(--_color);
        }
        :host([variant="dashed"]) .line { border-top-style: dashed; }
        :host([variant="dotted"]) .line { border-top-style: dotted; }

        :host([orientation="vertical"]) .line {
            height: auto;
            width: 0;
            border-top: none;
            border-left: var(--_thickness) solid var(--_color);
        }
        :host([orientation="vertical"][variant="dashed"]) .line { border-left-style: dashed; }
        :host([orientation="vertical"][variant="dotted"]) .line { border-left-style: dotted; }

        .label {
            padding: 0 var(--nc-spacing-sm);
            font-size: var(--nc-font-size-xs);
            color: var(--nc-text-muted);
            white-space: nowrap;
            font-weight: var(--nc-font-weight-medium);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        :host([orientation="vertical"]) .label { padding: var(--nc-spacing-sm) 0; }
    `;

    template() {
        return html`            <div ref="dividerEl" class="divider" role="separator" aria-orientation="horizontal">
                <span class="line"></span>
                <span ref="labelEl" class="label" hidden></span>
                <span ref="line2El" class="line"  hidden></span>
            </div>
        `;
    }

    onMount() {
        this.bind(this.label,         this.labelEl);
        this.bind(this.isLabelHidden, this.labelEl,  '?hidden');
        this.bind(this.isLabelHidden, this.line2El,  '?hidden');
        this._syncFromAttrs();
    }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const orientation = this.getAttribute('orientation') || 'horizontal';
        const label       = this.getAttribute('label') || '';
        const thickness   = this.getAttribute('thickness');
        const color       = this.getAttribute('color');
        const spacing     = this.getAttribute('spacing');

        this.label.value         = label;
        this.isLabelHidden.value = !label;
        this.dividerEl.setAttribute('aria-orientation', orientation);

        if (thickness) this.style.setProperty('--_thickness', thickness);
        else           this.style.removeProperty('--_thickness');

        if (color) this.style.setProperty('--_color', color);
        else       this.style.removeProperty('--_color');

        if (spacing) this.style.setProperty('--_spacing', spacing);
        else         this.style.removeProperty('--_spacing');
    }
}

if (!customElements.get('nc-divider')) customElements.define('nc-divider', NcDivider);


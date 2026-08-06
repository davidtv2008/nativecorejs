/**
 * NcStepper + NcStep Components
 *
 * Multi-step wizard with numbered step indicators.
 *
 * nc-stepper:
 *   - step: number — current step index (0-based, default: 0)
 *   - orientation: 'horizontal'|'vertical' (default: 'horizontal')
 *   - variant: 'default'|'simple' (default: 'default')
 *   - linear: boolean — prevent skipping ahead (default: false)
 *
 * nc-step:
 *   - label: string — step label
 *   - description: string — optional sub-label
 *   - status: 'complete'|'error'|'' — force a status icon (auto-set by stepper normally)
 *
 * Events (on nc-stepper):
 *   - change: CustomEvent<{ step: number; prev: number }>
 *
 * Methods (call on the element):
 *   stepper.next()
 *   stepper.prev()
 *   stepper.goTo(index)
 *
 * Usage:
 *   <nc-stepper id="wizard" step="0">
 *     <nc-step label="Account" description="Basic info"></nc-step>
 *     <nc-step label="Profile"></nc-step>
 *     <nc-step label="Review"></nc-step>
 *   </nc-stepper>
 *   <div id="wizard-content">Step 1 content...</div>
 */

import { CoreComponent } from '../../.nativecore/core/component.js';
import { css } from '../../.nativecore/utils/templates.js';

const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ERROR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 5v4M8 11v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

// ── NcStep ───────────────────────────────────────────────────────────────────

export class NcStep extends CoreComponent {
    static useShadowDOM = false; // light DOM — stepper queries children directly
    static observedAttributes = ['label', 'description', 'status'];
    static styles = css`
        :host { display: block; font-family: var(--nc-font-family); }

        /* ── Horizontal (default) ──────────────────────────── */
        .stepper { display: flex; flex-direction: row; gap: 0; }

        .step {
            display: flex; flex-direction: column; align-items: center;
            flex: 1; position: relative; cursor: pointer;
            gap: 6px; padding: 0 8px; outline: none;
        }
        .step:first-child { padding-left: 0; }
        .step:last-child  { padding-right: 0; }

        .step__text { display: flex; flex-direction: column; align-items: center; text-align: center; }

        .step__connector {
            position: absolute; background: var(--nc-border);
            transition: background var(--nc-transition-fast);
            top: 16px; left: calc(50% + 20px); right: calc(-50% + 20px); height: 2px;
        }

        /* ── Vertical override ─────────────────────────────── */
        :host([orientation="vertical"]) .stepper { flex-direction: column; }
        :host([orientation="vertical"]) .step {
            flex-direction: row; align-items: flex-start;
            flex: none; gap: var(--nc-spacing-sm); padding: var(--nc-spacing-sm) 0;
        }
        :host([orientation="vertical"]) .step__text { align-items: flex-start; text-align: left; }
        :host([orientation="vertical"]) .step__connector {
            top: 36px; left: 15px; width: 2px; height: calc(100% - 4px);
            right: auto;
        }

        /* ── Indicator ─────────────────────────────────────── */
        .step__indicator {
            width: 32px; height: 32px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: var(--nc-font-size-sm); font-weight: var(--nc-font-weight-semibold);
            flex-shrink: 0; border: 2px solid var(--nc-border);
            background: var(--nc-bg); color: var(--nc-text-muted);
            transition: background var(--nc-transition-fast), border-color var(--nc-transition-fast), color var(--nc-transition-fast);
            z-index: 1;
        }
        .step--active .step__indicator { border-color: var(--nc-primary); background: var(--nc-primary); color: #fff; }
        .step--done   .step__indicator { border-color: var(--nc-primary); background: var(--nc-primary); color: #fff; }
        .step--error  .step__indicator { border-color: var(--nc-danger, #ef4444); background: var(--nc-danger, #ef4444); color: #fff; }

        /* ── Labels ────────────────────────────────────────── */
        .step__label {
            font-size: var(--nc-font-size-sm); font-weight: var(--nc-font-weight-medium);
            color: var(--nc-text-muted); white-space: nowrap;
        }
        .step--active .step__label { color: var(--nc-text); font-weight: var(--nc-font-weight-semibold); }
        .step--done   .step__label { color: var(--nc-text); }
        .step--error  .step__label { color: var(--nc-danger, #ef4444); }
        .step__desc { font-size: var(--nc-font-size-xs); color: var(--nc-text-muted); white-space: nowrap; }

        /* ── Connector colour ──────────────────────────────── */
        .step--done   .step__connector,
        .step--active .step__connector { background: var(--nc-primary); }
    `;

    template() { return ''; }
}

if (!customElements.get('nc-step')) customElements.define('nc-step', NcStep);

// ── NcStepper ────────────────────────────────────────────────────────────────

export class NcStepper extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['step', 'orientation', 'variant', 'linear'];
    static attributeOptions = { orientation: ['horizontal', 'vertical'], variant: ['default', 'simple'] };
    static attributeOrder = ['step', 'orientation', 'variant', 'linear'];

    // -- Refs -----------------------------------------------------------------
    declare stepperEl: HTMLDivElement;

    private _getSteps(): NcStep[] {
        return Array.from(this.querySelectorAll<NcStep>('nc-step'));
    }

    template() {
        return `            <div ref="stepperEl" class="stepper" role="tablist"></div>
        `;
    }

    onMount() {
        this._syncFromAttrs();
        this.on(this.stepperEl, 'click', (e: MouseEvent) => {
            const stepEl = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');
            if (!stepEl) return;
            const index = Number(stepEl.dataset.index);
            const current = Number(this.getAttribute('step') || 0);
            if (this.hasAttribute('linear') && index > current) return;
            this.goTo(index);
        });
        this.on(this.stepperEl, 'keydown', (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); this.next(); }
            if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); this.prev(); }
            if (e.key === 'Home') this.goTo(0);
            if (e.key === 'End')  this.goTo(this._getSteps().length - 1);
        });
    }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const current = Number(this.getAttribute('step') || 0);
        const steps   = this._getSteps();
        const total   = steps.length;

        this.stepperEl.innerHTML = steps.map((step, i) => {
            const label        = step.getAttribute('label') || `Step ${i + 1}`;
            const desc         = step.getAttribute('description') || '';
            const forcedStatus = step.getAttribute('status') || '';
            const isDone       = forcedStatus === 'complete' || (!forcedStatus && i < current);
            const isError      = forcedStatus === 'error';
            const isActive     = i === current;

            let stateClass = 'step--pending';
            if (isActive) stateClass = 'step--active';
            else if (isDone) stateClass = 'step--done';
            else if (isError) stateClass = 'step--error';

            const iconContent = isDone ? CHECK_ICON : isError ? ERROR_ICON : String(i + 1);

            return `<div
                class="step ${stateClass}"
                data-index="${i}"
                role="tab"
                aria-selected="${isActive}"
                aria-label="Step ${i + 1}: ${label}"
                tabindex="${isActive ? '0' : '-1'}"
            >
                <div class="step__indicator">${iconContent}</div>
                <div class="step__text">
                    <span class="step__label">${label}</span>
                    ${desc ? `<span class="step__desc">${desc}</span>` : ''}
                </div>
                ${i < total - 1 ? `<div class="step__connector"></div>` : ''}
            </div>`;
        }).join('');
    }

    next() {
        const current = Number(this.getAttribute('step') || 0);
        this.goTo(Math.min(current + 1, this._getSteps().length - 1));
    }

    prev() {
        const current = Number(this.getAttribute('step') || 0);
        this.goTo(Math.max(current - 1, 0));
    }

    goTo(index: number) {
        const steps = this._getSteps();
        if (index < 0 || index >= steps.length) return;
        const prev = Number(this.getAttribute('step') || 0);
        if (index === prev) return;
        this.setAttribute('step', String(index));
        this.emit('change', { step: index, prev });
    }
}

if (!customElements.get('nc-stepper')) customElements.define('nc-stepper', NcStepper);


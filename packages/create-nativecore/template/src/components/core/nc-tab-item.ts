/**
 * NativeCore Tab Item Component (nc-tab-item)
 *
 * A single content panel inside an nc-tabs container.
 * Visibility is driven entirely by the `active` attribute set by the parent
 * nc-tabs — no JS show/hide logic required here.
 *
 * Attributes:
 *   label    — Text shown in the tab bar button (read by nc-tabs)
 *   active   — Boolean. Present = panel visible. Managed by nc-tabs.
 *   disabled — Boolean. Prevents the tab from being selected.
 *
 * Slots:
 *   default  — Any content for this panel.
 *
 * Usage:
 *   <nc-tabs>
 *     <nc-tab-item label="Overview">...</nc-tab-item>
 *     <nc-tab-item label="Settings">...</nc-tab-item>
 *     <nc-tab-item label="Logs" disabled>...</nc-tab-item>
 *   </nc-tabs>
 *
 * Events emitted:
 *   (none — nc-tabs owns all interaction events)
 */

import { Component, defineComponent } from '@core/component.js';
import { html } from '@utils/templates.js';

export class NcTabItem extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['label', 'active', 'disabled'];
    }

    template(): string {
        return html`
            <style>
                :host {
                    display: none;
                }

                :host([active]) {
                    display: block;
                }

                /* ── Animation variants driven by data-nc-transition set by nc-tabs ── */
                :host([active]) .panel {
                    animation: nc-tab-fade 250ms ease both;
                }

                :host([data-nc-transition="fade"][active]) .panel {
                    animation: nc-tab-fade 250ms ease both;
                }

                :host([data-nc-transition="slide-up"][active]) .panel {
                    animation: nc-tab-slide-up 300ms ease both;
                }

                :host([data-nc-transition="slide-right"][active]) .panel {
                    animation: nc-tab-slide-right 300ms ease both;
                }

                :host([data-nc-transition="slide-left"][active]) .panel {
                    animation: nc-tab-slide-left 300ms ease both;
                }

                :host([data-nc-transition="slide-down"][active]) .panel {
                    animation: nc-tab-slide-down 300ms ease both;
                }

                :host([data-nc-transition="none"][active]) .panel {
                    animation: none;
                }

                /* ── Keyframes ───────────────────────────────────────────────── */
                @keyframes nc-tab-fade {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }

                @keyframes nc-tab-slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                @keyframes nc-tab-slide-right {
                    from { opacity: 0; transform: translateX(-24px); }
                    to   { opacity: 1; transform: translateX(0); }
                }

                @keyframes nc-tab-slide-left {
                    from { opacity: 0; transform: translateX(24px); }
                    to   { opacity: 1; transform: translateX(0); }
                }

                @keyframes nc-tab-slide-down {
                    from { opacity: 0; transform: translateY(-20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .panel {
                    box-sizing: border-box;
                    padding: var(--nc-spacing-lg);
                    background: var(--nc-bg-secondary);
                    border-radius: var(--nc-radius-lg);
                }

                @media (max-width: 640px) {
                    .panel {
                        padding: var(--nc-spacing-sm);
                        border-radius: var(--nc-radius-md);
                    }
                }
            </style>
            <div class="panel"><slot></slot></div>
        `;
    }

    /**
     * Override to suppress re-renders — :host([active]) CSS handles show/hide,
     * and label/disabled changes are handled by nc-tabs rebuilding its bar.
     * A full re-render would needlessly flash slot content on every tab click.
     */
    attributeChangedCallback(
        _name: string,
        _oldValue: string | null,
        _newValue: string | null
    ): void {
        // intentionally empty — CSS selectors handle all visual state
    }

    onMount(): void {}
    onUnmount(): void {}
}

defineComponent('nc-tab-item', NcTabItem);

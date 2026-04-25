import { Component, defineComponent } from "@core/component.js";
import { html } from "@core-utils/templates.js";
class NcTabItem extends Component {
  static useShadowDOM = true;
  static get observedAttributes() {
    return ["label", "active", "disabled"];
  }
  template() {
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
  attributeChangedCallback(_name, _oldValue, _newValue) {
  }
  onMount() {
  }
  onUnmount() {
  }
}
defineComponent("nc-tab-item", NcTabItem);
export {
  NcTabItem
};

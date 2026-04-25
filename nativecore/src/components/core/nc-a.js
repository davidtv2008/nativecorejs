import { Component, defineComponent } from "@core/component.js";
import router from "@core/router.js";
import { html } from "@core-utils/templates.js";
class NcA extends Component {
  static useShadowDOM = true;
  static attributeOptions = {
    variant: [
      "primary",
      "secondary",
      "success",
      "danger",
      "warning",
      "info",
      "outline",
      "ghost",
      "link",
      "hero-primary",
      "hero-ghost"
    ],
    size: ["sm", "md", "lg"]
  };
  static get observedAttributes() {
    return ["href", "variant", "size", "disabled", "target"];
  }
  _onClick = null;
  template() {
    const href = this.attr("href", "#");
    const disabled = this.hasAttribute("disabled");
    const target = this.attr("target", "");
    const targetAttr = target ? `target="${target}" rel="noopener noreferrer"` : "";
    return html`
            <style>
                :host {
                    display: inline-block;
                    width: var(--nc-a-host-width, auto);
                }

                a {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--nc-spacing-xs);
                    font-family: var(--nc-font-family);
                    font-weight: var(--nc-font-weight-semibold);
                    text-decoration: none;
                    border: none;
                    border-radius: var(--nc-radius-md);
                    cursor: pointer;
                    transition:
                        background var(--nc-transition-fast),
                        color var(--nc-transition-fast),
                        box-shadow var(--nc-transition-fast),
                        transform var(--nc-transition-fast),
                        border-color var(--nc-transition-fast);
                    white-space: nowrap;
                    user-select: none;
                    box-sizing: border-box;
                    outline: none;
                    width: var(--nc-a-width, auto);

                    /* default size: md */
                    padding: var(--nc-spacing-sm) var(--nc-spacing-xl);
                    font-size: var(--nc-font-size-base);
                    min-height: 40px;

                    /* default variant: primary */
                    background: var(--nc-primary);
                    color: var(--nc-white);
                }

                a:focus-visible {
                    outline: 2px solid var(--nc-primary);
                    outline-offset: 2px;
                }

                /* ── Sizes ─────────────────────────────────────────────────── */
                :host([size="sm"]) a {
                    padding: var(--nc-spacing-xs) var(--nc-spacing-lg);
                    font-size: var(--nc-font-size-sm);
                    min-height: 32px;
                }

                :host([size="lg"]) a {
                    padding: var(--nc-spacing-md) var(--nc-spacing-2xl);
                    font-size: var(--nc-font-size-lg);
                    min-height: 48px;
                }

                /* ── Variants ──────────────────────────────────────────────── */
                :host([variant="primary"]) a {
                    background: var(--nc-primary);
                    color: var(--nc-white);
                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
                }
                :host([variant="primary"]) a:hover {
                    background: var(--nc-primary-dark);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                }

                :host([variant="secondary"]) a {
                    background: var(--nc-gray-200);
                    color: var(--nc-text);
                }
                :host([variant="secondary"]) a:hover {
                    background: var(--nc-gray-300);
                    transform: translateY(-1px);
                }

                :host([variant="success"]) a {
                    background: var(--nc-success);
                    color: var(--nc-white);
                    box-shadow: var(--nc-shadow-success);
                }
                :host([variant="success"]) a:hover {
                    background: var(--nc-success-dark);
                    transform: translateY(-1px);
                }

                :host([variant="danger"]) a {
                    background: var(--nc-danger);
                    color: var(--nc-white);
                    box-shadow: var(--nc-shadow-danger);
                }
                :host([variant="danger"]) a:hover {
                    background: var(--nc-danger-dark);
                    transform: translateY(-1px);
                }

                :host([variant="warning"]) a {
                    background: var(--nc-warning);
                    color: var(--nc-white);
                }
                :host([variant="warning"]) a:hover {
                    background: var(--nc-warning-dark);
                    transform: translateY(-1px);
                }

                :host([variant="info"]) a {
                    background: var(--nc-info);
                    color: var(--nc-white);
                }
                :host([variant="info"]) a:hover {
                    background: var(--nc-info-dark);
                    transform: translateY(-1px);
                }

                :host([variant="outline"]) a {
                    background: transparent;
                    color: var(--nc-primary);
                    border: 2px solid var(--nc-primary);
                }
                :host([variant="outline"]) a:hover {
                    background: var(--nc-primary);
                    color: var(--nc-white);
                    transform: translateY(-1px);
                }

                :host([variant="ghost"]) a {
                    background: transparent;
                    color: var(--nc-text);
                    border: 2px solid var(--nc-border-dark);
                }
                :host([variant="ghost"]) a:hover {
                    background: var(--nc-bg-tertiary);
                    transform: translateY(-1px);
                }

                :host([variant="link"]) a {
                    background: transparent;
                    color: var(--nc-primary);
                    padding-left: 0;
                    padding-right: 0;
                    min-height: unset;
                    text-decoration: underline;
                    text-underline-offset: 3px;
                }
                :host([variant="link"]) a:hover {
                    color: var(--nc-primary-dark);
                }

                /* ── Hero variants (landing page CTA style) ─────────────────── */
                :host([variant="hero-primary"]) a {
                    background: var(--nc-primary);
                    color: var(--nc-white);
                    padding: var(--nc-spacing-md) var(--nc-spacing-2xl);
                    font-size: var(--nc-font-size-lg);
                    min-height: 52px;
                    border-radius: var(--nc-radius-full);
                    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
                }
                :host([variant="hero-primary"]) a:hover {
                    background: var(--nc-primary-dark);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 28px rgba(16, 185, 129, 0.5);
                }

                :host([variant="hero-ghost"]) a {
                    background: transparent;
                    color: var(--nc-white);
                    padding: var(--nc-spacing-md) var(--nc-spacing-2xl);
                    font-size: var(--nc-font-size-lg);
                    min-height: 52px;
                    border-radius: var(--nc-radius-full);
                    border: 2px solid rgba(255, 255, 255, 0.4);
                }
                :host([variant="hero-ghost"]) a:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.7);
                    transform: translateY(-2px);
                }

                /* ── Disabled ────────────────────────────────────────────────── */
                :host([disabled]) a {
                    opacity: 0.45;
                    cursor: not-allowed;
                    pointer-events: none;
                    transform: none !important;
                    box-shadow: none !important;
                }
            </style>
            <a href="${href}" ${targetAttr} aria-disabled="${disabled}" role="link">
                <slot></slot>
            </a>
        `;
  }
  onMount() {
    this._onClick = (e) => {
      if (this.hasAttribute("disabled")) {
        e.preventDefault();
        return;
      }
      const href = this.attr("href", "");
      const target = this.attr("target", "");
      if (!href) return;
      if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#") || target === "_blank") {
        return;
      }
      e.preventDefault();
      const cancelled = !this.emitEvent("nc-navigate", { href }, { cancelable: true });
      if (cancelled) return;
      router.navigate(href);
    };
    this.shadowRoot.addEventListener("click", this._onClick);
  }
  onUnmount() {
    if (this._onClick) {
      this.shadowRoot?.removeEventListener("click", this._onClick);
      this._onClick = null;
    }
  }
  attributeChangedCallback(_name, oldValue, newValue) {
    if (this._mounted && oldValue !== newValue) {
      this.render();
    }
  }
}
defineComponent("nc-a", NcA);
export {
  NcA
};

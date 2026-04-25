import { Component, defineComponent } from "@core/component.js";
import { html } from "@core-utils/templates.js";
class NcBreadcrumb extends Component {
  static useShadowDOM = true;
  static get observedAttributes() {
    return ["separator"];
  }
  template() {
    return html`
            <style>
                :host { display: block; font-family: var(--nc-font-family); }

                nav { display: flex; align-items: center; flex-wrap: wrap; gap: 2px; }

                .sep {
                    color: var(--nc-text-muted);
                    font-size: var(--nc-font-size-sm);
                    padding: 0 4px;
                    user-select: none;
                }

                ::slotted(*) {
                    font-size: var(--nc-font-size-sm);
                    color: var(--nc-text-muted);
                    text-decoration: none;
                    white-space: nowrap;
                }

                ::slotted(*:last-child) {
                    color: var(--nc-text);
                    font-weight: var(--nc-font-weight-medium);
                    pointer-events: none;
                }

                ::slotted(*:not(:last-child):hover) {
                    color: var(--nc-primary);
                }
            </style>
            <nav aria-label="Breadcrumb">
                <slot></slot>
            </nav>
        `;
  }
  onMount() {
    this._insertSeparators();
    const observer = new MutationObserver(() => this._insertSeparators());
    observer.observe(this, { childList: true });
    this._breadcrumbObserver = observer;
  }
  onUnmount() {
    this._breadcrumbObserver?.disconnect();
  }
  _insertSeparators() {
    const sep = this.getAttribute("separator") || "/";
    const existing = Array.from(this.querySelectorAll(".nc-breadcrumb-sep"));
    existing.forEach((s) => s.remove());
    const children = Array.from(this.children).filter(
      (el) => !el.classList.contains("nc-breadcrumb-sep")
    );
    children.slice(0, -1).forEach((child) => {
      const span = document.createElement("span");
      span.className = "nc-breadcrumb-sep";
      span.setAttribute("aria-hidden", "true");
      span.textContent = sep;
      child.after(span);
    });
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._mounted) {
      this._insertSeparators();
    }
  }
}
defineComponent("nc-breadcrumb", NcBreadcrumb);
export {
  NcBreadcrumb
};

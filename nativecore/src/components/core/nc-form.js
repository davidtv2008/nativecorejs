import { Component, defineComponent } from "@core/component.js";
import { html, trusted } from "@core-utils/templates.js";
class NcField extends Component {
  static useShadowDOM = true;
  static get observedAttributes() {
    return ["label", "for", "required", "hint", "error"];
  }
  template() {
    const label = this.getAttribute("label") || "";
    const forAttr = this.getAttribute("for") || "";
    const required = this.hasAttribute("required");
    const hint = this.getAttribute("hint") || "";
    const error = this.getAttribute("error") || "";
    return html`
            <style>
                :host { display: block; font-family: var(--nc-font-family); }

                .field { display: flex; flex-direction: column; gap: 4px; }

                label {
                    font-size: var(--nc-font-size-sm);
                    font-weight: var(--nc-font-weight-medium);
                    color: var(--nc-text);
                    cursor: ${forAttr ? "pointer" : "default"};
                }

                .required {
                    color: var(--nc-danger, #ef4444);
                    margin-left: 2px;
                }

                .subtext {
                    font-size: var(--nc-font-size-xs);
                    line-height: 1.4;
                }
                .subtext--hint  { color: var(--nc-text-muted); }
                .subtext--error { color: var(--nc-danger, #ef4444); }
            </style>
            <div class="field">
                ${trusted(label ? `
                <label ${forAttr ? `for="${forAttr}"` : ""}>
                    ${label}${required ? `<span class="required" aria-hidden="true">*</span>` : ""}
                </label>` : "")}
                <slot></slot>
                ${trusted(error ? `<span class="subtext subtext--error" role="alert">${error}</span>` : hint ? `<span class="subtext subtext--hint">${hint}</span>` : "")}
            </div>
        `;
  }
  setError(msg) {
    if (msg) this.setAttribute("error", msg);
    else this.removeAttribute("error");
  }
  clearError() {
    this.removeAttribute("error");
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._mounted) this.render();
  }
}
defineComponent("nc-field", NcField);
const FORM_CONTROLS = [
  "nc-input",
  "nc-textarea",
  "nc-select",
  "nc-checkbox",
  "nc-radio",
  "nc-switch",
  "nc-slider",
  "nc-rating",
  "nc-number-input",
  "nc-autocomplete",
  "nc-date-picker",
  "nc-time-picker",
  "nc-color-picker",
  "input",
  "textarea",
  "select"
];
class NcForm extends Component {
  static useShadowDOM = true;
  _submitHandler = this._onSubmit.bind(this);
  _keydownHandler = (e) => {
    const ke = e;
    const target = ke.target;
    if (ke.key === "Enter" && target.tagName !== "TEXTAREA") {
      this._handleSubmit();
    }
  };
  _clickHandler = (e) => {
    const btn = e.target.closest('[type="submit"], nc-button[type="submit"]');
    if (btn && this.contains(btn)) {
      e.preventDefault();
      this._handleSubmit();
    }
  };
  template() {
    return `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }
            </style>
            <slot></slot>
        `;
  }
  connectedCallback() {
    super.connectedCallback?.();
    this.addEventListener("submit", this._submitHandler);
    this.addEventListener("keydown", this._keydownHandler);
    this.addEventListener("click", this._clickHandler);
  }
  disconnectedCallback() {
    this.removeEventListener("submit", this._submitHandler);
    this.removeEventListener("keydown", this._keydownHandler);
    this.removeEventListener("click", this._clickHandler);
    super.disconnectedCallback?.();
  }
  _onSubmit(e) {
    const customEvent = e;
    if (customEvent.detail?.values) {
      return;
    }
    e.preventDefault();
    this._handleSubmit();
  }
  _handleSubmit() {
    if (!this.hasAttribute("novalidate")) {
      const valid = this.validate();
      if (!valid) return;
    }
    const values = this.getValues();
    this.dispatchEvent(new CustomEvent("submit", {
      bubbles: true,
      composed: true,
      detail: { values }
    }));
  }
  getValues() {
    const result = {};
    FORM_CONTROLS.forEach((tag) => {
      this.querySelectorAll(tag).forEach((el) => {
        const name = el.getAttribute("name");
        if (!name) return;
        if (tag === "nc-checkbox" || tag === "nc-switch") {
          result[name] = el.hasAttribute("checked") ? "true" : "false";
        } else {
          const controlWithValue = el;
          result[name] = controlWithValue.value ?? el.getAttribute("value") ?? el.value ?? "";
        }
      });
    });
    return result;
  }
  validate() {
    let valid = true;
    const invalidFields = [];
    this.querySelectorAll("nc-field").forEach((field) => {
      const ctrl = FORM_CONTROLS.map((tag) => field.querySelector(tag)).find(Boolean);
      if (!ctrl) return;
      const name = ctrl.getAttribute("name") || "";
      const value = ctrl.value ?? ctrl.getAttribute("value") ?? ctrl.value ?? "";
      const isRequired = field.hasAttribute("required") || ctrl.hasAttribute("required");
      if (isRequired && !String(value).trim()) {
        valid = false;
        field.setError("This field is required.");
        invalidFields.push(name);
        ctrl.clearValidationError?.();
        return;
      }
      if (typeof ctrl.checkValidity === "function" && !ctrl.checkValidity()) {
        valid = false;
        field.setError(
          typeof ctrl.getValidationMessage === "function" ? ctrl.getValidationMessage() : "Enter a valid value."
        );
        invalidFields.push(name);
        ctrl.clearValidationError?.();
        return;
      }
      field.clearError();
      ctrl.clearValidationError?.();
    });
    FORM_CONTROLS.forEach((tag) => {
      this.querySelectorAll(tag).forEach((ctrl) => {
        if (ctrl.closest("nc-field")) return;
        const element = ctrl;
        if (typeof element.validate === "function") {
          const isValid = element.validate();
          if (!isValid) {
            valid = false;
            const name = ctrl.getAttribute("name");
            if (name) invalidFields.push(name);
          }
          return;
        }
        if (typeof element.checkValidity === "function" && !element.checkValidity()) {
          valid = false;
          const name = ctrl.getAttribute("name");
          if (name) invalidFields.push(name);
          return;
        }
        element.clearValidationError?.();
      });
    });
    if (!valid) {
      this.dispatchEvent(new CustomEvent("invalid", {
        bubbles: true,
        composed: true,
        detail: { fields: Array.from(new Set(invalidFields)) }
      }));
    }
    return valid;
  }
  reset() {
    FORM_CONTROLS.forEach((tag) => {
      this.querySelectorAll(tag).forEach((el) => {
        el.setAttribute("value", "");
        if (tag === "nc-checkbox" || tag === "nc-switch") el.removeAttribute("checked");
      });
    });
    this.querySelectorAll("nc-field").forEach((f) => f.clearError());
  }
  attributeChangedCallback(_name, _oldValue, _newValue) {
  }
}
defineComponent("nc-form", NcForm);
export {
  NcField,
  NcForm
};

import { computed, useState } from "@core/state.js";
import { validateForm } from "@utils/validation.js";
function useForm(options) {
  const initialSnapshot = { ...options.initialValues };
  const fields = {};
  const touched = {};
  const dirty = {};
  for (const [key, value] of Object.entries(options.initialValues)) {
    const typedKey = key;
    fields[typedKey] = useState(value);
    touched[typedKey] = useState(false);
    dirty[typedKey] = useState(false);
  }
  const errors = computed(() => validateForm(getValues(), options.rules ?? {}));
  const isDirty = computed(() => Object.values(dirty).some((flag) => flag.value));
  const isValid = computed(() => Object.keys(errors.value).length === 0);
  return {
    fields,
    touched,
    dirty,
    errors,
    isDirty,
    isValid,
    getValues,
    reset,
    markAsPristine,
    bindField,
    submit
  };
  function getValues() {
    const values = {};
    for (const key of Object.keys(fields)) {
      values[key] = fields[key].value;
    }
    return values;
  }
  function reset(values = {}) {
    for (const key of Object.keys(fields)) {
      const nextValue = key in values ? values[key] : initialSnapshot[key];
      fields[key].value = nextValue;
      touched[key].value = false;
      dirty[key].value = false;
    }
  }
  function markAsPristine() {
    for (const key of Object.keys(fields)) {
      touched[key].value = false;
      dirty[key].value = false;
    }
  }
  function bindField(fieldName, target) {
    const element = resolveFieldElement(target);
    if (!element) return () => {
    };
    syncElementFromState(fieldName, element);
    const inputHandler = () => {
      fields[fieldName].value = readElementValue(element);
      touched[fieldName].value = true;
      dirty[fieldName].value = !Object.is(fields[fieldName].value, initialSnapshot[fieldName]);
    };
    const blurHandler = () => {
      touched[fieldName].value = true;
    };
    const eventName = getBindingEventName(element);
    element.addEventListener(eventName, inputHandler);
    element.addEventListener("blur", blurHandler);
    return () => {
      element.removeEventListener(eventName, inputHandler);
      element.removeEventListener("blur", blurHandler);
    };
  }
  function submit(handler) {
    return async (event) => {
      event?.preventDefault();
      for (const key of Object.keys(touched)) {
        touched[key].value = true;
      }
      if (!isValid.value) {
        return false;
      }
      await handler(getValues());
      markAsPristine();
      return true;
    };
  }
  function syncElementFromState(fieldName, element) {
    const value = fields[fieldName].value;
    if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
      element.checked = Boolean(value);
      return;
    }
    element.value = value == null ? "" : String(value);
  }
}
function resolveFieldElement(target) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return element;
  }
  return null;
}
function getBindingEventName(element) {
  if (element instanceof HTMLSelectElement) {
    return "change";
  }
  if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
    return "change";
  }
  return "input";
}
function readElementValue(element) {
  if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
    return element.checked;
  }
  return element.value;
}
export {
  useForm
};

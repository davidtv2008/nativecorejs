/**
 * `useForm()` — reactive form helper for NativeCoreJS.
 *
 * Manages field values, dirty/touched flags, derived errors, validity,
 * submission, and DOM binding for native inputs and `<nc-*>` form
 * components in a single object.
 *
 * Validators come from `./validators.js`; each validator returns either
 * `null` (valid) or a message string (invalid).
 */
import { computed, useState } from './state.js';
import type { ComputedState, State } from './state.js';
import type { Validator } from './validators.js';

type FormValues = Record<string, unknown>;
type FieldStates<T extends FormValues> = { [K in keyof T]: State<T[K]> };
type FieldFlags<T extends FormValues> = { [K in keyof T]: State<boolean> };
type ValidationRules<T extends FormValues> = Partial<{ [K in keyof T]: Validator<T[K]>[] }>;

export interface UseFormOptions<T extends FormValues> {
    initialValues: T;
    rules?: ValidationRules<T>;
    /** Called once before submit when the form is valid; rejects to abort submit. */
    onSubmit?: (values: T) => void | Promise<void>;
}

export interface UseFormResult<T extends FormValues> {
    fields: FieldStates<T>;
    touched: FieldFlags<T>;
    dirty: FieldFlags<T>;
    errors: ComputedState<Record<string, string>>;
    isDirty: ComputedState<boolean>;
    isValid: ComputedState<boolean>;
    isSubmitting: State<boolean>;
    getValues(): T;
    setValue<K extends keyof T>(field: K, value: T[K]): void;
    reset(values?: Partial<T>): void;
    markAllTouched(): void;
    bindField<K extends keyof T>(field: K, target: string | HTMLElement | null): () => void;
    handleSubmit(handler?: (values: T) => void | Promise<void>): (event?: Event) => Promise<boolean>;
}

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement;

function readControlValue(el: FormControl): unknown {
    if (el instanceof HTMLInputElement) {
        if (el.type === 'checkbox') return el.checked;
        if (el.type === 'radio') return el.checked ? el.value : undefined;
        if (el.type === 'number' || el.type === 'range') return el.value === '' ? '' : Number(el.value);
        return el.value;
    }
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        return el.value;
    }
    // Custom element (e.g. nc-input, nc-switch). Prefer `.checked` for switches.
    const anyEl = el as HTMLElement & { checked?: unknown; value?: unknown };
    if (typeof anyEl.checked === 'boolean') return anyEl.checked;
    return anyEl.value ?? '';
}

function writeControlValue(el: FormControl, value: unknown): void {
    if (el instanceof HTMLInputElement) {
        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = Boolean(value);
        } else {
            el.value = value == null ? '' : String(value);
        }
        return;
    }
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        el.value = value == null ? '' : String(value);
        return;
    }
    const anyEl = el as HTMLElement & { checked?: unknown; value?: unknown };
    if (typeof anyEl.checked === 'boolean') anyEl.checked = Boolean(value);
    else anyEl.value = value == null ? '' : String(value);
}

function controlEventName(el: FormControl): string {
    if (el instanceof HTMLSelectElement) return 'change';
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) return 'change';
    return 'input';
}

export function useForm<T extends FormValues>(options: UseFormOptions<T>): UseFormResult<T> {
    const initialSnapshot = { ...options.initialValues } as T;

    const fields = {} as FieldStates<T>;
    const touched = {} as FieldFlags<T>;
    const dirty = {} as FieldFlags<T>;

    for (const key of Object.keys(options.initialValues) as Array<keyof T>) {
        fields[key] = useState(options.initialValues[key]);
        touched[key] = useState(false);
        dirty[key] = useState(false);
    }

    const isSubmitting = useState(false);

    const errors = computed(() => {
        const result: Record<string, string> = {};
        const rules: ValidationRules<T> = options.rules ?? ({} as ValidationRules<T>);
        for (const key of Object.keys(fields) as Array<keyof T>) {
            const fieldRules = rules[key];
            if (!fieldRules || fieldRules.length === 0) continue;
            const value = fields[key].value;
            for (const validator of fieldRules) {
                const message = validator(value);
                if (message) {
                    result[key as string] = message;
                    break;
                }
            }
        }
        return result;
    });

    const isDirty = computed(() => Object.values(dirty).some(flag => flag.value));
    const isValid = computed(() => Object.keys(errors.value).length === 0);

    function getValues(): T {
        const out = {} as T;
        for (const key of Object.keys(fields) as Array<keyof T>) {
            out[key] = fields[key].value;
        }
        return out;
    }

    function setValue<K extends keyof T>(field: K, value: T[K]): void {
        fields[field].value = value;
        dirty[field].value = !Object.is(value, initialSnapshot[field]);
    }

    function reset(values: Partial<T> = {}): void {
        for (const key of Object.keys(fields) as Array<keyof T>) {
            fields[key].value = (key in values ? values[key] : initialSnapshot[key]) as T[keyof T];
            touched[key].value = false;
            dirty[key].value = false;
        }
    }

    function markAllTouched(): void {
        for (const key of Object.keys(touched) as Array<keyof T>) {
            touched[key].value = true;
        }
    }

    function bindField<K extends keyof T>(field: K, target: string | HTMLElement | null): () => void {
        const element = typeof target === 'string'
            ? document.querySelector<HTMLElement>(target)
            : target;
        if (!element) return () => {};

        writeControlValue(element as FormControl, fields[field].value);

        const eventName = controlEventName(element as FormControl);
        const onInputEvt = () => {
            const next = readControlValue(element as FormControl) as T[K];
            fields[field].value = next;
            dirty[field].value = !Object.is(next, initialSnapshot[field]);
        };
        const onBlur = () => { touched[field].value = true; };

        element.addEventListener(eventName, onInputEvt);
        element.addEventListener('blur', onBlur);

        return () => {
            element.removeEventListener(eventName, onInputEvt);
            element.removeEventListener('blur', onBlur);
        };
    }

    function handleSubmit(handler?: (values: T) => void | Promise<void>): (event?: Event) => Promise<boolean> {
        return async (event?: Event) => {
            event?.preventDefault();
            markAllTouched();
            if (!isValid.value) return false;
            const cb = handler ?? options.onSubmit;
            if (!cb) return true;
            try {
                isSubmitting.value = true;
                await cb(getValues());
                return true;
            } finally {
                isSubmitting.value = false;
            }
        };
    }

    return {
        fields,
        touched,
        dirty,
        errors,
        isDirty,
        isValid,
        isSubmitting,
        getValues,
        setValue,
        reset,
        markAllTouched,
        bindField,
        handleSubmit,
    };
}

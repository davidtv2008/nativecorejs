import { computed, useState } from '@core/state.js';
import type { ComputedState, State } from '@core/state.js';
import { validateForm } from '@utils/validation.js';

type Validator = (value: any) => boolean;
type FieldStates<T extends Record<string, any>> = { [K in keyof T]: State<T[K]> };
type FieldFlags<T extends Record<string, any>> = { [K in keyof T]: State<boolean> };
type ValidationRules<T extends Record<string, any>> = Partial<Record<keyof T, Validator[]>>;

export interface UseFormOptions<T extends Record<string, any>> {
    initialValues: T;
    rules?: ValidationRules<T>;
}

export interface UseFormResult<T extends Record<string, any>> {
    fields: FieldStates<T>;
    touched: FieldFlags<T>;
    dirty: FieldFlags<T>;
    errors: ComputedState<Record<string, string>>;
    isDirty: ComputedState<boolean>;
    isValid: ComputedState<boolean>;
    getValues(): T;
    reset(values?: Partial<T>): void;
    markAsPristine(): void;
    bindField<K extends keyof T>(fieldName: K, target: string | HTMLElement): () => void;
    submit(handler: (values: T) => void | Promise<void>): (event?: Event) => Promise<boolean>;
}

export function useForm<T extends Record<string, any>>(options: UseFormOptions<T>): UseFormResult<T> {
    const initialSnapshot = { ...options.initialValues };
    const fields = {} as FieldStates<T>;
    const touched = {} as FieldFlags<T>;
    const dirty = {} as FieldFlags<T>;

    for (const [key, value] of Object.entries(options.initialValues)) {
        const typedKey = key as keyof T;
        fields[typedKey] = useState(value as T[keyof T]);
        touched[typedKey] = useState(false);
        dirty[typedKey] = useState(false);
    }

    const errors = computed(() => validateForm(getValues(), options.rules ?? {}));
    const isDirty = computed(() => Object.values(dirty).some(flag => flag.value));
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

    function getValues(): T {
        const values = {} as T;

        for (const key of Object.keys(fields) as Array<keyof T>) {
            values[key] = fields[key].value;
        }

        return values;
    }

    function reset(values: Partial<T> = {}): void {
        for (const key of Object.keys(fields) as Array<keyof T>) {
            const nextValue = key in values ? values[key] : initialSnapshot[key];
            fields[key].value = nextValue as T[keyof T];
            touched[key].value = false;
            dirty[key].value = false;
        }
    }

    function markAsPristine(): void {
        for (const key of Object.keys(fields) as Array<keyof T>) {
            touched[key].value = false;
            dirty[key].value = false;
        }
    }

    function bindField<K extends keyof T>(fieldName: K, target: string | HTMLElement): () => void {
        const element = resolveFieldElement(target);
        if (!element) return () => {};

        syncElementFromState(fieldName, element);

        const inputHandler = () => {
            fields[fieldName].value = readElementValue(element) as T[K];
            touched[fieldName].value = true;
            dirty[fieldName].value = !Object.is(fields[fieldName].value, initialSnapshot[fieldName]);
        };

        const blurHandler = () => {
            touched[fieldName].value = true;
        };

        const eventName = getBindingEventName(element);
        element.addEventListener(eventName, inputHandler);
        element.addEventListener('blur', blurHandler);

        return () => {
            element.removeEventListener(eventName, inputHandler);
            element.removeEventListener('blur', blurHandler);
        };
    }

    function submit(handler: (values: T) => void | Promise<void>): (event?: Event) => Promise<boolean> {
        return async (event?: Event) => {
            event?.preventDefault();

            for (const key of Object.keys(touched) as Array<keyof T>) {
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

    function syncElementFromState<K extends keyof T>(fieldName: K, element: FormControlElement): void {
        const value = fields[fieldName].value;

        if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
            element.checked = Boolean(value);
            return;
        }

        element.value = value == null ? '' : String(value);
    }
}

type FormControlElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function resolveFieldElement(target: string | HTMLElement): FormControlElement | null {
    const element = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;

    if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
    ) {
        return element;
    }

    return null;
}

function getBindingEventName(element: FormControlElement): 'input' | 'change' {
    if (element instanceof HTMLSelectElement) {
        return 'change';
    }

    if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
        return 'change';
    }

    return 'input';
}

function readElementValue(element: FormControlElement): string | boolean {
    if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
        return element.checked;
    }

    return element.value;
}

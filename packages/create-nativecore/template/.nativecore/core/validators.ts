/**
 * Reusable validator factories for the NativeCoreJS form module.
 *
 * Each validator returns `null` when the value is valid and an error
 * message string when it isn't, so they can be composed in arrays.
 */

export type Validator<T = unknown> = (value: T) => string | null;

const isEmpty = (value: unknown): boolean =>
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim().length === 0) ||
    (Array.isArray(value) && value.length === 0);

export function required(message = 'This field is required'): Validator {
    return value => (isEmpty(value) ? message : null);
}

export function minLength(min: number, message?: string): Validator<string | unknown[]> {
    return value => {
        if (value == null) return null;
        const length = typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0;
        return length < min ? message ?? `Must be at least ${min} characters` : null;
    };
}

export function maxLength(max: number, message?: string): Validator<string | unknown[]> {
    return value => {
        if (value == null) return null;
        const length = typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0;
        return length > max ? message ?? `Must be at most ${max} characters` : null;
    };
}

export function pattern(regex: RegExp, message = 'Invalid format'): Validator<string> {
    return value => {
        if (value == null || value === '') return null;
        return regex.test(String(value)) ? null : message;
    };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function email(message = 'Enter a valid email address'): Validator<string> {
    return value => {
        if (value == null || value === '') return null;
        return EMAIL_RE.test(String(value)) ? null : message;
    };
}

export function url(message = 'Enter a valid URL'): Validator<string> {
    return value => {
        if (value == null || value === '') return null;
        try {
            // eslint-disable-next-line no-new
            new URL(String(value));
            return null;
        } catch {
            return message;
        }
    };
}

export function min(minVal: number, message?: string): Validator<number | string> {
    return value => {
        if (value === null || value === undefined || value === '') return null;
        const n = Number(value);
        if (Number.isNaN(n)) return message ?? 'Must be a number';
        return n < minVal ? message ?? `Must be at least ${minVal}` : null;
    };
}

export function max(maxVal: number, message?: string): Validator<number | string> {
    return value => {
        if (value === null || value === undefined || value === '') return null;
        const n = Number(value);
        if (Number.isNaN(n)) return message ?? 'Must be a number';
        return n > maxVal ? message ?? `Must be at most ${maxVal}` : null;
    };
}

export function oneOf<T>(allowed: readonly T[], message = 'Invalid selection'): Validator<T> {
    return value => (allowed.includes(value) ? null : message);
}

/** Combines several validators into one. The first validator that fails wins. */
export function compose<T>(...validators: Validator<T>[]): Validator<T> {
    return value => {
        for (const v of validators) {
            const result = v(value);
            if (result) return result;
        }
        return null;
    };
}

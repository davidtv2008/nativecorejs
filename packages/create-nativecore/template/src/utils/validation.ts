/**
 * Validation Utilities
 */

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isRequired(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
}

export function minLength(min: number): (value: any) => boolean {
    return (value: any) => {
        if (!value) return false;
        return String(value).length >= min;
    };
}

export function maxLength(max: number): (value: any) => boolean {
    return (value: any) => {
        if (!value) return true;
        return String(value).length <= max;
    };
}

export function matchesPattern(pattern: RegExp): (value: any) => boolean {
    return (value: any) => {
        if (!value) return false;
        return pattern.test(String(value));
    };
}

export function isNumber(value: any): boolean {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

export function isInteger(value: any): boolean {
    return Number.isInteger(Number(value));
}

export function isValidURL(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

export function isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
}

type Validator = (value: any) => boolean;

export function validateForm(values: Record<string, any>, rules: Record<string, Validator[]>): Record<string, string> {
    const errors: Record<string, string> = {};
    
    for (const [field, validators] of Object.entries(rules)) {
        for (const validator of validators) {
            if (!validator(values[field])) {
                errors[field] = `Validation failed for ${field}`;
                break;
            }
        }
    }
    
    return errors;
}

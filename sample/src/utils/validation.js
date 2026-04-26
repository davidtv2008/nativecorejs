/**
 * Validation Utilities
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
export function isRequired(value) {
    if (value === null || value === undefined)
        return false;
    if (typeof value === 'string')
        return value.trim().length > 0;
    return true;
}
export function minLength(min) {
    return (value) => {
        if (!value)
            return false;
        return String(value).length >= min;
    };
}
export function maxLength(max) {
    return (value) => {
        if (!value)
            return true;
        return String(value).length <= max;
    };
}
export function matchesPattern(pattern) {
    return (value) => {
        if (!value)
            return false;
        return pattern.test(String(value));
    };
}
export function isNumber(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}
export function isInteger(value) {
    return Number.isInteger(Number(value));
}
export function isValidURL(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
export function isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
}
export function validateForm(values, rules) {
    const errors = {};
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

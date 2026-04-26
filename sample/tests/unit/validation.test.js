import { describe, expect, it } from 'vitest';
import { isNumber, isRequired, isValidEmail, matchesPattern, maxLength, minLength, validateForm } from '../../src/utils/validation.js';
describe('utils/validation', () => {
    it('validates email addresses', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('invalid')).toBe(false);
    });
    it('validates required values', () => {
        expect(isRequired('value')).toBe(true);
        expect(isRequired('   ')).toBe(false);
        expect(isRequired(null)).toBe(false);
    });
    it('validates length rules and patterns', () => {
        expect(minLength(3)('abcd')).toBe(true);
        expect(maxLength(3)('abcd')).toBe(false);
        expect(matchesPattern(/^\d+$/)('1234')).toBe(true);
    });
    it('validates numbers', () => {
        expect(isNumber(123)).toBe(true);
        expect(isNumber('123.45')).toBe(true);
        expect(isNumber('abc')).toBe(false);
    });
    it('returns field-level form errors', () => {
        const errors = validateForm({ email: 'bad-email', name: 'A' }, {
            email: [isRequired, isValidEmail],
            name: [minLength(2)]
        });
        expect(errors).toEqual({
            email: 'Validation failed for email',
            name: 'Validation failed for name'
        });
    });
});

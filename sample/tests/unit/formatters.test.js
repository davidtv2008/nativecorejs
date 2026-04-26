/**
 * Example Formatter Test
 * Tests for formatting utilities
 */
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatPercentage, truncate, capitalize, } from '../../src/utils/formatters.js';
describe('Formatter Utilities', () => {
    describe('formatCurrency', () => {
        it('should format currency correctly', () => {
            expect(formatCurrency(99.99)).toBe('$99.99');
            expect(formatCurrency(1000)).toBe('$1,000.00');
        });
    });
    describe('formatNumber', () => {
        it('should format numbers with commas', () => {
            expect(formatNumber(1000)).toBe('1,000');
            expect(formatNumber(1000000)).toBe('1,000,000');
        });
    });
    describe('formatPercentage', () => {
        it('should format percentages', () => {
            expect(formatPercentage(0.5)).toBe('50%');
            expect(formatPercentage(0.123, 2)).toBe('12.30%');
        });
    });
    describe('truncate', () => {
        it('should truncate long text', () => {
            expect(truncate('This is a long text', 10)).toBe('This is...');
            expect(truncate('Short', 10)).toBe('Short');
        });
    });
    describe('capitalize', () => {
        it('should capitalize first letter', () => {
            expect(capitalize('hello')).toBe('Hello');
            expect(capitalize('HELLO')).toBe('HELLO');
        });
    });
});

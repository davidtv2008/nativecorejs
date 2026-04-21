/**
 * Unit tests for the i18n module.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { I18n } from '../../.nativecore/core/i18n.js';

describe('I18n', () => {
    beforeEach(() => {
        try { localStorage.clear(); } catch { /* ignore */ }
    });

    it('translates keys and falls back to the default locale', () => {
        const i = new I18n({
            defaultLocale: 'en',
            messages: {
                en: { hello: 'Hello' },
                es: { hello: 'Hola' },
            },
            persist: false,
        });
        expect(i.t('hello')).toBe('Hello');
        i.setLocale('es');
        expect(i.t('hello')).toBe('Hola');
    });

    it('returns the key as a fallback when no message is registered', () => {
        const i = new I18n({ persist: false });
        expect(i.t('missing.key')).toBe('missing.key');
    });

    it('interpolates `{name}` placeholders', () => {
        const i = new I18n({
            messages: { en: { greet: 'Hi {name}, you have {n} messages' } },
            persist: false,
        });
        expect(i.t('greet', { name: 'David', n: 3 })).toBe('Hi David, you have 3 messages');
    });

    it('falls back to fallbackLocale when key is missing in active locale', () => {
        const i = new I18n({
            defaultLocale: 'en',
            fallbackLocale: 'en',
            messages: {
                en: { only_en: 'English only' },
                es: {},
            },
            persist: false,
        });
        i.setLocale('es');
        expect(i.t('only_en')).toBe('English only');
    });

    it('extend() merges new messages without dropping existing ones', () => {
        const i = new I18n({ messages: { en: { a: 'A' } }, persist: false });
        i.extend({ en: { b: 'B' } });
        expect(i.t('a')).toBe('A');
        expect(i.t('b')).toBe('B');
    });

    it('formats numbers and currencies for the active locale', () => {
        const i = new I18n({ defaultLocale: 'en-US', persist: false });
        expect(i.formatNumber(1234.5)).toMatch(/1,234/);
        expect(i.formatCurrency(10, 'USD')).toContain('10');
    });
});

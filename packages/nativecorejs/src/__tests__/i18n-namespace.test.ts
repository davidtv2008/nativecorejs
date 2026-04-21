/**
 * Additional coverage for i18n namespace loading.
 */
import { describe, it, expect, vi } from 'vitest';
import { I18n } from '../../.nativecore/core/i18n.js';

describe('I18n namespaces', () => {
    it('lazily loads a namespace and prefixes keys with the namespace name', async () => {
        const i = new I18n({ defaultLocale: 'en', persist: false });
        const loader = vi.fn().mockResolvedValue({ title: 'Cart', empty: 'Empty' });
        i.registerNamespace('cart', loader);

        expect(i.isNamespaceLoaded('cart')).toBe(false);
        await i.loadNamespace('cart');

        expect(loader).toHaveBeenCalledWith('en');
        expect(i.isNamespaceLoaded('cart')).toBe(true);
        expect(i.t('cart.title')).toBe('Cart');
        expect(i.t('cart.empty')).toBe('Empty');
    });

    it('deduplicates concurrent loadNamespace() calls', async () => {
        const i = new I18n({ persist: false });
        let calls = 0;
        i.registerNamespace('ns', async () => { calls++; return { a: 'A' }; });
        await Promise.all([i.loadNamespace('ns'), i.loadNamespace('ns'), i.loadNamespace('ns')]);
        expect(calls).toBe(1);
    });

    it('loads different locales independently', async () => {
        const i = new I18n({ defaultLocale: 'en', persist: false });
        i.registerNamespace('ns', async (locale) => ({ hello: locale === 'es' ? 'Hola' : 'Hello' }));
        await i.loadNamespace('ns', 'en');
        await i.loadNamespace('ns', 'es');
        i.setLocale('es');
        expect(i.t('ns.hello')).toBe('Hola');
        i.setLocale('en');
        expect(i.t('ns.hello')).toBe('Hello');
    });

    it('throws when no loader is registered', async () => {
        const i = new I18n({ persist: false });
        await expect(i.loadNamespace('missing')).rejects.toThrow(/No loader registered/);
    });
});

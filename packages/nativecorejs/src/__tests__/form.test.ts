/**
 * Unit tests for `useForm()` and the bundled validators.
 */
import { describe, it, expect } from 'vitest';
import { useForm } from '../../.nativecore/core/form.js';
import { required, minLength, email, compose } from '../../.nativecore/core/validators.js';

describe('validators', () => {
    it('required flags empty values', () => {
        const v = required();
        expect(v('')).not.toBeNull();
        expect(v('x')).toBeNull();
        expect(v(null)).not.toBeNull();
        expect(v([])).not.toBeNull();
    });

    it('minLength enforces length', () => {
        const v = minLength(3);
        expect(v('ab')).not.toBeNull();
        expect(v('abc')).toBeNull();
    });

    it('email accepts valid addresses', () => {
        const v = email();
        expect(v('a@b.co')).toBeNull();
        expect(v('not-an-email')).not.toBeNull();
    });

    it('compose returns the first failure', () => {
        const v = compose(required(), minLength(3));
        expect(v('')).toBe('This field is required');
        expect(v('ab')).toContain('at least');
        expect(v('abc')).toBeNull();
    });
});

describe('useForm', () => {
    it('exposes initial values via fields', () => {
        const form = useForm({ initialValues: { name: '', age: 0 } });
        expect(form.fields.name.value).toBe('');
        expect(form.fields.age.value).toBe(0);
    });

    it('tracks dirty state when a field changes', () => {
        const form = useForm({ initialValues: { name: '' } });
        expect(form.isDirty.value).toBe(false);
        form.setValue('name', 'a');
        expect(form.isDirty.value).toBe(true);
    });

    it('reports validation errors via computed `errors`', () => {
        const form = useForm({
            initialValues: { name: '' },
            rules: { name: [required()] },
        });
        expect(form.isValid.value).toBe(false);
        expect(form.errors.value.name).toBeDefined();
        form.setValue('name', 'David');
        expect(form.isValid.value).toBe(true);
    });

    it('handleSubmit blocks invalid submissions', async () => {
        let called = false;
        const form = useForm({
            initialValues: { name: '' },
            rules: { name: [required()] },
        });
        const submit = form.handleSubmit(() => { called = true; });
        const ok = await submit();
        expect(ok).toBe(false);
        expect(called).toBe(false);
    });

    it('handleSubmit invokes the handler when valid', async () => {
        let received: { name: string } | null = null;
        const form = useForm({
            initialValues: { name: 'David' },
            rules: { name: [required()] },
        });
        const submit = form.handleSubmit(values => { received = values; });
        const ok = await submit();
        expect(ok).toBe(true);
        expect(received).toEqual({ name: 'David' });
    });

    it('reset restores initial values and clears flags', () => {
        const form = useForm({ initialValues: { name: 'a' } });
        form.setValue('name', 'b');
        form.markAllTouched();
        form.reset();
        expect(form.fields.name.value).toBe('a');
        expect(form.isDirty.value).toBe(false);
        expect(form.touched.name.value).toBe(false);
    });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useForm } from '../../src/utils/form.js';
import { isRequired, isValidEmail, minLength } from '../../src/utils/validation.js';

describe('utils/form', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('tracks errors, touched flags, and dirtiness reactively', async () => {
        const form = useForm({
            initialValues: {
                email: '',
                name: ''
            },
            rules: {
                email: [isRequired, isValidEmail],
                name: [minLength(2)]
            }
        });

        expect(form.isValid.value).toBe(false);
        expect(form.errors.value.email).toBe('Validation failed for email');

        form.fields.email.value = 'dev@example.com';
        form.fields.name.value = 'Dev';
        form.dirty.email.value = true;
        form.dirty.name.value = true;

        expect(form.isValid.value).toBe(true);
        expect(form.isDirty.value).toBe(true);

        const submitHandler = vi.fn(async () => {});
        const submitted = await form.submit(submitHandler)();

        expect(submitted).toBe(true);
        expect(submitHandler).toHaveBeenCalledWith({
            email: 'dev@example.com',
            name: 'Dev'
        });
        expect(form.isDirty.value).toBe(false);
    });

    it('binds input elements to field state', () => {
        const input = document.createElement('input');
        document.body.appendChild(input);

        const form = useForm({
            initialValues: {
                email: ''
            },
            rules: {
                email: [isRequired, isValidEmail]
            }
        });

        const cleanup = form.bindField('email', input);
        input.value = 'user@example.com';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));

        expect(form.fields.email.value).toBe('user@example.com');
        expect(form.touched.email.value).toBe(true);
        expect(form.isValid.value).toBe(true);

        cleanup();
    });
});

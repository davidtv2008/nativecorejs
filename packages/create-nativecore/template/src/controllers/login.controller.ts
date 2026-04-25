/**
 * Login Controller
 * Handles form submission, validation, and auth flow for the login page.
 */
import { wireContents } from '@core-utils/wires.js';
import { useState, effect } from '@core/state.js';
import { trackEvents } from '@core-utils/events.js';
import { dom } from '@core-utils/dom.js';
import router from '@core/router.js';
import auth from '@services/auth.service.js';
import api from '@services/api.service.js';

export async function loginController(): Promise<() => void> {
    // Setup
    const events = trackEvents();

    // DOM refs (needed for focus and custom element internals)
    const form               = dom.$<HTMLElement & { getValues?: () => Record<string, string> }>('#loginForm');
    const errorDiv           = dom.$<HTMLElement>('#login-error');
    const loginBtn           = dom.$('#loginBtn');
    const rememberMeCheckbox = dom.$('#rememberMe');
    const emailField         = dom.$('#email');
    const passwordField      = dom.$('#password');

    // Wires + local state
    // errorMessage -> [wire-content="errorMessage"] in login.html
    const { errorMessage } = wireContents();
    const isLoading = useState(false);

    // Reactive bindings
    effect(() => {
        if (!loginBtn) return;
        loginBtn.toggleAttribute('disabled', isLoading.value);
        loginBtn.textContent = isLoading.value ? 'Signing In...' : 'Access Dashboard';
    });
    effect(() => {
        if (!errorDiv) return;
        errorDiv.hidden = !errorMessage.value;
    });

    // Helpers
    // nc-input wraps a native <input> inside its shadow root
    const getInputValue = (element: Element | null): string => {
        if (!element) return '';
        const shadowInput = dom.within<HTMLInputElement>(element.shadowRoot ?? element, 'input');
        return shadowInput?.value ?? element.getAttribute('value') ?? '';
    };

    const focusInput = (element: Element | null) => {
        dom.within<HTMLInputElement>(element?.shadowRoot ?? element, 'input')?.focus();
    };

    // Event handlers
    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        if (!form || !loginBtn || !errorDiv) return;

        const submitEvent = e as CustomEvent<{ values?: Record<string, string> }>;
        const values   = submitEvent.detail?.values ?? form.getValues?.() ?? {};
        const email    = (values.email    ?? getInputValue(emailField)).trim();
        const password =  values.password ?? getInputValue(passwordField);
        const rememberMe = rememberMeCheckbox?.hasAttribute('checked') ?? false;

        errorMessage.value = '';

        if (!email || !password) {
            errorMessage.value = 'Email and password are required. Use the demo credentials shown above.';
            focusInput(!email ? emailField : passwordField);
            return;
        }

        isLoading.value = true;

        try {
            const response = await api.post('/auth/login', { email, password });

            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            auth.setTokens(response.accessToken, response.refreshToken);
            auth.setUser(response.user);
            router.navigate('/dashboard');

        } catch (error: unknown) {
            console.error('Login error:', error);
            errorMessage.value = error instanceof Error ? error.message : 'Login failed. Please try again.';
            emailField?.setAttribute('value', email);
            passwordField?.setAttribute('value', '');
            focusInput(passwordField);
        } finally {
            isLoading.value = false;
        }
    };

    // On load
    // Restore remembered email from a previous session
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        emailField?.setAttribute('value', savedEmail);
        rememberMeCheckbox?.setAttribute('checked', '');
    }

    // Events
    events.onSubmit('#loginForm', handleSubmit);
    events.onKeydown('#loginForm', (e) => {
        if (e.key === 'Enter') handleSubmit(e);
    });
    events.onInput('#email, #password', (e) => {
        const target = e.target as Element;
        const value = getInputValue(target);
        if (value) {
            target.setAttribute('value', value);
        } else {
            target.removeAttribute('value');
        }
    });

    // Cleanup
    // wire* and effect() bindings auto-dispose via PageCleanupRegistry.
    // Return cleanup only for tracked DOM events/listeners.
    return () => {
        events.cleanup();
    };
}


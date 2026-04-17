/**
 * Login Controller
 * Handles form submission, validation, and auth flow for the login page.
 */
import { trackEvents, trackSubscriptions } from '@core-utils/events.js';
import { dom } from '@core-utils/dom.js';
import router from '@core/router.js';
import auth from '@services/auth.service.js';
import api from '@services/api.service.js';

export async function loginController(): Promise<() => void> {

    // -- Setup ---------------------------------------------------------------
    const events = trackEvents();
    const subs = trackSubscriptions();

    // -- DOM refs ------------------------------------------------------------
    const form             = dom.$<HTMLElement & { getValues?: () => Record<string, string> }>('#loginForm');
    const errorDiv         = dom.$<HTMLElement>('#login-error');
    const loginBtn         = dom.$('#loginBtn');
    const rememberMeCheckbox = dom.$('#rememberMe');
    const emailField       = dom.$('#email');
    const passwordField    = dom.$('#password');

    // -- Helpers -------------------------------------------------------------
    const setButtonState = (isLoading: boolean) => {
        if (!loginBtn) return;
        if (isLoading) {
            loginBtn.setAttribute('disabled', '');
            loginBtn.textContent = 'Signing In...';
            return;
        }
        loginBtn.removeAttribute('disabled');
        loginBtn.textContent = 'Access Dashboard';
    };

    const setError = (message: string) => {
        if (!errorDiv) return;
        errorDiv.textContent = message;
        errorDiv.hidden = false;
    };

    const clearError = () => {
        if (!errorDiv) return;
        errorDiv.hidden = true;
        errorDiv.textContent = '';
    };

    // nc-input wraps a native <input> inside its shadow root
    const getInputValue = (element: Element | null): string => {
        if (!element) return '';
        const shadowInput = dom.within<HTMLInputElement>(element.shadowRoot ?? element, 'input');
        return shadowInput?.value ?? element.getAttribute('value') ?? '';
    };

    const focusInput = (element: Element | null) => {
        dom.within<HTMLInputElement>(element?.shadowRoot ?? element, 'input')?.focus();
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        if (!form || !loginBtn || !errorDiv) return;

        const submitEvent = e as CustomEvent<{ values?: Record<string, string> }>;
        const values   = submitEvent.detail?.values ?? form.getValues?.() ?? {};
        const email    = (values.email    ?? getInputValue(emailField)).trim();
        const password =  values.password ?? getInputValue(passwordField);
        const rememberMe = rememberMeCheckbox?.hasAttribute('checked') ?? false;

        clearError();

        if (!email || !password) {
            setError('Email and password are required. Use the demo credentials shown above.');
            focusInput(!email ? emailField : passwordField);
            return;
        }

        setButtonState(true);

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
            const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
            setError(errorMessage);
            emailField?.setAttribute('value', email);
            passwordField?.setAttribute('value', '');
            focusInput(passwordField);
        } finally {
            setButtonState(false);
        }
    };

    // -- On load -------------------------------------------------------------
    // Restore remembered email from a previous session
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        emailField?.setAttribute('value', savedEmail);
        rememberMeCheckbox?.setAttribute('checked', '');
    }

    // -- Events --------------------------------------------------------------
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

    // -- Cleanup -------------------------------------------------------------
    return () => {
        events.cleanup();
        subs.cleanup();
    };
}


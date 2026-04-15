/**
 * Login Page Controller
 * Handles dynamic behavior for the login page
 */
import { trackEvents, trackSubscriptions } from '@utils/events.js';
import router from '@core/router.js';
import auth from '../services/auth.service.js';
import api from '../services/api.service.js';

export async function loginController(): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();

    const form = document.getElementById('loginForm') as (HTMLElement & {
        getValues?: () => Record<string, string>;
    }) | null;
    const errorDiv = document.getElementById('login-error') as HTMLDivElement | null;
    const loginBtn = document.getElementById('loginBtn') as HTMLElement | null;
    const rememberMeCheckbox = document.getElementById('rememberMe') as HTMLElement | null;
    const emailField = document.getElementById('email') as HTMLElement | null;
    const passwordField = document.getElementById('password') as HTMLElement | null;

    // Load saved email if "remember me" was checked
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        emailField?.setAttribute('value', savedEmail);
        rememberMeCheckbox?.setAttribute('checked', '');
    }

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

    const getInputValue = (element: HTMLElement | null): string => {
        if (!element) return '';

        const shadowInput = element.shadowRoot?.querySelector('input') as HTMLInputElement | null;
        return shadowInput?.value ?? element.getAttribute('value') ?? '';
    };

    const focusInput = (element: HTMLElement | null) => {
        const shadowInput = element?.shadowRoot?.querySelector('input') as HTMLInputElement | null;
        shadowInput?.focus();
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        if (!form || !loginBtn || !errorDiv) return;

        const submitEvent = e as CustomEvent<{ values?: Record<string, string> }>;
        const values = submitEvent.detail?.values ?? form.getValues?.() ?? {};
        const email = (values.email ?? getInputValue(emailField)).trim();
        const password = values.password ?? getInputValue(passwordField);
        const rememberMe = rememberMeCheckbox?.hasAttribute('checked') ?? false;

        clearError();

        if (!email || !password) {
            setError('Email and password are required. Use the demo credentials shown above.');
            if (!email) {
                focusInput(emailField);
            } else {
                focusInput(passwordField);
            }
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

    events.on<CustomEvent<{ values: Record<string, string> }>>('#loginForm', 'submit', handleSubmit);
    events.on<KeyboardEvent>('#loginForm', 'keydown', (event) => {
        if (event.key === 'Enter') {
            handleSubmit(event);
        }
    });

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}



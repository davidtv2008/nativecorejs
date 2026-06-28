import { CoreController } from '@core/controller.js';
import type { State } from '@core/controller.js';
import router from '@core/router.js';
import auth from '@services/auth.service.js';
import api from '@services/api.service.js';

class LoginController extends CoreController {

    // --- STATE ---
    private errorMessage!: State<string>;
    private isLoading!: State<boolean>;

    // --- LIFECYCLE ---
    onMount() {
        this.errorMessage = this.state('');
        this.isLoading    = this.state(false);

        // Bind state to DOM
        this.effect(() => {
            const btn = this.el.querySelector('#loginBtn');
            if (!btn) return;
            btn.toggleAttribute('disabled', this.isLoading.value);
            btn.textContent = this.isLoading.value ? 'Signing In...' : 'Access Dashboard';
        });
        this.effect(() => {
            const errorDiv = this.el.querySelector<HTMLElement>('#login-error');
            if (!errorDiv) return;
            errorDiv.hidden = !this.errorMessage.value;
            errorDiv.textContent = this.errorMessage.value;
        });

        // Restore remembered email
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            this.el.querySelector('#email')?.setAttribute('value', savedEmail);
            this.el.querySelector('#rememberMe')?.setAttribute('checked', '');
        }

        // Events
        this.on(this.el, 'submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            void this._handleSubmit(e as CustomEvent);
        });
        this.on(this.el, 'keydown', (e) => {
            if ((e as KeyboardEvent).key === 'Enter') {
                e.preventDefault();
                void this._handleSubmit(e as CustomEvent);
            }
        });
        this.on(this.el, 'input', (e) => {
            const target = e.target as Element;
            if (!target.matches('#email, #password')) return;
            const value = this._getInputValue(target);
            if (value) target.setAttribute('value', value);
            else target.removeAttribute('value');
        });
    }

    // --- PRIVATE ---
    private _getInputValue(element: Element | null): string {
        if (!element) return '';
        const shadowInput = (element.shadowRoot ?? element).querySelector<HTMLInputElement>('input');
        return shadowInput?.value ?? element.getAttribute('value') ?? '';
    }

    private _focusInput(element: Element | null): void {
        (element?.shadowRoot ?? element)?.querySelector<HTMLInputElement>('input')?.focus();
    }

    private async _handleSubmit(e: CustomEvent): Promise<void> {
        const form     = this.el.querySelector<HTMLElement & { getValues?: () => Record<string, string> }>('#loginForm');
        const emailField    = this.el.querySelector('#email');
        const passwordField = this.el.querySelector('#password');
        const rememberMeCheckbox = this.el.querySelector('#rememberMe');

        if (!form) return;

        const values   = e.detail?.values ?? form.getValues?.() ?? {};
        const email    = (values.email    ?? this._getInputValue(emailField)).trim();
        const password =  values.password ?? this._getInputValue(passwordField);
        const rememberMe = rememberMeCheckbox?.hasAttribute('checked') ?? false;

        this.errorMessage.value = '';

        if (!email || !password) {
            this.errorMessage.value = 'Email and password are required. Use the demo credentials shown above.';
            this._focusInput(!email ? emailField : passwordField);
            return;
        }

        this.isLoading.value = true;

        try {
            const response = await api.post('/auth/login', { email, password });

            if (rememberMe) localStorage.setItem('rememberedEmail', email);
            else localStorage.removeItem('rememberedEmail');

            auth.setTokens(response.accessToken, response.refreshToken);
            auth.setUser(response.user);
            router.navigate('/dashboard');

        } catch (error: unknown) {
            console.error('Login error:', error);
            this.errorMessage.value = error instanceof Error ? error.message : 'Login failed. Please try again.';
            emailField?.setAttribute('value', email);
            passwordField?.setAttribute('value', '');
            this._focusInput(passwordField);
        } finally {
            this.isLoading.value = false;
        }
    }
}

// Factory — called by the router via lazyController('loginController', ...)
export function loginController(): () => void {
    const ctrl = new LoginController();
    return () => ctrl.destroy();
}


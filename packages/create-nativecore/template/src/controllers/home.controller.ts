import auth from '@services/auth.service.js';

export async function homeController(): Promise<() => void> {
    const ctaBtn = document.querySelector<HTMLElement>('[ref="ctaBtn"]');

    const sync = () => {
        const authed = auth.isAuthenticated();
        ctaBtn?.setAttribute('href', authed ? '/dashboard' : '/login');
        if (ctaBtn) ctaBtn.textContent = authed ? 'Go to Dashboard' : 'Sign In';
        ctaBtn?.classList.toggle('hero-primary--authed', authed);
    };

    sync();
    window.addEventListener('auth-change', sync);

    return () => window.removeEventListener('auth-change', sync);
}


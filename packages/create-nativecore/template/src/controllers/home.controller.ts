/**
 * Home Controller
 * Updates the primary landing CTA based on authentication status.
 */
import auth from '../services/auth.service.js';

export async function homeController(): Promise<() => void> {
    const getStartedBtn = document.getElementById('get-started-btn') as HTMLAnchorElement | null;

    if (getStartedBtn) {
        if (auth.isAuthenticated()) {
            getStartedBtn.href = '/dashboard';
            getStartedBtn.textContent = 'Go to Dashboard';
        } else {
            getStartedBtn.href = '/docs';
            getStartedBtn.textContent = 'Read the Docs';
        }
    }

    return () => {};
}

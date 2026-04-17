/**
 * Sidebar Initialization and Management
 */
import auth from '../services/auth.service.js';
import { dom } from '@core-utils/dom.js';

/**
 * Initialize sidebar functionality
 */
export function initSidebar() {
    const sidebar   = dom.$('#appSidebar');
    const appLayout = dom.$('.app-layout');
    
    // Listen for sidebar toggle events from nc-sidebar component
    sidebar?.addEventListener('toggle', ((e: CustomEvent) => {
        const isCollapsed = e.detail.collapsed;
        
        if (appLayout) {
            if (isCollapsed) {
                appLayout.classList.add('sidebar-collapsed');
            } else {
                appLayout.classList.remove('sidebar-collapsed');
            }
        }
        
        // Save state
        localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
    }) as EventListener);
    
    // Restore saved state on load
    const savedCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (savedCollapsed && sidebar) {
        sidebar.setAttribute('collapsed', '');
        appLayout?.classList.add('sidebar-collapsed');
    }
    
    // Update sidebar visibility based on auth state
    function updateSidebar() {
        const isAuthenticated = auth.isAuthenticated();
        
        // Toggle body class for sidebar visibility (no flash)
        if (isAuthenticated) {
            document.body.classList.add('sidebar-enabled');
            if (appLayout) appLayout.classList.remove('no-sidebar');
        } else {
            document.body.classList.remove('sidebar-enabled');
            if (appLayout) appLayout.classList.add('no-sidebar');
        }
        
        // Toggle menu items based on auth state
        const homeLink = document.querySelector('.sidebar-item.home-link') as HTMLElement;
        const aboutLink = document.querySelector('.sidebar-item.about-link') as HTMLElement;
        const dashboardLink = document.querySelector('.sidebar-item.dashboard-link') as HTMLElement;
        const componentsLink = document.querySelector('.sidebar-item.components-link') as HTMLElement;
        const underConstructionLink = document.querySelector('.sidebar-item.under-construction-link') as HTMLElement;
        const logoutLink = document.querySelector('.sidebar-item.logout-link') as HTMLElement;
        
        if (homeLink) homeLink.style.display = isAuthenticated ? 'none' : 'flex';
        if (aboutLink) aboutLink.style.display = isAuthenticated ? 'none' : 'flex';
        if (dashboardLink) dashboardLink.style.display = isAuthenticated ? 'flex' : 'none';
        if (componentsLink) componentsLink.style.display = isAuthenticated ? 'flex' : 'none';
        if (underConstructionLink) underConstructionLink.style.display = isAuthenticated ? 'flex' : 'none';
        if (logoutLink) logoutLink.style.display = isAuthenticated ? 'flex' : 'none';
        
        // Update active link
        updateActiveSidebarLink();
    }
    
    // Handle sidebar logout button
    const sidebarLogoutBtn = dom.$('#sidebarLogoutBtn');
    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener('click', () => {
            auth.logout();
        });
    }

    // Update active link on page load
    function updateActiveSidebarLink() {
        const currentPath = window.location.pathname;
        const sidebarItems = dom.$$('.sidebar-item');

        sidebarItems.forEach(item => {
            item.classList.remove('active');
            const href = item.getAttribute('href');
            if (href === currentPath || (currentPath === '/' && href === '/')) {
                item.classList.add('active');
            }
        });
    }
    
    // Listen for auth changes
    window.addEventListener('auth-change', updateSidebar);
    window.addEventListener('pageloaded', updateActiveSidebarLink);
    
    // Initial update
    updateSidebar();
}

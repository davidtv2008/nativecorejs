/**
 * Preload Registry
 * 
 * Components imported here are loaded immediately when the app starts,
 * rather than lazy-loading on first use.
 * 
 * Only import critical components that are needed on initial page load:
 * - Layout components (header, footer, sidebar)
 * - Components used on the home/landing page
 * - Core UI components used everywhere
 * 
 * Generated components with preload=Y will be added here automatically.
 */

// Core layout components used directly in the HTML shells.
import './core/app-header.js';
import './core/app-sidebar.js';
import './core/app-footer.js';

// Initial route components used on first paint.
import './core/loading-spinner.js';
import './core/nc-a.js';
import './core/nc-splash.js';
import './core/nc-scroll-top.js';
import './core/nc-snackbar.js';

// Other critical components
// Add your preloaded components here

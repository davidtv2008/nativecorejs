/**
 * Preload Registry
 *
 * Components imported here are loaded immediately when the app starts,
 * rather than lazy-loading on first use.
 *
 * Only import critical components that are needed on initial page load.
 * Shell chrome (app-header / app-sidebar / app-footer) is opt-in — add
 * imports here when you put those elements back in index.html.
 *
 * Generated components with preload=Y will be added here automatically.
 */

// Initial route components used on first paint.
import './core/loading-spinner.js';
import './core/nc-snackbar.js';

// Other critical components
// Add your preloaded components here

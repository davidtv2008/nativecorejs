import { componentRegistry } from '@core/lazyComponents.js';
export function registerAppComponents() {
    componentRegistry.register('app-footer', './core/app-footer.js');
    componentRegistry.register('app-header', './core/app-header.js');
    componentRegistry.register('app-sidebar', './core/app-sidebar.js');
    componentRegistry.register('dashboard-signal-lab', './ui/dashboard-signal-lab.js');
}

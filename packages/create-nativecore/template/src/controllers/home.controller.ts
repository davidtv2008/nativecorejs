import { CoreController } from '@core/controller.js';

export class HomeController extends CoreController {
    onMount() {
        // Home is a static welcome surface — add view logic here as the app grows.
    }
}

// Factory — called by the router via lazyController('homeController', ...)
export function homeController(): () => void {
    const ctrl = new HomeController();
    return () => ctrl.destroy();
}

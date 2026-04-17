import { bustCache } from '../utils/cacheBuster.js';

/**
 * Validate that a module path is safe for dynamic import.
 * Blocks absolute URLs, path traversal, and dangerous protocols.
 */
function isValidModulePath(modulePath: string): boolean {
    const normalized = modulePath.trim().toLowerCase();

    // Block absolute URLs (http://, https://, //, etc.)
    if (/^https?:\/\//i.test(normalized) || normalized.startsWith('//')) {
        return false;
    }

    // Block dangerous protocols
    if (/^(javascript|data|vbscript|blob):/i.test(normalized)) {
        return false;
    }

    // Block path traversal
    if (normalized.includes('..')) {
        return false;
    }

    return true;
}

class ComponentRegistry {
    private components = new Map<string, string>();
    private loaded = new Set<string>();
    private observer: MutationObserver | null = null;

    register(tagName: string, modulePath: string): void {
        if (!isValidModulePath(modulePath)) {
            console.error(`[ComponentRegistry] Blocked unsafe module path for <${tagName}>: ${modulePath}`);
            return;
        }
        this.components.set(tagName, modulePath);
    }

    async loadComponent(tagName: string): Promise<void> {
        if (this.loaded.has(tagName) || customElements.get(tagName)) {
            this.loaded.add(tagName);
            return;
        }

        const modulePath = this.components.get(tagName);
        if (!modulePath) {
            console.warn(`Component ${tagName} not registered`);
            return;
        }

        try {
            const absolutePath = modulePath.startsWith('./')
                ? `/dist/src/components/${modulePath.slice(2)}`
                : modulePath;

            const finalPath = bustCache(absolutePath);
            await import(finalPath);
            this.loaded.add(tagName);
        } catch (error) {
            console.error(`Failed to load component ${tagName}:`, error);
        }
    }

    async scanAndLoad(root: HTMLElement | Document = document.body): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const tagName of this.components.keys()) {
            if (!this.loaded.has(tagName)) {
                const elements = root.querySelectorAll(tagName);
                if (elements.length > 0) {
                    promises.push(this.loadComponent(tagName));
                }
            }
        }

        await Promise.all(promises);
    }

    startObserving(): void {
        if (this.observer) return;

        this.observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.scanAndLoad(node as HTMLElement);
                        }
                    });
                }
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    stopObserving(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

export const componentRegistry = new ComponentRegistry();

export async function initLazyComponents(): Promise<void> {
    await componentRegistry.scanAndLoad();
    componentRegistry.startObserving();
}


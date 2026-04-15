import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { componentRegistry } from '../../src/core/lazyComponents.js';

function resetRegistry(): void {
    const registry = componentRegistry as unknown as {
        components: Map<string, string>;
        loaded: Set<string>;
        observer: MutationObserver | null;
    };

    registry.components.clear();
    registry.loaded.clear();
    registry.observer?.disconnect();
    registry.observer = null;
}

describe('Lazy component registry', () => {
    beforeEach(() => {
        resetRegistry();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        componentRegistry.stopObserving();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('loads registered components when matching elements are found', async () => {
        componentRegistry.register('lazy-sample', './ui/lazy-sample.js');
        document.body.innerHTML = '<lazy-sample></lazy-sample>';

        const loadSpy = vi.spyOn(componentRegistry, 'loadComponent').mockResolvedValue();

        await componentRegistry.scanAndLoad();

        expect(loadSpy).toHaveBeenCalledWith('lazy-sample');
    });

    it('warns when attempting to load an unregistered component', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await componentRegistry.loadComponent('missing-widget');

        expect(warnSpy).toHaveBeenCalledWith('Component missing-widget not registered');
    });

    it('observes DOM additions and scans new nodes', async () => {
        const scanSpy = vi.spyOn(componentRegistry, 'scanAndLoad').mockResolvedValue();
        componentRegistry.startObserving();

        const wrapper = document.createElement('div');
        wrapper.innerHTML = '<lazy-observed></lazy-observed>';
        document.body.appendChild(wrapper);
        await Promise.resolve();

        expect(scanSpy).toHaveBeenCalled();
    });
});

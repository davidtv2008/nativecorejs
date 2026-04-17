/**
 * Component Overlay System
 *
 * Shows a tiny persistent gear button on each custom component in dev mode.
 * Visibility is controlled by the dev tools toggle pill.
 */

export class ComponentOverlay {
    private onEdit: (element: HTMLElement) => void;
    private observedComponents: Set<HTMLElement> = new Set();
    private componentButtons: Map<HTMLElement, HTMLButtonElement> = new Map();
    private mutationObserver: MutationObserver | null = null;
    private scrollListener: (() => void) | null = null;
    private resizeListener: (() => void) | null = null;
    private rescanInterval: number | null = null;
    private updateFrame: number | null = null;
    private visible = true;

    constructor(onEdit: (element: HTMLElement) => void) {
        this.onEdit = onEdit;
        this.injectStyles();
        this.setupObserver();
        this.scanExistingComponents();

        this.scrollListener = () => this.schedulePositionUpdate();
        this.resizeListener = () => this.schedulePositionUpdate();
        window.addEventListener('scroll', this.scrollListener, true);
        window.addEventListener('resize', this.resizeListener);

        this.rescanInterval = window.setInterval(() => this.scanExistingComponents(), 2000);
    }

    setVisible(visible: boolean): void {
        this.visible = visible;
        this.schedulePositionUpdate();
    }

    private injectStyles(): void {
        const styleId = 'nativecore-overlay-styles';
        if ((window.dom?.query?.(`#${styleId}`) || document.getElementById(styleId))) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .nc-denc-control {
                position: fixed !important;
                width: 16px !important;
                height: 16px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border: 1px solid rgba(15, 23, 42, 0.16) !important;
                border-radius: 999px !important;
                background: rgba(255, 255, 255, 0.96) !important;
                color: #475569 !important;
                box-shadow: 0 2px 6px rgba(15, 23, 42, 0.14) !important;
                cursor: pointer !important;
                opacity: 0.7 !important;
                z-index: 999997 !important;
                padding: 0 !important;
                transition: opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease !important;
            }

            .nc-denc-control:hover {
                opacity: 1 !important;
                transform: scale(1.08) !important;
                box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18) !important;
            }

            .nc-denc-control--hidden {
                opacity: 0 !important;
                pointer-events: none !important;
            }

            .nc-denc-control svg {
                width: 9px !important;
                height: 9px !important;
                fill: currentColor !important;
            }

            .nc-denc-highlight {
                outline: 2px dashed rgba(102, 126, 234, 0.5) !important;
                outline-offset: 2px !important;
            }
        `;
        document.head.appendChild(style);
    }

    private setupObserver(): void {
        this.mutationObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        this.processTree(node);
                    }
                });

                mutation.removedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        this.cleanupTree(node);
                    }
                });
            }

            this.schedulePositionUpdate();
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    private scanExistingComponents(): void {
        const allElements = (window.dom?.queryAll?.('*') || document.querySelectorAll('*'));
        allElements.forEach((element: Element) => {
            if (element instanceof HTMLElement) {
                this.processElement(element);
            }
        });

        this.schedulePositionUpdate();
    }

    private processTree(root: HTMLElement): void {
        this.processElement(root);
        root.querySelectorAll('*').forEach((element) => {
            if (element instanceof HTMLElement) {
                this.processElement(element);
            }
        });
    }

    private cleanupTree(root: HTMLElement): void {
        this.cleanupElement(root);
        root.querySelectorAll('*').forEach((element) => {
            if (element instanceof HTMLElement) {
                this.cleanupElement(element);
            }
        });
    }

    private isCustomComponent(element: HTMLElement): boolean {
        const tagName = element.tagName.toLowerCase();

        if (!tagName.includes('-')) return false;
        if (tagName.startsWith('nc-dev')) return false;
        if (tagName.startsWith('ion-') || tagName.startsWith('mat-')) return false;
        if (tagName.startsWith('nc-outline')) return false;
        if (tagName === 'nativecore-denc-indicator') return false;

        return customElements.get(tagName) !== undefined || element.shadowRoot !== null;
    }

    private processElement(element: HTMLElement): void {
        if (!this.isCustomComponent(element)) return;
        if (this.observedComponents.has(element)) return;

        this.observedComponents.add(element);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'nc-denc-control';
        button.title = `Edit <${element.tagName.toLowerCase()}>`;
        button.setAttribute('aria-label', `Edit <${element.tagName.toLowerCase()}>`);
        button.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
        `;

        button.addEventListener('mouseenter', () => {
            element.classList.add('nc-denc-highlight');
        });

        button.addEventListener('mouseleave', () => {
            element.classList.remove('nc-denc-highlight');
        });

        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this.onEdit(element);
        });

        document.body.appendChild(button);
        this.componentButtons.set(element, button);
        this.updateControlPosition(element, button);
    }

    private updateControlPosition(element: HTMLElement, button: HTMLButtonElement): void {
        if (!this.visible) {
            button.classList.add('nc-denc-control--hidden');
            return;
        }

        const rect = element.getBoundingClientRect();
        const size = 16;
        const inset = 4;
        const inViewport = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;

        if (!inViewport) {
            button.classList.add('nc-denc-control--hidden');
            return;
        }

        const top = Math.min(Math.max(rect.top + inset, 4), window.innerHeight - size - 4);
        const left = Math.min(Math.max(rect.right - size - inset, 4), window.innerWidth - size - 4);

        button.style.top = `${top}px`;
        button.style.left = `${left}px`;
        button.classList.remove('nc-denc-control--hidden');
    }

    private schedulePositionUpdate(): void {
        if (this.updateFrame !== null) return;

        this.updateFrame = window.requestAnimationFrame(() => {
            this.updateFrame = null;
            this.componentButtons.forEach((button, element) => {
                if (!document.body.contains(element)) {
                    this.cleanupElement(element);
                    return;
                }

                this.updateControlPosition(element, button);
            });
        });
    }

    private cleanupElement(element: HTMLElement): void {
        this.observedComponents.delete(element);
        element.classList.remove('nc-denc-highlight');

        const button = this.componentButtons.get(element);
        if (button) {
            button.remove();
            this.componentButtons.delete(element);
        }
    }

    destroy(): void {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }

        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener, true);
            this.scrollListener = null;
        }

        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = null;
        }

        if (this.rescanInterval !== null) {
            window.clearInterval(this.rescanInterval);
            this.rescanInterval = null;
        }

        if (this.updateFrame !== null) {
            window.cancelAnimationFrame(this.updateFrame);
            this.updateFrame = null;
        }

        this.componentButtons.forEach((button, element) => {
            element.classList.remove('nc-denc-highlight');
            button.remove();
        });

        this.componentButtons.clear();
        this.observedComponents.clear();
        (window.dom?.query?.('#nativecore-overlay-styles') || document.getElementById('nativecore-overlay-styles'))?.remove();
    }
}

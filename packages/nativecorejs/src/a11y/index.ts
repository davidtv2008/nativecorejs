/**
 * NativeCoreJS Accessibility Utilities
 *
 * Small, composable helpers that eliminate copy-paste a11y boilerplate across
 * interactive components.  Each utility returns a disposer — call it to
 * remove the side-effect and restore original state.
 *
 * @example
 * import { trapFocus, announce, roving } from 'nativecorejs/a11y';
 *
 * // Trap focus inside a modal while it is open
 * const releaseFocus = trapFocus(modalEl);
 * // ... later, when the modal closes:
 * releaseFocus();
 */

// ─── trapFocus ───────────────────────────────────────────────────────────────

const FOCUSABLE_SELECTORS = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'details > summary',
    '[contenteditable]',
].join(', ');

/**
 * Trap keyboard focus within `container`.
 *
 * Tab / Shift+Tab cycle through focusable descendants; focus cannot leave the
 * container while the trap is active.  The first focusable child receives
 * focus immediately.
 *
 * @returns A disposer that removes the trap and restores the previously
 *          focused element.
 */
export function trapFocus(container: HTMLElement): () => void {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getFocusable(): HTMLElement[] {
        return Array.from(
            container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
        ).filter(el => !el.closest('[inert]') && getComputedStyle(el).display !== 'none');
    }

    function handleKeyDown(event: KeyboardEvent): void {
        if (event.key !== 'Tab') return;
        const focusable = getFocusable();
        if (focusable.length === 0) {
            event.preventDefault();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey) {
            if (document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    }

    container.addEventListener('keydown', handleKeyDown);

    // Move focus into the container
    const firstFocusable = getFocusable()[0];
    if (firstFocusable) {
        firstFocusable.focus();
    }

    return () => {
        container.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
            previouslyFocused.focus();
        }
    };
}

// ─── announce ────────────────────────────────────────────────────────────────

let politeRegion: HTMLElement | null = null;
let assertiveRegion: HTMLElement | null = null;

function getOrCreateRegion(politeness: 'polite' | 'assertive'): HTMLElement {
    const existing = politeness === 'polite' ? politeRegion : assertiveRegion;
    if (existing && document.contains(existing)) {
        return existing;
    }
    const region = document.createElement('div');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('aria-relevant', 'additions text');
    region.style.cssText =
        'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    document.body.appendChild(region);
    if (politeness === 'polite') {
        politeRegion = region;
    } else {
        assertiveRegion = region;
    }
    return region;
}

/**
 * Announce a message to screen-reader users via an ARIA live region.
 *
 * @param message     The text to announce.
 * @param politeness  `'polite'` (default) waits for the user to be idle;
 *                    `'assertive'` interrupts immediately.
 */
export function announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
    const region = getOrCreateRegion(politeness);
    // Clear then set forces the AT to re-read even if the message is unchanged
    region.textContent = '';
    // Use a microtask-delay so the DOM mutation is detected as a change
    setTimeout(() => {
        region.textContent = message;
    }, 50);
}

// ─── roving ──────────────────────────────────────────────────────────────────

/**
 * Implement a roving-tabindex pattern for a group of items (e.g. menu,
 * listbox, toolbar).
 *
 * - Only the currently active item has `tabindex="0"`; all others get
 *   `tabindex="-1"`.
 * - Arrow keys (Up/Down or Left/Right) move focus between items.
 * - Home / End jump to the first / last item.
 *
 * @param container  Parent element that holds the roving items.
 * @param selector   CSS selector matching the focusable items inside container.
 * @returns A disposer that removes the roving-tabindex behaviour.
 */
export function roving(container: HTMLElement, selector: string): () => void {
    function getItems(): HTMLElement[] {
        return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
            el => !el.closest('[inert]')
        );
    }

    function focusItem(item: HTMLElement, items: HTMLElement[]): void {
        items.forEach(i => i.setAttribute('tabindex', '-1'));
        item.setAttribute('tabindex', '0');
        item.focus();
    }

    // Initialise tabindex on all items
    const items = getItems();
    items.forEach((item, idx) => item.setAttribute('tabindex', idx === 0 ? '0' : '-1'));

    function handleKeyDown(event: KeyboardEvent): void {
        const currentItems = getItems();
        const target = event.target as HTMLElement;
        const idx = currentItems.indexOf(target);
        if (idx === -1) return;

        let next: HTMLElement | undefined;
        switch (event.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                event.preventDefault();
                next = currentItems[(idx + 1) % currentItems.length];
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                event.preventDefault();
                next = currentItems[(idx - 1 + currentItems.length) % currentItems.length];
                break;
            case 'Home':
                event.preventDefault();
                next = currentItems[0];
                break;
            case 'End':
                event.preventDefault();
                next = currentItems[currentItems.length - 1];
                break;
        }

        if (next) {
            focusItem(next, currentItems);
        }
    }

    container.addEventListener('keydown', handleKeyDown);

    return () => {
        container.removeEventListener('keydown', handleKeyDown);
        // Restore natural tabindex
        getItems().forEach(item => item.removeAttribute('tabindex'));
    };
}

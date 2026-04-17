/**
 * Global Type Declarations
 */

interface Toast {
    success(message: string): void;
    error(message: string): void;
    warning(message: string): void;
    info(message: string): void;
}

// ── Custom Element Registry ──────────────────────────────────────────────────
// Registering nc-* elements here gives TypeScript IntelliSense in .ts files:
//   document.querySelector('nc-button')  →  typed as NcButton
//   document.createElement('nc-tabs')    →  typed as NcTabs

import type { NcA }        from '../../src/components/core/nc-a.js';
import type { NcButton }   from '../../src/components/core/nc-button.js';
import type { NcCard }     from '../../src/components/core/nc-card.js';
import type { NcTabs }     from '../../src/components/core/nc-tabs.js';
import type { NcTabItem }  from '../../src/components/core/nc-tab-item.js';
import type { NcMenu }     from '../../src/components/core/nc-menu.js';
import type { NcMenuItem } from '../../src/components/core/nc-menu-item.js';

declare global {
    interface Window {
        Toast: Toast;
        router: unknown;
        __NATIVECORE_DEV__?: boolean;
        dom: {
            query: (selector: string) => Element | null;
            queryAll: (selector: string) => NodeListOf<Element>;
            $: (selector: string) => Element | null;
            $$: (selector: string) => NodeListOf<Element>;
        };
    }

    interface HTMLElementTagNameMap {
        'nc-a':         NcA;
        'nc-button':    NcButton;
        'nc-card':      NcCard;
        'nc-tabs':      NcTabs;
        'nc-tab-item':  NcTabItem;
        'nc-menu':      NcMenu;
        'nc-menu-item': NcMenuItem;
    }
}

export {};

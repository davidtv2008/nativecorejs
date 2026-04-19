import { Component, defineComponent } from '../../.nativecore/core/component.js';

export class NcAvatarGroup extends Component {
    static useShadowDOM = true;

    template() {
        const overlap = parseInt(this.getAttribute('overlap') ?? '10', 10);
        const size = this.getAttribute('size') ?? 'md';

        const sizePixels: Record<string, number> = {
            xs: 24,
            sm: 32,
            md: 40,
            lg: 48,
            xl: 56
        };
        const resolvedSize = sizePixels[size] ?? 40;
        const fontSize = Math.round(resolvedSize * 0.32);
        const borderWidth = Math.max(2, Math.round(resolvedSize * 0.06));

        return html`
            <style>
                :host { display: inline-block; }
                .group {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                }
                ::slotted(*) {
                    margin-left: -${overlap}px;
                    box-shadow: 0 0 0 ${borderWidth}px var(--nc-bg, #fff);
                    border-radius: 50%;
                    flex-shrink: 0;
                    position: relative;
                    transition: transform var(--nc-transition-fast, 160ms ease), z-index 0s;
                    z-index: 0;
                }
                ::slotted(*:first-child) { margin-left: 0; }
                ::slotted(*:hover) { transform: translateY(-3px); z-index: 10; }
                .overflow {
                    margin-left: -${overlap}px;
                    width: ${resolvedSize}px;
                    height: ${resolvedSize}px;
                    border-radius: 50%;
                    background: var(--nc-bg-tertiary, #e5e7eb);
                    color: var(--nc-text-secondary, #4b5563);
                    font-family: var(--nc-font-family);
                    font-size: ${fontSize}px;
                    font-weight: var(--nc-font-weight-semibold, 600);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 0 ${borderWidth}px var(--nc-bg, #fff);
                    flex-shrink: 0;
                    user-select: none;
                }
            </style>
            <div class="group" role="group" aria-label="Avatar group">
                <slot></slot>
                <div class="overflow" id="overflow" style="display:none" aria-hidden="true"></div>
            </div>
        `;
    }

    onMount() {
        this.updateGroup();
    }

    private updateGroup() {
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot');
        const overflow = this.shadowRoot?.querySelector<HTMLElement>('#overflow');
        if (!slot || !overflow) return;

        const max = parseInt(this.getAttribute('max') ?? '4', 10);
        const total = parseInt(this.getAttribute('total') ?? '0', 10);
        const items = slot.assignedElements({ flatten: true }) as HTMLElement[];
        const count = total > 0 ? total : items.length;

        items.forEach((element, index) => {
            element.style.display = index < max ? '' : 'none';
        });

        const extra = count - Math.min(max, items.length);
        if (extra > 0) {
            overflow.textContent = `+${extra}`;
            overflow.style.display = 'flex';
        } else {
            overflow.style.display = 'none';
        }
    }
}

defineComponent('nc-avatar-group', NcAvatarGroup);


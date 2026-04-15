import { Component, defineComponent } from '../core/component.js';

const ICONS: Record<string, string> = {
    inbox: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect x="8" y="16" width="48" height="36" rx="4" stroke="currentColor" stroke-width="2.5"/><polyline points="8,30 26,42 38,42 56,30" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><line x1="20" y1="24" x2="44" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/><line x1="20" y1="30" x2="32" y2="30" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/></svg>`,
    search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><circle cx="27" cy="27" r="17" stroke="currentColor" stroke-width="2.5"/><line x1="39" y1="39" x2="56" y2="56" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="21" y1="27" x2="33" y2="27" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/><line x1="27" y1="21" x2="27" y2="33" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/></svg>`,
    folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><path d="M8 20a4 4 0 0 1 4-4h12l6 6h22a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V20z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><line x1="24" y1="38" x2="40" y2="38" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/></svg>`,
    data: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="18" rx="20" ry="8" stroke="currentColor" stroke-width="2.5"/><path d="M12 18v10c0 4.4 9 8 20 8s20-3.6 20-8V18" stroke="currentColor" stroke-width="2.5"/><path d="M12 28v10c0 4.4 9 8 20 8s20-3.6 20-8V28" stroke="currentColor" stroke-width="2.5"/></svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="2.5"/><line x1="32" y1="20" x2="32" y2="36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="44" r="2.5" fill="currentColor"/></svg>`,
    lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect x="14" y="28" width="36" height="26" rx="4" stroke="currentColor" stroke-width="2.5"/><path d="M20 28V20a12 12 0 0 1 24 0v8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="32" cy="41" r="4" stroke="currentColor" stroke-width="2.5"/><line x1="32" y1="45" x2="32" y2="50" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`
};

export class NcEmptyState extends Component {
    static useShadowDOM = true;

    template() {
        const title = this.getAttribute('title') ?? '';
        const description = this.getAttribute('description') ?? '';
        const icon = this.getAttribute('icon') ?? 'inbox';
        const size = this.getAttribute('size') ?? 'md';
        const variant = this.getAttribute('variant') ?? 'default';

        const iconSize = size === 'sm' ? '56px' : size === 'lg' ? '96px' : '72px';
        const titleSize = size === 'sm' ? 'var(--nc-font-size-base, 1rem)' : size === 'lg' ? 'var(--nc-font-size-xl, 1.25rem)' : 'var(--nc-font-size-lg, 1.125rem)';
        const padding = size === 'sm' ? 'var(--nc-spacing-lg, 1.5rem)' : size === 'lg' ? 'var(--nc-spacing-2xl, 48px)' : 'var(--nc-spacing-xl, 40px)';

        const variantStyle =
            variant === 'bordered'
                ? 'border: 1px dashed var(--nc-border, #e5e7eb); border-radius: var(--nc-radius-lg, 1rem);'
                : variant === 'filled'
                    ? 'background: var(--nc-bg-secondary, #f8fafc); border-radius: var(--nc-radius-lg, 1rem);'
                    : '';

        const customIcon = icon === 'custom';
        const iconMarkup = customIcon ? '' : (ICONS[icon] ?? ICONS.inbox);

        return `
            <style>
                :host { display: block; }
                .wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    padding: ${padding};
                    ${variantStyle}
                    font-family: var(--nc-font-family);
                }
                .icon-wrap {
                    width: ${iconSize};
                    height: ${iconSize};
                    color: var(--nc-text-muted, #6b7280);
                    margin-bottom: var(--nc-spacing-md, 1rem);
                    opacity: 0.6;
                }
                .icon-wrap svg { width: 100%; height: 100%; }
                .title {
                    font-size: ${titleSize};
                    font-weight: var(--nc-font-weight-semibold, 600);
                    color: var(--nc-text, #111827);
                    margin: 0 0 var(--nc-spacing-xs, 0.25rem);
                }
                .desc {
                    font-size: var(--nc-font-size-sm, 0.875rem);
                    color: var(--nc-text-secondary, #4b5563);
                    margin: 0 0 var(--nc-spacing-md, 1rem);
                    max-width: 360px;
                    line-height: var(--nc-line-height-relaxed, 1.7);
                }
                .actions { display: flex; gap: var(--nc-spacing-sm, 0.5rem); flex-wrap: wrap; justify-content: center; }
                slot[name="title"]::slotted(*),
                slot[name="description"]::slotted(*) { margin: 0; }
            </style>
            <div class="wrap">
                <div class="icon-wrap">
                    ${customIcon ? '<slot name="icon"></slot>' : iconMarkup}
                </div>
                ${title ? `<p class="title">${title}</p>` : '<slot name="title"></slot>'}
                ${description ? `<p class="desc">${description}</p>` : '<slot name="description"></slot>'}
                <div class="actions"><slot name="actions"></slot></div>
            </div>
        `;
    }
}

defineComponent('nc-empty-state', NcEmptyState);

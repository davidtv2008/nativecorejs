import { CoreComponent } from '../../.nativecore/core/component.js';
import { html, css, sanitizeURL } from '../../.nativecore/utils/templates.js';
import router from '../../.nativecore/core/router.js';

export class NcA extends CoreComponent {

    // --- STATIC CONFIG ---
    static useShadowDOM = true;
    static observedAttributes = ['href', 'target', 'disabled', 'variant'];

    // Drives devtools sidebar dropdowns — server parses this statically from source.
    // (none) is added automatically by the editor — do not include '' here.
    static attributeOptions = {
        target: ['_blank', '_self', '_parent', '_top'],
        variant: ['primary', 'secondary', 'tertiary', 'success', 'danger', 'outline']
    };

    static styles = css`
        :host { display: inline; }
        a {
            display: inline;
            color: var(--nc-a-color, var(--nc-text, inherit));
            text-decoration: none;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        :host([disabled]) a { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
        /* Button variants */
        :host([variant]) a {
            display: inline-flex; align-items: center; justify-content: center;
            padding: 10px 24px; border-radius: var(--nc-radius-md, 6px);
            color: white; transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        :host([variant="primary"]) a   { background: var(--nc-primary, #007bff); }
        :host([variant="secondary"]) a { background: var(--nc-secondary, #6c757d); }
        :host([variant="tertiary"]) a  { background: var(--nc-bg, #ffffff); color: var(--nc-text, #212529); border: 1px solid var(--nc-text, #212529); }
        :host([variant="success"]) a   { background: var(--nc-success, #28a745); }
        :host([variant="danger"]) a    { background: var(--nc-danger, #dc3545); }
        :host([variant="outline"]) a   { background: transparent; color: var(--nc-primary, #007bff); border: 1px solid var(--nc-primary, #007bff); }
    `;

    // --- TEMPLATE ---
    template() {
        return html`
            <a ref="anchor">
                <slot></slot>
            </a>
        `;
    }

    // --- STATE ---
    private _href     = this.state('#');
    private _target   = this.state('');
    private _disabled = this.state(false);
    private _variant  = this.state('primary'); // Example of a custom attribute that could drive styling

    // --- REFS ---
    private anchor!: HTMLAnchorElement;

    // --- LIFECYCLE ---
    onMount() {
        this._href.value     = sanitizeURL(this.getAttribute('href')) || '#';
        this._target.value   = this.getAttribute('target') || '';
        this._disabled.value = this.hasAttribute('disabled');
        this._variant.value  = this.getAttribute('variant') || '';
        this.bind(this._href,     this.anchor, 'href');
        this.bind(this._target,   this.anchor, 'target');
        this.bind(this._disabled, this.anchor, '?disabled');
        this.bind(this._variant,  this, 'variant');
    }

    protected _handleAttributeUpdate(name: string, val: string | null): void {
        if (name === 'href')     this._href.value     = sanitizeURL(val) || '#';
        if (name === 'target')   this._target.value   = val || '';
        if (name === 'disabled') this._disabled.value = val !== null;
        if (name === 'variant') {
            this._variant.value = val || '';
        }
    }

    // --- EVENTS ---
    events() {
        this.on(this.anchor, 'click', (e: MouseEvent) => {
            if (this._disabled.value) return e.preventDefault();

            const href = this._href.value;
            const isExternal = href.includes('://') || this._target.value === '_blank';
            if (isExternal || href.startsWith('#')) return;

            e.preventDefault();
            if (this.emit('nc-navigate', { href })) {
                router.navigate(href);
            }
        });
    }

    onUnmount() {
        // clean up computes, memos, setIntervals, most others auto cleanup using events(){ this.on(...)} 
        

    }
}

if (!customElements.get('nc-a')) customElements.define('nc-a', NcA);
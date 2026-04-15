import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Component, defineComponent } from '../../src/core/component.js';

class TestComponentElement extends Component {
    static useShadowDOM = true;
    static observedAttributes = ['label'];

    template(): string {
        return `<div class="label">${this.getAttribute('label') ?? 'Default'}</div>`;
    }
}

class FocusPreservingComponent extends Component {
    static useShadowDOM = true;

    constructor() {
        super();
        this.state = {
            label: 'Initial label'
        };
    }

    template(): string {
        return `
            <div class="wrapper">
                <label for="name">${this.state.label}</label>
                <input id="name" value="keep-me" />
            </div>
        `;
    }
}

defineComponent('test-component-element', TestComponentElement);
defineComponent('focus-preserving-component', FocusPreservingComponent);

describe('core/component', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
        document.body.innerHTML = '';
    });

    it('renders into shadow DOM when enabled', () => {
        const element = document.createElement('test-component-element') as TestComponentElement;
        container.appendChild(element);

        expect(element.shadowRoot).not.toBeNull();
        expect(element.shadowRoot?.querySelector('.label')?.textContent).toBe('Default');
    });

    it('rerenders when observed attributes change', () => {
        const element = document.createElement('test-component-element') as TestComponentElement;
        container.appendChild(element);

        element.setAttribute('label', 'Updated');

        expect(element.shadowRoot?.querySelector('.label')?.textContent).toBe('Updated');
    });

    it('patches the existing DOM instead of replacing focused elements', () => {
        const element = document.createElement('focus-preserving-component') as FocusPreservingComponent;
        container.appendChild(element);

        const shadowRoot = element.shadowRoot as ShadowRoot;
        const inputBefore = shadowRoot.querySelector<HTMLInputElement>('#name');
        const labelBefore = shadowRoot.querySelector('label');

        expect(inputBefore).toBeTruthy();
        expect(labelBefore?.textContent).toBe('Initial label');

        inputBefore?.focus();
        element.setState({ label: 'Updated label' });

        const inputAfter = shadowRoot.querySelector<HTMLInputElement>('#name');
        const labelAfter = shadowRoot.querySelector('label');

        expect(inputAfter).toBe(inputBefore);
        expect(labelAfter?.textContent).toBe('Updated label');
        expect(shadowRoot.activeElement).toBe(inputAfter);
    });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as esbuild from 'esbuild';
import {
    generateBuilderCode,
    normalizeState,
    parseBuilderSource,
    createEmptyState,
    isBuilderOwned,
} from '../component-builder-codegen.mjs';

function sampleState() {
    const state = createEmptyState();
    state.componentTag = 'billing-card';
    state.componentClass = 'BillingCard';
    state.componentDesc = 'Billing summary card';
    state.useShadowDOM = true;
    state.observedAttrs = [{ name: 'title', defaultValue: 'Invoice' }];
    state.layout = {
        direction: 'column',
        wrap: 'nowrap',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        gap: '8px',
        padding: '12px',
    };
    state.children = [{
        id: 'x',
        tag: 'nc-button',
        attrs: { variant: { type: 'text', value: 'primary' } },
        slotContent: 'Pay now',
        classList: '',
        nodeId: '',
    }];
    state.events = [{
        id: 'e1',
        name: 'billing-card-pay',
        trigger: 'nc-button-click',
        triggerTag: 'nc-button',
        payload: [{ key: 'amount', type: 'string' }],
        bubbles: true,
        composed: true,
        cancelable: false,
    }];
    return state;
}

async function assertParses(code, loader) {
    const result = await esbuild.transform(code, { loader, format: 'esm' });
    assert.ok(result.code.length > 0);
}

describe('component-builder-codegen', () => {
    it('marks generated code as builder-owned', () => {
        const code = generateBuilderCode(sampleState(), 'ts');
        assert.equal(isBuilderOwned(code), true);
    });

    it('round-trips state for TypeScript output', async () => {
        const original = sampleState();
        const code = generateBuilderCode(original, 'ts');
        await assertParses(code, 'ts');
        const { state, warnings } = parseBuilderSource(code);
        assert.equal(warnings.length, 0);
        assert.deepEqual(normalizeState(state), normalizeState(original));
    });

    it('round-trips state for JavaScript output', async () => {
        const original = sampleState();
        const code = generateBuilderCode(original, 'js');
        assert.match(code, /onMount\(\)/);
        assert.doesNotMatch(code, /\bas any\b/);
        assert.doesNotMatch(code, /:\s*string/);
        await assertParses(code, 'js');
        const { state, warnings } = parseBuilderSource(code);
        assert.equal(warnings.length, 0);
        assert.deepEqual(normalizeState(state), normalizeState(original));
    });

    it('warns when source is not builder-owned', () => {
        const { warnings, builderOwned } = parseBuilderSource(`
            export class X extends CoreComponent {}
            defineComponent('hand-made', X);
        `);
        assert.equal(builderOwned, false);
        assert.ok(warnings.some((w) => /not created by the Component Builder/i.test(w)));
    });
});

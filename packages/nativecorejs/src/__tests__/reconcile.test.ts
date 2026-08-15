import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { reconcile } from '../../.nativecore/utils/reconcile.js';

function itemEl(id: string, label: string): HTMLElement {
    const el = document.createElement('li');
    el.textContent = label;
    el.dataset.id = id;
    return el;
}

describe('reconcile', () => {
    let list: HTMLUListElement;

    beforeEach(() => {
        list = document.createElement('ul');
        document.body.appendChild(list);
    });

    afterEach(() => {
        list.remove();
    });

    it('creates nodes for new keys', () => {
        reconcile(list, [{ id: 'a' }, { id: 'b' }], item => item.id, item => itemEl(item.id, item.id));
        expect(list.children).toHaveLength(2);
        expect(list.children[0].getAttribute('data-nc-key')).toBe('a');
        expect(list.children[1].getAttribute('data-nc-key')).toBe('b');
    });

    it('reuses nodes and calls update for existing keys', () => {
        const items = [{ id: 'a', label: 'one' }];
        reconcile(list, items, item => item.id, item => itemEl(item.id, item.label));
        const first = list.children[0];
        reconcile(
            list,
            [{ id: 'a', label: 'two' }],
            item => item.id,
            item => itemEl(item.id, item.label),
            (el, item) => { el.textContent = item.label; }
        );
        expect(list.children[0]).toBe(first);
        expect(first.textContent).toBe('two');
    });

    it('reorders existing nodes to match item order', () => {
        reconcile(list, [{ id: 'a' }, { id: 'b' }], item => item.id, item => itemEl(item.id, item.id));
        const a = list.children[0];
        const b = list.children[1];
        reconcile(list, [{ id: 'b' }, { id: 'a' }], item => item.id, item => itemEl(item.id, item.id));
        expect(list.children[0]).toBe(b);
        expect(list.children[1]).toBe(a);
    });

    it('removes nodes whose keys left the list', () => {
        reconcile(list, [{ id: 'a' }, { id: 'b' }], item => item.id, item => itemEl(item.id, item.id));
        reconcile(list, [{ id: 'b' }], item => item.id, item => itemEl(item.id, item.id));
        expect(list.children).toHaveLength(1);
        expect(list.children[0].getAttribute('data-nc-key')).toBe('b');
    });
});

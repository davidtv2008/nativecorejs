const KEY_ATTR = 'data-nc-key';

export type ReconcileKey = string | number;

/**
 * Keyed list reconcile — move / insert / remove real DOM nodes. No virtual DOM.
 *
 * `create` runs only for new keys. Same-key nodes are reused and optionally
 * updated. Pair with `controller.rebind(container)` after insert if the new
 * nodes contain `ref` attributes.
 */
export function reconcile<T>(
    container: Element,
    items: readonly T[],
    keyFn: (item: T, index: number) => ReconcileKey,
    create: (item: T, index: number) => Element,
    update?: (el: Element, item: T, index: number) => void
): void {
    const existing = new Map<string, Element>();
    for (const child of Array.from(container.children)) {
        const key = child.getAttribute(KEY_ATTR);
        if (key != null) existing.set(key, child);
    }

    let cursor: ChildNode | null = container.firstChild;

    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const key = String(keyFn(item, index));
        let node = existing.get(key);

        if (node) {
            existing.delete(key);
            update?.(node, item, index);
        } else {
            node = create(item, index);
            node.setAttribute(KEY_ATTR, key);
        }

        if (cursor !== node) {
            container.insertBefore(node, cursor);
        }
        cursor = node.nextSibling;
    }

    for (const leftover of existing.values()) {
        leftover.remove();
    }
}

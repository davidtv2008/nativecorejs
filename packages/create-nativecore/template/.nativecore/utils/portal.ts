/**
 * Move `node` into `target` (light-DOM teleport). Returns a disposer that
 * puts the node back where it came from, or removes it if it had no parent.
 */
export function portal(node: Node, target: Element | string): () => void {
    const dest = typeof target === 'string' ? document.querySelector(target) : target;
    if (!dest) {
        return () => {};
    }

    const parent = node.parentNode;
    const next = node.nextSibling;
    dest.appendChild(node);

    return () => {
        if (parent) {
            parent.insertBefore(node, next);
            return;
        }
        if (dest.contains(node)) dest.removeChild(node);
    };
}

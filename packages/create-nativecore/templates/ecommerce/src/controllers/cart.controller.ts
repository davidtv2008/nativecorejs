import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { effect } from '@core/state.js';
import { cartStore } from '@stores/cart.store.js';
import type { CartItem } from '@stores/cart.store.js';
import router from '@core/router.js';

export async function cartController(): Promise<() => void> {
    const events = trackEvents();
    const disposers: Array<() => void> = [];

    const scope = dom.view('cart');
    const cartList = scope.hook('cart-list');
    const empty = scope.hook('empty');
    const cartContent = scope.hook('cart-content');
    const subtotalEl = scope.hook('subtotal');
    const totalEl = scope.hook('total');
    const btnContinue = scope.hook('btn-continue');
    const btnShop = scope.hook('btn-shop');
    const btnCheckout = scope.hook('btn-checkout');
    const snackbar = scope.hook('snackbar') as any;

    // Use the shared cart store
    const render = () => {
        const items = cartStore.value.items;

        if (items.length === 0) {
            empty?.removeAttribute('hidden');
            cartContent?.setAttribute('hidden', '');
            return;
        }

        empty?.setAttribute('hidden', '');
        cartContent?.removeAttribute('hidden');

        if (!cartList) return;
        cartList.innerHTML = '';

        for (const item of items) {
            const li = document.createElement('li');
            li.className = 'cart-item';
            li.dataset.id = item.id;
            li.innerHTML = `
                <span class="cart-item__name">${item.name}</span>
                <span class="cart-item__price">$${item.price.toFixed(2)}</span>
                <div class="cart-item__qty">
                    <button class="qty-btn" data-action="dec" data-id="${item.id}">−</button>
                    <span class="qty-value">${item.qty}</span>
                    <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
                </div>
                <button class="remove-btn" data-action="remove" data-id="${item.id}">✕</button>
            `;
            cartList.appendChild(li);
        }

        const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${subtotal.toFixed(2)}`;
    };

    disposers.push(cartStore.watch(render));
    render();

    // Qty / remove buttons
    if (cartList) {
        events.add(cartList, 'click', (e: Event) => {
            const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
            if (!btn) return;
            const { action, id } = btn.dataset;
            const items = [...cartStore.get().items];
            const idx = items.findIndex(i => i.id === id);
            if (idx === -1) return;

            if (action === 'inc') items[idx] = { ...items[idx], qty: items[idx].qty + 1 };
            else if (action === 'dec') {
                if (items[idx].qty <= 1) items.splice(idx, 1);
                else items[idx] = { ...items[idx], qty: items[idx].qty - 1 };
            } else if (action === 'remove') items.splice(idx, 1);

            cartStore.set({ items });
        });
    }

    const goShop = () => router.navigate('/shop');
    if (btnContinue) events.add(btnContinue, 'click', goShop);
    if (btnShop) events.add(btnShop, 'click', goShop);

    if (btnCheckout) {
        events.add(btnCheckout, 'click', () => {
            if (snackbar) {
                snackbar.setAttribute('message', 'Checkout coming soon!');
                snackbar.setAttribute('variant', 'info');
                snackbar.setAttribute('open', '');
            }
        });
    }

    return () => {
        disposers.forEach(d => d());
        events.cleanup();
    };
}

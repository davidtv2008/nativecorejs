import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { cartStore } from '@stores/cart.store.js';
import type { CartItem } from '@stores/cart.store.js';
import http from '@core/http.js';
import router from '@core/router.js';

interface ProductDetail {
    id: string;
    name: string;
    category: string;
    price: number;
    image?: string;
    description: string;
    rating: number;
    reviewCount: number;
}

export async function productDetailController(params: Record<string, string>): Promise<() => void> {
    const events = trackEvents();
    const scope = dom.view('product-detail');

    const skeleton = scope.hook('skeleton');
    const productEl = scope.hook('product');
    const nameEl = scope.hook('name');
    const priceEl = scope.hook('price');
    const descEl = scope.hook('description');
    const categoryEl = scope.hook('category') as any;
    const imageEl = scope.hook('image') as any;
    const ratingEl = scope.hook('rating') as any;
    const reviewCountEl = scope.hook('review-count');
    const quantityEl = scope.hook('quantity') as any;
    const btnAddCart = scope.hook('btn-add-cart');
    const btnBack = scope.hook('btn-back');
    const snackbar = scope.hook('snackbar') as any;

    if (btnBack) events.add(btnBack, 'click', () => router.navigate('/shop'));

    const { id } = params;
    const result = await http.get<ProductDetail>(`/api/shop/products/${id}`);
    skeleton?.setAttribute('hidden', '');

    if (!result.ok || !result.data) {
        router.navigate('/shop');
        return () => events.cleanup();
    }

    const product = result.data;
    if (nameEl) nameEl.textContent = product.name;
    if (priceEl) priceEl.textContent = `$${product.price.toFixed(2)}`;
    if (descEl) descEl.textContent = product.description;
    if (categoryEl) categoryEl.setAttribute('label', product.category);
    if (imageEl && product.image) imageEl.setAttribute('src', product.image);
    if (ratingEl) ratingEl.setAttribute('value', String(product.rating));
    if (reviewCountEl) reviewCountEl.textContent = `(${product.reviewCount} reviews)`;
    productEl?.removeAttribute('hidden');

    if (btnAddCart) {
        events.add(btnAddCart, 'click', () => {
            const qty = Number(quantityEl?.getAttribute('value') ?? 1);
            const items = cartStore.value.items;
            const existing = items.find((i: CartItem) => i.id === product.id);
            if (existing) {
                existing.qty += qty;
                cartStore.value = { items: [...items] };
            } else {
                cartStore.value = { items: [...items, { id: product.id, name: product.name, price: product.price, qty }] };
            }
            if (snackbar) {
                snackbar.setAttribute('message', `${product.name} added to cart`);
                snackbar.setAttribute('variant', 'success');
                snackbar.setAttribute('open', '');
            }
        });
    }

    return () => events.cleanup();
}

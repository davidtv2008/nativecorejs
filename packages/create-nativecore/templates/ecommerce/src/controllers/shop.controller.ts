import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { useState, computed, effect } from '@core/state.js';
import { http } from '@core/http.js';
import router from '@core/router.js';

interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    image?: string;
    rating: number;
}

export async function shopController(): Promise<() => void> {
    const events = trackEvents();
    const disposers: Array<() => void> = [];

    const scope = dom.data('shop');
    const grid = scope.hook('product-grid');
    const empty = scope.hook('empty');
    const pagination = scope.hook('pagination') as any;
    const searchInput = scope.hook('search') as any;
    const sortSelect = scope.hook('sort') as any;
    const categorySelect = scope.hook('filter-category') as any;
    const priceSlider = scope.hook('filter-price') as any;
    const priceLabel = scope.hook('price-label');

    const allProducts = useState<Product[]>([]);
    const query = useState('');
    const category = useState('');
    const maxPrice = useState(500);
    const sortBy = useState('newest');
    const page = useState(1);
    const PAGE_SIZE = 12;

    const filtered = computed(() => {
        let list = allProducts.value;
        const q = query.value.toLowerCase();
        if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
        if (category.value) list = list.filter(p => p.category === category.value);
        list = list.filter(p => p.price <= maxPrice.value);

        if (sortBy.value === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
        else if (sortBy.value === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
        return list;
    });

    const paginated = computed(() => {
        const start = (page.value - 1) * PAGE_SIZE;
        return filtered.value.slice(start, start + PAGE_SIZE);
    });

    disposers.push(
        effect(() => {
            if (!grid) return;
            const products = paginated.value;
            if (products.length === 0) {
                grid.innerHTML = '';
                empty?.removeAttribute('hidden');
                return;
            }
            empty?.setAttribute('hidden', '');
            grid.innerHTML = '';

            for (const product of products) {
                const li = document.createElement('li');
                li.className = 'product-card';
                li.dataset.id = product.id;
                li.innerHTML = `
                    <div class="product-card__img-wrap">
                        ${product.image ? `<img src="${product.image}" alt="${product.name}" loading="lazy">` : ''}
                    </div>
                    <div class="product-card__body">
                        <p class="product-card__category">${product.category}</p>
                        <h2 class="product-card__name">${product.name}</h2>
                        <p class="product-card__price">$${product.price.toFixed(2)}</p>
                    </div>
                `;
                grid.appendChild(li);
            }

            if (pagination) {
                pagination.setAttribute('total', String(filtered.value.length));
                pagination.setAttribute('current', String(page.value));
            }
        }),
    );

    if (searchInput) {
        events.add(searchInput, 'nc-input', (e: CustomEvent) => { query.value = (e.detail as string) ?? ''; page.value = 1; });
    }
    if (sortSelect) {
        events.add(sortSelect, 'nc-change', (e: CustomEvent) => { sortBy.value = (e.detail as string) ?? 'newest'; page.value = 1; });
    }
    if (categorySelect) {
        events.add(categorySelect, 'nc-change', (e: CustomEvent) => { category.value = (e.detail as string) ?? ''; page.value = 1; });
    }
    if (priceSlider) {
        events.add(priceSlider, 'nc-change', (e: CustomEvent) => {
            const val = Number(e.detail) || 500;
            maxPrice.value = val;
            if (priceLabel) priceLabel.textContent = `$${val}`;
            page.value = 1;
        });
    }
    if (pagination) {
        events.add(pagination, 'nc-page-change', (e: CustomEvent) => { page.value = (e.detail as number) ?? 1; });
    }
    if (grid) {
        events.add(grid, 'click', (e: Event) => {
            const card = (e.target as HTMLElement).closest('[data-id]') as HTMLElement | null;
            if (card) router.navigate(`/products/${card.dataset.id}`);
        });
    }

    // Populate categories
    const result = await http.get<Product[]>('/api/shop/products');
    if (result.ok && result.data) {
        allProducts.value = result.data;
        // Populate category options
        const cats = [...new Set(result.data.map(p => p.category))];
        if (categorySelect) {
            for (const cat of cats) {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                categorySelect.appendChild(opt);
            }
        }
    }

    return () => {
        filtered.dispose();
        paginated.dispose();
        disposers.forEach(d => d());
        events.cleanup();
    };
}

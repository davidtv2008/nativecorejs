import { useState } from '@core/state.js';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    qty: number;
}

export interface CartState {
    items: CartItem[];
}

export const cartStore = useState<CartState>({ items: [] });

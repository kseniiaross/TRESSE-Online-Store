import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
import type { Product } from "../types/product";

export type ClientCartItem = Product & {
  quantity: number;
  product_size_id: number;
  sizeName?: string;
  maxQty?: number;
};

export type ClientCartState = {
  items: ClientCartItem[];
};

type AddToCartPayload = {
  product: Product;
  product_size_id: number;
  sizeName?: string;
  maxQty?: number;
};

const isBrowser = typeof window !== "undefined" && typeof localStorage !== "undefined";
const LS_KEY = "guest_cart";

function loadFromLS(): ClientCartState | null {
  // We read guest cart from localStorage to persist it across refreshes and guest sessions.
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items)) return parsed as ClientCartState;
  } catch {
    // Intentionally ignore parse errors and fall back to empty cart.
  }
  return null;
}

function saveToLS(state: ClientCartState) {
  // We persist guest cart after each mutation to keep UI and storage consistent.
  if (!isBrowser) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // Intentionally ignore storage quota errors.
  }
}

const initialState: ClientCartState = loadFromLS() ?? { items: [] };

const toSafeInt = (n: unknown, fallback = 1) => {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.trunc(v);
};

const normalizeMax = (maxQty?: number) => {
  if (typeof maxQty !== "number") return undefined;
  if (!Number.isFinite(maxQty)) return undefined;
  const v = Math.trunc(maxQty);
  return v >= 1 ? v : undefined;
};

const clampToMax = (qty: number, maxQty?: number) => {
  const safe = Math.max(1, toSafeInt(qty, 1));
  const m = normalizeMax(maxQty);
  return typeof m === "number" ? Math.min(safe, m) : safe;
};

const resolveMaxQty = (existingMax?: number, incomingMax?: number) => {
  const e = normalizeMax(existingMax);
  if (typeof e === "number") return e;
  const i = normalizeMax(incomingMax);
  if (typeof i === "number") return i;
  return undefined;
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<AddToCartPayload>) => {
      const { product, product_size_id, sizeName, maxQty } = action.payload;

      const existingItem = state.items.find(
        (it) => it.id === product.id && it.product_size_id === product_size_id
      );

      if (existingItem) {
        const limit = resolveMaxQty(existingItem.maxQty, maxQty);
        existingItem.quantity = clampToMax(existingItem.quantity + 1, limit);

        // We only upgrade maxQty if the existing one is missing and the incoming value is valid.
        if (typeof existingItem.maxQty !== "number") {
          const normalizedIncoming = normalizeMax(maxQty);
          if (typeof normalizedIncoming === "number") existingItem.maxQty = normalizedIncoming;
        }
      } else {
        const limit = resolveMaxQty(undefined, maxQty);

        state.items.push({
          ...product,
          product_size_id,
          sizeName,
          maxQty: limit,
          quantity: clampToMax(1, limit),
        });
      }

      saveToLS(state);
    },

    removeFromCart: (state, action: PayloadAction<{ id: number; product_size_id: number }>) => {
      state.items = state.items.filter(
        (it) => !(it.id === action.payload.id && it.product_size_id === action.payload.product_size_id)
      );
      saveToLS(state);
    },

    updateQuantity: (
      state,
      action: PayloadAction<{ id: number; product_size_id: number; quantity: number }>
    ) => {
      const it = state.items.find(
        (x) => x.id === action.payload.id && x.product_size_id === action.payload.product_size_id
      );
      if (!it) return;

      it.quantity = clampToMax(action.payload.quantity, it.maxQty);
      saveToLS(state);
    },

    clearCart: (state) => {
      state.items = [];
      saveToLS(state);
    },

    setItemMaxQty: (
      state,
      action: PayloadAction<{ id: number; product_size_id: number; maxQty: number }>
    ) => {
      const it = state.items.find(
        (x) => x.id === action.payload.id && x.product_size_id === action.payload.product_size_id
      );
      if (!it) return;

      it.maxQty = normalizeMax(action.payload.maxQty);
      it.quantity = clampToMax(it.quantity, it.maxQty);
      saveToLS(state);
    },
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart, setItemMaxQty } =
  cartSlice.actions;

export default cartSlice.reducer;

type HasGuestCart = { cart: ClientCartState };

export const selectGuestCartItems = (state: HasGuestCart) => state.cart.items;

export const selectGuestCartCount = createSelector([selectGuestCartItems], (items) =>
  items.reduce((acc, it) => acc + it.quantity, 0)
);

export const selectGuestCartTotal = createSelector([selectGuestCartItems], (items) =>
  // We keep price parsing as-is to avoid breaking existing data, but the backend should ideally provide a numeric price.
  items.reduce((sum, it) => sum + parseFloat(it.price) * it.quantity, 0)
);
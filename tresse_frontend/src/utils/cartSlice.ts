import { createSlice, type PayloadAction, createSelector } from "@reduxjs/toolkit";
import type { Product } from "../types/product";

/**
 * Guest cart item stored locally (Redux + localStorage).
 * NOTE: We keep the structure stable so nothing breaks in UI or merge logic.
 */
export type GuestCartItem = Product & {
  quantity: number;
  product_size_id: number;
  sizeName?: string;
  maxQty?: number;
};

/**
 * Backwards-compatibility alias.
 * If any old file still imports ClientCartItem, it will keep working.
 */
export type ClientCartItem = GuestCartItem;

export type GuestCartState = {
  items: GuestCartItem[];
};

type AddToCartPayload = {
  product: Product;
  product_size_id: number;
  sizeName?: string;
  maxQty?: number;
};

const isBrowser = typeof window !== "undefined" && typeof localStorage !== "undefined";
const LS_KEY = "guest_cart";

function loadFromLS(): GuestCartState | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const rec = parsed as Record<string, unknown>;
      if (Array.isArray(rec.items)) return parsed as GuestCartState;
    }
  } catch {
  }
  return null;
}
// We persist guest cart on every change to keep cart state across refreshes.
// Guest cart is "UX source of truth" until login/merge moves it to the server cart.
function saveToLS(state: GuestCartState) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
  }
}

const initialState: GuestCartState = loadFromLS() ?? { items: [] };

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

const toMoney = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
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

type HasGuestCart = { cart: GuestCartState };

export const selectGuestCartItems = (state: HasGuestCart) => state.cart.items;

export const selectGuestCartCount = createSelector([selectGuestCartItems], (items) =>
  items.reduce((acc, it) => acc + it.quantity, 0)
);

export const selectGuestCartTotal = createSelector([selectGuestCartItems], (items) =>
  items.reduce((sum, it) => sum + toMoney(it.price) * it.quantity, 0)
);
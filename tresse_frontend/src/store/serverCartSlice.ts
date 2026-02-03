import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import api from "../api/axiosInstance";
import type { RootState } from ".";
import { selectGuestCartItems, clearCart as clearGuestCart } from "../utils/cartSlice";

type ProductMini = {
  id: number;
  name: string;
  price: string;
  main_image_url?: string | null;
};

type Size = {
  id: number;
  name: string;
};

type ProductSize = {
  id: number;
  product: ProductMini;
  size: Size;
  quantity: number;
};

export type CartItem = {
  id: number;
  product_size: ProductSize;
  quantity: number;
};

export type Cart = {
  id: number;
  items: CartItem[];
};

type State = {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
};

const initialState: State = {
  cart: null,
  loading: false,
  error: null,
};

const toSafeInt = (n: unknown, fallback = 1) => {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.trunc(v);
};

const clampMin1 = (n: unknown) => Math.max(1, toSafeInt(n, 1));

const isBrowser = typeof window !== "undefined" && typeof localStorage !== "undefined";
const ACCESS_KEY = "access";

const hasToken = () => {
  // We unified token checks to a single canonical key to avoid auth desync across the app.
  if (!isBrowser) return false;
  const t = localStorage.getItem(ACCESS_KEY);
  return typeof t === "string" && t.trim().length > 0;
};

export const fetchCart = createAsyncThunk<Cart | null>("serverCart/fetch", async () => {
  if (!hasToken()) return null;
  const { data } = await api.get("/products/cart/");
  return data as Cart;
});

export const mergeGuestCart = createAsyncThunk<void, void, { state: RootState }>(
  "serverCart/mergeGuestCart",
  async (_, { getState, dispatch }) => {
    // We merge guest cart into server cart only when the user is authenticated.
    if (!hasToken()) return;

    const guestItems = selectGuestCartItems(getState());
    if (!guestItems.length) return;

    // We changed the merge strategy to 1 request per cart line with quantity=qty.
    // This prevents dozens/hundreds of network requests and reduces rate-limit / timeout issues.
    const requests = guestItems.map((it) => {
      const qty = clampMin1(it.quantity);
      return api.post("/products/cart/items/", {
        product_size_id: it.product_size_id,
        quantity: qty,
      });
    });

    const results = await Promise.allSettled(requests);
    const allOk = results.every((r) => r.status === "fulfilled");

    if (allOk) {
      // We clear guest cart only after a full successful merge to prevent data loss.
      dispatch(clearGuestCart());
      await dispatch(fetchCart()).unwrap();
    } else {
      // We keep guest cart if any request fails so the user can retry without losing items.
      console.warn("mergeGuestCart: some requests failed", results);
      await dispatch(fetchCart()).unwrap();
    }
  }
);

export const addCartItem = createAsyncThunk<CartItem, { product_size_id: number }>(
  "serverCart/addItem",
  async ({ product_size_id }) => {
    const { data } = await api.post("/products/cart/items/", {
      product_size_id,
      quantity: 1,
    });
    return data as CartItem;
  }
);

export const updateCartItem = createAsyncThunk<CartItem, { item_id: number; quantity: number }>(
  "serverCart/updateItem",
  async ({ item_id, quantity }) => {
    const safeQty = clampMin1(quantity);
    const { data } = await api.put(`/products/cart/items/${item_id}/`, { quantity: safeQty });
    return data as CartItem;
  }
);

export const removeCartItem = createAsyncThunk<number, number>(
  "serverCart/removeItem",
  async (item_id) => {
    await api.delete(`/products/cart/items/${item_id}/`);
    return item_id;
  }
);

const slice = createSlice({
  name: "serverCart",
  initialState,
  reducers: {
    clearServerCart(state) {
      // We normalize the cleared state to a stable shape (empty items array) to simplify UI rendering.
      state.cart = state.cart ? { ...state.cart, items: [] } : { id: -1, items: [] };
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.cart = action.payload;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = String(action.error.message || "Failed");
      })

      .addCase(addCartItem.fulfilled, (state, action) => {
        if (!state.cart) state.cart = { id: -1, items: [] };
        const idx = state.cart.items.findIndex((i) => i.id === action.payload.id);
        if (idx >= 0) state.cart.items[idx] = action.payload;
        else state.cart.items.push(action.payload);
      })

      .addCase(updateCartItem.fulfilled, (state, action) => {
        if (!state.cart) return;
        const idx = state.cart.items.findIndex((i) => i.id === action.payload.id);
        if (idx >= 0) state.cart.items[idx] = action.payload;
      })

      .addCase(removeCartItem.fulfilled, (state, action: PayloadAction<number>) => {
        if (!state.cart) return;
        state.cart.items = state.cart.items.filter((i) => i.id !== action.payload);
      });
  },
});

export const { clearServerCart } = slice.actions;
export default slice.reducer;
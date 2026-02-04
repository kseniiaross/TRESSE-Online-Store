import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import api from "../api/axiosInstance";
import type { RootState } from ".";
import { selectGuestCartItems, clearCart as clearGuestCart } from "../utils/cartSlice";
import { getAccessToken } from "../types/token";
import type { CartDto, CartItemDto } from "../types/cart";

type State = {
  cart: CartDto | null;
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

const hasToken = () => {
  const t = getAccessToken();
  return typeof t === "string" && t.trim().length > 0;
};

/**
 * Backend compatibility shim:
 * Some environments expect `product_size_id`, others expect `product_size`.
 * We try `product_size_id` first and only retry on 400 (validation) with the alternate key.
 * Purpose: keep the client resilient across backend field naming differences without branching per env.
 */
async function postCartItem(productSizeId: number, quantity: number) {
  const qty = clampMin1(quantity);

  try {
    const { data } = await api.post<CartItemDto>("/products/cart/items/", {
      product_size_id: productSizeId,
      quantity: qty,
    });
    return data;
  } catch (err: unknown) {
    const maybeAxios = err as { response?: { status?: number; data?: unknown } };
    const status = maybeAxios?.response?.status;

    // Only retry on 400 (validation), not on other failures.
    if (status !== 400) throw err;

    // Retry with alternate field name
    const { data } = await api.post<CartItemDto>("/products/cart/items/", {
      product_size: productSizeId,
      quantity: qty,
    });
    return data;
  }
}

export const fetchCart = createAsyncThunk<CartDto | null>("serverCart/fetch", async () => {
  if (!hasToken()) return null;
  const { data } = await api.get<CartDto>("/products/cart/");
  return data;
});

export const mergeGuestCart = createAsyncThunk<void, void, { state: RootState }>(
  "serverCart/mergeGuestCart",
  async (_, { getState, dispatch }) => {
    if (!hasToken()) return;

    const guestItems = selectGuestCartItems(getState());
    if (!guestItems.length) return;

    const requests = guestItems.map((it) => postCartItem(it.product_size_id, it.quantity));

    const results = await Promise.allSettled(requests);
    const allOk = results.every((r) => r.status === "fulfilled");
    // Only clear guest cart when ALL server writes succeeded (avoid silent data loss).
    if (allOk) {
      dispatch(clearGuestCart());
    } else {
      console.warn("mergeGuestCart: some requests failed", results);
    }

    // Intentionally NOT calling fetchCart() here.
    // Cart screen fetches after merge to avoid duplicate requests.
  }
);

export const addCartItem = createAsyncThunk<CartItemDto, { product_size_id: number }>(
  "serverCart/addItem",
  async ({ product_size_id }) => {
    return await postCartItem(product_size_id, 1);
  }
);

export const updateCartItem = createAsyncThunk<CartItemDto, { item_id: number; quantity: number }>(
  "serverCart/updateItem",
  async ({ item_id, quantity }) => {
    const safeQty = clampMin1(quantity);
    const { data } = await api.put<CartItemDto>(`/products/cart/items/${item_id}/`, { quantity: safeQty });
    return data;
  }
);

export const removeCartItem = createAsyncThunk<number, number>("serverCart/removeItem", async (item_id) => {
  await api.delete(`/products/cart/items/${item_id}/`);
  return item_id;
});

const slice = createSlice({
  name: "serverCart",
  initialState,
  reducers: {
    clearServerCart(state) {
      state.cart = state.cart ? { ...state.cart, items: [] } : null;
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
        if (!state.cart) return; // UI should fetchCart() if cart isn't loaded
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
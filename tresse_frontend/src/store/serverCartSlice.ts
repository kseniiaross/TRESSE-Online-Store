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
  quantity: number; // stock
};

export type CartItem = {
  id: number;
  product_size: ProductSize;
  quantity: number; // cart quantity
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

const hasToken = () =>
  !!(
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );

/**
 * ✅ ВАЖНО:
 * Мерж гостевой корзины делаем через "инкремент",
 * чтобы не зависеть от того, как API интерпретирует quantity.
 */
export const mergeGuestCart = createAsyncThunk<void, void, { state: RootState }>(
  "serverCart/mergeGuestCart",
  async (_, { getState, dispatch }) => {
    if (!hasToken()) return;

    const guestItems = selectGuestCartItems(getState());
    if (!guestItems.length) return;

    const requests: Promise<unknown>[] = [];

    guestItems.forEach((it) => {
      const qty = clampMin1(it.quantity);
      for (let i = 0; i < qty; i += 1) {
        requests.push(
          api.post("/products/cart/items/", {
            product_size_id: it.product_size_id,
            quantity: 1, // ✅ всегда +1
          })
        );
      }
    });

    const results = await Promise.allSettled(requests);
    const allOk = results.every((r) => r.status === "fulfilled");

    if (allOk) {
      dispatch(clearGuestCart());
      await dispatch(fetchCart());
    } else {
      console.warn("mergeGuestCart: some requests failed", results);
    }
  }
);

export const fetchCart = createAsyncThunk<Cart | null>("serverCart/fetch", async () => {
  if (!hasToken()) return null;
  const { data } = await api.get("/products/cart/");
  return data as Cart;
});

/**
 * ✅ КРИТИЧЕСКИЙ ФИКС:
 * addCartItem больше НЕ принимает quantity.
 * Один клик Add to cart = quantity: 1 всегда.
 */
export const addCartItem = createAsyncThunk<CartItem, { product_size_id: number }>(
  "serverCart/addItem",
  async ({ product_size_id }) => {
    const { data } = await api.post("/products/cart/items/", {
      product_size_id,
      quantity: 1, // ✅ всегда 1, что бы ни пришло с UI
    });
    return data as CartItem;
  }
);

export const updateCartItem = createAsyncThunk<CartItem, { item_id: number; quantity: number }>(
  "serverCart/updateItem",
  async ({ item_id, quantity }) => {
    const safeQty = clampMin1(quantity);
    const { data } = await api.put(`/api/products/cart/items/${item_id}/`, { quantity: safeQty });
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
      state.cart = state.cart ? { ...state.cart, items: [] } : state.cart;
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
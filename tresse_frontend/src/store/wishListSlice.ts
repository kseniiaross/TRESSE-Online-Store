import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import api from "../api/axiosInstance";


export const fetchWishlistCount = createAsyncThunk<number>(
  "wishlist/fetchCount",
  async () => {
    // Axios already attaches Authorization header if token exists.
    // If not authorized -> backend will respond 401 -> thunk will be rejected.
    const res = await api.get<{ count: number }>("/products/wishlist/count/");
    return res.data.count;
  }
);

type WishlistState = {
  count: number;
  loading: boolean;
};

const initialState: WishlistState = {
  count: 0,
  loading: false,
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    inc: (state) => {
      state.count += 1;
    },
    dec: (state) => {
      state.count = Math.max(0, state.count - 1);
    },
    setCount: (state, action: PayloadAction<number>) => {
      state.count = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlistCount.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWishlistCount.fulfilled, (state, action) => {
        state.loading = false;
        state.count = action.payload;
      })
      .addCase(fetchWishlistCount.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { setCount, inc, dec } = wishlistSlice.actions;
export default wishlistSlice.reducer;
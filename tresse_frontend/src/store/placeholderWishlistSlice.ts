import { createSlice, PayloadAction } from '@reduxjs/toolkit';


type State = { ids: number[] };

const initialState: State = { ids: [] };

const placeholderWishlistSlice = createSlice({
  name: 'placeholderWishlist',
  initialState,
  reducers: {
    
    togglePlaceholderWish(state, action: PayloadAction<number>) {
      const id = action.payload;
      const i = state.ids.indexOf(id);
      if (i >= 0) state.ids.splice(i, 1);
      else state.ids.push(id);
    },
    clearPlaceholderWish(state) {
        state.ids = [];
  },
},
});

export const { togglePlaceholderWish, clearPlaceholderWish } =
  placeholderWishlistSlice.actions;

export default placeholderWishlistSlice.reducer;
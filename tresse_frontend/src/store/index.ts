import { configureStore } from "@reduxjs/toolkit";

import authReducer from '../utils/authSlice';
import wishlistReducer from './wishListSlice';
import clientCartReducer from '../utils/cartSlice';
import serverCartReducer from './serverCartSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    serverCart: serverCartReducer,
    wishlist: wishlistReducer,
    cart: clientCartReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchWishlistCount, setCount } from '../store/wishListSlice';
import type { AppDispatch } from '../store';

export default function useAuthStorageSync() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue) {
          dispatch(fetchWishlistCount());
        } else {
          dispatch(setCount(0));
        }
      }
      if (e.key === 'wishlist:ping') {
        dispatch(fetchWishlistCount());
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [dispatch]);
}

export interface CartProductMini {
  id: number;
  name: string;
  price: string;
  main_image_url: string | null;
}

export interface CartSizeRef {
  id: number;
  name: string;
}

export interface CartProductSize {
  id: number;
  product: CartProductMini;
  size: CartSizeRef;
  quantity: number;
}

export interface CartItemDto {
  id: number;
  product_size: CartProductSize;
  product_size_id?: number; 
  quantity: number; 
}

export interface CartDto {
  id: number;
  user: number;
  created_at: string;
  items: CartItemDto[];
}

export type GuestCartItem = {
  id: number;
  quantity: number;

  product_id?: number;
  product_size_id: number;
  size_label?: string;

  maxQty?: number;
  name: string;
  price: string | number;

  main_image_url?: string | null;
  images?: { image: string }[];
};
import type { ProductSize } from "./product";

export interface CartItemDto {
  id: number;
  product_size: ProductSize;      
  product_size_id?: number;   
  quantity: number;
}

export interface CartDto {
  id: number;
  user: number;                
  created_at: string;
  items: CartItemDto[];
};

export type GuestCartImage = { 
    image: string 
};

export type GuestCartItem = {
  id: number;
  quantity: number;
  product_size_id: number;
  maxQty?: number;
  name: string;
  price: string;
  main_image_url?: string | null;
  images?: GuestCartImage[];
};

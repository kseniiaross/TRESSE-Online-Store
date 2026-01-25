export interface ProductImage {
  id: number;
  image: string;
  alt_text?: string | null;
  sort_order: number;
}

export type ProductMini = {
  id: number;
  name: string;
  price: string;
  main_image_url: string | null;
};

export interface SizeRef {
  id: number;
  name: string;
}

export interface ProductSize {
  id: number;
  size: SizeRef;
  quantity: number;
  product: ProductMini;
}

export interface Product {
  id: number;
  name: string;
  category_name: string;
  category_slug: string;
  description?: string | null;
  price: string;
  available: boolean;
  main_image_url: string | null;
  images?: ProductImage[];
  in_stock: boolean;
  is_in_wishlist: boolean;
  created_at?: string;
  updated_at?: string;
  sizes?: ProductSize[];
}
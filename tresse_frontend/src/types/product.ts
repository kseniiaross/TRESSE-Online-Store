export interface CategoryDto {
  id: number;
  name: string;
  slug: string;
}

export interface CollectionDto {
  id: number;
  name: string;
  slug: string;
}

export interface ProductImage {
  id: number;
  image_url: string | null;       
  alt_text?: string | null;
  sort_order: number;
  is_primary?: boolean;
}

export interface SizeRef {
  id: number;
  name: string;
}

export interface ProductSizeInline {
  id: number;
  size: SizeRef;
  quantity: number;
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: string;
  available: boolean;
  main_image_url: string | null;
  category: CategoryDto;         
  collections?: CollectionDto[];  
  collections_slugs?: string[];   
  collections_names?: string[];     
  images?: ProductImage[];
  sizes?: ProductSizeInline[];
  in_stock: boolean;
  is_in_wishlist: boolean;
}
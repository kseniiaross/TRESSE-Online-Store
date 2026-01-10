
export interface AuthState {
    token:string | null;
    user: User | null;
    isLoggedIn: boolean;
}

export interface ProductImage {
    id: number;
    image: string;
    alt_text?: string | null;
    sort_order: number;
};

export type ProductMini = {
    id: number;
    name: string;
    price: string;
    main_image_url: string | null;
};

export interface Product {
    id: number;
    name: string;
    category_name: string;
    category_slug: string;
    description?: string | null;
    price: string;
    available: boolean;
    main_image_url: string | null;
    images?: { id: number; image: string; alt_text?: string | null; sort_order: number }[];
    in_stock: boolean;            
    is_in_wishlist: boolean;  
    category?: number;
    created_at?: string;
    updated_at?: string;
    quantity: number;
    sizes?: ProductSize[];
};

export interface SizeRef {
  id: number;
  name: string;
}

export interface ProductSize {
  id: number;
  size: SizeRef;        // ✅ ТОЛЬКО объект, без string | number
  quantity: number;     // ✅ остаток по размеру
  product: ProductMini; // ок
}

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

export interface LoginFormData {
    email: string;
    password: string;
}


export interface LoginRequest {
    email: string;
    password: string;
}


export interface RegisterFormData {
    first_name: string;
    last_name: string;
    phone_number: string;
    email: string;
    password: string;
}

export interface RegisterRequest {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    password: string;
}

export interface ResponseData {
    access: string;
    refresh: string;
    user: {
        id: number;
        email: string;
        first_name: string;
        last_name: string;
    };
}

export type Review = {
    id: number;
    product: number;
    user_name: string;
    rating: number;
    comment: string;
    created_at: string;
};

export interface User {
    id: number; 
    email: string;
    first_name: string;
    last_name: string;
}

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type CreateReviewDTO = Omit<Review, 'id' | 'created_at'>;
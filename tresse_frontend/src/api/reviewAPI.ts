import axiosInstance from '../utils/axiosInstance';
import { Review, CreateReviewDTO } from '../types';

export const fetchReviews = async (product: number): Promise<Review[]> => {
    try {
        const response = await axiosInstance.get<Review[]>(`products/${product}/reviews/`);
        return response.data;
    } catch (error) {
        console.error('Error fetching reviews:', error);
        throw error;
    }
    
};

export const createReview = async (
    productId: number, 
    reviewData: Omit<CreateReviewDTO, 'product'>
): Promise<Review> => {
    try {
        const response = await axiosInstance.post<Review>(
            `/products/${productId}/reviews/`, 
            { ...reviewData, product: productId }
        );
        return response.data; 
    }   catch (error) {
        console.error('Error creating review:', error);
        throw error;
    }    
};




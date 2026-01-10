import api from "./axiosInstance";

type FetchProductsParams = {
  search?: string;
  category?: string;
  page?: number;
  page_size?: number;
};

export const fetchProducts = async (params?: FetchProductsParams) => {
  const response = await api.get('/products/', {
    params,
  });

  return response.data;
};
/**
 * Products API
 * واجهة برمجة التطبيقات للأصناف
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';
import { API_CACHE_CONFIG } from '@/lib/config';

// تعريف أنواع البيانات
export interface Product {
  id: number;
  sku: string;
  name: string;
  unit?: string;
  unitsPerBox?: number; // عدد الوحدات في الصندوق الواحد
  createdByCompanyId: number;
  createdByCompany: {
    id: number;
    name: string;
    code: string;
  };
  createdAt: string;
  updatedAt: string;
  stock?: {
    boxes: number; // عدد الصناديق
    updatedAt: string;
  };
  price?: {
    sellPrice: number;
    updatedAt: string;
  };
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  unit?: string;
  unitsPerBox?: number; // عدد الوحدات في الصندوق
  createdByCompanyId: number;
  sellPrice?: number;
  initialBoxes?: number; // عدد الصناديق الأولية
}

export interface UpdateProductRequest {
  sku?: string;
  name?: string;
  unit?: string;
  unitsPerBox?: number; // عدد الوحدات في الصندوق
  sellPrice?: number;
}

export interface GetProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: number;
  unit?: string;
}

export interface UpdateStockRequest {
  productId: number;
  companyId: number;
  quantity: number;
}

export interface UpdatePriceRequest {
  productId: number;
  companyId: number;
  sellPrice: number;
}

// تعريف أنواع الاستجابة
export interface ProductsResponse {
  success: boolean;
  message: string;
  data: {
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface ProductResponse {
  success: boolean;
  message: string;
  data?: Product;
}

export interface ProductStats {
  totalProducts: number;
  productsWithStock: number;
  productsWithoutStock: number;
  totalStockValue: number;
  averageProductPrice: number;
}

export interface ProductStatsResponse {
  success: boolean;
  message: string;
  data: ProductStats;
}

export const productsApi = createApi({
  reducerPath: "productsApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["Products", "Product", "ProductStats"],
  ...API_CACHE_CONFIG.products,
  endpoints: (builder) => ({
    // الحصول على قائمة الأصناف
    getProducts: builder.query<ProductsResponse, GetProductsQuery>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.search) searchParams.append('search', params.search);
        if (params.companyId) searchParams.append('companyId', params.companyId.toString());
        if (params.unit) searchParams.append('unit', params.unit);
        
        const queryString = searchParams.toString();
        return `/products${queryString ? `?${queryString}` : ''}`;
      },
    }),

    // الحصول على صنف واحد
    getProduct: builder.query<ProductResponse, number>({
      query: (id) => `/products/${id}`,
    }),

    // إنشاء صنف جديد
    createProduct: builder.mutation<ProductResponse, CreateProductRequest>({
      query: (productData) => ({
        url: "/products",
        method: "POST",
        body: productData,
      }),
    }),

    // تحديث صنف
    updateProduct: builder.mutation<ProductResponse, { id: number; productData: UpdateProductRequest }>({
      query: ({ id, productData }) => ({
        url: `/products/${id}`,
        method: "PUT",
        body: productData,
      }),
    }),

    // حذف صنف
    deleteProduct: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/products/${id}`,
        method: "DELETE",
      }),
    }),

    // تحديث المخزون
    updateStock: builder.mutation<{ success: boolean; message: string }, UpdateStockRequest>({
      query: (stockData) => ({
        url: "/products/stock/update",
        method: "PUT",
        body: stockData,
      }),
    }),

    // تحديث السعر
    updatePrice: builder.mutation<{ success: boolean; message: string }, UpdatePriceRequest>({
      query: (priceData) => ({
        url: "/products/price/update",
        method: "PUT",
        body: priceData,
      }),
    }),

    // الحصول على إحصائيات الأصناف
    getProductStats: builder.query<ProductStatsResponse, void>({
      query: () => "/products/stats",
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUpdateStockMutation,
  useUpdatePriceMutation,
  useGetProductStatsQuery,
} = productsApi;

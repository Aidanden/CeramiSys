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
  cost?: number; // تكلفة المنتج
  unitsPerBox?: number; // عدد الوحدات في الصندوق الواحد
  qrCode?: string; // QR Code كـ Data URL
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
  sku?: string;
  companyId?: number;
  unit?: string;
  strict?: boolean;
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

export interface TopSellingProduct {
  productId: number;
  productName: string;
  sku: string;
  totalQuantitySold: number;
  totalRevenue: number;
  unit: string;
}

export interface LowStockProduct {
  productId: number;
  productName: string;
  sku: string;
  currentStock: number;
  totalUnits: number;
  unit: string;
  unitsPerBox: number;
  stockStatus: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
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
        if (params.sku) searchParams.append('sku', params.sku);
        if (params.companyId) searchParams.append('companyId', params.companyId.toString());
        if (params.unit) searchParams.append('unit', params.unit);
        if (params.strict) searchParams.append('strict', 'true');

        // إضافة timestamp لمنع الـ cache في المتصفح
        searchParams.append('_t', Date.now().toString());

        const queryString = searchParams.toString();
        return `/products${queryString ? `?${queryString}` : ''}`;
      },
      // إجبار إعادة الجلب دائماً - بدون cache
      keepUnusedDataFor: 0,
      providesTags: (result) =>
        result?.data?.products
          ? [
            ...result.data.products.map(({ id }) => ({ type: 'Product' as const, id })),
            { type: 'Products', id: 'LIST' },
          ]
          : [{ type: 'Products', id: 'LIST' }],
    }),

    // الحصول على صنف واحد
    getProduct: builder.query<ProductResponse, number>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),

    // إنشاء صنف جديد
    createProduct: builder.mutation<ProductResponse, CreateProductRequest>({
      query: (productData) => ({
        url: "/products",
        method: "POST",
        body: productData,
      }),
      // الحل الجذري: invalidate جميع الـ tags لإعادة جلب البيانات تلقائياً
      invalidatesTags: ['Products', 'Product', 'ProductStats'],
    }),

    // تحديث صنف
    updateProduct: builder.mutation<ProductResponse, { id: number; productData: UpdateProductRequest }>({
      query: ({ id, productData }) => ({
        url: `/products/${id}`,
        method: "PUT",
        body: productData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Product', id },
        { type: 'Products', id: 'LIST' },
        'ProductStats'
      ],
      async onQueryStarted({ id, productData }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(productsApi.util.invalidateTags([{ type: 'Products', id: 'LIST' }]));
        } catch (error) {
          // Error handled by RTK Query
        }
      },
    }),

    // حذف صنف
    deleteProduct: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ['Products', 'ProductStats'],
    }),

    // تحديث المخزون
    updateStock: builder.mutation<{ success: boolean; message: string }, UpdateStockRequest>({
      query: (stockData) => ({
        url: "/products/stock/update",
        method: "PUT",
        body: stockData,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: 'Product', id: productId },
        { type: 'Products', id: 'LIST' },
        'ProductStats'
      ],
      async onQueryStarted({ productId, quantity }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;

          // تحديث فوري لجميع الـ queries
          dispatch(productsApi.util.invalidateTags([{ type: 'Products', id: 'LIST' }]));

        } catch {
          // في حالة الخطأ، سيتم التعامل معه في المكون
        }
      },
    }),

    // تحديث السعر
    updatePrice: builder.mutation<{ success: boolean; message: string }, UpdatePriceRequest>({
      query: (priceData) => ({
        url: "/products/price/update",
        method: "PUT",
        body: priceData,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: 'Product', id: productId },
        { type: 'Products', id: 'LIST' },
        'ProductStats'
      ],
      async onQueryStarted({ productId, sellPrice }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;

          // تحديث فوري لجميع الـ queries
          dispatch(productsApi.util.invalidateTags([{ type: 'Products', id: 'LIST' }]));

        } catch {
          // في حالة الخطأ، سيتم التعامل معه في المكون
        }
      },
    }),

    // الحصول على إحصائيات الأصناف
    getProductStats: builder.query<ProductStatsResponse, void>({
      query: () => "/products/stats",
      providesTags: ['ProductStats'],
    }),

    // الحصول على الأصناف الأكثر مبيعاً
    getTopSellingProducts: builder.query<{
      success: boolean;
      message: string;
      data: TopSellingProduct[];
    }, { limit?: number; companyId?: number }>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.companyId) searchParams.append('companyId', params.companyId.toString());
        return `/products/top-selling?${searchParams.toString()}`;
      },
      providesTags: ['ProductStats'],
    }),

    // الحصول على الأصناف التي ستنتهي قريباً
    getLowStockProducts: builder.query<{
      success: boolean;
      message: string;
      data: LowStockProduct[];
    }, { limit?: number; companyId?: number }>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.companyId) searchParams.append('companyId', params.companyId.toString());
        return `/products/low-stock?${searchParams.toString()}`;
      },
      providesTags: ['ProductStats'],
    }),

    getParentCompanyProducts: builder.query<{
      success: boolean;
      message: string;
      data: Array<{
        id: number;
        name: string;
        sku: string;
        unit: string;
        unitsPerBox: number;
        currentStock: number;
        unitPrice: number;
      }>;
    }, { parentCompanyId: number }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        searchParams.append('parentCompanyId', params.parentCompanyId.toString());
        return `/products/parent-company?${searchParams.toString()}`;
      },
      providesTags: ['Product'],
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
  useGetTopSellingProductsQuery,
  useGetLowStockProductsQuery,
  useGetParentCompanyProductsQuery,
} = productsApi;

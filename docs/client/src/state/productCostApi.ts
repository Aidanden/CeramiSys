import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';

export interface ProductCostInfo {
    productId: number;
    productName: string;
    productSku: string;
    unit: string | null;
    currentCost: number | null;
    lastPurchase: {
        id: number;
        invoiceNumber: string | null;
        purchaseDate: string;
        currency: string;
        exchangeRate: number;
        qty: number;
        unitPrice: number;
        subTotal: number;
        totalExpenses: number;
        expenseShareAmount: number;
        expenseSharePercentage: number;
        // تفاصيل المصروفات الفردية
        expenseDetails: Array<{
            id: number;
            categoryName: string;
            supplierName: string | null;
            currency: string;
            amountForeign: number | null;
            exchangeRate: number;
            amountLYD: number;
        }>;
        totalWithExpenses: number;
        totalInLYD: number;
        calculatedCostPerUnit: number;
    } | null;
}

export interface ProductWithCostInfo {
    id: number;
    name: string;
    sku: string;
    unit: string | null;
    cost: number | null;
    companyId: number;
    company: {
        id: number;
        name: string;
        code: string;
    };
    updatedAt: string;
    hasLastPurchase: boolean;
    lastPurchase: {
        id: number;
        invoiceNumber: string | null;
        createdAt: string;
        currency: string;
    } | null;
}

export interface GetProductsWithCostQuery {
    page?: number;
    limit?: number;
    search?: string;
    companyId?: number;
    hasCost?: boolean;
}

export interface UpdateProductCostRequest {
    productId: number;
    newCost: number;
    purchaseId: number;
    exchangeRateUsed: number;
    notes?: string;
}

export interface CalculateCostRequest {
    exchangeRate: number;
}

export const productCostApi = createApi({
    reducerPath: 'productCostApi',
    baseQuery: baseQueryWithAuthInterceptor,
    tagTypes: ['ProductCost', 'ProductCostList'],
    endpoints: (builder) => ({
        // الحصول على قائمة الأصناف مع معلومات التكلفة
        getProductsWithCostInfo: builder.query<
            { products: ProductWithCostInfo[]; pagination: any },
            GetProductsWithCostQuery
        >({
            query: (params) => ({
                url: '/product-cost/products',
                params
            }),
            transformResponse: (response: any) => response.data,
            providesTags: ['ProductCostList']
        }),

        // الحصول على معلومات تكلفة صنف معين
        getProductCostInfo: builder.query<ProductCostInfo, number>({
            query: (productId) => `/product-cost/products/${productId}`,
            transformResponse: (response: any) => response.data,
            providesTags: (result, error, productId) => [
                { type: 'ProductCost', id: productId }
            ]
        }),

        // حساب التكلفة مع سعر صرف مخصص
        calculateCostWithCustomRate: builder.mutation<
            ProductCostInfo,
            { productId: number; exchangeRate: number }
        >({
            query: ({ productId, exchangeRate }) => ({
                url: `/product-cost/products/${productId}/calculate`,
                method: 'POST',
                body: { exchangeRate }
            }),
            transformResponse: (response: any) => response.data
        }),

        // تحديث تكلفة الصنف
        updateProductCost: builder.mutation<
            { success: boolean; message: string; product: any },
            UpdateProductCostRequest
        >({
            query: (data) => ({
                url: '/product-cost/update',
                method: 'POST',
                body: data
            }),
            invalidatesTags: (result, error, { productId }) => [
                { type: 'ProductCost', id: productId },
                'ProductCostList'
            ]
        })
    })
});

export const {
    useGetProductsWithCostInfoQuery,
    useGetProductCostInfoQuery,
    useCalculateCostWithCustomRateMutation,
    useUpdateProductCostMutation
} = productCostApi;

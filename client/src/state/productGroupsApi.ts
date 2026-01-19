/**
 * Product Groups API
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';

export interface Supplier {
    id: number;
    name: string;
    phone?: string;
    email?: string;
}

export interface ProductGroup {
    id: number;
    name: string;
    maxDiscountPercentage?: number | null;
    supplierId?: number | null;
    currency?: string;
    supplier?: Supplier;
    suppliers?: Supplier[];
    productsCount?: number;
    createdAt?: string;
    updatedAt?: string;
    products?: any[];
}

export interface ProductWithGroupStatus {
    id: number;
    sku: string;
    name: string;
    groupId: number | null;
    isInGroup: boolean;
    companyName: string;
}

export interface ProductGroupsResponse {
    success: boolean;
    data?: ProductGroup[];
}

export interface ProductGroupResponse {
    success: boolean;
    data?: ProductGroup;
}

export interface ProductsWithGroupStatusResponse {
    success: boolean;
    data: ProductWithGroupStatus[];
}

export interface AssignProductsResponse {
    success: boolean;
    message: string;
    data: {
        updatedCount: number;
        groupId: number;
        groupName: string;
    };
}

export const productGroupsApi = createApi({
    reducerPath: "productGroupsApi",
    baseQuery: baseQueryWithAuthInterceptor,
    tagTypes: ["ProductGroups", "ProductsGroupStatus"],
    endpoints: (builder) => ({
        getProductGroups: builder.query<ProductGroup[], void>({
            query: () => "/product-groups",
            providesTags: ["ProductGroups"],
        }),
        getProductGroup: builder.query<ProductGroup, number>({
            query: (id) => `/product-groups/${id}`,
            providesTags: (result, error, id) => [{ type: "ProductGroups", id }],
        }),
        searchProductGroups: builder.query<ProductGroup[], string>({
            query: (searchQuery) => `/product-groups/search?q=${encodeURIComponent(searchQuery)}`,
            providesTags: ["ProductGroups"],
        }),
        getGroupPurchaseReport: builder.query<any, number>({
            query: (groupId) => `/product-groups/${groupId}/purchase-report`,
        }),
        getProductsWithGroupStatus: builder.query<ProductsWithGroupStatusResponse, number | undefined>({
            query: (groupId) => `/product-groups/products${groupId ? `?groupId=${groupId}` : ''}`,
            providesTags: ["ProductsGroupStatus"],
        }),
        createProductGroup: builder.mutation<ProductGroup, Partial<ProductGroup>>({
            query: (data) => ({
                url: "/product-groups",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["ProductGroups"],
        }),
        updateProductGroup: builder.mutation<ProductGroup, { id: number; data: Partial<ProductGroup> }>({
            query: ({ id, data }) => ({
                url: `/product-groups/${id}`,
                method: "PUT",
                body: data,
            }),
            invalidatesTags: ["ProductGroups"],
        }),
        deleteProductGroup: builder.mutation<{ success: boolean; message: string }, number>({
            query: (id) => ({
                url: `/product-groups/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["ProductGroups"],
        }),
        assignProductsToGroup: builder.mutation<AssignProductsResponse, { groupId: number; productIds: number[] }>({
            query: ({ groupId, productIds }) => ({
                url: `/product-groups/${groupId}/assign-products`,
                method: "POST",
                body: { productIds },
            }),
            invalidatesTags: ["ProductGroups", "ProductsGroupStatus"],
        }),
        removeProductsFromGroup: builder.mutation<{ success: boolean; message: string }, number[]>({
            query: (productIds) => ({
                url: `/product-groups/remove-products`,
                method: "POST",
                body: { productIds },
            }),
            invalidatesTags: ["ProductGroups", "ProductsGroupStatus"],
        }),
    }),
});

export const {
    useGetProductGroupsQuery,
    useGetProductGroupQuery,
    useSearchProductGroupsQuery,
    useGetGroupPurchaseReportQuery,
    useGetProductsWithGroupStatusQuery,
    useCreateProductGroupMutation,
    useUpdateProductGroupMutation,
    useDeleteProductGroupMutation,
    useAssignProductsToGroupMutation,
    useRemoveProductsFromGroupMutation,
} = productGroupsApi;

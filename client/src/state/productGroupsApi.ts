/**
 * Product Groups API
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';

export interface ProductGroup {
    id: number;
    name: string;
    maxDiscountPercentage: number;
    _count?: {
        products: number;
    };
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
    data: ProductGroup[];
}

export interface ProductGroupResponse {
    success: boolean;
    data: ProductGroup;
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
        getProductGroups: builder.query<ProductGroupsResponse, void>({
            query: () => "/product-groups",
            providesTags: ["ProductGroups"],
        }),
        getProductGroup: builder.query<ProductGroupResponse, number>({
            query: (id) => `/product-groups/${id}`,
            providesTags: (result, error, id) => [{ type: "ProductGroups", id }],
        }),
        getProductsWithGroupStatus: builder.query<ProductsWithGroupStatusResponse, number | undefined>({
            query: (groupId) => `/product-groups/products${groupId ? `?groupId=${groupId}` : ''}`,
            providesTags: ["ProductsGroupStatus"],
        }),
        createProductGroup: builder.mutation<ProductGroupResponse, Partial<ProductGroup>>({
            query: (data) => ({
                url: "/product-groups",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["ProductGroups"],
        }),
        updateProductGroup: builder.mutation<ProductGroupResponse, { id: number; data: Partial<ProductGroup> }>({
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
    useGetProductsWithGroupStatusQuery,
    useCreateProductGroupMutation,
    useUpdateProductGroupMutation,
    useDeleteProductGroupMutation,
    useAssignProductsToGroupMutation,
    useRemoveProductsFromGroupMutation,
} = productGroupsApi;

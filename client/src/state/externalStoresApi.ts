import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';

export interface ExternalStoreProductAssignment {
    id: number;
    productId: number;
    product?: {
        id: number;
        sku: string;
        name: string;
        unit: string;
    };
}

export interface ExternalStore {
    id: number;
    name: string;
    ownerName: string;
    phone1: string;
    phone2?: string;
    address?: string;
    googleMapsUrl?: string;
    isActive: boolean;
    showPrices: boolean;
    createdAt: string;
    updatedAt: string;
    customerId?: number;
    customer?: {
        id: number;
        name: string;
        phone?: string;
        address?: string;
    };
    users?: ExternalStoreUser[];
    productAssignments?: ExternalStoreProductAssignment[];
    _count?: {
        users: number;
        productAssignments: number;
        invoices: number;
    };
}

export interface ExternalStoreUser {
    id: string;
    username: string;
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
}

export interface CreateStoreRequest {
    name: string;
    ownerName: string;
    phone1: string;
    phone2?: string;
    address?: string;
    googleMapsUrl?: string;
    customerId?: number;
}

export type UpdateStoreRequest = Partial<CreateStoreRequest> & {
    isActive?: boolean;
    showPrices?: boolean;
};

export interface CreateStoreUserRequest {
    username: string;
    password: string;
}

export interface UpdateStoreUserRequest {
    username?: string;
    password?: string;
    isActive?: boolean;
}

export interface AssignProductsRequest {
    productIds: number[];
}

export const externalStoresApi = createApi({
    reducerPath: 'externalStoresApi',
    baseQuery: baseQueryWithAuthInterceptor,
    tagTypes: ['ExternalStores', 'StoreProducts'],
    endpoints: (builder) => ({
        // Get all stores
        getStores: builder.query<
            {
                stores: ExternalStore[];
                pagination: {
                    total: number;
                    page: number;
                    limit: number;
                    totalPages: number;
                };
            },
            { page?: number; limit?: number; search?: string; isActive?: boolean }
        >({
            query: (params) => ({
                url: '/external-stores',
                params,
            }),
            providesTags: ['ExternalStores'],
        }),

        // Get store by ID
        getStoreById: builder.query<ExternalStore, number>({
            query: (id) => `/external-stores/${id}`,
            providesTags: (result, error, id) => [{ type: 'ExternalStores', id }],
        }),

        // Create store
        createStore: builder.mutation<ExternalStore, CreateStoreRequest>({
            query: (data) => ({
                url: '/external-stores',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['ExternalStores'],
        }),

        // Update store
        updateStore: builder.mutation<ExternalStore, { id: number; data: UpdateStoreRequest }>({
            query: ({ id, data }) => ({
                url: `/external-stores/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                'ExternalStores',
                { type: 'ExternalStores', id },
            ],
        }),

        // Delete store
        deleteStore: builder.mutation<void, number>({
            query: (id) => ({
                url: `/external-stores/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['ExternalStores'],
        }),

        // Create store user
        createStoreUser: builder.mutation<
            ExternalStoreUser,
            { storeId: number; data: CreateStoreUserRequest }
        >({
            query: ({ storeId, data }) => ({
                url: `/external-stores/${storeId}/users`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (result, error, { storeId }) => [
                { type: 'ExternalStores', id: storeId },
            ],
        }),

        // Update store user
        updateStoreUser: builder.mutation<
            ExternalStoreUser,
            { storeId: number; userId: string; data: UpdateStoreUserRequest }
        >({
            query: ({ storeId, userId, data }) => ({
                url: `/external-stores/${storeId}/users/${userId}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (result, error, { storeId, userId }) => [
                { type: 'ExternalStores', id: storeId },
                { type: 'ExternalStores', id: userId as unknown as number },
            ],
        }),

        // Get store products
        getStoreProducts: builder.query<any[], number>({
            query: (storeId) => `/external-stores/${storeId}/products`,
            providesTags: (result, error, storeId) => [{ type: 'StoreProducts', id: storeId }],
        }),

        // Assign products to store
        assignProducts: builder.mutation<
            void,
            { storeId: number; data: AssignProductsRequest }
        >({
            query: ({ storeId, data }) => ({
                url: `/external-stores/${storeId}/products`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (result, error, { storeId }) => [
                { type: 'StoreProducts', id: storeId },
                { type: 'ExternalStores', id: storeId },
            ],
        }),

        // Remove product from store
        removeProduct: builder.mutation<void, { storeId: number; productId: number }>({
            query: ({ storeId, productId }) => ({
                url: `/external-stores/${storeId}/products/${productId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { storeId }) => [
                { type: 'StoreProducts', id: storeId },
            ],
        }),
    }),
});

export const {
    useGetStoresQuery,
    useGetStoreByIdQuery,
    useCreateStoreMutation,
    useUpdateStoreMutation,
    useDeleteStoreMutation,
    useCreateStoreUserMutation,
    useUpdateStoreUserMutation,
    useGetStoreProductsQuery,
    useAssignProductsMutation,
    useRemoveProductMutation,
} = externalStoresApi;

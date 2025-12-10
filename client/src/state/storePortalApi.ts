import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_CONFIG } from '@/lib/config';

export interface StoreUser {
    id: string;
    username: string;
    storeId: number;
    storeName: string;
}

export interface LoginResponse {
    token: string;
    user: StoreUser;
}

export const storePortalApi = createApi({
    reducerPath: 'storePortalApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${API_CONFIG.baseUrl}/store-portal`,
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('storeToken'); // تخزين توكن المحل بشكل منفصل
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ['StoreInvoices', 'StoreProducts', 'StoreProfile'],
    endpoints: (builder) => ({
        // Login
        login: builder.mutation<LoginResponse, { username: string; password: string }>({
            query: (credentials) => ({
                url: '/auth/login',
                method: 'POST',
                body: credentials,
            }),
        }),

        // Get Current User
        getCurrentUser: builder.query<any, void>({
            query: () => '/auth/me',
            providesTags: ['StoreProfile'],
        }),

        // Get Available Products
        getAvailableProducts: builder.query<any[], void>({
            query: () => '/products',
            providesTags: ['StoreProducts'],
        }),

        // Get Invoices
        getInvoices: builder.query<any, void>({
            query: () => '/invoices',
            providesTags: ['StoreInvoices'],
        }),

        // Create Invoice
        createInvoice: builder.mutation<any, { lines: any[]; notes?: string }>({
            query: (data) => ({
                url: '/invoices',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['StoreInvoices'],
        }),

        // Get Invoice Stats
        getInvoiceStats: builder.query<any, void>({
            query: () => '/invoices/stats',
            providesTags: ['StoreInvoices'],
        }),
    }),
});

export const {
    useLoginMutation,
    useGetCurrentUserQuery,
    useGetAvailableProductsQuery,
    useGetInvoicesQuery,
    useCreateInvoiceMutation,
    useGetInvoiceStatsQuery,
} = storePortalApi;

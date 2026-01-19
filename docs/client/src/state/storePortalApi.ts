import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_CONFIG } from '@/lib/config';

export interface StoreUser {
    id: string;
    username: string;
    storeId: number;
    storeName: string;
}

export interface StoreInfo {
    id: number;
    name: string;
    ownerName: string;
    phone1: string;
    address: string;
    showPrices: boolean;
}

export interface LoginResponse {
    token: string;
    user: StoreUser;
    store: StoreInfo;
}

export interface CurrentUserResponse {
    user: StoreUser;
    store: StoreInfo;
}

export const storePortalApi = createApi({
    reducerPath: 'storePortalApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${API_CONFIG.baseUrl}/store-portal`,
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('storeToken');
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            // إضافة timestamp لمنع الـ browser caching
            headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            headers.set('Pragma', 'no-cache');
            return headers;
        },
    }),
    // تعطيل الـ cache بالكامل لضمان عدم تداخل البيانات
    keepUnusedDataFor: 0,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    tagTypes: ['StoreInvoices', 'StoreProducts', 'StoreProfile'],
    endpoints: (builder) => ({
        // Login
        login: builder.mutation<LoginResponse, { username: string; password: string }>({
            query: (credentials) => ({
                url: '/auth/login',
                method: 'POST',
                body: credentials,
            }),
            // مسح جميع الـ cache عند تسجيل الدخول لضمان عدم وجود بيانات قديمة
            invalidatesTags: ['StoreProfile', 'StoreInvoices', 'StoreProducts'],
        }),

        // Logout
        logout: builder.mutation<void, void>({
            query: () => ({
                url: '/auth/logout',
                method: 'POST',
            }),
            // مسح جميع الـ cache عند تسجيل الخروج
            invalidatesTags: ['StoreProfile', 'StoreInvoices', 'StoreProducts'],
        }),

        // Get Current User
        getCurrentUser: builder.query<CurrentUserResponse, void>({
            query: () => '/auth/me',
            providesTags: ['StoreProfile'],
            // تعطيل الـ cache لضمان جلب البيانات الصحيحة دائماً
            keepUnusedDataFor: 0,
        }),

        // Get Available Products
        getAvailableProducts: builder.query<any[], void>({
            query: () => '/products',
            providesTags: ['StoreProducts'],
            // تعطيل الـ cache لضمان جلب البيانات الصحيحة دائماً
            keepUnusedDataFor: 0,
        }),

        // Get Invoices
        getInvoices: builder.query<any, void>({
            query: () => '/invoices',
            providesTags: ['StoreInvoices'],
            // تعطيل الـ cache لضمان جلب البيانات الصحيحة دائماً
            keepUnusedDataFor: 0,
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
            // تعطيل الـ cache لضمان جلب البيانات الصحيحة دائماً
            keepUnusedDataFor: 0,
        }),
    }),
});

export const {
    useLoginMutation,
    useLogoutMutation,
    useGetCurrentUserQuery,
    useGetAvailableProductsQuery,
    useGetInvoicesQuery,
    useCreateInvoiceMutation,
    useGetInvoiceStatsQuery,
} = storePortalApi;

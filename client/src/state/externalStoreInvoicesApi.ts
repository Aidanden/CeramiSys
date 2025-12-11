import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export type InvoiceStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ExternalStoreInvoice {
    id: number;
    storeId: number;
    invoiceNumber?: string;
    total: number;
    status: InvoiceStatus;
    notes?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
    store: {
        id: number;
        name: string;
        ownerName: string;
    };
    lines: ExternalStoreInvoiceLine[];
}

export interface ExternalStoreInvoiceLine {
    id: number;
    invoiceId: number;
    productId: number;
    qty: number;
    unitPrice: number;
    subTotal: number;
    product: {
        id: number;
        sku: string;
        name: string;
        unit?: string;
    };
}

export interface CreateInvoiceRequest {
    lines: {
        productId: number;
        qty: number;
        unitPrice: number;
    }[];
    notes?: string;
}

export interface InvoiceStats {
    totalInvoices: number;
    pendingInvoices: number;
    approvedInvoices: number;
    rejectedInvoices: number;
    totalAmount: number;
}

export const externalStoreInvoicesApi = createApi({
    reducerPath: 'externalStoreInvoicesApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${API_BASE_URL}/api`,
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('token');
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ['ExternalStoreInvoices', 'InvoiceStats'],
    endpoints: (builder) => ({
        // Get all invoices (admin)
        getInvoices: builder.query<
            {
                invoices: ExternalStoreInvoice[];
                pagination: {
                    total: number;
                    page: number;
                    limit: number;
                    totalPages: number;
                };
            },
            { page?: number; limit?: number; status?: InvoiceStatus; storeId?: number }
        >({
            query: (params) => ({
                url: '/external-store-invoices',
                params,
            }),
            providesTags: ['ExternalStoreInvoices'],
        }),

        // Get invoice by ID
        getInvoiceById: builder.query<ExternalStoreInvoice, number>({
            query: (id) => `/external-store-invoices/${id}`,
            providesTags: (result, error, id) => [{ type: 'ExternalStoreInvoices', id }],
        }),

        // Approve invoice
        approveInvoice: builder.mutation<ExternalStoreInvoice, number>({
            query: (id) => ({
                url: `/external-store-invoices/${id}/approve`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, id) => [
                'ExternalStoreInvoices',
                'InvoiceStats',
                { type: 'ExternalStoreInvoices', id },
            ],
        }),

        // Reject invoice
        rejectInvoice: builder.mutation<ExternalStoreInvoice, { id: number; reason?: string }>({
            query: ({ id, reason }) => ({
                url: `/external-store-invoices/${id}/reject`,
                method: 'POST',
                body: { reason },
            }),
            invalidatesTags: (result, error, { id }) => [
                'ExternalStoreInvoices',
                'InvoiceStats',
                { type: 'ExternalStoreInvoices', id },
            ],
        }),

        // Get invoice stats
        getInvoiceStats: builder.query<InvoiceStats, void>({
            query: () => '/external-store-invoices/stats',
            providesTags: ['InvoiceStats'],
        }),
    }),
});

export const {
    useGetInvoicesQuery,
    useGetInvoiceByIdQuery,
    useApproveInvoiceMutation,
    useRejectInvoiceMutation,
    useGetInvoiceStatsQuery,
} = externalStoreInvoicesApi;

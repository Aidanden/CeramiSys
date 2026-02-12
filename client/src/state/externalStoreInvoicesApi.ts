import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';

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
        unitsPerBox?: number;
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
    baseQuery: baseQueryWithAuthInterceptor,
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
            keepUnusedDataFor: 0,
        }),

        // Get invoice by ID
        getInvoiceById: builder.query<ExternalStoreInvoice, number>({
            query: (id) => `/external-store-invoices/${id}`,
            providesTags: (result, error, id) => [{ type: 'ExternalStoreInvoices', id }],
        }),

        // Approve invoice
        approveInvoice: builder.mutation<{
            invoice: ExternalStoreInvoice;
            sale: any;
            dispatchOrder: any;
        }, number>({
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

        // Update invoice (admin)
        updateInvoice: builder.mutation<ExternalStoreInvoice, { id: number; data: CreateInvoiceRequest }>({
            query: ({ id, data }) => ({
                url: `/external-store-invoices/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                'ExternalStoreInvoices',
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
    useUpdateInvoiceMutation,
    useGetInvoiceStatsQuery,
} = externalStoreInvoicesApi;

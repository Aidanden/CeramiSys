import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';

// أنواع البيانات
export interface Treasury {
    id: number;
    name: string;
    type: 'COMPANY' | 'GENERAL' | 'BANK';
    companyId: number | null;
    bankName: string | null;
    accountNumber: string | null;
    balance: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    company?: {
        id: number;
        name: string;
        code: string;
    };
}

export interface TreasuryTransaction {
    id: number;
    treasuryId: number;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
    source: 'RECEIPT' | 'PAYMENT' | 'MANUAL' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'OPENING_BALANCE';
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string | null;
    referenceType: string | null;
    referenceId: number | null;
    relatedTreasuryId: number | null;
    createdBy: string | null;
    createdAt: string;
    treasury?: Treasury;
}

export interface TreasuryStats {
    totalBalance: number;
    totalCompanyBalance: number;
    totalGeneralBalance: number;
    totalBankBalance: number;
    companyTreasuries: Treasury[];
    generalTreasuries: Treasury[];
    bankAccounts: Treasury[];
}

export interface CreateTreasuryRequest {
    name: string;
    type: 'COMPANY' | 'GENERAL' | 'BANK';
    companyId?: number;
    bankName?: string;
    accountNumber?: string;
    openingBalance?: number;
}

export interface UpdateTreasuryRequest {
    name?: string;
    bankName?: string;
    accountNumber?: string;
    isActive?: boolean;
}

export interface CreateTransactionRequest {
    treasuryId: number;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    description?: string;
}

export interface TransferRequest {
    fromTreasuryId: number;
    toTreasuryId: number;
    amount: number;
    description?: string;
}

export interface TransactionsResponse {
    transactions: TreasuryTransaction[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface TransactionsQuery {
    treasuryId?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
    source?: string;
    page?: number;
    limit?: number;
}

// إنشاء الـ API
export const treasuryApi = createApi({
    reducerPath: 'treasuryApi',
    baseQuery: baseQueryWithAuthInterceptor,
    tagTypes: ['Treasury', 'TreasuryTransaction', 'TreasuryStats'],
    endpoints: (builder) => ({
        // الحصول على جميع الخزائن
        getTreasuries: builder.query<Treasury[], { type?: string; companyId?: number; isActive?: boolean }>({
            query: (params) => ({
                url: '/treasury',
                params,
            }),
            providesTags: ['Treasury'],
        }),

        // الحصول على خزينة واحدة
        getTreasuryById: builder.query<Treasury, number>({
            query: (id) => `/treasury/${id}`,
            providesTags: (result, error, id) => [{ type: 'Treasury', id }],
        }),

        // إحصائيات الخزائن
        getTreasuryStats: builder.query<TreasuryStats, void>({
            query: () => '/treasury/stats',
            providesTags: ['TreasuryStats'],
        }),

        // الحصول على جميع الحركات
        getAllTransactions: builder.query<TransactionsResponse, TransactionsQuery>({
            query: (params) => ({
                url: '/treasury/transactions',
                params,
            }),
            providesTags: ['TreasuryTransaction'],
        }),

        // الحصول على حركات خزينة معينة
        getTreasuryTransactions: builder.query<TransactionsResponse, { treasuryId: number } & TransactionsQuery>({
            query: ({ treasuryId, ...params }) => ({
                url: `/treasury/${treasuryId}/transactions`,
                params,
            }),
            providesTags: (result, error, { treasuryId }) => [
                { type: 'TreasuryTransaction', id: treasuryId },
            ],
        }),

        // إنشاء خزينة جديدة
        createTreasury: builder.mutation<Treasury, CreateTreasuryRequest>({
            query: (data) => ({
                url: '/treasury',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Treasury', 'TreasuryStats'],
        }),

        // تحديث خزينة
        updateTreasury: builder.mutation<Treasury, { id: number; data: UpdateTreasuryRequest }>({
            query: ({ id, data }) => ({
                url: `/treasury/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Treasury', 'TreasuryStats'],
        }),

        // حذف خزينة
        deleteTreasury: builder.mutation<{ message: string }, number>({
            query: (id) => ({
                url: `/treasury/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Treasury', 'TreasuryStats'],
        }),

        // إنشاء حركة يدوية
        createTransaction: builder.mutation<TreasuryTransaction, CreateTransactionRequest>({
            query: (data) => ({
                url: '/treasury/transaction',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Treasury', 'TreasuryTransaction', 'TreasuryStats'],
        }),

        // تحويل بين الخزائن
        transferBetweenTreasuries: builder.mutation<{ message: string; outTransaction: TreasuryTransaction; inTransaction: TreasuryTransaction }, TransferRequest>({
            query: (data) => ({
                url: '/treasury/transfer',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Treasury', 'TreasuryTransaction', 'TreasuryStats'],
        }),
    }),
});

export const {
    useGetTreasuriesQuery,
    useGetTreasuryByIdQuery,
    useGetTreasuryStatsQuery,
    useGetAllTransactionsQuery,
    useGetTreasuryTransactionsQuery,
    useCreateTreasuryMutation,
    useUpdateTreasuryMutation,
    useDeleteTreasuryMutation,
    useCreateTransactionMutation,
    useTransferBetweenTreasuriesMutation,
} = treasuryApi;

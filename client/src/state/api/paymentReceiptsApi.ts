import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from '../apiUtils';
import { treasuryApi } from '../treasuryApi';

// Types
export interface PaymentReceipt {
  id: number;
  supplierId: number;
  supplier: {
    id: number;
    name: string;
    phone?: string;
  };
  purchaseId?: number;
  purchase?: {
    id: number;
    invoiceNumber?: string;
    currency?: string;
    exchangeRate?: number;
    totalForeign?: number;
  };
  amount: number;
  amountForeign?: number; // المبلغ بالعملة الأجنبية
  currency?: string; // عملة الإيصال الأصلية
  exchangeRate?: number; // سعر الصرف
  paidAmount?: number;
  remainingAmount?: number;
  type: 'MAIN_PURCHASE' | 'EXPENSE' | 'RETURN';
  description?: string;
  categoryName?: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  createdAt: string;
  paidAt?: string;
  notes?: string;
}

export interface CreatePaymentReceiptDto {
  supplierId: number;
  purchaseId?: number;
  amount: number;
  amountForeign?: number;
  currency?: string;
  exchangeRate?: number;
  type: 'MAIN_PURCHASE' | 'EXPENSE' | 'RETURN';
  description?: string;
  categoryName?: string;
  notes?: string;
}

export interface UpdatePaymentReceiptDto {
  status?: 'PENDING' | 'PAID' | 'CANCELLED';
  paidAt?: string;
  notes?: string;
}

export interface PaymentReceiptsResponse {
  receipts: PaymentReceipt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaymentReceiptsQuery {
  page?: number;
  limit?: number;
  supplierId?: number;
  purchaseId?: number | 'exists';
  status?: 'PENDING' | 'PAID' | 'CANCELLED';
  type?: 'MAIN_PURCHASE' | 'EXPENSE' | 'RETURN';
  search?: string;
}

export interface PaymentInstallment {
  id: number;
  paymentReceiptId: number;
  amount: number;
  paidAt: string;
  notes?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  createdAt: string;
}

export interface CreateInstallmentDto {
  paymentReceiptId: number;
  amount: number;
  notes?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  treasuryId?: number; // الخزينة التي سيتم السحب منها
}

export const paymentReceiptsApi = createApi({
  reducerPath: 'paymentReceiptsApi',
  baseQuery: (args, api, extraOptions) => {
    // Modify the URL to include the payment-receipts prefix
    if (typeof args === 'string') {
      args = `/payment-receipts${args}`;
    } else if (args && typeof args === 'object' && 'url' in args) {
      args = { ...args, url: `/payment-receipts${args.url}` };
    }

    return baseQueryWithAuthInterceptor(args, api, extraOptions);
  },
  tagTypes: ['PaymentReceipts', 'SupplierAccounts'],
  endpoints: (builder) => ({
    // ==================== الحصول على إيصالات الدفع ====================
    getPaymentReceipts: builder.query<PaymentReceiptsResponse, PaymentReceiptsQuery>({
      query: (params = {}) => ({
        url: '',
        params,
      }),
      providesTags: ['PaymentReceipts'],
    }),

    // ==================== الحصول على إيصال دفع واحد ====================
    getPaymentReceipt: builder.query<PaymentReceipt, number>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'PaymentReceipts', id }],
    }),

    // ==================== إنشاء إيصال دفع ====================
    createPaymentReceipt: builder.mutation<PaymentReceipt, CreatePaymentReceiptDto>({
      query: (data) => ({
        url: '',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['PaymentReceipts', 'SupplierAccounts'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(treasuryApi.util.invalidateTags(['Treasury', 'TreasuryTransaction', 'TreasuryStats'] as any));
        } catch { }
      },
    }),

    // ==================== تحديث إيصال دفع ====================
    updatePaymentReceipt: builder.mutation<PaymentReceipt, { id: number; data: UpdatePaymentReceiptDto }>({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PaymentReceipts', id },
        'PaymentReceipts',
        'SupplierAccounts',
      ],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(treasuryApi.util.invalidateTags(['Treasury', 'TreasuryTransaction', 'TreasuryStats'] as any));
        } catch { }
      },
    }),

    // ==================== حذف إيصال دفع ====================
    deletePaymentReceipt: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PaymentReceipts', 'SupplierAccounts'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(treasuryApi.util.invalidateTags(['Treasury', 'TreasuryTransaction', 'TreasuryStats'] as any));
        } catch { }
      },
    }),

    // ==================== تسديد إيصال دفع ====================
    payReceipt: builder.mutation<PaymentReceipt, { id: number; notes?: string }>({
      query: ({ id, notes }) => ({
        url: `/${id}/pay`,
        method: 'POST',
        body: { notes },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PaymentReceipts', id },
        'PaymentReceipts',
        'SupplierAccounts',
      ],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(treasuryApi.util.invalidateTags(['Treasury', 'TreasuryTransaction', 'TreasuryStats'] as any));
        } catch { }
      },
    }),

    // ==================== إلغاء إيصال دفع ====================
    cancelReceipt: builder.mutation<PaymentReceipt, { id: number; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PaymentReceipts', id },
        'PaymentReceipts',
        'SupplierAccounts',
      ],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(treasuryApi.util.invalidateTags(['Treasury', 'TreasuryTransaction', 'TreasuryStats'] as any));
        } catch { }
      },
    }),

    // ==================== الدفعات الجزئية ====================
    addInstallment: builder.mutation<{ success: boolean; installment: PaymentInstallment; message: string }, CreateInstallmentDto>({
      query: (data) => ({
        url: '/installments',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { paymentReceiptId }) => [
        { type: 'PaymentReceipts', id: paymentReceiptId },
        'PaymentReceipts',
        'SupplierAccounts',
      ],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(treasuryApi.util.invalidateTags(['Treasury', 'TreasuryTransaction', 'TreasuryStats'] as any));
        } catch { }
      },
    }),

    getInstallmentsByReceiptId: builder.query<{ success: boolean; installments: PaymentInstallment[] }, number>({
      query: (paymentReceiptId) => `/${paymentReceiptId}/installments`,
      providesTags: (result, error, paymentReceiptId) => [
        { type: 'PaymentReceipts', id: paymentReceiptId },
      ],
    }),

    deleteInstallment: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/installments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PaymentReceipts', 'SupplierAccounts'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(treasuryApi.util.invalidateTags(['Treasury', 'TreasuryTransaction', 'TreasuryStats'] as any));
        } catch { }
      },
    }),

    // ==================== إحصائيات إيصالات الدفع ====================
    getPaymentReceiptsStats: builder.query<{
      totalPending: number;
      totalPaid: number;
      totalCancelled: number;
      totalAmount: number;
      paidAmount: number;
      pendingAmount: number;
    }, void>({
      query: () => '/stats',
      providesTags: ['PaymentReceipts'],
    }),
  }),
});

export const {
  useGetPaymentReceiptsQuery,
  useGetPaymentReceiptQuery,
  useCreatePaymentReceiptMutation,
  useUpdatePaymentReceiptMutation,
  useDeletePaymentReceiptMutation,
  usePayReceiptMutation,
  useCancelReceiptMutation,
  useAddInstallmentMutation,
  useGetInstallmentsByReceiptIdQuery,
  useDeleteInstallmentMutation,
  useGetPaymentReceiptsStatsQuery,
} = paymentReceiptsApi;

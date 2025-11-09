/**
 * Return Payment API
 * API إيصالات الدفع للمردودات
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface ReturnPayment {
  id: number;
  saleReturnId: number;
  companyId: number;
  receiptNumber?: string;
  amount: number;
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'CHECK';
  paymentDate: string;
  notes?: string;
  createdAt: string;
  saleReturn?: {
    id: number;
    returnNumber?: string;
    total: number;
    customer?: {
      id: number;
      name: string;
    };
    sale?: {
      invoiceNumber?: string;
    };
  };
}

export interface CreateReturnPaymentDto {
  saleReturnId: number;
  amount: number;
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'CHECK';
  paymentDate?: string;
  notes?: string;
}

export interface ReturnPaymentsQueryParams {
  page?: number;
  limit?: number;
  saleReturnId?: number;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedReturnPaymentsResponse {
  success: boolean;
  data: ReturnPayment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const returnPaymentApi = createApi({
  reducerPath: 'returnPaymentApi',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['ReturnPayment', 'SaleReturn'],
  endpoints: (builder) => ({
    // إنشاء دفعة جديدة
    createReturnPayment: builder.mutation<
      { success: boolean; message: string; data: ReturnPayment },
      CreateReturnPaymentDto
    >({
      query: (data) => ({
        url: '/api/sale-returns/payments',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'ReturnPayment', id: 'LIST' },
        { type: 'SaleReturn', id: arg.saleReturnId },
        { type: 'SaleReturn', id: 'LIST' },
      ],
    }),

    // الحصول على جميع الدفعات
    getReturnPayments: builder.query<PaginatedReturnPaymentsResponse, ReturnPaymentsQueryParams>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.saleReturnId) queryParams.append('saleReturnId', params.saleReturnId.toString());
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);

        return `/api/sale-returns/payments?${queryParams.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'ReturnPayment' as const, id })),
              { type: 'ReturnPayment', id: 'LIST' },
            ]
          : [{ type: 'ReturnPayment', id: 'LIST' }],
    }),

    // حذف دفعة
    deleteReturnPayment: builder.mutation<
      { success: boolean; message: string },
      { paymentId: number; saleReturnId: number }
    >({
      query: ({ paymentId }) => ({
        url: `/api/sale-returns/payments/${paymentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'ReturnPayment', id: arg.paymentId },
        { type: 'ReturnPayment', id: 'LIST' },
        { type: 'SaleReturn', id: arg.saleReturnId },
        { type: 'SaleReturn', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useCreateReturnPaymentMutation,
  useGetReturnPaymentsQuery,
  useDeleteReturnPaymentMutation,
} = returnPaymentApi;


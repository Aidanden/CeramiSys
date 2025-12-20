import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '@/app/redux';
import { baseQueryWithAuthInterceptor } from './apiUtils';
import { API_CACHE_CONFIG } from '@/lib/config';

export interface PurchaseLine {
  id?: number;
  productId: number;
  product?: {
    id: number;
    sku: string;
    name: string;
    unit: string | null;
  };
  qty: number;
  unitPrice: number;
  subTotal: number;
  total?: number;
}

export interface Purchase {
  id: number;
  companyId: number;
  company: {
    id: number;
    name: string;
    code: string;
  };
  supplierId: number | null;
  supplier: {
    id: number;
    name: string;
    phone: string | null;
  } | null;
  invoiceNumber: string | null;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  purchaseType: 'CASH' | 'CREDIT';
  paymentMethod: 'CASH' | 'BANK' | 'CARD' | null;
  isFullyPaid: boolean;
  isApproved: boolean;
  approvedAt: string | null;
  approvedBy: number | null;
  totalExpenses: number;
  finalTotal: number;
  currency: 'LYD' | 'USD' | 'EUR';
  exchangeRate: number;
  totalForeign: number | null;
  createdAt: string;
  lines: PurchaseLine[];
  payments: PurchasePayment[];
  expenses?: any[]; // For now using any or I should import PurchaseExpense
}

export interface PurchasePayment {
  id: number;
  purchaseId: number;
  companyId: number;
  receiptNumber: string | null;
  amount: number;
  paymentMethod: 'CASH' | 'BANK' | 'CARD';
  paymentDate: string;
  notes: string | null;
  createdAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
  createdAt: string;
  _count?: {
    purchases: number;
  };
}

export interface PurchaseStats {
  totalPurchases: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  cashPurchases: number;
  creditPurchases: number;
  averagePurchase: number;
}

export interface CreatePurchaseRequest {
  companyId: number;
  supplierId?: number;
  invoiceNumber?: string;
  purchaseType: 'CASH' | 'CREDIT';
  paymentMethod?: 'CASH' | 'BANK' | 'CARD';
  currency?: 'LYD' | 'USD' | 'EUR';
  exchangeRate?: number;
  totalForeign?: number;
  lines: {
    id?: number;
    productId: number;
    qty: number;
    unitPrice: number;
  }[];
}

export interface UpdatePurchaseRequest {
  supplierId?: number;
  invoiceNumber?: string;
  purchaseType?: 'CASH' | 'CREDIT';
  paymentMethod?: 'CASH' | 'BANK' | 'CARD';
  currency?: 'LYD' | 'USD' | 'EUR';
  exchangeRate?: number;
  totalForeign?: number;
  lines?: {
    id?: number;
    productId: number;
    qty: number;
    unitPrice: number;
  }[];
}

export interface CreatePurchasePaymentRequest {
  purchaseId: number;
  companyId: number;
  receiptNumber?: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK' | 'CARD';
  paymentDate?: string;
  notes?: string;
}

export interface CreateSupplierRequest {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
}

export interface GetPurchasesQuery {
  page?: number;
  limit?: number;
  companyId?: number;
  supplierId?: number;
  purchaseType?: 'CASH' | 'CREDIT';
  isFullyPaid?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  supplierName?: string;
  supplierPhone?: string;
  invoiceNumber?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface GetSuppliersQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export const purchaseApi = createApi({
  reducerPath: 'purchaseApi',
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ['Purchase', 'Supplier', 'PurchaseStats', 'PaymentReceipts', 'SupplierAccounts'],
  ...API_CACHE_CONFIG.purchases, // تحسين الأداء
  endpoints: (builder) => ({
    // Purchase endpoints
    getPurchases: builder.query<{
      purchases: Purchase[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }, GetPurchasesQuery>({
      query: (params) => ({
        url: '/purchases',
        params,
      }),
      transformResponse: (response: any) => response.data,
      providesTags: ['Purchase'],
    }),

    getPurchaseById: builder.query<Purchase, number>({
      query: (id) => `/purchases/${id}`,
      transformResponse: (response: any) => response.data,
      providesTags: (result, error, id) => [{ type: 'Purchase', id }],
    }),

    createPurchase: builder.mutation<Purchase, CreatePurchaseRequest>({
      query: (data) => ({
        url: '/purchases',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['Purchase', 'PurchaseStats', 'PaymentReceipts', 'SupplierAccounts'],
    }),

    updatePurchase: builder.mutation<Purchase, { id: number; data: UpdatePurchaseRequest }>({
      query: ({ id, data }) => ({
        url: `/purchases/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: 'Purchase', id },
        'Purchase',
        'PurchaseStats',
        'PaymentReceipts',
        'SupplierAccounts',
      ],
    }),

    deletePurchase: builder.mutation<void, number>({
      query: (id) => ({
        url: `/purchases/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Purchase', 'PurchaseStats', 'PaymentReceipts', 'SupplierAccounts'],
    }),

    // Purchase payment endpoints
    addPurchasePayment: builder.mutation<{
      payment: PurchasePayment;
      updatedPurchase: Purchase;
    }, CreatePurchasePaymentRequest>({
      query: (data) => ({
        url: '/purchases/payments',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['Purchase', 'PurchaseStats', 'PaymentReceipts'],
    }),

    // Purchase statistics
    getPurchaseStats: builder.query<PurchaseStats, { companyId?: number }>({
      query: (params) => ({
        url: '/purchases/stats',
        params,
      }),
      transformResponse: (response: any) => response.data,
      providesTags: ['PurchaseStats'],
    }),

    // Supplier endpoints
    getSuppliers: builder.query<{
      data: {
        suppliers: Supplier[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      };
    }, GetSuppliersQuery>({
      query: (params) => ({
        url: '/suppliers',
        params,
      }),
      providesTags: ['Supplier'],
    }),

    getSupplierById: builder.query<Supplier, number>({
      query: (id) => `/suppliers/${id}`,
      providesTags: (result, error, id) => [{ type: 'Supplier', id }],
    }),

    createSupplier: builder.mutation<Supplier, CreateSupplierRequest>({
      query: (data) => ({
        url: '/suppliers',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Supplier'],
    }),

    updateSupplier: builder.mutation<Supplier, { id: number; data: UpdateSupplierRequest }>({
      query: ({ id, data }) => ({
        url: `/suppliers/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Supplier', id },
        'Supplier',
      ],
    }),

    deleteSupplier: builder.mutation<void, number>({
      query: (id) => ({
        url: `/suppliers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Supplier'],
    }),
  }),
});

export const {
  useGetPurchasesQuery,
  useGetPurchaseByIdQuery,
  useCreatePurchaseMutation,
  useUpdatePurchaseMutation,
  useDeletePurchaseMutation,
  useAddPurchasePaymentMutation,
  useGetPurchaseStatsQuery,
  useGetSuppliersQuery,
  useGetSupplierByIdQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = purchaseApi;


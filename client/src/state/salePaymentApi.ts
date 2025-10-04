/**
 * Sale Payment API
 * API لدفعات المبيعات الآجلة
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";

// Types للمبيعات الآجلة والدفعات
export interface CreditSale {
  id: number;
  companyId: number;
  company: {
    id: number;
    name: string;
    code: string;
  };
  customerId?: number;
  customer?: {
    id: number;
    name: string;
    phone?: string;
  };
  invoiceNumber?: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  saleType: "CREDIT";
  paymentMethod?: "CASH" | "BANK" | "CARD";
  isFullyPaid: boolean;
  createdAt: string;
  payments: SalePayment[];
  lines: {
    id: number;
    productId: number;
    product: {
      id: number;
      sku: string;
      name: string;
      unit?: string;
      unitsPerBox?: number;
    };
    qty: number;
    unitPrice: number;
    subTotal: number;
  }[];
}

export interface SalePayment {
  id: number;
  saleId: number;
  companyId: number;
  company?: {
    id: number;
    name: string;
    code: string;
  };
  sale?: {
    id: number;
    invoiceNumber?: string;
    customer?: {
      id: number;
      name: string;
    };
  };
  receiptNumber?: string;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "CARD";
  paymentDate: string;
  notes?: string;
  createdAt: string;
}

export interface CreatePaymentRequest {
  saleId: number;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "CARD";
  paymentDate?: string;
  notes?: string;
}

export interface CreditSalesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: number;
  isFullyPaid?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface PaymentsQueryParams {
  page?: number;
  limit?: number;
  saleId?: number;
  startDate?: string;
  endDate?: string;
}

export interface CreditSalesStats {
  totalCreditSales: number;
  fullyPaidSales: number;
  partiallyPaidSales: number;
  unpaidSales: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
}

export const salePaymentApi = createApi({
  reducerPath: "salePaymentApi",
  baseQuery: baseQueryWithAuthInterceptor,
  endpoints: (builder) => ({
    // الحصول على المبيعات الآجلة
    getCreditSales: builder.query<any, CreditSalesQueryParams>({
      query: (params) => ({
        url: "/sale-payments/credit-sales",
        method: "GET",
        params
      })
    }),

    // الحصول على فاتورة آجلة واحدة
    getCreditSaleById: builder.query<any, number>({
      query: (id) => ({
        url: `/sale-payments/credit-sales/${id}`,
        method: "GET"
      })
    }),

    // الحصول على إحصائيات المبيعات الآجلة
    getCreditSalesStats: builder.query<any, void>({
      query: () => ({
        url: "/sale-payments/credit-sales/stats",
        method: "GET"
      })
    }),

    // إنشاء دفعة جديدة
    createPayment: builder.mutation<any, CreatePaymentRequest>({
      query: (data) => ({
        url: "/sale-payments/payments",
        method: "POST",
        body: data
      })
    }),

    // الحصول على دفعات فاتورة
    getSalePayments: builder.query<any, PaymentsQueryParams>({
      query: (params) => ({
        url: "/sale-payments/payments",
        method: "GET",
        params
      })
    }),

    // حذف دفعة
    deletePayment: builder.mutation<any, number>({
      query: (id) => ({
        url: `/sale-payments/payments/${id}`,
        method: "DELETE"
      })
    })
  })
});

export const {
  useGetCreditSalesQuery,
  useGetCreditSaleByIdQuery,
  useGetCreditSalesStatsQuery,
  useCreatePaymentMutation,
  useGetSalePaymentsQuery,
  useDeletePaymentMutation
} = salePaymentApi;

/**
 * Sale Returns API
 * API للمرتجعات
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";
import { API_CACHE_CONFIG } from "@/lib/config";

// Types للمرتجعات
export type ReturnStatus = "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED";
export type PaymentMethod = "CASH" | "BANK" | "CARD";

export interface SaleReturnLine {
  id?: number;
  productId: number;
  product?: {
    id: number;
    sku: string;
    name: string;
    unit?: string;
    unitsPerBox?: number;
  };
  qty: number;
  unitPrice: number;
  subTotal: number;
}

export interface SaleReturn {
  id: number;
  saleId: number;
  sale: {
    id: number;
    invoiceNumber?: string;
    total: number;
    isFullyPaid: boolean;
    customer?: {
      id: number;
      name: string;
      phone?: string;
    };
  };
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
  returnNumber?: string;
  total: number;
  refundAmount: number;
  refundMethod?: PaymentMethod;
  status: ReturnStatus;
  reason?: string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
  lines: SaleReturnLine[];
}

export interface CreateSaleReturnRequest {
  saleId: number;
  companyId: number;
  customerId?: number;
  reason?: string;
  notes?: string;
  refundMethod?: PaymentMethod;
  lines: {
    productId: number;
    qty: number;
    unitPrice: number;
  }[];
}

export interface UpdateReturnStatusRequest {
  returnId: number;
  status: ReturnStatus;
  notes?: string;
}

export interface ValidateSaleResponse {
  success: boolean;
  message?: string;
}

export interface SaleReturnStats {
  totalReturns: number;
  pendingReturns: number;
  approvedReturns: number;
  processedReturns: number;
  rejectedReturns: number;
  totalAmount: number;
}

export const saleReturnsApi = createApi({
  reducerPath: "saleReturnsApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["SaleReturns", "SaleReturnStats"],
  // تطبيق إعدادات عدم الكاش
  keepUnusedDataFor: API_CACHE_CONFIG.saleReturns.keepUnusedDataFor,
  refetchOnMountOrArgChange: API_CACHE_CONFIG.saleReturns.refetchOnMountOrArgChange,
  refetchOnFocus: API_CACHE_CONFIG.saleReturns.refetchOnFocus,
  refetchOnReconnect: API_CACHE_CONFIG.saleReturns.refetchOnReconnect,
  endpoints: (builder) => ({
    // التحقق من صلاحية الفاتورة للمرتجع
    validateSaleForReturn: builder.query<ValidateSaleResponse, number>({
      query: (saleId) => ({
        url: `/sale-returns/validate-sale/${saleId}`,
        method: "GET",
      }),
    }),

    // الحصول على جميع المرتجعات
    getSaleReturns: builder.query<
      {
        success: boolean;
        data: SaleReturn[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      },
      {
        companyId?: number;
        customerId?: number;
        status?: ReturnStatus;
        page?: number;
        limit?: number;
      }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.companyId) queryParams.append("companyId", params.companyId.toString());
        if (params.customerId) queryParams.append("customerId", params.customerId.toString());
        if (params.status) queryParams.append("status", params.status);
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.limit) queryParams.append("limit", params.limit.toString());

        return {
          url: `/sale-returns?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["SaleReturns"],
    }),

    // الحصول على مرتجع واحد
    getSaleReturnById: builder.query<
      { success: boolean; data: SaleReturn },
      number
    >({
      query: (id) => ({
        url: `/sale-returns/${id}`,
        method: "GET",
      }),
      providesTags: ["SaleReturns"],
    }),

    // إنشاء مرتجع جديد
    createSaleReturn: builder.mutation<
      { success: boolean; message: string; data: SaleReturn },
      CreateSaleReturnRequest
    >({
      query: (data) => ({
        url: "/sale-returns",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["SaleReturns", "SaleReturnStats"],
    }),

    // تحديث حالة المرتجع
    updateReturnStatus: builder.mutation<
      { success: boolean; message: string; data: SaleReturn },
      UpdateReturnStatusRequest
    >({
      query: ({ returnId, status, notes }) => ({
        url: `/sale-returns/${returnId}/status`,
        method: "PATCH",
        body: { status, notes },
      }),
      invalidatesTags: ["SaleReturns", "SaleReturnStats"],
    }),

    // معالجة المرتجع
    processSaleReturn: builder.mutation<
      { success: boolean; message: string; data: SaleReturn },
      number
    >({
      query: (returnId) => ({
        url: `/sale-returns/${returnId}/process`,
        method: "POST",
      }),
      invalidatesTags: ["SaleReturns", "SaleReturnStats"],
    }),

    // حذف مرتجع
    deleteSaleReturn: builder.mutation<
      { success: boolean; message: string },
      number
    >({
      query: (returnId) => ({
        url: `/sale-returns/${returnId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SaleReturns", "SaleReturnStats"],
    }),

    // إحصائيات المرتجعات
    getSaleReturnStats: builder.query<
      { success: boolean; data: SaleReturnStats },
      { companyId?: number }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.companyId) queryParams.append("companyId", params.companyId.toString());

        return {
          url: `/sale-returns/stats?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["SaleReturnStats"],
    }),
  }),
});

export const {
  useValidateSaleForReturnQuery,
  useLazyValidateSaleForReturnQuery,
  useGetSaleReturnsQuery,
  useGetSaleReturnByIdQuery,
  useCreateSaleReturnMutation,
  useUpdateReturnStatusMutation,
  useProcessSaleReturnMutation,
  useDeleteSaleReturnMutation,
  useGetSaleReturnStatsQuery,
} = saleReturnsApi;

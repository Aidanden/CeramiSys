/**
 * Inter-Company Sales API
 * واجهة برمجة المبيعات بين الشركات
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";
import { API_CACHE_CONFIG } from "@/lib/config";

// Types
export interface InterCompanySaleLine {
  productId: number;
  qty: number;
  parentUnitPrice: number;
  branchUnitPrice: number;
  subTotal: number;
}

export interface CreateInterCompanySaleRequest {
  customerId?: number;
  saleType: 'CASH' | 'CREDIT';
  paymentMethod?: 'CASH' | 'BANK' | 'CARD';
  lines: InterCompanySaleLine[];
}

export interface InterCompanySale {
  id: number;
  companyId: number;
  customerId?: number;
  invoiceNumber?: string;
  saleType: 'CASH' | 'CREDIT';
  paymentMethod?: 'CASH' | 'BANK' | 'CARD';
  total: number;
  paidAmount: number;
  remainingAmount: number;
  isFullyPaid: boolean;
  createdAt: string;
  customer?: {
    id: number;
    name: string;
    phone?: string;
  };
  company?: {
    id: number;
    name: string;
    code: string;
  };
  lines: Array<{
    id: number;
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
  }>;
  payments?: Array<{
    id: number;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    notes?: string;
  }>;
}

export interface InterCompanySalesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: number;
  saleType?: 'CASH' | 'CREDIT';
  startDate?: string;
  endDate?: string;
}

export interface InterCompanySalesStats {
  totalSales: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: string;
  cashSales: number;
  creditSales: number;
}

export const interCompanySalesApi = createApi({
  reducerPath: "interCompanySalesApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["InterCompanySales", "InterCompanySale", "InterCompanySalesStats"],
  // تطبيق إعدادات عدم الكاش
  keepUnusedDataFor: API_CACHE_CONFIG.interCompanySales.keepUnusedDataFor,
  refetchOnMountOrArgChange: API_CACHE_CONFIG.interCompanySales.refetchOnMountOrArgChange,
  refetchOnFocus: API_CACHE_CONFIG.interCompanySales.refetchOnFocus,
  refetchOnReconnect: API_CACHE_CONFIG.interCompanySales.refetchOnReconnect,
  endpoints: (builder) => ({
    // إنشاء فاتورة مبيعات بين الشركات
    createInterCompanySale: builder.mutation<any, CreateInterCompanySaleRequest>({
      query: (data) => ({
        url: "/inter-company-sales",
        method: "POST",
        body: data
      }),
      invalidatesTags: ["InterCompanySales", "InterCompanySalesStats"]
    }),

    // الحصول على جميع المبيعات بين الشركات
    getInterCompanySales: builder.query<any, InterCompanySalesQueryParams>({
      query: (params) => ({
        url: "/inter-company-sales",
        method: "GET",
        params
      }),
      providesTags: ["InterCompanySales"]
    }),

    // الحصول على فاتورة مبيعات بين الشركات بالتفصيل
    getInterCompanySaleById: builder.query<any, number>({
      query: (id) => ({
        url: `/inter-company-sales/${id}`,
        method: "GET"
      }),
      providesTags: (result, error, id) => [{ type: "InterCompanySale", id }]
    }),

    // الحصول على إحصائيات المبيعات بين الشركات
    getInterCompanySalesStats: builder.query<any, void>({
      query: () => ({
        url: "/inter-company-sales/stats",
        method: "GET"
      }),
      providesTags: ["InterCompanySalesStats"]
    })
  })
});

export const {
  useCreateInterCompanySaleMutation,
  useGetInterCompanySalesQuery,
  useGetInterCompanySaleByIdQuery,
  useGetInterCompanySalesStatsQuery
} = interCompanySalesApi;

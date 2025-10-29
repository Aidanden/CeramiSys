import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";
import { API_CACHE_CONFIG } from "@/lib/config";

// Types
export interface SalesReportQuery {
  startDate?: string;
  endDate?: string;
  companyId?: number;
  customerId?: number;
  saleType?: "cash" | "credit";
}

export interface StockReportQuery {
  companyId?: number;
  productId?: number;
  minBoxes?: number;
  maxBoxes?: number;
}

export interface ProfitReportQuery {
  startDate?: string;
  endDate?: string;
  companyId?: number;
  groupBy?: "day" | "week" | "month" | "year";
}

export interface CustomerReportQuery {
  companyId?: number;
  customerId?: number;
  startDate?: string;
  endDate?: string;
}

export interface TopProductsReportQuery {
  companyId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export const reportsApi = createApi({
  reducerPath: "reportsApi",
  baseQuery: baseQueryWithAuthInterceptor,
  // تطبيق إعدادات عدم الكاش
  keepUnusedDataFor: API_CACHE_CONFIG.reports.keepUnusedDataFor,
  refetchOnMountOrArgChange: API_CACHE_CONFIG.reports.refetchOnMountOrArgChange,
  refetchOnFocus: API_CACHE_CONFIG.reports.refetchOnFocus,
  refetchOnReconnect: API_CACHE_CONFIG.reports.refetchOnReconnect,
  endpoints: (build) => ({
    // تقرير المبيعات
    getSalesReport: build.query({
      query: (params: SalesReportQuery) => ({
        url: "/reports/sales",
        method: "GET",
        params,
      }),
    }),

    // تقرير المخزون
    getStockReport: build.query({
      query: (params: StockReportQuery) => ({
        url: "/reports/stock",
        method: "GET",
        params,
      }),
    }),

    // تقرير الأرباح
    getProfitReport: build.query({
      query: (params: ProfitReportQuery) => ({
        url: "/reports/profit",
        method: "GET",
        params,
      }),
    }),

    // تقرير العملاء
    getCustomerReport: build.query({
      query: (params: CustomerReportQuery) => ({
        url: "/reports/customers",
        method: "GET",
        params,
      }),
    }),

    // تقرير المنتجات الأكثر مبيعاً
    getTopProductsReport: build.query({
      query: (params: TopProductsReportQuery) => ({
        url: "/reports/top-products",
        method: "GET",
        params,
      }),
    }),
  }),
});

export const {
  useGetSalesReportQuery,
  useGetStockReportQuery,
  useGetProfitReportQuery,
  useGetCustomerReportQuery,
  useGetTopProductsReportQuery,
} = reportsApi;

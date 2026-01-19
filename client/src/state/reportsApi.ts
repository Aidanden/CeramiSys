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

export interface SupplierReportQuery {
  companyId?: number;
  supplierId?: number;
  startDate?: string;
  endDate?: string;
}

export interface PurchaseReportQuery {
  companyId?: number;
  supplierId?: number;
  startDate?: string;
  endDate?: string;
  purchaseType?: "CASH" | "CREDIT";
}

export interface ProductMovementReportQuery {
  productId: number;
  companyId?: number;
  startDate?: string;
  endDate?: string;
}

export interface FinancialReportQuery {
  startDate?: string;
  endDate?: string;
  companyId?: number;
  productId?: number;
}

export interface SupplierStockReportQuery {
  supplierId: number;
  companyId?: number;
}

export interface GroupStockReportQuery {
  groupId: number;
  companyId?: number;
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

    // تقرير الموردين
    getSupplierReport: build.query({
      query: (params: SupplierReportQuery) => ({
        url: "/reports/suppliers",
        method: "GET",
        params,
      }),
    }),

    // تقرير المشتريات
    getPurchaseReport: build.query({
      query: (params: PurchaseReportQuery) => ({
        url: "/reports/purchases",
        method: "GET",
        params,
      }),
    }),

    // تقرير حركة الصنف
    getProductMovementReport: build.query({
      query: (params: ProductMovementReportQuery) => ({
        url: "/reports/product-movement",
        method: "GET",
        params,
      }),
    }),

    // تقرير الأرباح (التقرير المالي)
    // Updated to include full financial stats
    getProfitReport: build.query({
      query: (params: FinancialReportQuery) => ({
        url: "/reports/financial",
        method: "GET",
        params,
      }),
    }),

    // تقرير بضاعة الموردين (جديد)
    getSupplierStockReport: build.query({
      query: (params: SupplierStockReportQuery) => ({
        url: "/reports/supplier-stock",
        method: "GET",
        params,
      }),
    }),

    // تقرير بضاعة المجموعات (جديد)
    getGroupStockReport: build.query({
      query: (params: GroupStockReportQuery) => ({
        url: "/reports/group-stock",
        method: "GET",
        params,
      }),
    }),

  }),
});

export const {
  useGetSalesReportQuery,
  useGetStockReportQuery,
  useGetCustomerReportQuery,
  useGetTopProductsReportQuery,
  useGetSupplierReportQuery,
  useGetPurchaseReportQuery,
  useGetProductMovementReportQuery,
  useGetProfitReportQuery,
  useGetSupplierStockReportQuery,
  useGetGroupStockReportQuery,
} = reportsApi;


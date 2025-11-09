/**
 * Complex Inter-Company Sales API
 * واجهة برمجة المبيعات المعقدة بين الشركات
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";
import { API_CACHE_CONFIG } from "@/lib/config";

// Types
export interface ComplexInterCompanySaleLine {
  productId: number;
  qty: number;
  parentUnitPrice?: number; // سعر التقازي (فقط للأصناف من الشركة الأم)
  branchUnitPrice: number;  // سعر الإمارات (مع هامش الربح)
  subTotal: number;
  isFromParentCompany?: boolean; // هل الصنف من الشركة الأم؟
}

export interface CreateComplexInterCompanySaleRequest {
  customerId: number;
  branchCompanyId: number; // شركة الإمارات
  parentCompanyId: number; // شركة التقازي
  lines: ComplexInterCompanySaleLine[];
  profitMargin?: number; // هامش الربح (نسبة مئوية)
  customerSaleType: 'CASH' | 'CREDIT'; // نوع فاتورة العميل: نقدي أو آجل
  customerPaymentMethod: 'CASH' | 'BANK' | 'CARD'; // طريقة الدفع: كاش، حوالة، بطاقة
}

export interface ComplexInterCompanySaleResult {
  customerSale: {
    id: number;
    invoiceNumber: string;
    total: number;
  };
  parentSale: {
    id: number;
    invoiceNumber: string;
    total: number;
  } | null;
  purchaseFromParent?: {
    id: number;
    invoiceNumber: string;
    total: number;
  } | null;
  branchPurchase?: {
    id: number;
    invoiceNumber: string;
    total: number;
  } | null;
  stockUpdates: Array<{
    productId: number;
    companyId: number;
    newStock: number;
  }>;
}

export interface ComplexInterCompanyStats {
  customerSales: {
    count: number;
    total: number;
  };
  parentPurchases: {
    count: number;
    total: number;
  };
  parentSales: {
    count: number;
    total: number;
    remaining: number;
  };
}

export interface SettleParentSaleRequest {
  amount: number;
  paymentMethod: 'CASH' | 'BANK' | 'CARD';
}

// API Definition
export const complexInterCompanySalesApi = createApi({
  reducerPath: "complexInterCompanySalesApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["ComplexInterCompanySales", "ComplexInterCompanyStats"],
  // تطبيق إعدادات عدم الكاش
  keepUnusedDataFor: API_CACHE_CONFIG.interCompanySales.keepUnusedDataFor,
  refetchOnMountOrArgChange: API_CACHE_CONFIG.interCompanySales.refetchOnMountOrArgChange,
  refetchOnFocus: API_CACHE_CONFIG.interCompanySales.refetchOnFocus,
  refetchOnReconnect: API_CACHE_CONFIG.interCompanySales.refetchOnReconnect,
  endpoints: (builder) => ({
    /**
     * إنشاء عملية بيع معقدة بين الشركات
     */
    createComplexInterCompanySale: builder.mutation<{
      success: boolean;
      message: string;
      data: ComplexInterCompanySaleResult;
    }, CreateComplexInterCompanySaleRequest>({
      query: (data) => ({
        url: "/complex-inter-company-sales",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ComplexInterCompanySales", "ComplexInterCompanyStats"],
    }),

    /**
     * تسوية فاتورة الشراء من الشركة الأم
     */
    settleParentSale: builder.mutation<{
      success: boolean;
      message: string;
      data: any;
    }, { parentSaleId: number; data: SettleParentSaleRequest }>({
      query: ({ parentSaleId, data }) => ({
        url: `/complex-inter-company-sales/${parentSaleId}/settle`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ComplexInterCompanySales", "ComplexInterCompanyStats"],
    }),

    /**
     * الحصول على إحصائيات المبيعات المعقدة
     */
    getComplexInterCompanyStats: builder.query<{
      success: boolean;
      message: string;
      data: ComplexInterCompanyStats;
    }, void>({
      query: () => "/complex-inter-company-sales/stats",
      providesTags: ["ComplexInterCompanyStats"],
    }),
  }),
});

// Export hooks
export const {
  useCreateComplexInterCompanySaleMutation,
  useSettleParentSaleMutation,
  useGetComplexInterCompanyStatsQuery,
} = complexInterCompanySalesApi;



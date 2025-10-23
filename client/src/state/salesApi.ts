/**
 * Sales API
 * API للمبيعات والعملاء
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";

// Types للمبيعات
export interface SaleLine {
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

export interface Sale {
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
  saleType: "CASH" | "CREDIT";
  paymentMethod?: "CASH" | "BANK" | "CARD"; // اختياري للبيع الآجل
  receiptIssued?: boolean; // حالة إصدار إيصال القبض
  receiptIssuedAt?: string; // تاريخ إصدار الإيصال
  receiptIssuedBy?: string; // المحاسب الذي أصدر الإيصال
  dispatchOrders?: { id: number; status: string }[]; // أوامر صرف المخزن
  createdAt: string;
  lines: SaleLine[];
}

export interface CreateSaleRequest {
  companyId?: number; // للـ System User: تحديد الشركة التي يريد البيع منها
  customerId?: number;
  invoiceNumber?: string;
  saleType: "CASH" | "CREDIT";
  paymentMethod?: "CASH" | "BANK" | "CARD"; // اختياري للبيع الآجل
  lines: {
    productId: number;
    qty: number;
    unitPrice: number;
  }[];
}

export interface UpdateSaleRequest {
  customerId?: number;
  invoiceNumber?: string;
  saleType?: "CASH" | "CREDIT";
  paymentMethod?: "CASH" | "BANK" | "CARD";
  lines?: {
    productId: number;
    qty: number;
    unitPrice: number;
  }[];
}

export interface SalesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: number;
  saleType?: "CASH" | "CREDIT";
  paymentMethod?: "CASH" | "BANK" | "CARD";
  startDate?: string;
  endDate?: string;
  receiptIssued?: boolean; // فلتر حسب إصدار إيصال القبض
  todayOnly?: boolean; // فلتر حسب اليوم الحالي
}

export interface SalesResponse {
  success: boolean;
  message: string;
  data: {
    sales: Sale[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface SalesStats {
  totalSales: number;
  todaySales: number;
  monthSales: number;
  yearSales: number;
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
}

export interface DailySalesData {
  date: string;
  revenue: number;
  count: number;
}

// Types للعملاء
export interface Customer {
  id: number;
  name: string;
  phone?: string;
  note?: string;
  createdAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  phone?: string;
  note?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  note?: string;
}

export interface CustomersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CustomersResponse {
  success: boolean;
  message: string;
  data: {
    customers: Customer[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// API Definition
export const salesApi = createApi({
  reducerPath: "salesApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["Sales", "Sale", "SalesStats", "Customers", "Customer"],
  keepUnusedDataFor: 300, // 5 دقائق cache - تحسين الأداء
  refetchOnMountOrArgChange: 30, // إعادة الجلب بعد 30 ثانية فقط
  refetchOnFocus: false, // لا إعادة جلب عند العودة للتبويب
  refetchOnReconnect: true, // فقط عند إعادة الاتصال
  endpoints: (builder) => ({
    // ============== المبيعات ==============
    
    /**
     * الحصول على قائمة المبيعات
     */
    getSales: builder.query<SalesResponse, SalesQueryParams>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, value.toString());
          }
        });
        return `sales?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.sales.map(({ id }) => ({ type: "Sale" as const, id })),
              { type: "Sales", id: "LIST" },
            ]
          : [{ type: "Sales", id: "LIST" }],
    }),

    /**
     * الحصول على فاتورة مبيعات واحدة
     */
    getSale: builder.query<{ success: boolean; message: string; data: Sale }, number>({
      query: (id) => `sales/${id}`,
      providesTags: (result, error, id) => [{ type: "Sale", id }],
    }),

    /**
     * إنشاء فاتورة مبيعات جديدة
     */
    createSale: builder.mutation<{ success: boolean; message: string; data: Sale }, CreateSaleRequest>({
      query: (data) => ({
        url: "sales",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Sales", id: "LIST" }, { type: "SalesStats", id: "STATS" }],
    }),

    /**
     * تحديث فاتورة مبيعات
     */
    updateSale: builder.mutation<{ success: boolean; message: string; data: Sale }, { id: number; data: UpdateSaleRequest }>({
      query: ({ id, data }) => ({
        url: `sales/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Sale", id },
        { type: "Sales", id: "LIST" },
        { type: "SalesStats", id: "STATS" },
      ],
    }),

    /**
     * حذف فاتورة مبيعات
     */
    deleteSale: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `sales/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Sale", id },
        { type: "Sales", id: "LIST" },
        { type: "SalesStats", id: "STATS" },
      ],
    }),

    /**
     * الحصول على إحصائيات المبيعات
     */
    getSalesStats: builder.query<{ success: boolean; message: string; data: SalesStats }, void>({
      query: () => "sales/stats",
      providesTags: [{ type: "SalesStats", id: "STATS" }],
    }),

    /**
     * الحصول على الفواتير النقدية (للمحاسب)
     */
    getCashSales: builder.query<SalesResponse, SalesQueryParams>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        // إضافة saleType=CASH تلقائياً
        searchParams.append('saleType', 'CASH');
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, value.toString());
          }
        });
        return `sales?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.sales.map(({ id }) => ({ type: "Sale" as const, id })),
              { type: "Sales", id: "CASH_LIST" },
            ]
          : [{ type: "Sales", id: "CASH_LIST" }],
    }),

    /**
     * إصدار إيصال قبض لفاتورة نقدية
     */
    issueReceipt: builder.mutation<{ success: boolean; message: string; data: Sale }, number>({
      query: (saleId) => ({
        url: `sales/${saleId}/issue-receipt`,
        method: "POST",
      }),
      invalidatesTags: (result, error, saleId) => [
        { type: "Sale", id: saleId },
        { type: "Sales", id: "LIST" },
        { type: "Sales", id: "CASH_LIST" },
        { type: "SalesStats", id: "STATS" },
      ],
    }),

    // ============== العملاء ==============

    /**
     * الحصول على قائمة العملاء
     */
    getCustomers: builder.query<CustomersResponse, CustomersQueryParams>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, value.toString());
          }
        });
        return `sales/customers?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.customers.map(({ id }) => ({ type: "Customer" as const, id })),
              { type: "Customers", id: "LIST" },
            ]
          : [{ type: "Customers", id: "LIST" }],
    }),

    /**
     * الحصول على عميل واحد
     */
    getCustomer: builder.query<{ success: boolean; message: string; data: Customer }, number>({
      query: (id) => `sales/customers/${id}`,
      providesTags: (result, error, id) => [{ type: "Customer", id }],
    }),

    /**
     * إنشاء عميل جديد
     */
    createCustomer: builder.mutation<{ success: boolean; message: string; data: Customer }, CreateCustomerRequest>({
      query: (data) => ({
        url: "sales/customers",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Customers", id: "LIST" }],
      // تحديث optimistic للـ cache - إضافة العميل الجديد فوراً
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data: response } = await queryFulfilled;
          const newCustomer = response.data;
          
          // تحديث الـ cache مباشرة بإضافة العميل الجديد
          dispatch(
            salesApi.util.updateQueryData('getCustomers', { limit: 1000 }, (draft) => {
              if (draft?.data?.customers) {
                draft.data.customers.unshift(newCustomer);
              }
            })
          );
        } catch {}
      },
    }),

    /**
     * تحديث عميل
     */
    updateCustomer: builder.mutation<{ success: boolean; message: string; data: Customer }, { id: number; data: UpdateCustomerRequest }>({
      query: ({ id, data }) => ({
        url: `sales/customers/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Customer", id },
        { type: "Customers", id: "LIST" },
      ],
    }),

    /**
     * حذف عميل
     */
    deleteCustomer: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `sales/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Customer", id },
        { type: "Customers", id: "LIST" },
      ],
    }),
  }),
});

// Export hooks
export const {
  // المبيعات
  useGetSalesQuery,
  useGetSaleQuery,
  useCreateSaleMutation,
  useUpdateSaleMutation,
  useDeleteSaleMutation,
  useGetSalesStatsQuery,
  useGetCashSalesQuery,
  useIssueReceiptMutation,
  // العملاء
  useGetCustomersQuery,
  useGetCustomerQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} = salesApi;

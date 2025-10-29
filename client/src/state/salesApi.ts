/**
 * Sales API
 * API للمبيعات والعملاء
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";
import { API_CACHE_CONFIG } from "@/lib/config";

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
  status: "DRAFT" | "APPROVED" | "CANCELLED"; // حالة الفاتورة
  notes?: string; // ملاحظات
  saleType?: "CASH" | "CREDIT"; // يحدده المحاسب
  paymentMethod?: "CASH" | "BANK" | "CARD"; // يحدده المحاسب
  approvedAt?: string; // تاريخ اعتماد الفاتورة
  approvedBy?: string; // المحاسب الذي اعتمد الفاتورة
  receiptIssued?: boolean; // هل تم إصدار إيصال قبض؟
  receiptIssuedAt?: string; // تاريخ إصدار إيصال القبض
  receiptIssuedBy?: string; // من أصدر إيصال القبض
  dispatchOrders?: { id: number; status: string }[]; // أوامر صرف المخزن
  createdAt: string;
  updatedAt: string;
  lines: SaleLine[];
}

export interface CreateSaleRequest {
  companyId?: number; // للـ System User: تحديد الشركة التي يريد البيع منها
  customerId?: number;
  invoiceNumber?: string;
  notes?: string; // ملاحظات اختيارية
  lines: {
    productId: number;
    qty: number;
    unitPrice: number;
  }[];
  // ملاحظة: saleType و paymentMethod سيحددهما المحاسب لاحقاً
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
  // تطبيق إعدادات التحديث الفوري من config.ts
  ...API_CACHE_CONFIG.sales,
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
      keepUnusedDataFor: API_CACHE_CONFIG.sales.keepUnusedDataFor,
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
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        // الحصول على الفاتورة الجديدة فوراً بدون انتظار الخادم
        const optimisticSale = {
          id: Date.now(), // ID مؤقت
          invoiceNumber: `TEMP-${Date.now()}`,
          customerId: arg.customerId,
          customer: arg.customerId ? { 
            id: arg.customerId, 
            name: 'جاري التحميل...',
            phone: '',
            note: ''
          } : null,
          companyId: arg.companyId,
          company: { id: arg.companyId, name: 'جاري التحميل...' },
          notes: arg.notes || '',
          lines: arg.lines || [],
          totalAmount: arg.lines?.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0) || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 1,
          receiptIssued: false,
          receiptIssuedAt: null,
          receiptIssuedBy: null
        };

        // تحديث فوري للـ cache - تحديث جميع الـ queries المحتملة
        const patchResults: any[] = [];
        
        // تحديث الـ query الافتراضي
        patchResults.push(
          dispatch(
            salesApi.util.updateQueryData('getSales', {}, (draft) => {
              if (draft?.data?.sales) {
                draft.data.sales.unshift(optimisticSale as any);
              }
            })
          )
        );
        
        // تحديث الـ queries مع pagination
        for (let page = 1; page <= 5; page++) {
          patchResults.push(
            dispatch(
              salesApi.util.updateQueryData('getSales', { page, limit: 10 }, (draft) => {
                if (draft?.data?.sales && page === 1) {
                  draft.data.sales.unshift(optimisticSale as any);
                }
              })
            )
          );
        }

        try {
          const { data: response } = await queryFulfilled;
          const realSale = response.data;
          
          // استبدال البيانات المؤقتة بالبيانات الحقيقية في جميع الـ queries
          dispatch(
            salesApi.util.updateQueryData('getSales', {}, (draft) => {
              if (draft?.data?.sales) {
                const tempIndex = draft.data.sales.findIndex(s => s.id === optimisticSale.id);
                if (tempIndex !== -1) {
                  draft.data.sales[tempIndex] = realSale;
                }
              }
            })
          );
          
          // تحديث الـ queries مع pagination
          for (let page = 1; page <= 5; page++) {
            dispatch(
              salesApi.util.updateQueryData('getSales', { page, limit: 10 }, (draft) => {
                if (draft?.data?.sales && page === 1) {
                  const tempIndex = draft.data.sales.findIndex(s => s.id === optimisticSale.id);
                  if (tempIndex !== -1) {
                    draft.data.sales[tempIndex] = realSale;
                  }
                }
              })
            );
          }
        } catch (error) {
          // في حالة الخطأ، إزالة البيانات المؤقتة
          patchResults.forEach(patchResult => {
            if (patchResult && patchResult.undo) {
              patchResult.undo();
            }
          });
        }
      },
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
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        // Optimistic update للفاتورة المحدثة
        const patchResults: any[] = [];
        
        try {
          // تحديث جميع الـ queries
          patchResults.push(
            dispatch(
              salesApi.util.updateQueryData('getSales', { page: 1, limit: 10, search: undefined }, (draft) => {
                const sale = draft?.data?.sales?.find(s => s.id === id);
                if (sale) {
                  Object.assign(sale, data);
                }
              })
            )
          );
          
          patchResults.push(
            dispatch(
              salesApi.util.updateQueryData('getSales', { page: 1, limit: 1000, search: undefined }, (draft) => {
                const sale = draft?.data?.sales?.find(s => s.id === id);
                if (sale) {
                  Object.assign(sale, data);
                }
              })
            )
          );
          
          await queryFulfilled;
        } catch {
          // في حالة الخطأ، نرجع التغييرات
          patchResults.forEach(patchResult => patchResult.undo());
        }
      },
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
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Optimistic update لحذف الفاتورة
        const patchResults: any[] = [];
        
        try {
          // حذف من جميع الـ queries
          patchResults.push(
            dispatch(
              salesApi.util.updateQueryData('getSales', { page: 1, limit: 10, search: undefined }, (draft) => {
                if (draft?.data?.sales) {
                  draft.data.sales = draft.data.sales.filter(sale => sale.id !== id);
                }
              })
            )
          );
          
          patchResults.push(
            dispatch(
              salesApi.util.updateQueryData('getSales', { page: 1, limit: 1000, search: undefined }, (draft) => {
                if (draft?.data?.sales) {
                  draft.data.sales = draft.data.sales.filter(sale => sale.id !== id);
                }
              })
            )
          );
          
          await queryFulfilled;
        } catch {
          // في حالة الخطأ، نرجع التغييرات
          patchResults.forEach(patchResult => patchResult.undo());
        }
      },
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

    /**
     * اعتماد فاتورة مبدئية
     */
    approveSale: builder.mutation<
      { success: boolean; message: string; data: Sale }, 
      { id: number; saleType: "CASH" | "CREDIT"; paymentMethod?: "CASH" | "BANK" | "CARD" }
    >({
      query: ({ id, ...data }) => ({
        url: `sales/${id}/approve`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Sale", id },
        { type: "Sales", id: "LIST" },
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
  useApproveSaleMutation,
  // العملاء
  useGetCustomersQuery,
  useGetCustomerQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} = salesApi;

/**
 * Provisional Sales API
 * API للفواتير المبدئية
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";

// Types للفواتير المبدئية
export interface ProvisionalSaleLine {
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

export interface ProvisionalSale {
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
  status: "DRAFT" | "PENDING" | "APPROVED" | "CONVERTED" | "CANCELLED";
  isConverted: boolean;
  convertedSaleId?: number;
  convertedSale?: {
    id: number;
    invoiceNumber?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  convertedAt?: string;
  lines: ProvisionalSaleLine[];
}

export interface CreateProvisionalSaleRequest {
  companyId?: number; // للـ System User: تحديد الشركة التي يريد البيع منها
  customerId?: number;
  invoiceNumber?: string;
  status?: "DRAFT" | "PENDING" | "APPROVED" | "CANCELLED";
  notes?: string;
  lines: {
    productId: number;
    qty: number;
    unitPrice: number;
  }[];
}

export interface UpdateProvisionalSaleRequest {
  customerId?: number;
  invoiceNumber?: string;
  status?: "DRAFT" | "PENDING" | "APPROVED" | "CANCELLED";
  notes?: string;
  lines?: {
    id?: number;
    productId: number;
    qty: number;
    unitPrice: number;
  }[];
}

export interface GetProvisionalSalesRequest {
  page?: number;
  limit?: number;
  companyId?: number;
  customerId?: number;
  status?: "DRAFT" | "PENDING" | "APPROVED" | "CONVERTED" | "CANCELLED";
  isConverted?: boolean;
  search?: string;
  sortBy?: "createdAt" | "updatedAt" | "total" | "invoiceNumber";
  sortOrder?: "asc" | "desc";
}

export interface ProvisionalSalesResponse {
  provisionalSales: ProvisionalSale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ConvertToSaleRequest {
  saleType: "CASH" | "CREDIT";
  paymentMethod?: "CASH" | "BANK" | "CARD";
}

export interface UpdateStatusRequest {
  status: "DRAFT" | "PENDING" | "APPROVED" | "CANCELLED";
}

// Customer types
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

export interface GetCustomersRequest {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface CustomersResponse {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const provisionalSalesApi = createApi({
  reducerPath: "provisionalSalesApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["ProvisionalSale", "Customer"],
  endpoints: (builder) => ({
    // ============== إدارة الفواتير المبدئية ==============

    // الحصول على قائمة الفواتير المبدئية
    getProvisionalSales: builder.query<ProvisionalSalesResponse, GetProvisionalSalesRequest>({
      query: (params) => ({
        url: "/provisional-sales",
        method: "GET",
        params,
      }),
      providesTags: ["ProvisionalSale"],
    }),

    // الحصول على فاتورة مبدئية واحدة
    getProvisionalSaleById: builder.query<{ data: ProvisionalSale }, number>({
      query: (id) => ({
        url: `/provisional-sales/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "ProvisionalSale", id }],
    }),

    // إنشاء فاتورة مبدئية جديدة
    createProvisionalSale: builder.mutation<{ data: ProvisionalSale }, CreateProvisionalSaleRequest>({
      query: (data) => ({
        url: "/provisional-sales",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ProvisionalSale"],
    }),

    // تحديث فاتورة مبدئية
    updateProvisionalSale: builder.mutation<{ data: ProvisionalSale }, { id: number; data: UpdateProvisionalSaleRequest }>({
      query: ({ id, data }) => ({
        url: `/provisional-sales/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ProvisionalSale", id },
        "ProvisionalSale",
      ],
    }),

    // حذف فاتورة مبدئية
    deleteProvisionalSale: builder.mutation<void, number>({
      query: (id) => ({
        url: `/provisional-sales/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "ProvisionalSale", id },
        "ProvisionalSale",
      ],
    }),

    // ============== العمليات الخاصة ==============

    // تغيير حالة الفاتورة المبدئية
    updateProvisionalSaleStatus: builder.mutation<{ data: ProvisionalSale }, { id: number; data: UpdateStatusRequest }>({
      query: ({ id, data }) => ({
        url: `/provisional-sales/${id}/status`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ProvisionalSale", id },
        "ProvisionalSale",
      ],
    }),

    // ترحيل فاتورة مبدئية إلى فاتورة مبيعات عادية
    convertProvisionalSaleToSale: builder.mutation<{ data: ProvisionalSale }, { id: number; data: ConvertToSaleRequest }>({
      query: ({ id, data }) => ({
        url: `/provisional-sales/${id}/convert`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ProvisionalSale", id },
        "ProvisionalSale",
      ],
    }),

    // ============== إدارة العملاء ==============

    // الحصول على قائمة العملاء
    getCustomers: builder.query<CustomersResponse, GetCustomersRequest>({
      query: (params) => ({
        url: "/sales/customers",
        method: "GET",
        params,
      }),
      providesTags: ["Customer"],
    }),

    // إنشاء عميل جديد
    createCustomer: builder.mutation<{ data: Customer }, CreateCustomerRequest>({
      query: (data) => ({
        url: "/sales/customers",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Customer"],
    }),

    // تحديث عميل
    updateCustomer: builder.mutation<{ data: Customer }, { id: number; data: UpdateCustomerRequest }>({
      query: ({ id, data }) => ({
        url: `/sales/customers/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Customer", id },
        "Customer",
      ],
    }),

    // حذف عميل
    deleteCustomer: builder.mutation<void, number>({
      query: (id) => ({
        url: `/sales/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Customer", id },
        "Customer",
      ],
    }),
  }),
});

export const {
  // الفواتير المبدئية
  useGetProvisionalSalesQuery,
  useGetProvisionalSaleByIdQuery,
  useCreateProvisionalSaleMutation,
  useUpdateProvisionalSaleMutation,
  useDeleteProvisionalSaleMutation,
  
  // العمليات الخاصة
  useUpdateProvisionalSaleStatusMutation,
  useConvertProvisionalSaleToSaleMutation,
  
  // العملاء
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} = provisionalSalesApi;

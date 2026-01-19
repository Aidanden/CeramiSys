import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";

// Types
export interface SaleReturnLine {
  id: number;
  saleReturnId: number;
  productId: number;
  qty: number;
  unitPrice: number;
  subTotal: number;
  product: {
    id: number;
    sku: string;
    name: string;
    unit?: string;
  };
}

export interface SaleReturn {
  id: number;
  saleId: number;
  companyId: number;
  customerId?: number;
  returnNumber?: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  isFullyPaid: boolean;
  refundMethod?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "RECEIVED_WAREHOUSE";
  reason?: string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
  lines: SaleReturnLine[];
  customer?: {
    id: number;
    name: string;
    phone?: string;
  };
  sale: {
    id: number;
    invoiceNumber?: string;
    total: number;
  };
  payments?: ReturnPayment[];
}

export interface ReturnPayment {
  id: number;
  saleReturnId: number;
  companyId: number;
  receiptNumber?: string;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "CARD";
  paymentDate: string;
  notes?: string;
  createdAt: string;
}

export interface CreateSaleReturnLineDto {
  productId: number;
  qty: number;
  unitPrice: number;
}

export interface CreateSaleReturnDto {
  saleId: number;
  reason?: string;
  notes?: string;
  lines: CreateSaleReturnLineDto[];
}

export interface CreateReturnPaymentDto {
  saleReturnId: number;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "CARD";
  paymentDate?: string;
  notes?: string;
}

export interface SaleReturnsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  saleId?: number;
  customerId?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  isFullyPaid?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ReturnPaymentsQueryParams {
  page?: number;
  limit?: number;
  saleReturnId?: number;
  startDate?: string;
  endDate?: string;
}

export const saleReturnApi = createApi({
  reducerPath: "saleReturnApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["SaleReturns", "ReturnPayments", "Sales", "CustomerAccountSummary", "Treasury", "TreasuryTransaction", "TreasuryStats"],
  endpoints: (build) => ({
    // Get all sale returns
    getSaleReturns: build.query<
      {
        success: boolean;
        data: SaleReturn[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      },
      SaleReturnsQueryParams
    >({
      query: (params) => {
        const queryString = new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString();
        return `/sale-returns?${queryString}`;
      },
      providesTags: (result) =>
        result
          ? [
            ...result.data.map(({ id }) => ({ type: "SaleReturns" as const, id })),
            { type: "SaleReturns", id: "LIST" },
          ]
          : [{ type: "SaleReturns", id: "LIST" }],
    }),

    // Get single sale return
    getSaleReturnById: build.query<
      {
        success: boolean;
        data: SaleReturn;
      },
      number
    >({
      query: (id) => `/sale-returns/${id}`,
      providesTags: (result, error, id) => [{ type: "SaleReturns", id }],
    }),

    // Create sale return
    createSaleReturn: build.mutation<
      {
        success: boolean;
        message: string;
        data: SaleReturn;
      },
      CreateSaleReturnDto
    >({
      query: (body) => ({
        url: "/sale-returns",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "SaleReturns", id: "LIST" },
        { type: "Sales", id: "LIST" },
        { type: "CustomerAccountSummary", id: "LIST" },
      ],
    }),

    // Approve sale return
    approveSaleReturn: build.mutation<
      {
        success: boolean;
        message: string;
        data: SaleReturn;
      },
      number
    >({
      query: (id) => ({
        url: `/sale-returns/${id}/approve`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "SaleReturns", id },
        { type: "SaleReturns", id: "LIST" },
        { type: "CustomerAccountSummary", id: "LIST" },
      ],
    }),

    // Reject sale return
    rejectSaleReturn: build.mutation<
      {
        success: boolean;
        message: string;
        data: SaleReturn;
      },
      number
    >({
      query: (id) => ({
        url: `/sale-returns/${id}/reject`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "SaleReturns", id },
        { type: "SaleReturns", id: "LIST" },
      ],
    }),

    // Delete sale return
    deleteSaleReturn: build.mutation<
      {
        success: boolean;
        message: string;
      },
      number
    >({
      query: (id) => ({
        url: `/sale-returns/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "SaleReturns", id: "LIST" }],
    }),

    // ==================== Return Payments ====================

    // Get return payments
    getReturnPayments: build.query<
      {
        success: boolean;
        data: ReturnPayment[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      },
      ReturnPaymentsQueryParams
    >({
      query: (params) => {
        const queryString = new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString();
        return `/sale-returns/payments?${queryString}`;
      },
      providesTags: (result) =>
        result
          ? [
            ...result.data.map(({ id }) => ({ type: "ReturnPayments" as const, id })),
            { type: "ReturnPayments", id: "LIST" },
          ]
          : [{ type: "ReturnPayments", id: "LIST" }],
    }),

    // Create return payment
    createReturnPayment: build.mutation<
      {
        success: boolean;
        message: string;
        data: ReturnPayment;
      },
      CreateReturnPaymentDto
    >({
      query: (body) => ({
        url: "/sale-returns/payments",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "ReturnPayments", id: "LIST" },
        { type: "SaleReturns", id: arg.saleReturnId },
        { type: "SaleReturns", id: "LIST" },
        { type: "CustomerAccountSummary", id: "LIST" },
        "Treasury",
        "TreasuryTransaction",
        "TreasuryStats"
      ],
    }),

    // Delete return payment
    deleteReturnPayment: build.mutation<
      {
        success: boolean;
        message: string;
      },
      number
    >({
      query: (paymentId) => ({
        url: `/sale-returns/payments/${paymentId}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "ReturnPayments", id: "LIST" },
        { type: "SaleReturns", id: "LIST" },
        { type: "CustomerAccountSummary", id: "LIST" },
        "Treasury",
        "TreasuryTransaction",
        "TreasuryStats"
      ],
    }),
  }),
});

export const {
  useGetSaleReturnsQuery,
  useGetSaleReturnByIdQuery,
  useCreateSaleReturnMutation,
  useApproveSaleReturnMutation,
  useRejectSaleReturnMutation,
  useDeleteSaleReturnMutation,
  useGetReturnPaymentsQuery,
  useCreateReturnPaymentMutation,
  useDeleteReturnPaymentMutation,
} = saleReturnApi;


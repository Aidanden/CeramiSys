import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";

export interface CustomerAccountEntry {
  id: number;
  customerId: number;
  transactionType: 'DEBIT' | 'CREDIT';
  amount: number;
  balance: number;
  referenceType: 'SALE' | 'PAYMENT' | 'ADJUSTMENT' | 'RETURN';
  referenceId: number;
  description?: string;
  transactionDate: string;
  createdAt: string;
  customer: {
    id: number;
    name: string;
    phone?: string;
  };
}

export interface CustomerAccount {
  customer: {
    id: number;
    name: string;
    phone?: string;
    note?: string;
    createdAt: string;
  };
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: CustomerAccountEntry[];
}

export interface CustomerAccountSummary {
  id: number;
  name: string;
  phone?: string;
  currentBalance: number;
  hasDebt: boolean;
}

export interface OpenInvoice {
  id: number;
  invoiceNumber?: string;
  companyId: number;
  company: {
    id: number;
    name: string;
    code: string;
  };
  customer?: {
    id: number;
    name: string;
    phone?: string;
  };
  total: number;
  paidAmount: number;
  remainingAmount: number;
  isFullyPaid: boolean;
  createdAt: string;
  approvedAt?: string;
  payments: {
    id: number;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    receiptNumber?: string;
  }[];
}

// معلمات جلب كشف الحساب مع الفلترة
export interface GetCustomerAccountParams {
  customerId: number;
  startDate?: string;
  endDate?: string;
}

// معلمات جلب الفواتير المفتوحة مع الفلترة
export interface GetOpenInvoicesParams {
  customerId: number;
  startDate?: string;
  endDate?: string;
}

export const customerAccountApi = createApi({
  reducerPath: "customerAccountApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ['CustomerAccount', 'CustomerAccountSummary'],
  endpoints: (build) => ({
    // جلب حساب عميل معين مع دعم الفلترة بالتاريخ
    getCustomerAccount: build.query<{ data: CustomerAccount }, GetCustomerAccountParams>({
      query: ({ customerId, startDate, endDate }) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const queryString = params.toString();
        return {
          url: `/customer-accounts/${customerId}${queryString ? `?${queryString}` : ''}`,
          method: "GET"
        };
      },
      providesTags: (_result, _error, { customerId }) => [{ type: 'CustomerAccount', id: customerId }]
    }),

    // جلب ملخص حسابات جميع العملاء
    getAllCustomersAccountSummary: build.query<{ data: CustomerAccountSummary[] }, void>({
      query: () => ({
        url: `/customer-accounts/summary`,
        method: "GET"
      }),
      providesTags: [{ type: 'CustomerAccountSummary', id: 'LIST' }]
    }),

    // جلب الرصيد الحالي لعميل
    getCustomerBalance: build.query<{ data: { balance: number } }, number>({
      query: (customerId) => ({
        url: `/customer-accounts/${customerId}/balance`,
        method: "GET"
      }),
      providesTags: (_result, _error, customerId) => [{ type: 'CustomerAccount', id: customerId }]
    }),

    // جلب الفواتير المفتوحة لعميل معين مع دعم الفلترة بالتاريخ
    getCustomerOpenInvoices: build.query<{ data: OpenInvoice[] }, GetOpenInvoicesParams>({
      query: ({ customerId, startDate, endDate }) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const queryString = params.toString();
        return {
          url: `/customer-accounts/${customerId}/open-invoices${queryString ? `?${queryString}` : ''}`,
          method: "GET"
        };
      },
      providesTags: (_result, _error, { customerId }) => [{ type: 'CustomerAccount', id: customerId }]
    })
  })
});

export const {
  useGetCustomerAccountQuery,
  useGetAllCustomersAccountSummaryQuery,
  useGetCustomerBalanceQuery,
  useGetCustomerOpenInvoicesQuery
} = customerAccountApi;


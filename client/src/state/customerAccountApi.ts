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

export const customerAccountApi = createApi({
  reducerPath: "customerAccountApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ['CustomerAccount', 'CustomerAccountSummary'],
  endpoints: (build) => ({
    // جلب حساب عميل معين
    getCustomerAccount: build.query<{ data: CustomerAccount }, number>({
      query: (customerId) => ({
        url: `/customer-accounts/${customerId}`,
        method: "GET"
      }),
      providesTags: (_result, _error, customerId) => [{ type: 'CustomerAccount', id: customerId }]
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

    // جلب الفواتير المفتوحة لعميل معين
    getCustomerOpenInvoices: build.query<{ data: OpenInvoice[] }, number>({
      query: (customerId) => ({
        url: `/customer-accounts/${customerId}/open-invoices`,
        method: "GET"
      }),
      providesTags: (_result, _error, customerId) => [{ type: 'CustomerAccount', id: customerId }]
    })
  })
});

export const {
  useGetCustomerAccountQuery,
  useGetAllCustomersAccountSummaryQuery,
  useGetCustomerBalanceQuery,
  useGetCustomerOpenInvoicesQuery
} = customerAccountApi;


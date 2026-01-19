import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";

export interface SupplierAccountEntry {
  id: number;
  supplierId: number;
  transactionType: 'DEBIT' | 'CREDIT';
  amount: number;
  balance: number;
  referenceType: 'PURCHASE' | 'PAYMENT' | 'ADJUSTMENT' | 'RETURN';
  referenceId: number;
  description?: string;
  transactionDate: string;
  createdAt: string;
  // دعم العملات الأجنبية
  currency: string;
  amountForeign?: number;
  exchangeRate: number;
  supplier: {
    id: number;
    name: string;
    phone?: string;
  };
}

export interface SupplierAccount {
  supplier: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    note?: string;
    createdAt: string;
  };
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  totalsByCurrency: Record<string, { credit: number; debit: number; balance: number }>;
  entries: SupplierAccountEntry[];
}

export interface SupplierAccountSummary {
  id: number;
  name: string;
  phone?: string;
  currentBalance: number;
  hasDebt: boolean;
}

export interface OpenPurchase {
  id: number;
  invoiceNumber?: string;
  companyId: number;
  company: {
    id: number;
    name: string;
  };
  total: number;
  paidAmount: number;
  remainingAmount: number;
  purchaseType: 'CASH' | 'CREDIT';
  status: 'DRAFT' | 'APPROVED' | 'CANCELLED';
  createdAt: string;
}

export const supplierAccountApi = createApi({
  reducerPath: "supplierAccountApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["SupplierAccounts", "SupplierAccount", "OpenPurchases"],
  refetchOnFocus: true, // إعادة جلب البيانات عند العودة للصفحة
  refetchOnReconnect: true, // إعادة جلب البيانات عند إعادة الاتصال
  endpoints: (build) => ({
    // جلب ملخص جميع حسابات الموردين
    getAllSuppliersAccountSummary: build.query<
      { success: boolean; data: SupplierAccountSummary[] },
      void
    >({
      query: () => "/supplier-accounts/summary",
      providesTags: ["SupplierAccounts"],
      keepUnusedDataFor: 0, // عدم الاحتفاظ بالبيانات القديمة
    }),

    // جلب تفاصيل حساب مورد واحد
    getSupplierAccount: build.query<
      { success: boolean; data: SupplierAccount },
      number
    >({
      query: (supplierId) => `/supplier-accounts/${supplierId}`,
      providesTags: (result, error, supplierId) => [
        { type: "SupplierAccount", id: supplierId },
        "SupplierAccounts", // إضافة tag عام للتحديث الشامل
      ],
      keepUnusedDataFor: 0, // عدم الاحتفاظ بالبيانات القديمة
    }),

    // جلب المشتريات المفتوحة للمورد
    getSupplierOpenPurchases: build.query<
      { success: boolean; data: OpenPurchase[] },
      number
    >({
      query: (supplierId) => `/supplier-accounts/${supplierId}/open-purchases`,
      providesTags: (result, error, supplierId) => [
        { type: "OpenPurchases", id: supplierId },
        "SupplierAccounts", // إضافة tag عام للتحديث الشامل
      ],
      keepUnusedDataFor: 0, // عدم الاحتفاظ بالبيانات القديمة
    }),
  }),
});

export const {
  useGetAllSuppliersAccountSummaryQuery,
  useGetSupplierAccountQuery,
  useGetSupplierOpenPurchasesQuery,
} = supplierAccountApi;

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from '../apiUtils';

// Types
export interface PurchaseExpenseCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  suppliers?: {
    id: number;
    supplierId: number;
    supplier: {
      id: number;
      name: string;
    };
  }[];
}

export interface CreateExpenseCategoryDto {
  name: string;
  description?: string;
  supplierIds?: number[];
}

export interface UpdateExpenseCategoryDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  supplierIds?: number[];
}

export interface PurchaseExpense {
  id: number;
  purchaseId: number;
  categoryId: number;
  supplierId?: number;
  amount: string;
  currency: 'LYD' | 'USD' | 'EUR';
  exchangeRate: string;
  amountForeign?: string;
  notes?: string;
  isActualExpense: boolean; // true = مصروف فعلي (دين), false = مصروف تقديري (لتوزيع التكلفة فقط)
  createdAt: string;
  category?: PurchaseExpenseCategory;
  supplier?: {
    id: number;
    name: string;
  };
}

export interface CreatePurchaseExpenseDto {
  categoryId: number;
  supplierId?: number;
  amount: number;
  currency?: 'LYD' | 'USD' | 'EUR';
  exchangeRate?: number;
  amountForeign?: number;
  notes?: string;
  isActualExpense?: boolean; // true = مصروف فعلي (دين), false = مصروف تقديري (لتوزيع التكلفة فقط)
}

export interface ApprovePurchaseDto {
  purchaseId: number;
  expenses: CreatePurchaseExpenseDto[];
}

export interface SupplierPayable {
  supplierId: number;
  supplierName: string;
  amount: number;
  type: 'MAIN_PURCHASE' | 'EXPENSE';
  description?: string;
  categoryName?: string;
}

export interface ApprovePurchaseResponse {
  success: boolean;
  purchase: {
    id: number;
    isApproved: boolean;
    approvedAt: string;
    totalExpenses: string;
    finalTotal: string;
  };
  productCosts?: {
    productId: number;
    totalCostPerUnit: string;
  }[];
  supplierPayables?: SupplierPayable[];
  paymentReceipts?: SupplierPayable[];
  message?: string;
}

export interface ProductCostHistory {
  id: number;
  productId: number;
  purchaseId: number;
  companyId: number;
  purchasePrice: string;
  expensePerUnit: string;
  totalCostPerUnit: string;
  quantity: string;
  createdAt: string;
}

export const purchaseExpenseApi = createApi({
  reducerPath: 'purchaseExpenseApi',
  baseQuery: (args, api, extraOptions) => {
    // Modify the URL to include the purchase-expenses prefix
    if (typeof args === 'string') {
      args = `/purchase-expenses${args}`;
    } else if (args && typeof args === 'object' && 'url' in args) {
      args = { ...args, url: `/purchase-expenses${args.url}` };
    }

    return baseQueryWithAuthInterceptor(args, api, extraOptions);
  },
  tagTypes: ['ExpenseCategories', 'PurchaseExpenses', 'ProductCostHistory', 'PaymentReceipts', 'SupplierAccounts'],
  endpoints: (builder) => ({
    // ==================== فئات المصروفات ====================
    getExpenseCategories: builder.query<PurchaseExpenseCategory[], boolean | void>({
      query: (includeInactive = false) => ({
        url: '/categories',
        params: { includeInactive },
      }),
      providesTags: ['ExpenseCategories'],
    }),

    getExpenseCategoryById: builder.query<PurchaseExpenseCategory, number>({
      query: (id) => `/categories/${id}`,
      providesTags: (result, error, id) => [{ type: 'ExpenseCategories', id }],
    }),

    createExpenseCategory: builder.mutation<PurchaseExpenseCategory, CreateExpenseCategoryDto>({
      query: (data) => ({
        url: '/categories',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ExpenseCategories'],
    }),

    updateExpenseCategory: builder.mutation<
      PurchaseExpenseCategory,
      { id: number; data: UpdateExpenseCategoryDto }
    >({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        'ExpenseCategories',
        { type: 'ExpenseCategories', id },
      ],
    }),

    deleteExpenseCategory: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ExpenseCategories'],
    }),

    // ==================== اعتماد الفاتورة ====================
    approvePurchase: builder.mutation<ApprovePurchaseResponse, ApprovePurchaseDto>({
      query: (data) => ({
        url: '/approve',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { purchaseId }) => [
        { type: 'PurchaseExpenses', id: purchaseId },
        'PaymentReceipts', // تحديث إيصالات الدفع
        'SupplierAccounts', // تحديث حسابات الموردين
      ],
    }),

    addExpensesToApprovedPurchase: builder.mutation<ApprovePurchaseResponse, ApprovePurchaseDto>({
      query: (data) => ({
        url: '/add-to-approved',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { purchaseId }) => [
        { type: 'PurchaseExpenses', id: purchaseId },
        'PaymentReceipts', // تحديث إيصالات الدفع
        'SupplierAccounts', // تحديث حسابات الموردين
      ],
    }),

    getPurchaseExpenses: builder.query<PurchaseExpense[], number>({
      query: (purchaseId) => `/purchase/${purchaseId}`,
      providesTags: (result, error, purchaseId) => [
        { type: 'PurchaseExpenses', id: purchaseId },
      ],
    }),

    deletePurchaseExpense: builder.mutation<{ message: string; deletedPaymentsCount: number }, number>({
      query: (expenseId) => ({
        url: `/expense/${expenseId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, expenseId) => [
        'PurchaseExpenses',
        { type: 'PurchaseExpenses', id: 'LIST' },
        'PaymentReceipts', // تحديث إيصالات الدفع
      ],
    }),

    // ==================== تاريخ التكلفة ====================
    getProductCostHistory: builder.query<
      ProductCostHistory[],
      { productId: number; companyId?: number }
    >({
      query: ({ productId, companyId }) => ({
        url: `/cost-history/${productId}`,
        params: companyId ? { companyId } : undefined,
      }),
      providesTags: (result, error, { productId }) => [
        { type: 'ProductCostHistory', id: productId },
      ],
    }),
  }),
});

export const {
  useGetExpenseCategoriesQuery,
  useGetExpenseCategoryByIdQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  useApprovePurchaseMutation,
  useAddExpensesToApprovedPurchaseMutation,
  useGetPurchaseExpensesQuery,
  useDeletePurchaseExpenseMutation,
  useGetProductCostHistoryQuery,
} = purchaseExpenseApi;

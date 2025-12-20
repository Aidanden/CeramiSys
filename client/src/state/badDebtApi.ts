/**
 * Bad Debt API
 * API للمصروفات المعدومة
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";

// Types
export interface BadDebtCategory {
    id: number;
    name: string;
    description?: string;
    companyId?: number;
    company?: {
        id: number;
        name: string;
        code: string;
    };
    isActive: boolean;
    totalExpenses?: number;
    expensesCount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface BadDebtExpense {
    id: number;
    categoryId: number;
    category?: {
        id: number;
        name: string;
    };
    amount: number;
    description?: string;
    treasuryId: number;
    receiptNumber?: string;
    paymentDate: string;
    notes?: string;
    createdBy?: string;
    createdAt: string;
}

export interface BadDebtStats {
    totalActiveCategories: number;
    thisMonth: {
        count: number;
        totalAmount: number;
    };
    thisYear: {
        count: number;
        totalAmount: number;
    };
    topCategories: Array<{
        categoryId: number;
        categoryName: string;
        totalAmount: number;
        count: number;
    }>;
}

export interface MonthlyReport {
    month: number;
    monthName: string;
    count: number;
    totalAmount: number;
}

// API Definition
export const badDebtApi = createApi({
    reducerPath: "badDebtApi",
    baseQuery: baseQueryWithAuthInterceptor,
    tagTypes: ["BadDebtCategories", "BadDebtCategory", "BadDebtExpenses", "BadDebtStats"],
    endpoints: (builder) => ({
        // ============== البنود ==============

        getCategories: builder.query<{ success: boolean; data: BadDebtCategory[] }, { companyId?: number; isActive?: boolean; search?: string }>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params.companyId) searchParams.append('companyId', params.companyId.toString());
                if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
                if (params.search) searchParams.append('search', params.search);
                return `bad-debts/categories?${searchParams.toString()}`;
            },
            providesTags: ["BadDebtCategories"],
        }),

        getCategory: builder.query<{ success: boolean; data: BadDebtCategory & { expenses: BadDebtExpense[] } }, number>({
            query: (id) => `bad-debts/categories/${id}`,
            providesTags: (result, error, id) => [{ type: "BadDebtCategory", id }],
        }),

        createCategory: builder.mutation<{ success: boolean; data: BadDebtCategory }, Partial<BadDebtCategory>>({
            query: (data) => ({
                url: "bad-debts/categories",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["BadDebtCategories", "BadDebtStats"],
        }),

        updateCategory: builder.mutation<{ success: boolean; data: BadDebtCategory }, { id: number; data: Partial<BadDebtCategory> }>({
            query: ({ id, data }) => ({
                url: `bad-debts/categories/${id}`,
                method: "PUT",
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: "BadDebtCategory", id }, "BadDebtCategories"],
        }),

        deleteCategory: builder.mutation<{ success: boolean; deleted: boolean; deactivated: boolean; message: string }, number>({
            query: (id) => ({
                url: `bad-debts/categories/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["BadDebtCategories", "BadDebtStats"],
        }),

        // ============== صرف المصروفات ==============

        payBadDebt: builder.mutation<{ success: boolean; data: BadDebtExpense }, {
            categoryId: number;
            amount: number;
            description?: string;
            treasuryId: number;
            notes?: string;
        }>({
            query: (data) => ({
                url: "bad-debts/expenses/pay",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["BadDebtExpenses", "BadDebtStats", "BadDebtCategories"],
        }),

        getExpenses: builder.query<{
            success: boolean;
            data: {
                expenses: BadDebtExpense[];
                pagination: { page: number; limit: number; total: number; pages: number }
            }
        }, {
            categoryId?: number;
            treasuryId?: number;
            startDate?: string;
            endDate?: string;
            page?: number;
            limit?: number
        }>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params.categoryId) searchParams.append('categoryId', params.categoryId.toString());
                if (params.treasuryId) searchParams.append('treasuryId', params.treasuryId.toString());
                if (params.startDate) searchParams.append('startDate', params.startDate);
                if (params.endDate) searchParams.append('endDate', params.endDate);
                if (params.page) searchParams.append('page', params.page.toString());
                if (params.limit) searchParams.append('limit', params.limit.toString());
                return `bad-debts/expenses?${searchParams.toString()}`;
            },
            providesTags: ["BadDebtExpenses"],
        }),

        // ============== الإحصائيات ==============

        getBadDebtStats: builder.query<{ success: boolean; data: BadDebtStats }, { companyId?: number; year?: number }>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params.companyId) searchParams.append('companyId', params.companyId.toString());
                if (params.year) searchParams.append('year', params.year.toString());
                return `bad-debts/stats?${searchParams.toString()}`;
            },
            providesTags: ["BadDebtStats"],
        }),

        getMonthlyReport: builder.query<{ success: boolean; data: MonthlyReport[] }, { year: number; companyId?: number }>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                searchParams.append('year', params.year.toString());
                if (params.companyId) searchParams.append('companyId', params.companyId.toString());
                return `bad-debts/reports/monthly?${searchParams.toString()}`;
            },
        }),
    }),
});

export const {
    useGetCategoriesQuery,
    useGetCategoryQuery,
    useCreateCategoryMutation,
    useUpdateCategoryMutation,
    useDeleteCategoryMutation,
    usePayBadDebtMutation,
    useGetExpensesQuery,
    useGetBadDebtStatsQuery,
    useGetMonthlyReportQuery,
} = badDebtApi;

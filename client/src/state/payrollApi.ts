/**
 * Payroll API
 * API للمرتبات والموظفين
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";

// Types
export interface Employee {
    id: number;
    name: string;
    jobTitle?: string;
    phone?: string;
    email?: string;
    baseSalary: number;
    companyId: number;
    company: {
        id: number;
        name: string;
        code: string;
    };
    isActive: boolean;
    hireDate?: string;
    notes?: string;
    totalPayments?: number;
    totalBonuses?: number;
    createdAt: string;
    updatedAt: string;
}

export interface SalaryPayment {
    id: number;
    employeeId: number;
    employee?: {
        id: number;
        name: string;
        jobTitle?: string;
        baseSalary: number;
    };
    amount: number;
    month: number;
    year: number;
    monthName?: string;
    treasuryId: number;
    receiptNumber?: string;
    paymentDate: string;
    notes?: string;
    createdBy?: string;
    createdAt: string;
}

export interface EmployeeBonus {
    id: number;
    employeeId: number;
    employee?: {
        id: number;
        name: string;
        jobTitle?: string;
    };
    type: 'BONUS' | 'RAISE' | 'INCENTIVE' | 'OVERTIME';
    typeName?: string;
    amount: number;
    reason?: string;
    treasuryId: number;
    receiptNumber?: string;
    paymentDate: string;
    effectiveDate?: string;
    notes?: string;
    createdBy?: string;
    createdAt: string;
}

export interface PayrollStats {
    totalActiveEmployees: number;
    thisMonth: {
        salariesPaid: number;
        totalAmount: number;
    };
    thisYear: {
        salariesPaid: number;
        totalSalaries: number;
        bonusesPaid: number;
        totalBonuses: number;
        grandTotal: number;
    };
    monthlyBreakdown: {
        month: number;
        monthName: string;
        salaries: number;
        bonuses: number;
        total: number;
    }[];
    treasuryDistribution: {
        name: string;
        amount: number;
    }[];
}

export interface SalaryStatement {
    employee: {
        id: number;
        name: string;
        jobTitle?: string;
        baseSalary: number;
    };
    month: number;
    year: number;
    monthName: string;
    summary: {
        baseSalary: number;
        totalPaid: number;
        remaining: number;
    };
    movements: {
        id: number;
        date: string;
        type: string;
        amount: number;
        treasury: string;
        receiptNumber?: string;
        notes?: string;
    }[];
}

// API Definition
export const payrollApi = createApi({
    reducerPath: "payrollApi",
    baseQuery: baseQueryWithAuthInterceptor,
    tagTypes: ["Employees", "Employee", "SalaryPayments", "Bonuses", "PayrollStats", "SalaryStatement"],
    endpoints: (builder) => ({
        // ============== الموظفين ==============

        getEmployees: builder.query<{ success: boolean; data: Employee[] }, { companyId?: number; isActive?: boolean; search?: string }>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params.companyId) searchParams.append('companyId', params.companyId.toString());
                if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
                if (params.search) searchParams.append('search', params.search);
                return `payroll/employees?${searchParams.toString()}`;
            },
            providesTags: ["Employees"],
        }),

        getEmployee: builder.query<{ success: boolean; data: Employee & { salaryPayments: SalaryPayment[]; bonuses: EmployeeBonus[] } }, number>({
            query: (id) => `payroll/employees/${id}`,
            providesTags: (result, error, id) => [{ type: "Employee", id }],
        }),

        createEmployee: builder.mutation<{ success: boolean; data: Employee }, Partial<Employee>>({
            query: (data) => ({
                url: "payroll/employees",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["Employees", "PayrollStats"],
        }),

        updateEmployee: builder.mutation<{ success: boolean; data: Employee }, { id: number; data: Partial<Employee> }>({
            query: ({ id, data }) => ({
                url: `payroll/employees/${id}`,
                method: "PUT",
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: "Employee", id }, "Employees"],
        }),

        deleteEmployee: builder.mutation<{ success: boolean; deleted: boolean; deactivated: boolean; message: string }, number>({
            query: (id) => ({
                url: `payroll/employees/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Employees", "PayrollStats"],
        }),

        // ============== صرف المرتبات ==============

        paySalary: builder.mutation<{ success: boolean; data: SalaryPayment }, {
            employeeId: number;
            month: number;
            year: number;
            amount: number;
            type: 'PARTIAL' | 'FINAL';
            treasuryId: number;
            notes?: string;
        }>({
            query: (data) => ({
                url: "payroll/salaries/pay",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["SalaryPayments", "PayrollStats", "Employees", "SalaryStatement"],
        }),

        payMultipleSalaries: builder.mutation<{
            success: boolean;
            data: {
                success: SalaryPayment[];
                errors: any[];
                totalPaid: number;
                totalFailed: number;
            }
        }, {
            employeeIds: number[];
            month: number;
            year: number;
            treasuryId: number;
        }>({
            query: (data) => ({
                url: "payroll/salaries/pay-multiple",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["SalaryPayments", "PayrollStats", "Employees"],
        }),

        getSalaryPayments: builder.query<{ success: boolean; data: SalaryPayment[] }, { month: number; year: number; companyId?: number }>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                searchParams.append('month', params.month.toString());
                searchParams.append('year', params.year.toString());
                if (params.companyId) searchParams.append('companyId', params.companyId.toString());
                return `payroll/salaries?${searchParams.toString()}`;
            },
            providesTags: ["SalaryPayments"],
        }),

        getSalaryStatement: builder.query<{ success: boolean; data: SalaryStatement }, { employeeId: number; month: number; year: number }>({
            query: ({ employeeId, month, year }) => `payroll/salaries/statement/${employeeId}?month=${month}&year=${year}`,
            providesTags: (result, error, { employeeId }) => [{ type: "SalaryStatement", id: employeeId }],
        }),

        // ============== المكافآت ==============

        payBonus: builder.mutation<{ success: boolean; data: EmployeeBonus }, {
            employeeId: number;
            type: 'BONUS' | 'RAISE' | 'INCENTIVE' | 'OVERTIME';
            amount: number;
            reason?: string;
            treasuryId: number;
            effectiveDate?: string;
            notes?: string;
        }>({
            query: (data) => ({
                url: "payroll/bonuses/pay",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["Bonuses", "PayrollStats", "Employees"],
        }),

        // ============== الإحصائيات ==============

        getPayrollStats: builder.query<{ success: boolean; data: PayrollStats }, { companyId?: number; year?: number }>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params.companyId) searchParams.append('companyId', params.companyId.toString());
                if (params.year) searchParams.append('year', params.year.toString());
                return `payroll/stats?${searchParams.toString()}`;
            },
            providesTags: ["PayrollStats"],
        }),

        // ============== حساب الموظف ==============

        getEmployeeAccount: builder.query<{ success: boolean; data: any }, number>({
            query: (id) => `payroll/employees/${id}/account`,
            providesTags: (result, error, id) => [{ type: "Employee", id }],
        }),
    }),
});

export const {
    useGetEmployeesQuery,
    useGetEmployeeQuery,
    useCreateEmployeeMutation,
    useUpdateEmployeeMutation,
    useDeleteEmployeeMutation,
    usePaySalaryMutation,
    usePayMultipleSalariesMutation,
    useGetSalaryPaymentsQuery,
    useGetSalaryStatementQuery,
    usePayBonusMutation,
    useGetPayrollStatsQuery,
    useGetEmployeeAccountQuery,
} = payrollApi;

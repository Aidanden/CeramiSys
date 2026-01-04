import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";
import { treasuryApi } from "./treasuryApi";

export interface FinancialContact {
    id: number;
    name: string;
    phone?: string;
    note?: string;
    totalDeposit?: number;
    totalWithdrawal?: number;
    currentBalance?: number;
}

export interface GeneralReceipt {
    id: number;
    contactId?: number;
    customerId?: number;
    supplierId?: number;
    employeeId?: number;
    treasuryId: number;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    description?: string;
    notes?: string;
    paymentDate: string;
    contact?: FinancialContact;
    customer?: {
        id: number;
        name: string;
        phone?: string;
    };
    supplier?: {
        id: number;
        name: string;
        phone?: string;
    };
    employee?: {
        id: number;
        name: string;
        phone?: string;
    };
}

export const generalReceiptApi = createApi({
    reducerPath: "generalReceiptApi",
    baseQuery: baseQueryWithAuthInterceptor,
    tagTypes: ["FinancialContacts", "GeneralReceipts", "Treasury", "FinancialContactStatement", "Customers", "Suppliers", "Employees"],
    endpoints: (build) => ({
        getFinancialContacts: build.query<FinancialContact[], void>({
            query: () => "/general/contacts",
            providesTags: ["FinancialContacts"],
        }),
        getFinancialContact: build.query<FinancialContact, number>({
            query: (id) => `/general/contacts/${id}`,
            providesTags: (result, error, id) => [{ type: "FinancialContacts", id }],
        }),
        createFinancialContact: build.mutation<FinancialContact, Partial<FinancialContact>>({
            query: (contact) => ({
                url: "/general/contacts",
                method: "POST",
                body: contact,
            }),
            invalidatesTags: ["FinancialContacts"],
        }),
        updateFinancialContact: build.mutation<FinancialContact, { id: number; data: Partial<FinancialContact> }>({
            query: ({ id, data }) => ({
                url: `/general/contacts/${id}`,
                method: "PUT",
                body: data,
            }),
            invalidatesTags: ["FinancialContacts"],
        }),
        getGeneralReceipts: build.query<GeneralReceipt[], { contactId?: number; customerId?: number; supplierId?: number; employeeId?: number; type?: string }>({
            query: (params) => ({
                url: "/general/receipts",
                params,
            }),
            providesTags: ["GeneralReceipts"],
        }),
        createGeneralReceipt: build.mutation<GeneralReceipt, Partial<GeneralReceipt>>({
            query: (receipt) => ({
                url: "/general/receipts",
                method: "POST",
                body: receipt,
            }),
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    // تحديث الخزائن والحركات في الذاكرة المؤقتة التابعة لـ treasuryApi
                    dispatch(treasuryApi.util.invalidateTags(['Treasury', 'TreasuryStats', 'TreasuryTransaction']));
                } catch (err) {
                    // Error updating treasury cache
                }
            },
            invalidatesTags: (result, error, { contactId, customerId, supplierId, employeeId }) => {
                const tags: any[] = [
                    "GeneralReceipts",
                    "FinancialContacts",
                    "Treasury",
                ];
                if (contactId) {
                    tags.push({ type: "FinancialContacts" as const, id: contactId });
                    tags.push({ type: "FinancialContactStatement" as const, id: contactId });
                }
                if (customerId) {
                    tags.push("Customers");
                }
                if (supplierId) {
                    tags.push("Suppliers");
                }
                if (employeeId) {
                    tags.push("Employees");
                }
                return tags;
            },
        }),
        getContactStatement: build.query<any[], number>({
            query: (id) => `/general/contacts/${id}/statement`,
            providesTags: (result, error, id) => [{ type: "FinancialContactStatement", id }],
        }),
    }),
});

export const {
    useGetFinancialContactsQuery,
    useGetFinancialContactQuery,
    useCreateFinancialContactMutation,
    useUpdateFinancialContactMutation,
    useGetGeneralReceiptsQuery,
    useCreateGeneralReceiptMutation,
    useGetContactStatementQuery,
} = generalReceiptApi;

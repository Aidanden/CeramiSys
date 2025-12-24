import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";

export interface FinancialContact {
    id: number;
    name: string;
    phone?: string;
    note?: string;
    currentBalance?: number;
}

export interface GeneralReceipt {
    id: number;
    contactId: number;
    treasuryId: number;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    description?: string;
    notes?: string;
    paymentDate: string;
    contact?: FinancialContact;
}

export const generalReceiptApi = createApi({
    reducerPath: "generalReceiptApi",
    baseQuery: baseQueryWithAuthInterceptor,
    tagTypes: ["FinancialContacts", "GeneralReceipts", "Treasury", "FinancialContactStatement"],
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
        getGeneralReceipts: build.query<GeneralReceipt[], { contactId?: number; type?: string }>({
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
            invalidatesTags: ["GeneralReceipts", "FinancialContacts", "Treasury"],
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

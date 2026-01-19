import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';

export interface SupplierWithPurchases {
  id: number;
  name: string;
  _count: {
    purchases: number;
  };
}

export interface SupplierDebt {
  currency: string;
  totalDebt: number;
}

export interface SupplierProductStats {
  productId: number;
  productName: string;
  productSku: string;
  unit: string;
  unitsPerBox: number | null;
  totalQuantityPurchased: number;
  currentStockQuantity: number;
}

export interface FullSupplierReport {
  supplier: {
    id: number;
    name: string;
    phone: string | null;
    address: string | null;
  };
  debts: SupplierDebt[];
  products: SupplierProductStats[];
}

export const supplierProductsReportApi = createApi({
  reducerPath: 'supplierProductsReportApi',
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ['SupplierProductsReport'],
  endpoints: (builder) => ({
    getSuppliersWithPurchases: builder.query<SupplierWithPurchases[], void>({
      query: () => '/reports/supplier-products/suppliers',
      providesTags: ['SupplierProductsReport'],
    }),
    getSupplierReport: builder.query<FullSupplierReport, number>({
      query: (supplierId) => `/reports/supplier-products/${supplierId}`,
      providesTags: ['SupplierProductsReport'],
    }),
    getSupplierDebt: builder.query<SupplierDebt[], number>({
      query: (supplierId) => `/reports/supplier-products/${supplierId}/debt`,
      providesTags: ['SupplierProductsReport'],
    }),
  }),
});

export const {
  useGetSuppliersWithPurchasesQuery,
  useGetSupplierReportQuery,
  useGetSupplierDebtQuery,
} = supplierProductsReportApi;


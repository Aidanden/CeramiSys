import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface ProvisionalSaleLine {
  id: number;
  productId: number;
  product: {
    id: number;
    sku: string;
    name: string;
    unit?: string;
    unitsPerBox?: number;
  };
  qty: number;
  unitPrice: number;
  subTotal: number;
}

export interface ProvisionalSale {
  id: number;
  companyId: number;
  company: {
    id: number;
    name: string;
    code: string;
  };
  customerId?: number;
  customer?: {
    id: number;
    name: string;
    phone?: string;
  };
  invoiceNumber?: string;
  total: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'CONVERTED' | 'CANCELLED';
  isConverted: boolean;
  convertedSaleId?: number;
  convertedSale?: {
    id: number;
    invoiceNumber?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  convertedAt?: string;
  lines: ProvisionalSaleLine[];
}

export interface CreateProvisionalSaleRequest {
  companyId?: number;
  customerId?: number;
  invoiceNumber?: string;
  status?: 'DRAFT' | 'PENDING' | 'APPROVED';
  notes?: string;
  lines: {
    productId: number;
    qty: number;
    unitPrice: number;
  }[];
}

export interface UpdateProvisionalSaleRequest {
  customerId?: number;
  invoiceNumber?: string;
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'CANCELLED';
  notes?: string;
  lines?: {
    id?: number;
    productId: number;
    qty: number;
    unitPrice: number;
  }[];
}

export interface ConvertToSaleRequest {
  saleType: 'CASH' | 'CREDIT';
  paymentMethod?: 'CASH' | 'BANK' | 'CARD';
}

export interface ProvisionalSalesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: number;
  customerId?: number;
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'CONVERTED' | 'CANCELLED';
  isConverted?: boolean;
  todayOnly?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'total' | 'invoiceNumber';
  sortOrder?: 'asc' | 'desc';
}

export const provisionalSalesApi = createApi({
  reducerPath: 'provisionalSalesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/api`,
    credentials: 'include',
  }),
  tagTypes: ['ProvisionalSale'],
  endpoints: (builder) => ({
    getProvisionalSales: builder.query<
      {
        provisionalSales: ProvisionalSale[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      },
      ProvisionalSalesQueryParams
    >({
      query: (params) => ({
        url: '/provisional-sales',
        params,
      }),
      providesTags: ['ProvisionalSale'],
    }),

    getProvisionalSaleById: builder.query<ProvisionalSale, number>({
      query: (id) => `/provisional-sales/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ProvisionalSale', id }],
    }),

    createProvisionalSale: builder.mutation<ProvisionalSale, CreateProvisionalSaleRequest>({
      query: (data) => ({
        url: '/provisional-sales',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ProvisionalSale'],
    }),

    updateProvisionalSale: builder.mutation<
      ProvisionalSale,
      { id: number; data: UpdateProvisionalSaleRequest }
    >({
      query: ({ id, data }) => ({
        url: `/provisional-sales/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'ProvisionalSale', id }, 'ProvisionalSale'],
    }),

    deleteProvisionalSale: builder.mutation<void, number>({
      query: (id) => ({
        url: `/provisional-sales/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ProvisionalSale'],
    }),

    updateProvisionalSaleStatus: builder.mutation<
      ProvisionalSale,
      { id: number; status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'CANCELLED' }
    >({
      query: ({ id, status }) => ({
        url: `/provisional-sales/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'ProvisionalSale', id }, 'ProvisionalSale'],
    }),

    convertProvisionalSaleToSale: builder.mutation<
      ProvisionalSale,
      { id: number; data: ConvertToSaleRequest }
    >({
      query: ({ id, data }) => ({
        url: `/provisional-sales/${id}/convert`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'ProvisionalSale', id }, 'ProvisionalSale'],
    }),
  }),
});

export const {
  useGetProvisionalSalesQuery,
  useGetProvisionalSaleByIdQuery,
  useCreateProvisionalSaleMutation,
  useUpdateProvisionalSaleMutation,
  useDeleteProvisionalSaleMutation,
  useUpdateProvisionalSaleStatusMutation,
  useConvertProvisionalSaleToSaleMutation,
} = provisionalSalesApi;

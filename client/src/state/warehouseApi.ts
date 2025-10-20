import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';

// Types
export interface DispatchOrder {
  id: number;
  saleId: number;
  sale?: {
    id: number;
    invoiceNumber: string;
    customer?: {
      id: number;
      name: string;
      phone?: string;
    };
    company?: {
      id: number;
      name: string;
      code: string;
    };
    total: number;
    lines: Array<{
      id: number;
      productId: number;
      product?: {
        id: number;
        name: string;
        sku: string;
        unit?: string;
        unitsPerBox?: number;
      };
      qty: number;
      unitPrice: number;
      subtotal: number;
    }>;
  };
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completedBy?: number;
  completedByUser?: {
    id: number;
    name: string;
  };
  notes?: string;
}

export interface CreateDispatchOrderRequest {
  saleId: number;
  notes?: string;
}

export interface UpdateDispatchOrderStatusRequest {
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export interface GetDispatchOrdersParams {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface DispatchOrdersResponse {
  dispatchOrders: DispatchOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const warehouseApi = createApi({
  reducerPath: 'warehouseApi',
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ['DispatchOrders', 'Sales'],
  endpoints: (builder) => ({
    // Get all dispatch orders
    getDispatchOrders: builder.query<{ data: DispatchOrdersResponse }, GetDispatchOrdersParams>({
      query: (params) => ({
        url: '/warehouse/dispatch-orders',
        params,
      }),
      providesTags: ['DispatchOrders'],
    }),

    // Get single dispatch order
    getDispatchOrder: builder.query<{ data: DispatchOrder }, number>({
      query: (id) => `/warehouse/dispatch-orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'DispatchOrders', id }],
    }),

    // Create dispatch order
    createDispatchOrder: builder.mutation<{ data: DispatchOrder }, CreateDispatchOrderRequest>({
      query: (body) => ({
        url: '/warehouse/dispatch-orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['DispatchOrders', 'Sales'],
    }),

    // Update dispatch order status
    updateDispatchOrderStatus: builder.mutation<
      { data: DispatchOrder },
      { id: number; body: UpdateDispatchOrderStatusRequest }
    >({
      query: ({ id, body }) => ({
        url: `/warehouse/dispatch-orders/${id}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        'DispatchOrders',
        { type: 'DispatchOrders', id },
      ],
    }),

    // Delete dispatch order
    deleteDispatchOrder: builder.mutation<void, number>({
      query: (id) => ({
        url: `/warehouse/dispatch-orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['DispatchOrders'],
    }),
  }),
});

export const {
  useGetDispatchOrdersQuery,
  useGetDispatchOrderQuery,
  useCreateDispatchOrderMutation,
  useUpdateDispatchOrderStatusMutation,
  useDeleteDispatchOrderMutation,
} = warehouseApi;

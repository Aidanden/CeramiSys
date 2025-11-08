import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';
import { API_CACHE_CONFIG } from '@/lib/config';

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
      isFromParentCompany?: boolean;
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
  // تطبيق إعدادات عدم الكاش
  keepUnusedDataFor: API_CACHE_CONFIG.warehouse.keepUnusedDataFor,
  refetchOnMountOrArgChange: API_CACHE_CONFIG.warehouse.refetchOnMountOrArgChange,
  refetchOnFocus: API_CACHE_CONFIG.warehouse.refetchOnFocus,
  refetchOnReconnect: API_CACHE_CONFIG.warehouse.refetchOnReconnect,
  endpoints: (builder) => ({
    // Get all dispatch orders
    getDispatchOrders: builder.query<{ data: DispatchOrdersResponse }, GetDispatchOrdersParams>({
      query: (params) => ({
        url: '/warehouse/dispatch-orders',
        params,
      }),
      providesTags: ['DispatchOrders'],
      keepUnusedDataFor: API_CACHE_CONFIG.warehouse.keepUnusedDataFor,
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
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data: response } = await queryFulfilled;
          const newOrder = response.data;
          
          // تحديث الـ cache مباشرة - إضافة الأمر الجديد في بداية القائمة
          dispatch(
            warehouseApi.util.updateQueryData('getDispatchOrders', { limit: 100 }, (draft) => {
              if (draft?.data?.dispatchOrders && newOrder) {
                draft.data.dispatchOrders.unshift(newOrder);
              }
            })
          );
        } catch {
          // في حالة الخطأ، سيتم invalidate tags تلقائياً
        }
      },
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
      async onQueryStarted({ id, body }, { dispatch, queryFulfilled }) {
        // Optimistic update لتحديث حالة الأمر
        const patchResults: any[] = [];
        
        try {
          patchResults.push(
            dispatch(
              warehouseApi.util.updateQueryData('getDispatchOrders', { limit: 100 }, (draft) => {
                const order = draft?.data?.dispatchOrders?.find(o => o.id === id);
                if (order) {
                  order.status = body.status;
                  if (body.status === 'COMPLETED') {
                    order.completedAt = new Date().toISOString();
                  }
                }
              })
            )
          );
          
          await queryFulfilled;
        } catch {
          // في حالة الخطأ، نرجع التغييرات
          patchResults.forEach(patchResult => patchResult.undo());
        }
      },
    }),

    // Delete dispatch order
    deleteDispatchOrder: builder.mutation<void, number>({
      query: (id) => ({
        url: `/warehouse/dispatch-orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['DispatchOrders'],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Optimistic update لحذف الأمر
        const patchResults: any[] = [];
        
        try {
          patchResults.push(
            dispatch(
              warehouseApi.util.updateQueryData('getDispatchOrders', { limit: 100 }, (draft) => {
                if (draft?.data?.dispatchOrders) {
                  draft.data.dispatchOrders = draft.data.dispatchOrders.filter(order => order.id !== id);
                }
              })
            )
          );
          
          await queryFulfilled;
        } catch {
          // في حالة الخطأ، نرجع التغييرات
          patchResults.forEach(patchResult => patchResult.undo());
        }
      },
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

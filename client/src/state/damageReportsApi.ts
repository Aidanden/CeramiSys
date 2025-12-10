import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';
import { API_CACHE_CONFIG } from '@/lib/config';

export interface DamageReportLine {
  id?: number;
  productId: number;
  product?: {
    id: number;
    sku: string;
    name: string;
    unit: string | null;
    unitsPerBox: number | null;
  };
  quantity: number;
  notes?: string;
  createdAt?: Date;
}

export interface DamageReport {
  id: number;
  reportNumber: string;
  companyId: number;
  company: {
    id: number;
    name: string;
    code: string;
  };
  createdByUserId: string;
  createdBy: {
    UserID: string;
    FullName: string;
    UserName: string;
  };
  reason: string;
  notes: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  lines: DamageReportLine[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DamageReportStats {
  totalReports: number;
  pendingReports: number;
  approvedReports: number;
  rejectedReports: number;
  totalDamagedQuantity: number;
  totalDamagedBoxes: number;
  totalDamagedPieces: number;
  totalDamagedBags: number;
  totalDamagedLiters: number;
  reportsPerCompany: {
    companyId: number;
    companyName: string;
    companyCode: string;
    totalReports: number;
  }[];
}

export interface CreateDamageReportDto {
  companyId?: number; // للـ Admin فقط - لتحديد الشركة
  reason: string;
  notes?: string;
  lines: {
    productId: number;
    quantity: number;
    notes?: string;
  }[];
}

export interface GetDamageReportsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  companyId?: number;
  startDate?: string;
  endDate?: string;
  productName?: string;
  productCode?: string;
  reason?: string;
}

export const damageReportsApi = createApi({
  reducerPath: 'damageReportsApi',
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ['DamageReports', 'DamageReportStats'],
  keepUnusedDataFor: API_CACHE_CONFIG.reports.keepUnusedDataFor,
  refetchOnMountOrArgChange: API_CACHE_CONFIG.reports.refetchOnMountOrArgChange,
  refetchOnFocus: API_CACHE_CONFIG.reports.refetchOnFocus,
  refetchOnReconnect: API_CACHE_CONFIG.reports.refetchOnReconnect,
  endpoints: (builder) => ({
    createDamageReport: builder.mutation<any, CreateDamageReportDto>({
      query: (data) => ({
        url: '/damage-reports',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['DamageReports', 'DamageReportStats'],
    }),
    getDamageReports: builder.query<any, GetDamageReportsQuery>({
      query: (params) => ({
        url: '/damage-reports',
        params,
      }),
      providesTags: ['DamageReports'],
    }),
    getDamageReportById: builder.query<any, number>({
      query: (id) => `/damage-reports/${id}`,
      providesTags: (result, error, id) => [{ type: 'DamageReports', id }],
    }),
    getDamageReportStats: builder.query<any, void>({
      query: () => '/damage-reports/stats',
      providesTags: ['DamageReportStats'],
    }),
    deleteDamageReport: builder.mutation<any, number>({
      query: (id) => ({
        url: `/damage-reports/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['DamageReports', 'DamageReportStats'],
    }),
  }),
});

export const {
  useCreateDamageReportMutation,
  useGetDamageReportsQuery,
  useGetDamageReportByIdQuery,
  useGetDamageReportStatsQuery,
  useDeleteDamageReportMutation,
} = damageReportsApi;

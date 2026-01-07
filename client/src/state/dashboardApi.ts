import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';

// أنواع البيانات
export interface UserSalesStat {
  userId: string;
  userName: string;
  fullName: string;
  companyName: string;
  totalSales: number;
  salesCount: number;
}

export interface UsersSalesStatsResponse {
  success: boolean;
  data: {
    period: {
      year: number;
      month: number;
    };
    summary: {
      totalRevenue: number;
      totalInvoices: number;
      activeUsers: number;
    };
    users: UserSalesStat[];
  };
}

export interface MonthlyChartData {
  month: number;
  monthName: string;
  sales: number;
  purchases: number;
  badDebts: number;
  damages: number;
  returns: number;
}

export interface ComprehensiveChartDataResponse {
  success: boolean;
  data: {
    year: number;
    monthlyData: MonthlyChartData[];
    yearTotals: {
      sales: number;
      purchases: number;
      badDebts: number;
      damages: number;
      returns: number;
    };
  };
}

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ['DashboardStats'],
  endpoints: (builder) => ({
    // إحصائيات مبيعات المستخدمين
    getUsersSalesStats: builder.query<UsersSalesStatsResponse, { year?: number; month?: number }>({
      query: ({ year, month }) => {
        const params = new URLSearchParams();
        if (year) params.append('year', year.toString());
        if (month) params.append('month', month.toString());
        return {
          url: `/dashboard/users-sales${params.toString() ? `?${params.toString()}` : ''}`,
          method: 'GET',
        };
      },
      providesTags: ['DashboardStats'],
    }),
    
    // بيانات الرسم البياني الشامل
    getComprehensiveChartData: builder.query<ComprehensiveChartDataResponse, { year?: number }>({
      query: ({ year }) => {
        const params = new URLSearchParams();
        if (year) params.append('year', year.toString());
        return {
          url: `/dashboard/comprehensive-chart${params.toString() ? `?${params.toString()}` : ''}`,
          method: 'GET',
        };
      },
      providesTags: ['DashboardStats'],
    }),
  }),
});

export const {
  useGetUsersSalesStatsQuery,
  useGetComprehensiveChartDataQuery,
} = dashboardApi;


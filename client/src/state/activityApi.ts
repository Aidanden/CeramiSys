/**
 * Activity API
 * API للأنشطة الأخيرة
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";
import { API_CACHE_CONFIG } from "@/lib/config";

// Types للأنشطة
export interface ActivityItem {
  id: string;
  type: "sale" | "purchase" | "payment" | "user" | "product";
  title: string;
  description: string;
  time: string;
  amount?: string;
  createdAt: string;
}

export interface ActivitiesResponse {
  success: boolean;
  message: string;
  data: ActivityItem[];
}

export interface ActivitiesQueryParams {
  limit?: number;
}

// API Definition
export const activityApi = createApi({
  reducerPath: "activityApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["Activities"],
  // تطبيق إعدادات عدم الكاش
  keepUnusedDataFor: API_CACHE_CONFIG.activities.keepUnusedDataFor,
  refetchOnMountOrArgChange: API_CACHE_CONFIG.activities.refetchOnMountOrArgChange,
  refetchOnFocus: API_CACHE_CONFIG.activities.refetchOnFocus,
  refetchOnReconnect: API_CACHE_CONFIG.activities.refetchOnReconnect,
  endpoints: (builder) => ({
    /**
     * الحصول على الأنشطة الأخيرة
     */
    getRecentActivities: builder.query<ActivitiesResponse, ActivitiesQueryParams>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit.toString());
        return `activities/recent?${searchParams.toString()}`;
      },
      providesTags: [{ type: "Activities", id: "LIST" }],
    }),
  }),
});

// Export hooks
export const {
  useGetRecentActivitiesQuery,
} = activityApi;


/**
 * Activity API
 * API للأنشطة الأخيرة
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";

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
  keepUnusedDataFor: 60, // 1 minute
  refetchOnMountOrArgChange: true,
  refetchOnFocus: false,
  refetchOnReconnect: true,
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


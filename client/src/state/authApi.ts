import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";
import { API_CACHE_CONFIG } from "@/lib/config";

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: {
      id: string;
      username: string;
      fullName: string;
      email: string;
      role: string;
      permissions: string[];
    };
  };
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  permissions: string[];
  companyId: number;
}

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["Auth", "CurrentUser"],
  ...API_CACHE_CONFIG.auth,
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    logout: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
    getCurrentUser: builder.query<{ success: boolean; data: User }, void>({
      query: () => "/auth/me",
      providesTags: ["CurrentUser"],
    }),
    changePassword: builder.mutation<
      { success: boolean; message: string },
      { currentPassword: string; newPassword: string }
    >({
      query: (passwords) => ({
        url: "/auth/change-password",
        method: "PUT",
        body: passwords,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useChangePasswordMutation,
} = authApi;

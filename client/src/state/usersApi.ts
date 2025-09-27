import { createApi } from "@reduxjs/toolkit/query/react";
import { API_CACHE_CONFIG } from "@/lib/config";
import { baseQueryWithAuthInterceptor } from "./apiUtils";

export interface CreateUserRequest {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  roleId: string;
  companyId?: number;
  isSystemUser?: boolean;
  isActive: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  roleName?: string;
  companyId?: number;
  companyName?: string;
  isSystemUser?: boolean;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface UsersResponse {
  success: boolean;
  data: {
    users: User[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  message?: string;
}

export interface CreateUserResponse {
  success: boolean;
  data?: User;
  message: string;
}

export const usersApi = createApi({
  reducerPath: "usersApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["Users"],
  ...API_CACHE_CONFIG.users,
  endpoints: (builder) => ({
    getUsers: builder.query<UsersResponse, void>({
      query: () => "/users/users",
      providesTags: ["Users"],
    }),
    createUser: builder.mutation<CreateUserResponse, CreateUserRequest>({
      query: (userData) => ({
        url: "/users/users",
        method: "POST",
        body: userData,
      }),
      invalidatesTags: ["Users"],
    }),
    updateUser: builder.mutation<CreateUserResponse, { id: string; userData: Partial<CreateUserRequest> }>({
      query: ({ id, userData }) => ({
        url: `/users/users/${id}`,
        method: "PUT",
        body: userData,
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/users/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = usersApi;

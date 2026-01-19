import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";
import { API_CACHE_CONFIG } from "@/lib/config";
import type { 
  ScreenPermission, 
  UserScreensResponse, 
  AllScreensResponse, 
  ScreenByCategoryResponse 
} from "@/types/permissions";

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  module: string;
  isActive: boolean;
  createdAt: string;
}

export interface Role {
  id: string;
  roleName: string;
  displayName: string;
  description?: string | null;
  permissions: string[];
  isActive?: boolean;
  createdAt?: string;
}

export interface CreateRoleRequest {
  roleName: string;
  displayName: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  displayName?: string;
  description?: string;
  permissions?: string[];
}

interface UserPermission {
  userId: string;
  roleId: string;
  customPermissions: string[];
}

export const permissionsApi = createApi({
  reducerPath: "permissionsApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["Permissions", "Permission", "Roles", "Role", "UserPermissions", "Screens", "UserScreens"],
  ...API_CACHE_CONFIG.permissions,
  endpoints: (builder) => ({
    // إدارة الشاشات (Screen-Based Permissions)
    getAllScreens: builder.query<AllScreensResponse, void>({
      query: () => "/screens",
      providesTags: ["Screens"],
      transformResponse: (response: { success: boolean; data: AllScreensResponse }) => response.data,
    }),
    
    getUserScreens: builder.query<UserScreensResponse, void>({
      query: () => "/users/me/screens",
      providesTags: ["UserScreens"],
      transformResponse: (response: { success: boolean; data: UserScreensResponse }) => response.data,
    }),
    
    getScreensByCategory: builder.query<ScreenByCategoryResponse, string>({
      query: (category) => `/screens/category/${category}`,
      providesTags: (result, error, category) => [{ type: "Screens", id: category }],
      transformResponse: (response: { success: boolean; data: ScreenByCategoryResponse }) => response.data,
    }),
    // إدارة الصلاحيات
    getPermissions: builder.query<Permission[], void>({
      query: () => "/permissions",
      providesTags: (result) => [
        "Permissions",
        ...(result?.map(({ id }) => ({ type: "Permission" as const, id })) ?? []),
      ],
    }),
    
    createPermission: builder.mutation<Permission, Partial<Permission>>({
      query: (permission) => ({
        url: "/permissions",
        method: "POST",
        body: permission,
      }),
      invalidatesTags: ["Permissions"],
    }),
    
    updatePermission: builder.mutation<Permission, { id: string; data: Partial<Permission> }>({
      query: ({ id, data }) => ({
        url: `/permissions/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Permission", id },
        "Permissions",
      ],
    }),
    
    deletePermission: builder.mutation<void, string>({
      query: (id) => ({
        url: `/permissions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Permission", id },
        "Permissions",
      ],
    }),

    // إدارة الأدوار
    getRoles: builder.query<{ success: boolean; data: Role[] }, void>({
      query: () => "/users/roles",
      providesTags: (result) => [
        "Roles",
        ...(result?.data?.map(({ id }) => ({ type: "Role" as const, id })) ?? []),
      ],
    }),
    
    createRole: builder.mutation<Role, CreateRoleRequest>({
      query: (role) => ({
        url: "/users/roles",
        method: "POST",
        body: role,
      }),
      invalidatesTags: ["Roles"],
    }),
    
    updateRole: builder.mutation<Role, { id: string; data: UpdateRoleRequest }>({
      query: ({ id, data }) => ({
        url: `/users/roles/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Role", id },
        "Roles",
      ],
    }),
    
    deleteRole: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/roles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Role", id },
        "Roles",
      ],
    }),

    // تخصيص صلاحيات المستخدمين
    getUserPermissions: builder.query<UserPermission[], string>({
      query: (userId) => `/users/${userId}/permissions`,
      providesTags: (result, error, userId) => [
        { type: "UserPermissions", id: userId },
      ],
    }),
    
    assignUserRole: builder.mutation<void, { userId: string; roleId: string }>({
      query: ({ userId, roleId }) => ({
        url: `/users/${userId}/role`,
        method: "POST",
        body: { roleId },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "UserPermissions", id: userId },
      ],
    }),
    
    assignUserPermissions: builder.mutation<void, { userId: string; permissions: string[] }>({
      query: ({ userId, permissions }) => ({
        url: `/users/${userId}/permissions`,
        method: "POST",
        body: { permissions },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "UserPermissions", id: userId },
      ],
    }),

    // التحقق من الصلاحيات
    checkUserPermission: builder.query<boolean, { userId: string; permission: string }>({
      query: ({ userId, permission }) => `/users/${userId}/check-permission?permission=${permission}`,
    }),
    
    getUserRolePermissions: builder.query<string[], string>({
      query: (userId) => `/users/${userId}/role-permissions`,
      providesTags: (result, error, userId) => [
        { type: "UserPermissions", id: userId },
      ],
    }),
  }),
});

export const {
  useGetAllScreensQuery,
  useGetUserScreensQuery,
  useGetScreensByCategoryQuery,
  useGetPermissionsQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetUserPermissionsQuery,
  useAssignUserRoleMutation,
  useAssignUserPermissionsMutation,
  useCheckUserPermissionQuery,
  useGetUserRolePermissionsQuery,
} = permissionsApi;

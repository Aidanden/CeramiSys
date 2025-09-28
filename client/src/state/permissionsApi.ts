import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";
import { API_CACHE_CONFIG } from "@/lib/config";

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  module: string;
  isActive: boolean;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

interface UserPermission {
  userId: string;
  roleId: string;
  customPermissions: string[];
}

export const permissionsApi = createApi({
  reducerPath: "permissionsApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["Permissions", "Permission", "Roles", "Role", "UserPermissions"],
  ...API_CACHE_CONFIG.permissions,
  endpoints: (builder) => ({
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
    getRoles: builder.query<Role[], void>({
      query: () => "/roles",
      providesTags: (result) => [
        "Roles",
        ...(result?.map(({ id }) => ({ type: "Role" as const, id })) ?? []),
      ],
    }),
    
    createRole: builder.mutation<Role, Partial<Role>>({
      query: (role) => ({
        url: "/roles",
        method: "POST",
        body: role,
      }),
      invalidatesTags: ["Roles"],
    }),
    
    updateRole: builder.mutation<Role, { id: string; data: Partial<Role> }>({
      query: ({ id, data }) => ({
        url: `/roles/${id}`,
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
        url: `/roles/${id}`,
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

import { createApi } from "@reduxjs/toolkit/query/react";
import { API_CACHE_CONFIG } from "@/lib/config";
import { baseQueryWithAuthInterceptor } from "./apiUtils";

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
  tagTypes: ["Permission", "Role", "UserPermission"],
  ...API_CACHE_CONFIG.permissions,
  endpoints: (builder) => ({
    // إدارة الصلاحيات
    getPermissions: builder.query<Permission[], void>({
      query: () => "/permissions",
      providesTags: ["Permission"],
    }),
    
    createPermission: builder.mutation<Permission, Partial<Permission>>({
      query: (permission) => ({
        url: "/permissions",
        method: "POST",
        body: permission,
      }),
      invalidatesTags: ["Permission"],
    }),
    
    updatePermission: builder.mutation<Permission, { id: string; data: Partial<Permission> }>({
      query: ({ id, data }) => ({
        url: `/permissions/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Permission"],
    }),
    
    deletePermission: builder.mutation<void, string>({
      query: (id) => ({
        url: `/permissions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Permission"],
    }),

    // إدارة الأدوار
    getRoles: builder.query<Role[], void>({
      query: () => "/roles",
      providesTags: ["Role"],
    }),
    
    createRole: builder.mutation<Role, Partial<Role>>({
      query: (role) => ({
        url: "/roles",
        method: "POST",
        body: role,
      }),
      invalidatesTags: ["Role"],
    }),
    
    updateRole: builder.mutation<Role, { id: string; data: Partial<Role> }>({
      query: ({ id, data }) => ({
        url: `/roles/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Role"],
    }),
    
    deleteRole: builder.mutation<void, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Role"],
    }),

    // تخصيص صلاحيات المستخدمين
    getUserPermissions: builder.query<UserPermission[], string>({
      query: (userId) => `/users/${userId}/permissions`,
      providesTags: ["UserPermission"],
    }),
    
    assignUserRole: builder.mutation<void, { userId: string; roleId: string }>({
      query: ({ userId, roleId }) => ({
        url: `/users/${userId}/role`,
        method: "POST",
        body: { roleId },
      }),
      invalidatesTags: ["UserPermission"],
    }),
    
    assignUserPermissions: builder.mutation<void, { userId: string; permissions: string[] }>({
      query: ({ userId, permissions }) => ({
        url: `/users/${userId}/permissions`,
        method: "POST",
        body: { permissions },
      }),
      invalidatesTags: ["UserPermission"],
    }),

    // التحقق من الصلاحيات
    checkUserPermission: builder.query<boolean, { userId: string; permission: string }>({
      query: ({ userId, permission }) => `/users/${userId}/check-permission?permission=${permission}`,
    }),
    
    getUserRolePermissions: builder.query<string[], string>({
      query: (userId) => `/users/${userId}/role-permissions`,
      providesTags: ["UserPermission"],
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

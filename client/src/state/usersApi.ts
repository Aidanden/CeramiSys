import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';
import { API_CACHE_CONFIG } from '@/lib/config';

// تعريف أنواع البيانات
export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: string | null;
  roleId?: string | null;
  roleName?: string;
  companyId?: number;
  companyName?: string;
  isSystemUser?: boolean;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  permissions: string[];
  hasCustomPermissions?: boolean;
}

export interface CreateUserRequest {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  roleId?: string;
  permissions?: string[];
  companyId?: number;
  isSystemUser?: boolean;
  isActive: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  roleId?: string;
  permissions?: string[];
  companyId?: number;
  isSystemUser?: boolean;
  isActive?: boolean;
}

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isSystemUser?: boolean;
  isActive?: boolean;
}

// تعريف أنواع الاستجابة
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

export interface UserResponse {
  success: boolean;
  data?: User;
  message: string;
}

export interface CompanyStats {
  totalCompanies: number;
  parentCompanies: number;
  branchCompanies: number;
  activeUsers: number;
  totalProducts: number;
  totalSales: number;
}

export interface CompanyStatsResponse {
  success: boolean;
  message: string;
  data: CompanyStats;
}

export const usersApi = createApi({
  reducerPath: "usersApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["Users", "User", "UserStats"],
  ...API_CACHE_CONFIG.users,
  endpoints: (builder) => ({
    // الحصول على قائمة المستخدمين
    getUsers: builder.query<UsersResponse, GetUsersQuery>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.search) searchParams.append('search', params.search);
        if (params.role) searchParams.append('role', params.role);
        if (params.isSystemUser !== undefined) searchParams.append('isSystemUser', params.isSystemUser.toString());
        if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
        
        const queryString = searchParams.toString();
        return `/users/users${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (result) => [
        "Users",
        ...(result?.data?.users?.map(({ id }) => ({ type: "User" as const, id })) ?? []),
      ],
    }),

    // الحصول على مستخدم واحد
    getUser: builder.query<UserResponse, string>({
      query: (id) => `/users/users/${id}`,
      providesTags: (result, error, id) => [{ type: "User", id }],
    }),

    // إنشاء مستخدم جديد
    createUser: builder.mutation<UserResponse, CreateUserRequest>({
      query: (userData) => ({
        url: "/users/users",
        method: "POST",
        body: userData,
      }),
      invalidatesTags: ["Users", "UserStats"],
      // Optimistic Update
      async onQueryStarted(userData, { dispatch, queryFulfilled }) {
        // إضافة فورية للمستخدم في القائمة
        const patchResult = dispatch(
          usersApi.util.updateQueryData('getUsers', {}, (draft) => {
            const newUser = {
              id: `temp-${Date.now()}`, // ID مؤقت
              username: userData.username,
              fullName: userData.fullName,
              email: userData.email,
              phone: userData.phone,
              role: userData.roleId.replace('role_', '').replace('_001', ''),
              companyId: userData.companyId,
              companyName: userData.companyId ? 'جاري التحميل...' : undefined,
              isSystemUser: userData.isSystemUser,
              isActive: userData.isActive,
              createdAt: new Date().toISOString(),
            };
            if (draft.data?.users) {
              draft.data.users.unshift(newUser as any);
            }
          })
        );
        
        try {
          const result = await queryFulfilled;
          // تحديث بالبيانات الحقيقية
          dispatch(
            usersApi.util.updateQueryData('getUsers', {}, (draft) => {
              if (draft.data?.users) {
                const tempIndex = draft.data.users.findIndex(u => u.id.toString().startsWith('temp-'));
                if (tempIndex !== -1 && result.data.data) {
                  draft.data.users[tempIndex] = result.data.data;
                }
              }
            })
          );
        } catch {
          // إلغاء التحديث في حالة الفشل
          patchResult.undo();
        }
      },
    }),

    // تحديث مستخدم
    updateUser: builder.mutation<UserResponse, { id: string; userData: UpdateUserRequest }>({
      query: ({ id, userData }) => ({
        url: `/users/users/${id}`,
        method: "PUT",
        body: userData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "User", id },
        "Users",
        "UserStats",
      ],
      // Optimistic Update للتحديث
      async onQueryStarted({ id, userData }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          usersApi.util.updateQueryData('getUsers', {}, (draft) => {
            if (draft.data?.users) {
              const userIndex = draft.data.users.findIndex(u => u.id === id);
              if (userIndex !== -1) {
                const user = draft.data.users[userIndex];
                // تحديث فوري للبيانات
                if (userData.username) user.username = userData.username;
                if (userData.fullName) user.fullName = userData.fullName;
                if (userData.email) user.email = userData.email;
                if (userData.phone) user.phone = userData.phone;
                if (userData.roleId) user.role = userData.roleId.replace('role_', '').replace('_001', '');
                if (userData.isActive !== undefined) user.isActive = userData.isActive;
              }
            }
          })
        );
        
        try {
          await queryFulfilled;
          // التحديث نجح، لا حاجة لعمل شيء إضافي
        } catch {
          // إلغاء التحديث في حالة الفشل
          patchResult.undo();
        }
      },
    }),

    // حذف (تعطيل) مستخدم
    deleteUser: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/users/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "User", id },
        "Users",
        "UserStats",
      ],
      // Optimistic Update للحذف
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          usersApi.util.updateQueryData('getUsers', {}, (draft) => {
            if (draft.data?.users) {
              // إزالة فورية من القائمة
              draft.data.users = draft.data.users.filter(u => u.id !== id);
            }
          })
        );
        
        try {
          await queryFulfilled;
          // الحذف نجح
        } catch {
          // إعادة المستخدم في حالة الفشل
          patchResult.undo();
        }
      },
    }),

    // الحصول على إحصائيات المستخدمين
    getUserStats: builder.query<CompanyStats, void>({
      query: () => "/users/users/stats",
      transformResponse: (response: CompanyStatsResponse) => response.data,
      providesTags: ["UserStats"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetUserStatsQuery,
} = usersApi;

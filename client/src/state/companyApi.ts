import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';
import { API_CACHE_CONFIG } from '@/lib/config';

// تعريف أنواع البيانات
export interface Company {
  id: number;
  name: string;
  code: string;
  isParent: boolean;
  parentId: number | null;
  parent?: {
    id: number;
    name: string;
    code: string;
  };
  children?: {
    id: number;
    name: string;
    code: string;
    isParent: boolean;
  }[];
  _count?: {
    users: number;
    products: number;
    sales: number;
  };
}

export interface CreateCompanyRequest {
  name: string;
  code: string;
  isParent: boolean;
  parentId?: number;
}

export interface UpdateCompanyRequest {
  name?: string;
  code?: string;
  isParent?: boolean;
  parentId?: number | null;
}

export interface GetCompaniesQuery {
  page?: number;
  limit?: number;
  search?: string;
  isParent?: boolean;
  parentId?: number;
}

export interface CompaniesResponse {
  success: boolean;
  message: string;
  data: {
    companies: Company[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface CompanyHierarchy {
  id: number;
  name: string;
  code: string;
  isParent: boolean;
  userCount: number;
  productCount: number;
  children?: CompanyHierarchy[];
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

export const companyApi = createApi({
  reducerPath: "companyApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["Companies", "Company", "CompanyHierarchy", "CompanyStats"],
  ...API_CACHE_CONFIG.companies,
  endpoints: (builder) => ({
    // الحصول على جميع الشركات
    getCompanies: builder.query<CompaniesResponse, GetCompaniesQuery>({
      query: (params) => ({
        url: "/company/companies",
        params,
      }),
      providesTags: (result) => [
        "Companies",
        ...(result?.data?.companies?.map(({ id }) => ({ type: "Company" as const, id })) ?? []),
      ],
    }),

    // الحصول على شركة بواسطة المعرف
    getCompanyById: builder.query<Company, number>({
      query: (id) => `/company/companies/${id}`,
      providesTags: (result, error, id) => [{ type: "Company", id }],
    }),

    // إنشاء شركة جديدة
    createCompany: builder.mutation<Company, CreateCompanyRequest>({
      query: (company) => ({
        url: "/company/companies",
        method: "POST",
        body: company,
      }),
      invalidatesTags: ["Companies", "CompanyHierarchy", "CompanyStats"],
      // Optimistic Update للإضافة
      async onQueryStarted(companyData, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          companyApi.util.updateQueryData('getCompanies', {}, (draft) => {
            const newCompany = {
              id: Date.now(), // ID مؤقت
              name: companyData.name,
              code: companyData.code,
              isParent: companyData.isParent ?? true,
              parentId: companyData.parentId || null,
              parent: companyData.parentId ? { id: companyData.parentId, name: 'جاري التحميل...', code: '' } : undefined,
              _count: { users: 0, products: 0, sales: 0 },
            };
            if (draft.data?.companies) {
              draft.data.companies.unshift(newCompany as any);
            }
          })
        );
        
        try {
          const result = await queryFulfilled;
          // تحديث بالبيانات الحقيقية
          dispatch(
            companyApi.util.updateQueryData('getCompanies', {}, (draft) => {
              if (draft.data?.companies) {
                const tempIndex = draft.data.companies.findIndex(c => typeof c.id === 'number' && c.id > 1000000000000);
                if (tempIndex !== -1 && result.data) {
                  draft.data.companies[tempIndex] = result.data;
                }
              }
            })
          );
        } catch {
          patchResult.undo();
        }
      },
    }),

    // تحديث الشركة
    updateCompany: builder.mutation<Company, { id: number; updates: UpdateCompanyRequest }>({
      query: ({ id, updates }) => ({
        url: `/company/companies/${id}`,
        method: "PUT",
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Company", id },
        "Companies",
        "CompanyHierarchy",
        "CompanyStats",
      ],
      // Optimistic Update للتحديث
      async onQueryStarted({ id, updates }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          companyApi.util.updateQueryData('getCompanies', {}, (draft) => {
            if (draft.data?.companies) {
              const companyIndex = draft.data.companies.findIndex(c => c.id === id);
              if (companyIndex !== -1) {
                const company = draft.data.companies[companyIndex];
                if (updates.name) company.name = updates.name;
                if (updates.code) company.code = updates.code;
                if (updates.isParent !== undefined) company.isParent = updates.isParent;
                if (updates.parentId !== undefined) company.parentId = updates.parentId;
              }
            }
          })
        );
        
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // حذف الشركة
    deleteCompany: builder.mutation<void, number>({
      query: (id) => ({
        url: `/company/companies/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Company", id },
        "Companies",
        "CompanyHierarchy",
        "CompanyStats",
      ],
      // Optimistic Update للحذف
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          companyApi.util.updateQueryData('getCompanies', {}, (draft) => {
            if (draft.data?.companies) {
              draft.data.companies = draft.data.companies.filter(c => c.id !== id);
            }
          })
        );
        
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // الحصول على الهيكل الهرمي
    getCompanyHierarchy: builder.query<CompanyHierarchy[], void>({
      query: () => "/company/companies/hierarchy",
      providesTags: ["CompanyHierarchy"],
    }),

    // إحصائيات الشركات
    getCompanyStats: builder.query<CompanyStats, void>({
      query: () => "/company/companies/stats",
      transformResponse: (response: CompanyStatsResponse) => response.data,
      providesTags: ["CompanyStats"],
    }),

    // الحصول على الفروع التابعة
    getBranchCompanies: builder.query<Company[], number>({
      query: (parentId) => `/company/companies/${parentId}/branches`,
      providesTags: (result, error, parentId) => [
        { type: "Company", id: `branches-${parentId}` },
      ],
    }),
  }),
});

export const {
  useGetCompaniesQuery,
  useGetCompanyByIdQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
  useGetCompanyHierarchyQuery,
  useGetCompanyStatsQuery,
  useGetBranchCompaniesQuery,
} = companyApi;

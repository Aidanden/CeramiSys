import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CACHE_CONFIG } from '@/lib/config';
import { baseQueryWithAuthInterceptor } from './apiUtils';

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
  tagTypes: ["Company", "CompanyStats", "CompanyHierarchy", "ParentCompanies"],
  ...API_CACHE_CONFIG.companies,
  endpoints: (builder) => ({
    // الحصول على جميع الشركات
    getCompanies: builder.query<CompaniesResponse, GetCompaniesQuery>({
      query: (params) => ({
        url: "/company/companies",
        params,
      }),
      providesTags: (result, error, arg) => {
        const tags: ("Company" | "ParentCompanies")[] = ["Company"];
        // إضافة ParentCompanies tag إذا كان البحث عن الشركات الأم
        if (arg.isParent === true) {
          tags.push("ParentCompanies");
        }
        return tags;
      },
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
      invalidatesTags: ["Company", "CompanyStats", "CompanyHierarchy", "ParentCompanies"],
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
        "Company",
        "CompanyStats",
        "CompanyHierarchy",
        "ParentCompanies",
      ],
    }),

    // حذف الشركة
    deleteCompany: builder.mutation<void, number>({
      query: (id) => ({
        url: `/company/companies/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Company", "CompanyStats", "CompanyHierarchy", "ParentCompanies"],
    }),

    // الحصول على الهيكل الهرمي
    getCompanyHierarchy: builder.query<CompanyHierarchy[], void>({
      query: () => "/company/companies/hierarchy",
      providesTags: ["CompanyHierarchy"],
    }),

    // إحصائيات الشركات
    getCompanyStats: builder.query<CompanyStats, void>({
      query: () => "/company/companies/stats",
      providesTags: ["CompanyStats"],
      transformResponse: (response: CompanyStatsResponse) => response.data,
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

"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/app/redux';
import {
  setSelectedCompany,
  setSearchTerm,
  setCurrentPage,
  setCurrentFilter,
  setViewMode,
  toggleSort,
  resetFilters
} from '@/state/companySlice';
import {
  useGetCompaniesQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
  useGetCompanyHierarchyQuery,
  useGetCompanyStatsQuery,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  Company
} from '@/state/companyApi';
import { useToast } from '@/components/ui/Toast';
import PermissionGuard from '@/components/PermissionGuard';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  ShoppingCart,
  TrendingUp,
  Building2 as Building,
  Filter,
  Download,
  Eye
} from 'lucide-react';

const CompaniesPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const toast = useToast();

  // استخدام Redux state بدلاً من local state
  const {
    selectedCompany,
    currentFilter,
    currentPage,
    searchTerm,
    viewMode,
    sortBy,
    sortOrder
  } = useAppSelector((state) => state.company);

  // local state للمودالز فقط
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // RTK Query hooks
  const { data: companiesData, isLoading: isLoadingCompanies, error: companiesError } = useGetCompaniesQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm || undefined,
    isParent: currentFilter === 'parent' ? true : currentFilter === 'branch' ? false : undefined,
  });

  const { data: statsData, isLoading: isLoadingStats, error: statsError, refetch: refetchStats } = useGetCompanyStatsQuery();
  const { data: hierarchyData } = useGetCompanyHierarchyQuery();

  // Move logging to useEffect to avoid React warnings during render
  React.useEffect(() => {
    if (companiesError) {
      console.error('❌ Companies API Error:', companiesError);
    }
  }, [companiesError]);

  React.useEffect(() => {
    if (statsError) {
      console.error('❌ Stats API Error:', statsError);
    }
  }, [statsError]);

  const [createCompany, { isLoading: isCreating }] = useCreateCompanyMutation();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();
  const [deleteCompany, { isLoading: isDeleting }] = useDeleteCompanyMutation();

  // Handle create company
  const handleCreateCompany = async (companyData: CreateCompanyRequest | UpdateCompanyRequest) => {
    try {
      // Validation
      if (!companyData.name?.trim()) {
        toast.error('خطأ في البيانات', 'يرجى إدخال اسم الشركة');
        return;
      }

      if (!companyData.code?.trim()) {
        toast.error('خطأ في البيانات', 'يرجى إدخال رمز الشركة');
        return;
      }

      // التحقق من وجود كود الشركة مسبقاً
      const existingCompanies = companiesData?.data?.companies || [];
      const codeExists = existingCompanies.some(company =>
        company.code.toLowerCase() === companyData.code?.trim().toLowerCase()
      );

      if (codeExists) {
        toast.error('كود مكرر', `كود الشركة "${companyData.code.trim()}" موجود مسبقاً. يرجى استخدام كود آخر.`);
        return;
      }

      // التحقق من أن الشركة الفرعية لها شركة أم
      if (companyData.isParent === false && !companyData.parentId) {
        toast.error('بيانات ناقصة', 'يرجى اختيار الشركة الأم للشركة الفرعية');
        return;
      }

      // تأكد من أن البيانات تحتوي على الحقول المطلوبة للإنشاء
      const createData: CreateCompanyRequest = {
        name: companyData.name.trim(),
        code: companyData.code.trim(),
        isParent: companyData.isParent ?? true,
        parentId: companyData.isParent === false ? (companyData.parentId || undefined) : undefined
      };

      console.log('🚀 Creating company with data:', createData);
      const result = await createCompany(createData).unwrap();
      setIsCreateModalOpen(false);
      toast.success('تم بنجاح!', 'تم إنشاء الشركة بنجاح');
      return result; // إرجاع النتيجة للمودال
    } catch (error: any) {
      console.error('❌ خطأ في إنشاء الشركة:', error);

      if (error?.status === 401) {
        toast.error('جلسة منتهية', 'جلسة المستخدم منتهية. يرجى تسجيل الدخول مرة أخرى.');
        router.push('/login');
      } else if (error?.status === 409 || error?.data?.message?.includes('كود') || error?.data?.message?.includes('code')) {
        toast.error('كود مكرر', `كود الشركة "${companyData.code?.trim()}" موجود مسبقاً في قاعدة البيانات. يرجى استخدام كود آخر.`);
      } else if (error?.data?.message) {
        toast.error('خطأ في العملية', error.data.message);
      } else {
        toast.error('خطأ غير متوقع', 'حدث خطأ في إنشاء الشركة. يرجى المحاولة مرة أخرى.');
      }
    }
  };

  // Handle update company
  const handleUpdateCompany = async (companyData: UpdateCompanyRequest) => {
    if (!selectedCompany) return;

    try {
      await updateCompany({
        id: selectedCompany.id,
        updates: companyData
      }).unwrap();
      setIsEditModalOpen(false);
      dispatch(setSelectedCompany(null));
      toast.success('تم بنجاح!', 'تم تحديث الشركة بنجاح');
    } catch (error: any) {
      console.error('خطأ في تحديث الشركة:', error);

      if (error?.status === 401) {
        toast.error('جلسة منتهية', 'جلسة المستخدم منتهية. يرجى تسجيل الدخول مرة أخرى.');
        router.push('/login');
      } else if (error?.data?.message) {
        toast.error('خطأ في العملية', error.data.message);
      } else {
        toast.error('خطأ غير متوقع', 'حدث خطأ في تحديث الشركة. يرجى المحاولة مرة أخرى.');
      }
    }
  };

  // Handle delete company
  const handleDeleteCompany = async (companyId: number) => {
    const confirmed = await toast.confirm(
      'تأكيد حذف الشركة',
      'هل أنت متأكد من حذف هذه الشركة؟ لا يمكن حذف الشركة إذا كان لديها مستخدمين أو منتجات أو شركات تابعة.'
    );

    if (!confirmed) return;

    try {
      console.log('🗑️ Deleting company with ID:', companyId);
      const result = await deleteCompany(companyId).unwrap();
      console.log('✅ Company deleted successfully:', result);

      toast.success('تم بنجاح!', 'تم حذف الشركة بنجاح');
    } catch (error: any) {
      console.error('❌ خطأ في حذف الشركة:', error);

      if (error?.status === 401) {
        toast.error('جلسة منتهية', 'جلسة المستخدم منتهية. يرجى تسجيل الدخول مرة أخرى.');
        router.push('/login');
      } else if (error?.data?.message) {
        toast.error('لا يمكن الحذف', error.data.message);
      } else {
        toast.error('خطأ غير متوقع', 'حدث خطأ في حذف الشركة. يرجى المحاولة مرة أخرى.');
      }
    }
  };

  return (
    <PermissionGuard requiredPermission="screen.companies">
      <div className="p-6 max-w-7xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-text-primary">إدارة الشركات</h1>
                <p className="text-slate-500 dark:text-text-secondary">إدارة الشركات الأم والشركات التابعة </p>
              </div>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              إضافة شركة جديدة
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {isLoadingStats ? (
              // Loading state
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-white dark:bg-surface-primary p-6 rounded-lg shadow-sm border border-slate-200 dark:border-border-primary animate-pulse">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-slate-200 dark:bg-surface-elevated rounded w-20 mb-2"></div>
                      <div className="h-8 bg-slate-200 dark:bg-surface-elevated rounded w-16"></div>
                    </div>
                    <div className="w-8 h-8 bg-slate-200 dark:bg-surface-elevated rounded"></div>
                  </div>
                </div>
              ))
            ) : statsError ? (
              // Error state
              <div className="col-span-full bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex flex-col items-center justify-center text-red-600">
                  <p className="text-center mb-2">خطأ في تحميل الإحصائيات</p>
                  {(statsError as any)?.status === 403 ? (
                    <p className="text-sm text-red-500 text-center">
                      ليس لديك صلاحية لعرض الإحصائيات. يرجى التواصل مع المدير.
                    </p>
                  ) : (statsError as any)?.status === 401 ? (
                    <p className="text-sm text-red-500 text-center">
                      جلسة المستخدم منتهية. يرجى تسجيل الدخول مرة أخرى.
                    </p>
                  ) : (
                    <p className="text-sm text-red-500 text-center">
                      خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.
                    </p>
                  )}
                  <button
                    onClick={() => refetchStats()}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              </div>
            ) : statsData ? (
              // Success state with data
              <>
                <div className="bg-white dark:bg-surface-primary p-6 rounded-lg shadow-sm border border-slate-200 dark:border-border-primary">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 dark:text-text-secondary text-sm">إجمالي الشركات</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-text-primary">{statsData.totalCompanies || 0}</p>
                    </div>
                    <Building2 className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white dark:bg-surface-primary p-6 rounded-lg shadow-sm border border-slate-200 dark:border-border-primary">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 dark:text-text-secondary text-sm">الشركات الأم</p>
                      <p className="text-2xl font-bold text-green-600">{statsData.parentCompanies || 0}</p>
                    </div>
                    <Building className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white dark:bg-surface-primary p-6 rounded-lg shadow-sm border border-slate-200 dark:border-border-primary">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 dark:text-text-secondary text-sm">الشركات التابعة</p>
                      <p className="text-2xl font-bold text-orange-600">{statsData.branchCompanies || 0}</p>
                    </div>
                    <Users className="w-8 h-8 text-orange-600" />
                  </div>
                </div>

                <div className="bg-white dark:bg-surface-primary p-6 rounded-lg shadow-sm border border-slate-200 dark:border-border-primary">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 dark:text-text-secondary text-sm">المستخدمين النشطين</p>
                      <p className="text-2xl font-bold text-purple-600">{statsData.activeUsers || 0}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </>
            ) : (
              // No data state
              <div className="col-span-full bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-center text-gray-500">
                  <p>لا توجد إحصائيات متاحة حالياً</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-surface-primary p-6 rounded-lg shadow-sm border border-slate-200 dark:border-border-primary mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-text-tertiary w-5 h-5" />
              <input
                type="text"
                placeholder="البحث عن الشركات..."
                value={searchTerm}
                onChange={(e) => dispatch(setSearchTerm(e.target.value))}
                className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-border-primary bg-white dark:bg-surface-secondary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-text-primary"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400 dark:text-text-tertiary" />
              <select
                value={currentFilter}
                onChange={(e) => dispatch(setCurrentFilter(e.target.value as any))}
                className="px-4 py-2 border border-slate-300 dark:border-border-primary bg-white dark:bg-surface-secondary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-text-primary"
              >
                <option value="all">جميع الشركات</option>
                <option value="parent">الشركات الأم فقط</option>
                <option value="branch">الشركات التابعة فقط</option>
              </select>
            </div>

            {/* Export */}
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-border-primary bg-white dark:bg-surface-secondary rounded-lg hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors dark:text-text-primary">
              <Download className="w-5 h-5" />
              تصدير
            </button>
          </div>
        </div>

        {/* Companies Table */}
        <div className="bg-white dark:bg-surface-primary rounded-lg shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-surface-secondary">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase tracking-wider">
                    اسم الشركة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase tracking-wider">
                    الكود
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase tracking-wider">
                    النوع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase tracking-wider">
                    الشركة الأم
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase tracking-wider">
                    المستخدمين
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase tracking-wider">
                    المنتجات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-surface-primary divide-y divide-slate-200 dark:divide-border-primary">
                {isLoadingCompanies ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-text-tertiary">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : companiesError ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-red-500">
                      خطأ في تحميل البيانات. يرجى المحاولة مرة أخرى.
                    </td>
                  </tr>
                ) : !companiesData?.data?.companies || companiesData.data.companies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-text-tertiary">
                      لا توجد شركات
                    </td>
                  </tr>
                ) : (
                  companiesData.data.companies.map((company: any) => (
                    <tr key={company.id} className="hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${company.isParent ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-green-100 text-green-600 dark:bg-green-900/30'
                              }`}>
                              {company.isParent ? <Building2 className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                            </div>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-slate-800 dark:text-text-primary">
                              {company.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-text-primary">
                        <code className="bg-slate-100 dark:bg-surface-secondary px-2 py-1 rounded text-xs">
                          {company.code}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${company.isParent
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                          }`}>
                          {company.isParent ? 'شركة أم' : 'فرع'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-text-primary">
                        {company.parent ? company.parent.name : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-text-primary">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-slate-400 dark:text-text-tertiary" />
                          {company._count?.users || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-text-primary">
                        <div className="flex items-center gap-1">
                          <ShoppingCart className="w-4 h-4 text-slate-400 dark:text-text-tertiary" />
                          {company._count?.products || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              dispatch(setSelectedCompany(company));
                              setIsEditModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCompany(company.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                            title="حذف"
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            className="text-slate-600 hover:text-slate-900 dark:text-text-tertiary dark:hover:text-text-secondary p-1 rounded"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {companiesData && companiesData.data?.pagination && companiesData.data.pagination.pages > 1 && (
            <div className="bg-white dark:bg-surface-primary px-4 py-3 flex items-center justify-between border-t border-slate-200 dark:border-border-primary sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => dispatch(setCurrentPage(Math.max(1, currentPage - 1)))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-border-primary text-sm font-medium rounded-md text-slate-700 dark:text-text-secondary bg-white dark:bg-surface-secondary hover:bg-slate-50 dark:hover:bg-surface-hover"
                >
                  السابق
                </button>
                <button
                  onClick={() => dispatch(setCurrentPage(Math.min(companiesData.data?.pagination?.pages || 1, currentPage + 1)))}
                  disabled={currentPage === companiesData.data?.pagination?.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-border-primary text-sm font-medium rounded-md text-slate-700 dark:text-text-secondary bg-white dark:bg-surface-secondary hover:bg-slate-50 dark:hover:bg-surface-hover"
                >
                  التالي
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-700 dark:text-text-secondary">
                    عرض{' '}
                    <span className="font-medium">{(currentPage - 1) * 10 + 1}</span>{' '}
                    إلى{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * 10, companiesData.data?.pagination?.total || 0)}
                    </span>{' '}
                    من{' '}
                    <span className="font-medium">{companiesData.data?.pagination?.total || 0}</span>{' '}
                    نتيجة
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    {Array.from({ length: companiesData.data?.pagination?.pages || 0 }, (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => dispatch(setCurrentPage(i + 1))}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === i + 1
                          ? 'z-10 bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'bg-white dark:bg-surface-secondary border-slate-300 dark:border-border-primary text-slate-500 dark:text-text-tertiary hover:bg-slate-50 dark:hover:bg-surface-hover'
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create Company Modal */}
        {isCreateModalOpen && (
          <CompanyModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateCompany}
            isLoading={isCreating}
            title="إضافة شركة جديدة"
            onCompanyCreated={() => {
              // Optimistic update سيتولى التحديث تلقائياً
              console.log('Company created via optimistic update');
            }}
          />
        )}

        {/* Edit Company Modal */}
        {isEditModalOpen && selectedCompany && (
          <CompanyModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              dispatch(setSelectedCompany(null));
            }}
            onSubmit={handleUpdateCompany}
            isLoading={isUpdating}
            title="تعديل الشركة"
            company={selectedCompany}
            onCompanyCreated={() => {
              // Optimistic update سيتولى التحديث تلقائياً
              console.log('Company updated via optimistic update');
            }}
          />
        )}
      </div>
    </PermissionGuard>
  );
};

// Company Modal Component
interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCompanyRequest | UpdateCompanyRequest) => void;
  isLoading: boolean;
  title: string;
  company?: Company;
  onCompanyCreated?: () => void; // إضافة callback عند إنشاء شركة
}

const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  title,
  company,
  onCompanyCreated
}) => {
  const [formData, setFormData] = useState({
    name: company?.name || '',
    code: company?.code || '',
    isParent: company?.isParent ?? true,
    parentId: company?.parentId || undefined,
  });

  // للتحقق من كود الشركة في الوقت الفعلي
  const [codeWarning, setCodeWarning] = useState('');

  const { data: companiesData, refetch: refetchParentCompanies } = useGetCompaniesQuery({
    isParent: true,
    limit: 100,
  });

  // للحصول على جميع الشركات للتحقق من الكود
  const { data: allCompaniesData } = useGetCompaniesQuery({ limit: 1000 });

  // تحديث القائمة عند فتح المودال - RTK Query سيتولى التحديث تلقائياً
  React.useEffect(() => {
    if (isOpen) {
      console.log('Modal opened, RTK Query will auto-update parent companies list');
    }
  }, [isOpen]);

  // التحقق من كود الشركة في الوقت الفعلي
  React.useEffect(() => {
    if (formData.code) {
      const existingCompanies = allCompaniesData?.data?.companies || [];
      const codeExists = existingCompanies.some(comp =>
        comp.code.toLowerCase() === formData.code.toLowerCase() &&
        comp.id !== company?.id // استثناء الشركة الحالية في حالة التعديل
      );

      if (codeExists) {
        setCodeWarning('⚠️ هذا الكود موجود مسبقاً');
      } else if (formData.code.length < 2) {
        setCodeWarning('⚠️ الكود يجب أن يكون حرفين على الأقل');
      } else {
        setCodeWarning('');
      }
    } else {
      setCodeWarning('');
    }
  }, [formData.code, company, allCompaniesData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submittedData = {
      ...formData,
      parentId: formData.isParent ? undefined : formData.parentId,
    };

    try {
      // إرسال البيانات
      await onSubmit(submittedData);

      // إذا كانت شركة أم جديدة، استدعاء callback
      if (submittedData.isParent && onCompanyCreated) {
        onCompanyCreated();
        console.log('Company created, RTK Query will auto-invalidate cache');
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white dark:bg-surface-primary rounded-xl p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-border-primary">
        <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-text-primary border-b pb-4 dark:border-border-primary">{title}</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">
              اسم الشركة
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 dark:border-border-primary bg-white dark:bg-surface-secondary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-text-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">
              كود الشركة
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-blue-500 outline-none transition-all dark:text-text-primary ${codeWarning
                ? 'border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-slate-300 dark:border-border-primary bg-white dark:bg-surface-secondary'
                }`}
              required
            />
            {codeWarning && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <span>⚠️</span>
                {codeWarning}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.isParent}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    isParent: e.target.checked,
                    parentId: e.target.checked ? undefined : formData.parentId
                  });
                  // RTK Query سيتولى تحديث القائمة تلقائياً عند الحاجة
                  if (!e.target.checked) {
                    console.log('Changed to branch company, parent list will auto-update');
                  }
                }}
                className="w-5 h-5 rounded border-slate-300 dark:border-border-primary text-blue-600 focus:ring-blue-500 dark:bg-surface-secondary cursor-pointer"
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-text-secondary group-hover:text-blue-600 transition-colors">
                شركة أم
              </span>
            </label>
          </div>

          {!formData.isParent && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-text-secondary mb-2">
                الشركة الأم
              </label>
              <select
                value={formData.parentId || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  parentId: e.target.value ? Number(e.target.value) : undefined
                })}
                className="w-full px-4 py-3 border border-slate-300 dark:border-border-primary bg-white dark:bg-surface-secondary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-text-primary"
                required
              >
                <option value="">اختر الشركة الأم</option>
                {companiesData?.data?.companies?.map((parentCompany: any) => (
                  <option key={parentCompany.id} value={parentCompany.id}>
                    {parentCompany.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={isLoading || !!codeWarning}
              className={`flex-1 py-3 px-6 rounded-lg font-bold text-white transition-all shadow-lg text-lg ${isLoading || codeWarning
                ? 'bg-slate-400 cursor-not-allowed opacity-50'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl active:transform active:scale-95'
                }`}
            >
              {isLoading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 dark:bg-surface-elevated text-slate-700 dark:text-text-primary py-3 px-6 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-surface-hover transition-all text-lg"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompaniesPage;

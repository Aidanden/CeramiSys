"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/app/redux';
import { 
  setSelectedCompany, 
  setCurrentFilter, 
  setSearchTerm, 
  setCurrentPage,
  setViewMode,
  toggleSort,
  resetFilters 
} from '@/state/companySlice';
import { 
  useGetCompaniesQuery, 
  useGetCompanyStatsQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
  useGetCompanyHierarchyQuery,
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest
} from '@/state/companyApi';
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
  const { data: companiesData, isLoading: isLoadingCompanies, error: companiesError, refetch } = useGetCompaniesQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm || undefined,
    isParent: currentFilter === 'parent' ? true : currentFilter === 'branch' ? false : undefined,
  });

  // Enhanced Debug logging
  console.log('🔍 Companies Debug - Full Details:', {
    isLoading: isLoadingCompanies,
    error: companiesError,
    data: companiesData,
    hasCompanies: companiesData?.data?.companies?.length,
    queryParams: {
      page: currentPage,
      limit: 10,
      search: searchTerm || undefined,
      isParent: currentFilter === 'parent' ? true : currentFilter === 'branch' ? false : undefined,
    },
    currentFilter,
    searchTerm
  });

  // Log API base URL being used
  console.log('🌐 API Base URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
  
  // Log if there's an error
  if (companiesError) {
    console.error('❌ Companies API Error:', companiesError);
  }

  const { data: statsData, isLoading: isLoadingStats, error: statsError, refetch: refetchStats } = useGetCompanyStatsQuery();
  
  // Enhanced Debug logging for stats
  console.log('📊 Stats Debug - Full Details:', {
    isLoading: isLoadingStats,
    error: statsError,
    data: statsData,
    hasStatsData: !!statsData,
    statsDataKeys: statsData ? Object.keys(statsData) : null,
    statsDataValues: statsData ? Object.values(statsData) : null,
  });
  
  // Log if there's a stats error
  if (statsError) {
    console.error('❌ Stats API Error:', statsError);
  }
  
  const { data: hierarchyData } = useGetCompanyHierarchyQuery();
  
  const [createCompany, { isLoading: isCreating }] = useCreateCompanyMutation();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();
  const [deleteCompany, { isLoading: isDeleting }] = useDeleteCompanyMutation();

  // Handle create company
  const handleCreateCompany = async (companyData: CreateCompanyRequest | UpdateCompanyRequest) => {
    try {
      // تأكد من أن البيانات تحتوي على الحقول المطلوبة للإنشاء
      const createData: CreateCompanyRequest = {
        name: companyData.name || '',
        code: companyData.code || '',
        isParent: companyData.isParent ?? true,
        parentId: companyData.parentId || undefined
      };
      
      console.log('🚀 Creating company with data:', createData);
      const result = await createCompany(createData).unwrap();
      setIsCreateModalOpen(false);
      refetch();
      alert('تم إنشاء الشركة بنجاح!');
      return result; // إرجاع النتيجة للمودال
    } catch (error: any) {
      console.error('خطأ في إنشاء الشركة:', error);
      
      if (error?.status === 401) {
        alert('جلسة المستخدم منتهية. يرجى تسجيل الدخول مرة أخرى.');
        router.push('/login');
      } else if (error?.data?.message) {
        alert(`خطأ: ${error.data.message}`);
      } else {
        alert('حدث خطأ في إنشاء الشركة. يرجى المحاولة مرة أخرى.');
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
      refetch();
      alert('تم تحديث الشركة بنجاح!');
    } catch (error: any) {
      console.error('خطأ في تحديث الشركة:', error);
      
      if (error?.status === 401) {
        alert('جلسة المستخدم منتهية. يرجى تسجيل الدخول مرة أخرى.');
        router.push('/login');
      } else if (error?.data?.message) {
        alert(`خطأ: ${error.data.message}`);
      } else {
        alert('حدث خطأ في تحديث الشركة. يرجى المحاولة مرة أخرى.');
      }
    }
  };

  // Handle delete company
  const handleDeleteCompany = async (companyId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الشركة؟\n\nملاحظة: لا يمكن حذف الشركة إذا كان لديها مستخدمين أو منتجات أو شركات تابعة.')) return;
    
    try {
      console.log('🗑️ Deleting company with ID:', companyId);
      const result = await deleteCompany(companyId).unwrap();
      console.log('✅ Company deleted successfully:', result);
      
      // إجبار تحديث البيانات
      await refetch();
      console.log('🔄 Data refetched after deletion');
      
      alert('تم حذف الشركة بنجاح!');
    } catch (error: any) {
      console.error('❌ خطأ في حذف الشركة:', error);
      
      if (error?.status === 401) {
        alert('جلسة المستخدم منتهية. يرجى تسجيل الدخول مرة أخرى.');
        router.push('/login');
      } else if (error?.data?.message) {
        alert(`لا يمكن حذف الشركة:\n${error.data.message}`);
      } else {
        alert('حدث خطأ في حذف الشركة. يرجى المحاولة مرة أخرى.');
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">إدارة الشركات</h1>
              <p className="text-gray-600">إدارة الشركات الأم والشركات التابعة </p>
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
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
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
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">إجمالي الشركات</p>
                    <p className="text-2xl font-bold text-gray-900">{statsData.totalCompanies || 0}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">الشركات الأم</p>
                    <p className="text-2xl font-bold text-green-600">{statsData.parentCompanies || 0}</p>
                  </div>
                  <Building className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">الشركات التابعة</p>
                    <p className="text-2xl font-bold text-orange-600">{statsData.branchCompanies || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">المستخدمين النشطين</p>
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
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="البحث عن الشركات..."
              value={searchTerm}
              onChange={(e) => dispatch(setSearchTerm(e.target.value))}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={currentFilter}
              onChange={(e) => dispatch(setCurrentFilter(e.target.value as any))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">جميع الشركات</option>
              <option value="parent">الشركات الأم فقط</option>
              <option value="branch">الشركات التابعة فقط</option>
            </select>
          </div>

          {/* Export */}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-5 h-5" />
            تصدير
          </button>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم الشركة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الكود
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  النوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الشركة الأم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المستخدمين
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المنتجات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoadingCompanies ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    لا توجد شركات
                  </td>
                </tr>
              ) : (
                companiesData.data.companies.map((company: any) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            company.isParent ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {company.isParent ? <Building2 className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {company.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {company.code}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        company.isParent 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {company.isParent ? 'شركة أم' : 'فرع'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {company.parent ? company.parent.name : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        {company._count?.users || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="w-4 h-4 text-gray-400" />
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
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="حذف"
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
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
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => dispatch(setCurrentPage(Math.max(1, currentPage - 1)))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                السابق
              </button>
              <button
                onClick={() => dispatch(setCurrentPage(Math.min(companiesData.data?.pagination?.pages || 1, currentPage + 1)))}
                disabled={currentPage === companiesData.data?.pagination?.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
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
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
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
            // تحديث جميع البيانات عند إضافة شركة جديدة
            refetch();
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
            // تحديث جميع البيانات عند تعديل شركة
            refetch();
          }}
        />
      )}
    </div>
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

  const { data: companiesData, refetch: refetchParentCompanies } = useGetCompaniesQuery({
    isParent: true,
    limit: 100,
  });

  // تحديث القائمة عند فتح المودال - RTK Query سيتولى التحديث تلقائياً
  React.useEffect(() => {
    if (isOpen) {
      console.log('Modal opened, RTK Query will auto-update parent companies list');
    }
  }, [isOpen]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم الشركة
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              كود الشركة
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
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
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                شركة أم
              </span>
            </label>
          </div>

          {!formData.isParent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الشركة الأم
              </label>
              <select
                value={formData.parentId || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  parentId: e.target.value ? Number(e.target.value) : undefined 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
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

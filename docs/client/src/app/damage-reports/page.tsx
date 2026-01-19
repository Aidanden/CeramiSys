'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  useGetDamageReportsQuery,
  useGetDamageReportStatsQuery,
  useCreateDamageReportMutation,
  useDeleteDamageReportMutation,
  DamageReportLine,
} from '@/state/damageReportsApi';
import { useGetProductsQuery } from '@/state/productsApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { Plus, Search, Trash2, Eye, X, FileText, Building2 } from 'lucide-react';
import { formatArabicNumber, formatArabicCurrency, formatArabicArea } from '@/utils/formatArabicNumbers';
import { useToast } from '@/components/ui/Toast';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux';

const DamageReportsPage = () => {
  const { success, error: showError } = useToast();

  // Get current user info
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { data: currentUserData } = useGetCurrentUserQuery();
  const user = currentUserData?.data || currentUser;
  const userCompanyId = user?.companyId;
  const isSystemUser = user?.isSystemUser || false;

  // States
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(userCompanyId || null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterProductName, setFilterProductName] = useState('');
  const [filterProductCode, setFilterProductCode] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Form states
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DamageReportLine[]>([]);

  // Product search states
  const [productNameSearch, setProductNameSearch] = useState('');
  const [productCodeSearch, setProductCodeSearch] = useState('');
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (productSearchRef.current && !productSearchRef.current.contains(target)) {
        setShowNameDropdown(false);
        setShowCodeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Queries
  const { data: companiesData } = useGetCompaniesQuery({});
  const companies = (companiesData?.data as any)?.companies || [];

  const { data: stats } = useGetDamageReportStatsQuery();
  const { data: reportsData, isLoading, refetch } = useGetDamageReportsQuery({
    page: currentPage,
    limit: 10,
    companyId: isSystemUser ? selectedCompanyId || undefined : undefined,
    productName: filterProductName || undefined,
    productCode: filterProductCode || undefined,
    reason: filterReason || undefined,
    ...(filterDate
      ? {
        startDate: `${filterDate}T00:00:00.000Z`,
        endDate: `${filterDate}T23:59:59.999Z`,
      }
      : {}),
  });

  // جلب جميع الأصناف ثم الفلترة في الواجهة الأمامية حسب الشركة المختارة (نفس طريقة المبيعات)
  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery({
    limit: 10000,
    companyId: isSystemUser ? (selectedCompanyId || undefined) : userCompanyId
  });
  const [createDamageReport, { isLoading: isCreating }] = useCreateDamageReportMutation();
  const [deleteDamageReport] = useDeleteDamageReportMutation();

  const reports = reportsData?.data?.reports || [];
  const pagination = reportsData?.data?.pagination || {};
  const products = (productsData?.data as any)?.products || [];

  // Helper logic for filtering by company
  const isProductVisible = (product: any) => {
    const targetCompanyId = isSystemUser ? selectedCompanyId : userCompanyId;
    if (!targetCompanyId) return false;

    // For Damage Reports, companies can ONLY see their own products (strict filtering)
    // This applies to Emirates Company and any other subsidiary, as well as the Parent company.
    return product.createdByCompanyId === targetCompanyId;
  };

  // Filter products by code (Exact match)
  const filteredByCode = productsData?.data?.products?.filter(product => {
    if (!isProductVisible(product)) return false;
    if (!productCodeSearch) return false;
    return product.sku.toLowerCase() === productCodeSearch.toLowerCase();
  }) || [];

  // Filter products by name (Partial match)
  const filteredByName = productsData?.data?.products?.filter(product => {
    if (!isProductVisible(product)) return false;
    if (!productNameSearch) return false;
    return product.name.toLowerCase().includes(productNameSearch.toLowerCase());
  }) || [];

  // Reset form
  const resetForm = () => {
    setReason('');
    setNotes('');
    setLines([]);
    setProductNameSearch('');
    setProductCodeSearch('');
    setShowNameDropdown(false);
    setShowCodeDropdown(false);
  };

  // Handlers
  const handleSelectProductFromDropdown = (product: any) => {
    // Add product to lines
    const existingLineIndex = lines.findIndex(line => line.productId === product.id);

    if (existingLineIndex >= 0) {
      // If product already exists, increase quantity
      const newLines = [...lines];
      newLines[existingLineIndex].quantity += 1;
      setLines(newLines);
      success(`تم زيادة كمية الصنف: ${product.name}`);
    } else {
      // Add new line
      setLines([...lines, {
        productId: product.id,
        quantity: 1,
        notes: '',
        product: {
          id: product.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          unitsPerBox: product.unitsPerBox
        }
      }]);

      // تحديد ما إذا كان الصنف من الشركة الأم
      const targetCompanyId = isSystemUser ? selectedCompanyId : userCompanyId;
      const isFromParentCompany = product.createdByCompanyId !== targetCompanyId && product.createdByCompanyId === 1;
      const companyType = isFromParentCompany ? '(من مخزن التقازي)' : '(من الشركة الحالية)';

      success(`تم إضافة الصنف: ${product.name} ${companyType}`);
    }

    // Clear search
    setProductNameSearch('');
    setProductCodeSearch('');
    setShowNameDropdown(false);
    setShowCodeDropdown(false);
  };

  const handleAddLine = () => {
    setLines([...lines, { productId: 0, quantity: 0, notes: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleUpdateLine = (index: number, field: keyof DamageReportLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      showError('يرجى إدخال سبب الإتلاف');
      return;
    }

    if (lines.length === 0) {
      showError('يرجى إضافة صنف واحد على الأقل');
      return;
    }

    const invalidLine = lines.find(l => !l.productId || l.quantity <= 0);
    if (invalidLine) {
      showError('يرجى التأكد من اختيار الصنف وإدخال كمية صحيحة');
      return;
    }

    // للـ Admin: التحقق من اختيار الشركة
    if (isSystemUser && !selectedCompanyId) {
      showError('يرجى اختيار الشركة أولاً');
      return;
    }

    try {
      const result = await createDamageReport({
        companyId: isSystemUser ? selectedCompanyId! : undefined, // للـ Admin فقط
        reason,
        notes: notes || undefined,
        lines: lines.map(l => ({
          productId: l.productId,
          quantity: l.quantity,
          notes: l.notes || undefined,
        })),
      }).unwrap();

      if (result.success) {
        success('تم إنشاء محضر الإتلاف بنجاح');
        setShowCreateModal(false);
        resetForm();
        refetch();
      } else {
        showError(result.message || 'فشل في إنشاء محضر الإتلاف');
      }
    } catch (error: any) {
      showError(error?.data?.message || 'حدث خطأ أثناء إنشاء محضر الإتلاف');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المحضر؟')) return;

    try {
      const result = await deleteDamageReport(id).unwrap();
      if (result.success) {
        success('تم حذف المحضر بنجاح');
        refetch();
      } else {
        showError(result.message || 'فشل في حذف المحضر');
      }
    } catch (error: any) {
      showError(error?.data?.message || 'حدث خطأ أثناء حذف المحضر');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'قيد الانتظار';
      case 'APPROVED':
        return 'معتمد';
      case 'REJECTED':
        return 'مرفوض';
      default:
        return status;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-text-primary">محاضر الإتلاف</h1>
              <p className="text-text-secondary">
                إدارة محاضر إتلاف الأصناف التالفة
                {!isSystemUser && (
                  <span className="mr-2 text-red-600 font-medium">
                    • شركتك
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Company Selector for Admin */}
            {isSystemUser && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">الشركة:</label>
                <select
                  value={selectedCompanyId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedCompanyId(value ? parseInt(value) : null);
                    setCurrentPage(1); // Reset to first page
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white min-w-[200px]"
                >
                  <option value="">جميع الشركات</option>
                  {companies.map((company: any) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={isSystemUser && !selectedCompanyId}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title={isSystemUser && !selectedCompanyId ? 'يرجى اختيار الشركة أولاً' : ''}
            >
              <Plus className="w-5 h-5" />
              إنشاء محضر إتلاف
            </button>
          </div>
        </div>
      </div>

      {/* Admin Notice - Select Company */}
      {isSystemUser && !selectedCompanyId && (
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800">يرجى اختيار الشركة</h3>
              <p className="mt-1 text-sm text-blue-700">
                اختر الشركة من القائمة أعلاه لعرض محاضر الإتلاف والأصناف الخاصة بها، أو اختر "جميع الشركات" لعرض جميع المحاضر.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats?.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {/* إجمالي المحاضر */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي المحاضر</p>
                <p className="text-2xl font-bold text-gray-900">{formatArabicNumber(stats.data.totalReports)}</p>
              </div>
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
          </div>

          {/* المحاضر لكل شركة */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-blue-700">المحاضر حسب الشركة</p>
                <p className="text-xs text-gray-500">إجمالي عدد المحاضر لكل شركة</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-400" />
            </div>
            <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
              {stats.data.reportsPerCompany?.map((company: any) => (
                <div
                  key={company.companyId}
                  className="flex items-center justify-between text-xs text-gray-700"
                >
                  <span className="truncate">{company.companyName}</span>
                  <span className="font-semibold">{formatArabicNumber(company.totalReports)}</span>
                </div>
              ))}
              {(!stats.data.reportsPerCompany || stats.data.reportsPerCompany.length === 0) && (
                <p className="text-xs text-gray-400">لا توجد بيانات شركات.</p>
              )}
            </div>
          </div>

          {/* الكمية التالفة (صناديق) */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">الكمية التالفة (صندوق)</p>
                <p className="text-2xl font-bold text-red-600">{formatArabicNumber(stats.data.totalDamagedBoxes || 0)}</p>
              </div>
              <Trash2 className="w-10 h-10 text-red-400" />
            </div>
          </div>

          {/* الكمية التالفة (قطعة) */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">الكمية التالفة (قطعة)</p>
                <p className="text-2xl font-bold text-red-600">{formatArabicNumber(stats.data.totalDamagedPieces || 0)}</p>
              </div>
              <Trash2 className="w-10 h-10 text-red-400" />
            </div>
          </div>

          {/* الكمية التالفة (كيس) */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">الكمية التالفة (كيس)</p>
                <p className="text-2xl font-bold text-red-600">{formatArabicNumber(stats.data.totalDamagedBags || 0)}</p>
              </div>
              <Trash2 className="w-10 h-10 text-red-400" />
            </div>
          </div>

          {/* الكمية التالفة (لتر) */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">الكمية التالفة (لتر)</p>
                <p className="text-2xl font-bold text-red-600">{formatArabicNumber(stats.data.totalDamagedLiters || 0)}</p>
              </div>
              <Trash2 className="w-10 h-10 text-red-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">اسم الصنف</label>
            <input
              type="text"
              value={filterProductName}
              onChange={(e) => {
                setFilterProductName(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="بحث باسم الصنف..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">كود الصنف</label>
            <input
              type="text"
              value={filterProductCode}
              onChange={(e) => {
                setFilterProductCode(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="بحث بكود الصنف..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">التاريخ</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">السبب</label>
            <input
              type="text"
              value={filterReason}
              onChange={(e) => {
                setFilterReason(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="بحث بالسبب..."
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رقم المحضر
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  السبب
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عدد الأصناف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                      <p>جاري التحميل...</p>
                    </div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="w-12 h-12 text-gray-300" />
                      <p>لا توجد محاضر إتلاف</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report: any) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{report.reportNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{report.reason}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatArabicNumber(report.lines?.length || 0)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {getStatusText(report.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(report.createdAt).toLocaleDateString('en-GB')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {report.status === 'PENDING' && (
                          <button
                            onClick={() => handleDelete(report.id)}
                            className="text-red-600 hover:text-red-900"
                            title="حذف"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="mr-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  عرض <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> إلى{' '}
                  <span className="font-medium">{Math.min(currentPage * 10, pagination.total)}</span> من{' '}
                  <span className="font-medium">{pagination.total}</span> نتيجة
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    التالي
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">إنشاء محضر إتلاف جديد</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    سبب الإتلاف <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="مثال: تلف بسبب التخزين السيء"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="ملاحظات إضافية (اختياري)"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      الأصناف التالفة <span className="text-red-500">*</span>
                    </label>
                  </div>

                  {/* Product Search - Split into Name and Code */}
                  <div className="mb-4" ref={productSearchRef}>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      بحث عن صنف لإضافته
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name Search */}
                      <div className="relative">
                        <label className="block text-[10px] text-gray-500 mb-1">
                          البحث بالاسم (جزء من الاسم)
                        </label>
                        <input
                          type="text"
                          value={productNameSearch}
                          onChange={(e) => {
                            setProductNameSearch(e.target.value);
                            setShowNameDropdown(e.target.value.length > 0);
                            setShowCodeDropdown(false);
                          }}
                          onFocus={() => {
                            if (productNameSearch) setShowNameDropdown(true);
                            setShowCodeDropdown(false);
                          }}
                          placeholder="ابحث بالاسم..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                        />

                        {/* Name Dropdown */}
                        {showNameDropdown && productNameSearch && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {filteredByName.length > 0 ? (
                              filteredByName.slice(0, 10).map((product: any) => {
                                return (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => handleSelectProductFromDropdown(product)}
                                    className="w-full px-3 py-2 text-right focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors hover:bg-red-50 focus:bg-red-50"
                                  >
                                    <div className="flex justify-between items-center gap-3">
                                      <div className="text-sm flex-1">
                                        <div className="font-medium flex items-center gap-2 text-gray-900">
                                          {product.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          كود: {product.sku}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                <p>لا توجد أصناف مطابقة للاسم</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Code Search */}
                      <div className="relative">
                        <label className="block text-[10px] text-gray-500 mb-1">
                          البحث بالكود (مطابقة تامة)
                        </label>
                        <input
                          type="text"
                          value={productCodeSearch}
                          onChange={(e) => {
                            setProductCodeSearch(e.target.value);
                            setShowCodeDropdown(e.target.value.length > 0);
                            setShowNameDropdown(false);
                          }}
                          onFocus={() => {
                            if (productCodeSearch) setShowCodeDropdown(true);
                            setShowNameDropdown(false);
                          }}
                          placeholder="ابحث بالكود..."
                          className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                        />

                        {/* Code Dropdown */}
                        {showCodeDropdown && productCodeSearch && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-blue-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {filteredByCode.length > 0 ? (
                              filteredByCode.map((product: any) => {
                                return (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => handleSelectProductFromDropdown(product)}
                                    className="w-full px-3 py-2 text-right focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors hover:bg-blue-50 focus:bg-blue-50"
                                  >
                                    <div className="flex justify-between items-center gap-3">
                                      <div className="text-sm flex-1">
                                        <div className="font-medium flex items-center gap-2 text-gray-900">
                                          {product.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          كود: {product.sku}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                <p>لا يوجد صنف بهذا الكود</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      ابحث بالاسم (تقريبي) أو بالكود (مطابق تماماً) لإضافة الأصناف
                    </p>
                  </div>

                  <div className="space-y-3">
                    {lines.map((line, index) => {
                      const product = line.product || products.find((p: any) => p.id === line.productId);
                      const stockInfo = product?.stock?.[0];
                      const availableQty = stockInfo?.boxes || 0;

                      return (
                        <div key={index} className="flex gap-2 items-start p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-red-300 transition-colors">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {product?.name || 'صنف غير معروف'}
                              <span className="text-xs text-gray-500 font-normal">
                                #{index + 1}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                              <span>كود: {product?.sku || '-'}</span>
                              {availableQty > 0 && (
                                <span className="text-green-600 font-medium">
                                  • متوفر: {formatArabicArea(availableQty)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              value={line.quantity || ''}
                              onChange={(e) => handleUpdateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              placeholder="الكمية"
                              step="0.01"
                              min="0"
                            />
                          </div>
                          <button
                            onClick={() => handleRemoveLine(index)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      );
                    })}

                    {lines.length === 0 && (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="font-medium">لم يتم إضافة أي أصناف بعد</p>
                        <p className="text-sm">استخدم البحث أعلاه لإضافة الأصناف</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary */}
              {lines.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-900">ملخص المحضر</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-gray-700">
                        <span className="font-medium">عدد الأصناف:</span>{' '}
                        <span className="text-red-600 font-bold">{formatArabicNumber(lines.length)}</span>
                      </div>
                      <div className="text-gray-700">
                        <span className="font-medium">إجمالي الكميات:</span>{' '}
                        <span className="text-red-600 font-bold">
                          {formatArabicArea(lines.reduce((sum, line) => sum + (line.quantity || 0), 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isCreating}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'جاري الإنشاء...' : 'إنشاء المحضر'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">تفاصيل محضر الإتلاف</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">رقم المحضر</p>
                  <p className="font-medium">{selectedReport.reportNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">الحالة</p>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedReport.status)}`}>
                    {getStatusText(selectedReport.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">السبب</p>
                  <p className="font-medium">{selectedReport.reason}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">التاريخ</p>
                  <p className="font-medium">{new Date(selectedReport.createdAt).toLocaleDateString('en-GB')}</p>
                </div>
                {selectedReport.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">الملاحظات</p>
                    <p className="font-medium">{selectedReport.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3">الأصناف التالفة</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الصنف</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الكمية</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReport.lines?.map((line: any) => (
                        <tr key={line.id}>
                          <td className="px-4 py-2 text-sm">{line.product?.name}</td>
                          <td className="px-4 py-2 text-sm">{formatArabicArea(line.quantity)}</td>
                          <td className="px-4 py-2 text-sm">{line.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DamageReportsPage;

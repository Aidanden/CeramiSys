"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useGetSuppliersQuery,
  useDeleteSupplierMutation,
  Supplier
} from '@/state/purchaseApi';
import { useToast } from '@/components/ui/Toast';
import UnifiedSupplierModal from '@/components/shared/UnifiedSupplierModal';
import {
  Truck,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  UserPlus,
  CheckCircle
} from 'lucide-react';

const SuppliersPage = () => {
  const { success, error: showError } = useToast();
  const router = useRouter();

  // States
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // API calls
  const { data: suppliersData, isLoading: suppliersLoading, refetch: refetchSuppliers } = useGetSuppliersQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm
  });

  const [deleteSupplier, { isLoading: isDeleting }] = useDeleteSupplierMutation();

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleSupplierModalSuccess = () => {
    refetchSuppliers();
  };

  const openCreateModal = () => {
    setSelectedSupplier(null);
    setModalMode('create');
    setShowSupplierModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setModalMode('edit');
    setShowSupplierModal(true);
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    try {
      await deleteSupplier(supplierToDelete.id).unwrap();
      success('تم حذف المورد بنجاح');
      setShowDeleteConfirm(false);
      setSupplierToDelete(null);
      refetchSuppliers();
    } catch (err: any) {
      showError(err.data?.message || 'حدث خطأ في حذف المورد');
    }
  };

  return (
    <div className="max-w-full space-y-8 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-text-primary tracking-tight flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            الموردين
          </h1>
          <p className="text-slate-500 dark:text-text-secondary font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            إدارة الموردين وتتبع بيانات الاتصال والعناوين
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-5 h-5" />
          إضافة مورد جديد
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-surface-primary p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-text-tertiary group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="ابحث باسم المورد أو رقم الهاتف..."
              className="w-full pr-12 pl-4 py-3.5 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-text-primary font-medium transition-all"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-200 dark:border-border-primary">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider">#</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider">المورد</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider">الاتصال</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider">العنوان</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider">التاريخ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-border-primary/50">
              {suppliersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-8"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-40"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-16 mx-auto"></div></td>
                  </tr>
                ))
              ) : suppliersData?.data?.suppliers?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <Truck className="w-8 h-8 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-slate-900 dark:text-text-primary font-bold text-lg">لم يتم العثور على موردين</p>
                        <p className="text-slate-500 dark:text-text-tertiary text-sm">ابدأ بإضافة أول مورد إلى نظامك</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                suppliersData?.data?.suppliers?.map((supplier, index) => (
                  <tr key={supplier.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-slate-400">
                      {(currentPage - 1) * 10 + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold group-hover:scale-110 transition-transform">
                          {supplier.name.charAt(0)}
                        </div>
                        <p className="font-bold text-slate-900 dark:text-text-primary">{supplier.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {supplier.phone && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-text-secondary text-sm font-medium">
                            <Phone className="w-3.5 h-3.5" />
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-2 text-slate-400 dark:text-text-tertiary text-[10px]">
                            <Mail className="w-3 h-3" />
                            {supplier.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-text-tertiary text-sm max-w-xs">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="truncate" title={supplier.address || ''}>{supplier.address || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-text-tertiary text-sm">
                        <Calendar className="w-4 h-4" />
                        {new Date(supplier.createdAt).toLocaleDateString('ar-LY')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(supplier)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSupplierToDelete(supplier);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
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
        {suppliersData?.data?.pagination && suppliersData.data.pagination.pages > 1 && (
          <div className="bg-slate-50/50 dark:bg-slate-900/20 px-6 py-4 flex items-center justify-between border-t border-slate-100 dark:border-border-primary">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-slate-200 dark:border-border-primary text-sm font-bold rounded-xl text-slate-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(suppliersData.data.pagination.pages, p + 1))}
                disabled={currentPage === suppliersData.data.pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-200 dark:border-border-primary text-sm font-bold rounded-xl text-slate-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-text-tertiary font-medium">
                  عرض صفحة <span className="font-bold text-slate-900 dark:text-text-primary">{currentPage}</span> من <span className="font-bold text-slate-900 dark:text-text-primary">{suppliersData.data.pagination.pages}</span>
                </p>
              </div>
              <nav className="relative z-0 inline-flex rounded-xl shadow-sm space-x-1 rtl:space-x-reverse" aria-label="Pagination">
                {Array.from({ length: Math.min(suppliersData.data.pagination.pages, 10) }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl transition-all ${currentPage === i + 1
                      ? 'z-10 bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none'
                      : 'bg-white dark:bg-surface-primary border-2 border-slate-100 dark:border-border-primary text-slate-500 dark:text-text-tertiary hover:bg-slate-50 dark:hover:bg-surface-hover'
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Unified Supplier Modal */}
      <UnifiedSupplierModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSuccess={handleSupplierModalSuccess}
        supplier={selectedSupplier}
        mode={modalMode}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-200 dark:border-border-primary text-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-500 animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-text-primary mb-2">تأكيد الحذف</h3>
            <p className="text-slate-500 dark:text-text-secondary font-medium mb-8 leading-relaxed">
              هل أنت متأكد من حذف المورد <span className="text-slate-900 dark:text-text-primary font-bold">"{supplierToDelete?.name}"</span>؟<br />
              هذا الإجراء لا يمكن التراجع عنه وسيتم حذف كافة المشتريات والبيانات المرتبطة به.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDeleteSupplier}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-red-100 dark:shadow-none flex items-center justify-center gap-2 hover:translate-y-[-2px] active:translate-y-[0px] disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    تأكيد الحذف
                  </>
                )}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setSupplierToDelete(null); }}
                className="flex-1 bg-slate-100 dark:bg-surface-hover text-slate-600 dark:text-text-secondary rounded-2xl font-bold transition-all hover:bg-slate-200 dark:hover:bg-surface-selected"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  Customer,
  CreateCustomerRequest
} from '@/state/salesApi';
import { useToast } from '@/components/ui/Toast';
import {
  Users,
  UserPlus,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Filter,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Phone,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const CustomersPage = () => {
  const { success, error: showError, warning, info, confirm } = useToast();
  const router = useRouter();

  // States
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    name: '',
    phone: '',
    note: ''
  });

  // API calls
  const { data: customersData, isLoading: customersLoading, refetch: refetchCustomers } = useGetCustomersQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm
  });

  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: isUpdating }] = useUpdateCustomerMutation();
  const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('اسم العميل مطلوب');
      return;
    }

    try {
      await createCustomer(formData).unwrap();
      success('تم إنشاء العميل بنجاح');
      setShowCreateModal(false);
      setFormData({ name: '', phone: '', note: '' });
      refetchCustomers();
    } catch (err: any) {
      showError(err.data?.message || 'حدث خطأ في إنشاء العميل');
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !formData.name.trim()) {
      showError('اسم العميل مطلوب');
      return;
    }

    try {
      await updateCustomer({ id: selectedCustomer.id, data: formData }).unwrap();
      success('تم تحديث العميل بنجاح');
      setShowEditModal(false);
      setSelectedCustomer(null);
      setFormData({ name: '', phone: '', note: '' });
      refetchCustomers();
    } catch (err: any) {
      showError(err.data?.message || 'حدث خطأ في تحديث العميل');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      await deleteCustomer(customerToDelete.id).unwrap();
      success('تم حذف العميل بنجاح');
      setShowDeleteConfirm(false);
      setCustomerToDelete(null);
      refetchCustomers();
    } catch (err: any) {
      showError(err.data?.message || 'حدث خطأ في حذف العميل');
    }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      note: customer.note || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', note: '' });
    setSelectedCustomer(null);
  };

  return (
    <div className="max-w-full space-y-8 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 dark:text-text-primary tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            العملاء
          </h1>
          <p className="text-slate-500 dark:text-text-secondary font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            إدارة قاعدة بيانات العملاء وتتبع تفاصيلهم
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-100 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <UserPlus className="w-5 h-5" />
          إضافة عميل جديد
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-surface-primary p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-text-tertiary group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="ابحث باسم العميل أو رقم الهاتف..."
              className="w-full pr-12 pl-4 py-3.5 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-text-primary font-medium transition-all"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-200 dark:border-border-primary">
                <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-text-tertiary uppercase">العميل</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-text-tertiary uppercase">بيانات الاتصال</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-text-tertiary uppercase">التاريخ</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-text-tertiary uppercase">ملاحظات</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-text-tertiary uppercase text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-border-primary/50">
              {customersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-16 mx-auto"></div></td>
                  </tr>
                ))
              ) : customersData?.data?.customers?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <Users className="w-8 h-8 text-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-900 dark:text-text-primary font-black text-lg">لم يتم العثور على عملاء</p>
                        <p className="text-slate-500 dark:text-text-tertiary text-sm">ابدأ بإضافة أول عميل إلى نظامك</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                customersData?.data?.customers?.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold group-hover:scale-110 transition-transform">
                          {customer.name.charAt(0)}
                        </div>
                        <p className="font-bold text-slate-900 dark:text-text-primary">{customer.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-text-secondary">
                        <Phone className="w-4 h-4" />
                        <span className="font-medium">{customer.phone || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-text-tertiary text-sm">
                        <Calendar className="w-4 h-4" />
                        {new Date(customer.createdAt).toLocaleDateString('ar-LY')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-text-tertiary text-sm max-w-xs">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate" title={customer.note || ''}>{customer.note || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(customer)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCustomerToDelete(customer);
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
        {customersData?.data?.pagination && customersData.data.pagination.pages > 1 && (
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
                onClick={() => setCurrentPage(p => Math.min(customersData.data.pagination.pages, p + 1))}
                disabled={currentPage === customersData.data.pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-200 dark:border-border-primary text-sm font-bold rounded-xl text-slate-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-text-tertiary">
                  عرض صفحة <span className="font-bold text-slate-900 dark:text-text-primary">{currentPage}</span> من <span className="font-bold text-slate-900 dark:text-text-primary">{customersData.data.pagination.pages}</span>
                </p>
              </div>
              <nav className="relative z-0 inline-flex rounded-xl shadow-sm space-x-1 rtl:space-x-reverse" aria-label="Pagination">
                {Array.from({ length: Math.min(customersData.data.pagination.pages, 10) }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-black rounded-xl transition-all ${currentPage === i + 1
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

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-border-primary">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-600 dark:to-indigo-600 px-8 py-6 flex flex-row-reverse justify-between items-center text-white">
              <div className="flex items-center gap-3 flex-row-reverse">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black">{showEditModal ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</h3>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={showEditModal ? handleEditCustomer : handleCreateCustomer} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block text-right uppercase tracking-wider">اسم العميل *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-text-primary font-bold transition-all text-right"
                  placeholder="أدخل الاسم الكامل..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block text-right uppercase tracking-wider">رقم الهاتف</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-text-primary font-bold transition-all text-right"
                    placeholder="0xxxxxxxxx"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block text-right uppercase tracking-wider">ملاحظات</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-text-primary font-medium transition-all text-right resize-none"
                  placeholder="أي تفاصيل أو ملاحظات إضافية..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black transition-all shadow-lg shadow-blue-100 dark:shadow-none flex items-center justify-center gap-2 hover:translate-y-[-2px] active:translate-y-[0px] disabled:opacity-50"
                >
                  {(isCreating || isUpdating) ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {showEditModal ? 'تحديث البيانات' : 'إضافة العميل'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
                  className="px-8 py-4 bg-slate-100 dark:bg-surface-hover text-slate-600 dark:text-text-secondary rounded-2xl font-black transition-all hover:bg-slate-200 dark:hover:bg-surface-selected"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-200 dark:border-border-primary text-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-500 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-text-primary mb-2">تأكيد الحذف</h3>
            <p className="text-slate-500 dark:text-text-secondary font-medium mb-8 leading-relaxed">
              هل أنت متأكد من حذف العميل <span className="text-slate-900 dark:text-text-primary font-black">"{customerToDelete?.name}"</span>؟<br />
              هذا الإجراء لا يمكن التراجع عنه وسيتم حذف كافة البيانات المرتبطة به.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-2xl font-black transition-all shadow-lg shadow-red-100 dark:shadow-none flex items-center justify-center gap-2 hover:translate-y-[-2px] active:translate-y-[0px] disabled:opacity-50"
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
                onClick={() => { setShowDeleteConfirm(false); setCustomerToDelete(null); }}
                className="flex-1 bg-slate-100 dark:bg-surface-hover text-slate-600 dark:text-text-secondary rounded-2xl font-black transition-all hover:bg-slate-200 dark:hover:bg-surface-selected"
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

export default CustomersPage;

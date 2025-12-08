'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  useGetExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  PurchaseExpenseCategory,
  CreateExpenseCategoryDto,
} from '@/state/api/purchaseExpenseApi';
import { useGetSuppliersQuery, useCreateSupplierMutation } from '@/state/purchaseApi';
import { useToast } from '@/components/ui/Toast';
import UnifiedSupplierModal from '@/components/shared/UnifiedSupplierModal';
import Link from 'next/link';

export default function ExpenseCategoriesPage() {
  const { success, error: showError } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PurchaseExpenseCategory | null>(null);
  const [formData, setFormData] = useState<CreateExpenseCategoryDto>({
    name: '',
    description: '',
    supplierIds: [],
  });
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // API Queries
  const { data: categories = [], isLoading, refetch } = useGetExpenseCategoriesQuery(true);
  const { data: suppliersData, refetch: refetchSuppliers } = useGetSuppliersQuery({});
  const suppliers = suppliersData?.data?.suppliers || [];

  // Mutations
  const [createCategory, { isLoading: isCreating }] = useCreateExpenseCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateExpenseCategoryMutation();
  const [deleteCategory] = useDeleteExpenseCategoryMutation();

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter((supplier: any) =>
    supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );

  // Get selected suppliers
  const selectedSuppliers = suppliers.filter((s: any) => 
    formData.supplierIds?.includes(s.id)
  );

  const handleOpenModal = (category?: PurchaseExpenseCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        supplierIds: category.suppliers?.map((s) => s.supplierId) || [],
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', supplierIds: [] });
    }
    setSupplierSearchTerm('');
    setShowSupplierDropdown(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', supplierIds: [] });
    setSupplierSearchTerm('');
    setShowSupplierDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategory({
          id: editingCategory.id,
          data: formData,
        }).unwrap();
        success('تم التحديث', 'تم تحديث فئة المصروفات بنجاح');
      } else {
        await createCategory(formData).unwrap();
        success('تم الإنشاء', 'تم إنشاء فئة المصروفات بنجاح');
      }
      handleCloseModal();
      refetch();
    } catch (err: any) {
      showError('خطأ', err.message || 'حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    
    try {
      await deleteCategory(id).unwrap();
      success('تم الحذف', 'تم حذف فئة المصروفات بنجاح');
      refetch();
    } catch (err: any) {
      showError('خطأ', err.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleAddSupplier = (supplierId: number) => {
    setFormData((prev) => {
      const supplierIds = prev.supplierIds || [];
      if (!supplierIds.includes(supplierId)) {
        return { ...prev, supplierIds: [...supplierIds, supplierId] };
      }
      return prev;
    });
    setSupplierSearchTerm('');
    setShowSupplierDropdown(false);
  };

  const handleRemoveSupplier = (supplierId: number) => {
    setFormData((prev) => ({
      ...prev,
      supplierIds: (prev.supplierIds || []).filter((id) => id !== supplierId),
    }));
  };

  const handleSupplierCreated = () => {
    setShowSupplierModal(false);
    refetchSuppliers();
    success('تم الإضافة', 'تم إضافة المورد بنجاح');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        {/* Back Button */}
        <div className="mb-4">
          <Link href="/settings">
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>العودة للإعدادات</span>
            </button>
          </Link>
        </div>
        
        {/* Title and Add Button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">فئات مصروفات المشتريات</h1>
            <p className="text-gray-600 mt-1">إدارة فئات المصروفات والموردين المرتبطين بها</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <span className="text-xl">➕</span>
            <span>إضافة فئة جديدة</span>
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`p-6 rounded-lg border-2 shadow-md transition-all ${
              category.isActive
                ? 'bg-white border-gray-200 hover:border-blue-300'
                : 'bg-gray-50 border-gray-300 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{category.name}</h3>
                {category.description && (
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                )}
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  category.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {category.isActive ? 'نشط' : 'غير نشط'}
              </span>
            </div>

            {/* Suppliers */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">الموردين المرتبطين:</p>
              {category.suppliers && category.suppliers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {category.suppliers.map((s) => (
                    <span
                      key={s.id}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                    >
                      {s.supplier.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">لا يوجد موردين مرتبطين</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleOpenModal(category)}
                className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                تعديل
              </button>
              <button
                onClick={() => handleDelete(category.id)}
                className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-medium"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-xl font-medium text-gray-600 mb-2">لا توجد فئات مصروفات</p>
          <p className="text-gray-500">ابدأ بإضافة فئة جديدة</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingCategory ? 'تعديل فئة المصروفات' : 'إضافة فئة مصروفات جديدة'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الفئة *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="مثال: جمرك، شحن، نقل..."
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="وصف اختياري للفئة..."
                />
              </div>

              {/* Suppliers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    الموردين المرتبطين
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSupplierModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <span className="text-lg">➕</span>
                    إضافة مورد جديد
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative mb-3" ref={dropdownRef}>
                  <input
                    type="text"
                    value={supplierSearchTerm}
                    onChange={(e) => {
                      setSupplierSearchTerm(e.target.value);
                      setShowSupplierDropdown(true);
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    placeholder="ابحث عن مورد..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  
                  {/* Dropdown */}
                  {showSupplierDropdown && supplierSearchTerm && filteredSuppliers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredSuppliers.map((supplier: any) => (
                        <button
                          key={supplier.id}
                          type="button"
                          onClick={() => handleAddSupplier(supplier.id)}
                          disabled={formData.supplierIds?.includes(supplier.id)}
                          className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="text-sm text-gray-700">{supplier.name}</span>
                          {formData.supplierIds?.includes(supplier.id) && (
                            <span className="text-xs text-green-600 mr-2">✓ مضاف</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Suppliers */}
                {selectedSuppliers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedSuppliers.map((supplier: any) => (
                      <div
                        key={supplier.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg"
                      >
                        <span className="text-sm">{supplier.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSupplier(supplier.id)}
                          className="text-blue-700 hover:text-blue-900"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-gray-300 rounded-lg">
                    لم يتم اختيار موردين بعد
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating || isUpdating ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      <UnifiedSupplierModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSuccess={handleSupplierCreated}
        mode="create"
      />
    </div>
  );
}

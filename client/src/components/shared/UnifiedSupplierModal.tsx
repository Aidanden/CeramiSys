"use client";

import React, { useState, useEffect } from 'react';
import { useCreateSupplierMutation, useUpdateSupplierMutation, CreateSupplierRequest, UpdateSupplierRequest, Supplier } from '@/state/purchaseApi';
import { useToast } from '@/components/ui/Toast';

interface UnifiedSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null; // For editing existing supplier
  mode?: 'create' | 'edit';
}

const UnifiedSupplierModal: React.FC<UnifiedSupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  supplier = null,
  mode = 'create'
}) => {
  const { success, error } = useToast();
  
  // Form state
  const [formData, setFormData] = useState<CreateSupplierRequest>({
    name: '',
    phone: '',
    email: '',
    address: '',
    note: ''
  });

  // API mutations
  const [createSupplier, { isLoading: isCreating }] = useCreateSupplierMutation();
  const [updateSupplier, { isLoading: isUpdating }] = useUpdateSupplierMutation();

  // Initialize form data when supplier changes (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && supplier) {
      setFormData({
        name: supplier.name,
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        note: supplier.note || ''
      });
    } else {
      resetForm();
    }
  }, [supplier, mode, isOpen]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      error('خطأ', 'اسم المورد مطلوب');
      return;
    }

    try {
      if (mode === 'edit' && supplier) {
        // Update existing supplier
        await updateSupplier({ 
          id: supplier.id, 
          data: formData as UpdateSupplierRequest 
        }).unwrap();
        success('تم بنجاح!', 'تم تحديث المورد بنجاح');
      } else {
        // Create new supplier
        await createSupplier(formData).unwrap();
        success('تم بنجاح!', 'تم إنشاء المورد بنجاح');
      }
      
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('خطأ في عملية المورد:', error);
      
      const errorMessage = error?.data?.message || 
        (mode === 'edit' ? 'حدث خطأ في تحديث المورد' : 'حدث خطأ في إنشاء المورد');
      
      error('خطأ', errorMessage);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      note: ''
    });
  };

  // Handle close with reset
  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  const isLoading = isCreating || isUpdating;
  const modalTitle = mode === 'edit' ? 'تعديل المورد' : 'إضافة مورد جديد';
  const submitButtonText = mode === 'edit' 
    ? (isUpdating ? 'جاري التحديث...' : 'تحديث') 
    : (isCreating ? 'جاري الحفظ...' : 'حفظ');

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{modalTitle}</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Supplier Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اسم المورد *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-md bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                placeholder="أدخل اسم المورد"
                required
                disabled={isLoading}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الهاتف
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-md bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                placeholder="رقم الهاتف"
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-md bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                placeholder="البريد الإلكتروني"
                disabled={isLoading}
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                العنوان
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                placeholder="عنوان المورد"
                disabled={isLoading}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ملاحظات
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                placeholder="ملاحظات إضافية"
                disabled={isLoading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {submitButtonText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UnifiedSupplierModal;

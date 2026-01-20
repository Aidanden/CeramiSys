"use client";

import React, { useState } from 'react';
import { useAppSelector } from '@/app/redux';
import { 
  useAddPurchasePaymentMutation,
  Purchase
} from '@/state/purchaseApi';
import { useToast } from '@/components/ui/Toast';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  onSuccess: () => void;
  selectedCompanyId: number | null;
}

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  purchase,
  selectedCompanyId
}) => {
  const toast = useToast();
  
  // Local state
  const [formData, setFormData] = useState({
    receiptNumber: '',
    amount: '',
    paymentMethod: 'CASH' as 'CASH' | 'BANK' | 'CARD',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // RTK Query hooks
  const [addPayment, { isLoading }] = useAddPurchasePaymentMutation();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!purchase || !selectedCompanyId) {
      toast.error('خطأ', 'بيانات غير صحيحة');
      return;
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error('خطأ', 'يرجى إدخال مبلغ صحيح');
      return;
    }

    if (Number(formData.amount) > purchase.remainingAmount) {
      toast.error('خطأ', 'المبلغ أكبر من المبلغ المتبقي');
      return;
    }

    try {
      await addPayment({
        purchaseId: purchase.id,
        companyId: selectedCompanyId,
        receiptNumber: formData.receiptNumber || undefined,
        amount: Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        paymentDate: formData.paymentDate,
        notes: formData.notes || undefined,
      }).unwrap();
      
      toast.success('تم بنجاح!', 'تم إضافة الدفعة بنجاح');
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('خطأ في إضافة الدفعة:', error);
      
      if (error?.data?.message) {
        toast.error('خطأ في العملية', error.data.message);
      } else {
        toast.error('خطأ غير متوقع', 'حدث خطأ في إضافة الدفعة');
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      receiptNumber: '',
      amount: '',
      paymentMethod: 'CASH',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  if (!isOpen || !purchase) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">إضافة دفعة جديدة</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Purchase Info */}
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <div className="text-sm text-gray-600">
              <p><span className="font-medium">الفاتورة:</span> #{purchase.invoiceNumber || purchase.id}</p>
              <p><span className="font-medium">المورد:</span> {purchase.supplier?.name || 'غير محدد'}</p>
              <p><span className="font-medium">المبلغ المتبقي:</span> 
                <span className="font-bold text-red-600"> {purchase.remainingAmount.toLocaleString('ar-LY')} د.ل</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الإيصال
              </label>
              <input
                type="text"
                value={formData.receiptNumber}
                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                placeholder="رقم الإيصال (اختياري)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المبلغ *
              </label>
              <input
                type="number"
                min="0"
                max={purchase.remainingAmount}
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                placeholder="المبلغ"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                الحد الأقصى: {purchase.remainingAmount.toLocaleString('ar-LY')} د.ل
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                طريقة الدفع *
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                required
              >
                <option value="CASH">نقد</option>
                <option value="BANK">بنك</option>
                <option value="CARD">بطاقة</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ الدفع *
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                placeholder="ملاحظات إضافية"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'جاري الإضافة...' : 'إضافة الدفعة'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddPaymentModal;

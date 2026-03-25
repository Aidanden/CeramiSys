"use client";

import React, { useState } from 'react';
import { useCreateOpeningBalanceMutation as useCustomerOpeningBalanceMutation } from '@/state/customerAccountApi';
import { useCreateOpeningBalanceMutation as useSupplierOpeningBalanceMutation } from '@/state/supplierAccountApi';
import { useToast } from '@/components/ui/Toast';
import { 
  X, 
  Calendar, 
  FileText, 
  Plus, 
  TrendingUp, 
  TrendingDown
} from 'lucide-react';

interface OpeningBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: number;
  supplierId?: number;
  name: string;
  type: 'customer' | 'supplier';
}

const OpeningBalanceModal = ({ isOpen, onClose, customerId, supplierId, name, type }: OpeningBalanceModalProps) => {
  const { success, error: showError } = useToast();
  
  const [createCustomerOpeningBalance, { isLoading: isCustomerLoading }] = useCustomerOpeningBalanceMutation();
  const [createSupplierOpeningBalance, { isLoading: isSupplierLoading }] = useSupplierOpeningBalanceMutation();

  const createOpeningBalance = type === 'customer' ? createCustomerOpeningBalance : createSupplierOpeningBalance;
  const isLoading = isCustomerLoading || isSupplierLoading;

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'LYD',
    transactionType: type === 'customer' ? 'DEBIT' : 'CREDIT',
    transactionDate: new Date().toISOString().split('T')[0],
    description: '',
    previousSystemRef: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      showError('الرجاء إدخال مبلغ صحيح وموجب');
      return;
    }

    try {
      await createOpeningBalance({
        customerId,
        supplierId,
        amount,
        currency: formData.currency,
        transactionType: formData.transactionType as 'DEBIT' | 'CREDIT',
        transactionDate: formData.transactionDate,
        description: formData.description,
        previousSystemRef: formData.previousSystemRef
      }).unwrap();

      success('تم إضافة الرصيد الافتتاحي بنجاح');
      onClose();
    } catch (err: any) {
      showError(err.data?.message || 'حدث خطأ أثناء إضافة الرصيد');
    }
  };

  const isDebit = formData.transactionType === 'DEBIT';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-surface-primary rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-border-primary border-t-8 border-t-yellow-500">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-start">
          <div className="space-y-1" dir="rtl">
            <h3 className="text-2xl font-black text-slate-900 dark:text-text-primary flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                <FileText className="w-6 h-6 text-yellow-600" />
              </div>
              رصيد مرحل / افتتاحى
            </h3>
            <p className="text-slate-500 dark:text-text-secondary font-medium mr-11">
              إضافة رصيد سابق لـ: <span className="text-slate-900 dark:text-text-primary font-bold">{name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6" dir="rtl">
            <div className="flex gap-4 items-end">
              <div className="flex-[2] space-y-2">
                <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block">المبلغ *</label>
                <div className="relative group">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-4 bg-slate-50 dark:bg-surface-secondary border-2 border-slate-100 dark:border-border-primary rounded-2xl outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 text-slate-900 dark:text-text-primary text-2xl font-black transition-all text-right"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {type === 'supplier' && (
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block">العملة</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-4 bg-slate-50 dark:bg-surface-secondary border-2 border-slate-100 dark:border-border-primary rounded-2xl outline-none focus:border-yellow-500 text-slate-900 dark:text-text-primary font-black transition-all appearance-none cursor-pointer"
                  >
                    <option value="LYD">LYD (د.ل)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              )}
            </div>

          {/* Transaction Type */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block">نوع الرصيد</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, transactionType: 'DEBIT' })}
                className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  isDebit 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400 shadow-lg shadow-red-100 dark:shadow-none' 
                  : 'bg-white dark:bg-surface-secondary border-slate-100 dark:border-border-primary text-slate-400'
                }`}
              >
                <TrendingUp className={`w-5 h-5 ${isDebit ? 'animate-pulse' : ''}`} />
                <span className="font-black text-xs md:text-sm">{type === 'customer' ? 'مدين (عليه)' : 'مدين (مطلوب منه)'}</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, transactionType: 'CREDIT' })}
                className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  !isDebit 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400 shadow-lg shadow-green-100 dark:shadow-none' 
                  : 'bg-white dark:bg-surface-secondary border-slate-100 dark:border-border-primary text-slate-400'
                }`}
              >
                <TrendingDown className={`w-5 h-5 ${!isDebit ? 'animate-pulse' : ''}`} />
                <span className="font-black text-xs md:text-sm">{type === 'customer' ? 'دائن (له رصيد)' : 'دائن (له في ذمتنا)'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mr-2">
              {type === 'customer' 
                ? (isDebit ? '* سيؤدي لزيادة مديونية العميل' : '* سيؤدي لتخفيض مديونية العميل')
                : (isDebit ? '* سيؤدي لتخفيض ديون المورد علينا' : '* سيؤدي لزيادة ديون المورد علينا')
              }
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date Field */}
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block text-right">التاريخ</label>
              <div className="relative">
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={formData.transactionDate}
                  onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                  className="w-full pr-12 pl-4 py-3 bg-slate-50 dark:bg-surface-secondary border-2 border-slate-100 dark:border-border-primary rounded-2xl outline-none focus:border-yellow-500 text-slate-900 dark:text-text-primary font-bold transition-all text-right"
                />
              </div>
            </div>

            {/* Reference Field */}
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block text-right">رقم المرجع (قديم)</label>
              <div className="relative">
                <FileText className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.previousSystemRef}
                  onChange={(e) => setFormData({ ...formData, previousSystemRef: e.target.value })}
                  className="w-full pr-12 pl-4 py-3 bg-slate-50 dark:bg-surface-secondary border-2 border-slate-100 dark:border-border-primary rounded-2xl outline-none focus:border-yellow-500 text-slate-900 dark:text-text-primary font-bold transition-all text-right"
                  placeholder="رقم الفاتورة السابقة..."
                />
              </div>
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block text-right">البيان / ملاحظات</label>
            <div className="relative">
              <FileText className="absolute right-4 top-4 w-5 h-5 text-slate-400" />
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full pr-12 pl-4 py-3 bg-slate-50 dark:bg-surface-secondary border-2 border-slate-100 dark:border-border-primary rounded-2xl outline-none focus:border-yellow-500 text-slate-900 dark:text-text-primary font-medium transition-all resize-none text-right"
                placeholder="مثال: رصيد مرحل من سنة 2023..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-yellow-100 dark:shadow-none flex items-center justify-center gap-2 hover:translate-y-[-2px] active:translate-y-[0px] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  حفظ الرصيد المرحل
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 bg-slate-100 dark:bg-surface-hover text-slate-600 dark:text-text-secondary rounded-2xl font-black transition-all hover:bg-slate-200 dark:hover:bg-surface-selected"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpeningBalanceModal;

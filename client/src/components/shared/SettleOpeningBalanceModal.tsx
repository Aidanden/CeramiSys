"use client";

import React, { useState, useEffect } from 'react';
import { useSettleSupplierOpeningBalanceMutation } from '@/state/supplierAccountApi';
import { useSettleCustomerOpeningBalanceMutation } from '@/state/customerAccountApi';
import { useGetTreasuriesQuery } from '@/state/treasuryApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useToast } from '@/components/ui/Toast';
import { User, Search, TrendingUp, TrendingDown, FileText, X, DollarSign, Calendar, Phone, Eye, Filter, RefreshCw, Trash2, Plus, Wallet, Coins, Building2 } from "lucide-react";
import { printSupplierSettleReceipt, printCustomerSettleReceipt } from '@/utils/printUtils';

interface SettleOpeningBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: number;
  entityName: string;
  type: 'customer' | 'supplier';
  initialAmount?: number;
  initialCurrency?: string;
  initialDescription?: string;
}

const SettleOpeningBalanceModal = ({
  isOpen,
  onClose,
  entityId,
  entityName,
  type,
  initialAmount = 0,
  initialCurrency = 'LYD',
  initialDescription = ''
}: SettleOpeningBalanceModalProps) => {
  const { success, error: showError } = useToast();

  const [settleSupplierDebt, { isLoading: isSupplierSettling }] = useSettleSupplierOpeningBalanceMutation();
  const [settleCustomerDebt, { isLoading: isCustomerSettling }] = useSettleCustomerOpeningBalanceMutation();

  const { data: treasuries = [] } = useGetTreasuriesQuery({ isActive: true });
  const { data: companiesData } = useGetCompaniesQuery({ limit: 100 });

  const companies = companiesData?.data?.companies || [];
  const isSettling = isSupplierSettling || isCustomerSettling;

  const [formData, setFormData] = useState({
    amountForeign: initialAmount > 0 ? initialAmount.toString() : '',
    currency: initialCurrency || 'LYD',
    exchangeRate: '1',
    amountLYD: initialAmount > 0 ? initialAmount.toString() : '',
    treasuryId: '',
    companyId: '',
    description: initialDescription || 'رصيد مرحل من النظام السابق',
    notes: ''
  });

  // تحديث المبلغ بالدينار عند تغيير المبلغ بالعملة الأجنبية أو سعر الصرف
  useEffect(() => {
    const foreign = parseFloat(formData.amountForeign);
    const rate = parseFloat(formData.exchangeRate);

    if (!isNaN(foreign) && !isNaN(rate)) {
      const lyDAmount = foreign * rate;
      setFormData(prev => ({ ...prev, amountLYD: lyDAmount.toFixed(2) }));
    }
  }, [formData.amountForeign, formData.exchangeRate]);

  // تعيين سعر الصرف الافتراضي عند تغيير العملة
  useEffect(() => {
    if (formData.currency === 'LYD' || type === 'customer') {
      setFormData(prev => ({ ...prev, exchangeRate: '1' }));
    }
  }, [formData.currency, type]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountLYD = parseFloat(formData.amountLYD);
    const amountForeign = parseFloat(formData.amountForeign);
    const exchangeRate = parseFloat(formData.exchangeRate);

    if (isNaN(amountLYD) || amountLYD <= 0) {
      showError('الرجاء إدخال مبلغ صحيح وموجب');
      return;
    }

    if (!formData.treasuryId) {
      showError('الرجاء اختيار الخزينة');
      return;
    }

    if (!formData.companyId) {
      showError('الرجاء اختيار الشركة');
      return;
    }

    try {
      let result;
      if (type === 'supplier') {
        result = await settleSupplierDebt({
          supplierId: entityId,
          amount: amountLYD,
          amountForeign: formData.currency !== 'LYD' ? amountForeign : undefined,
          currency: formData.currency,
          exchangeRate,
          treasuryId: Number(formData.treasuryId),
          companyId: Number(formData.companyId),
          description: formData.description,
          notes: formData.notes
        }).unwrap();
      } else {
        result = await settleCustomerDebt({
          customerId: entityId,
          amount: amountLYD,
          treasuryId: Number(formData.treasuryId),
          companyId: Number(formData.companyId),
          description: formData.description,
          notes: formData.notes
        }).unwrap();
      }

      success('تمت عملية تسوية الرصيد بنجاح');
      onClose();
    } catch (err: any) {
      showError(err.data?.message || 'حدث خطأ أثناء عملية التسوية');
    }
  };

  const isSupplier = type === 'supplier';
  const colorClass = isSupplier ? 'emerald' : 'blue';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fadeIn">
      <div className={`bg-white dark:bg-surface-primary rounded-[2rem] shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-border-primary border-t-8 border-t-${colorClass}-500`}>
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-start">
          <div className="space-y-1" dir="rtl">
            <h3 className="text-2xl font-black text-slate-900 dark:text-text-primary flex items-center gap-3">
              <div className={`p-2 bg-${colorClass}-100 dark:bg-${colorClass}-900/30 rounded-xl`}>
                {isSupplier ? (
                  <TrendingDown className={`w-6 h-6 text-${colorClass}-600`} />
                ) : (
                  <TrendingUp className={`w-6 h-6 text-${colorClass}-600`} />
                )}
              </div>
              {isSupplier ? 'تسوية رصيد مرحل (دفع)' : 'تسوية رصيد مرحل (قبض)'}
            </h3>
            <p className="text-slate-500 dark:text-text-secondary font-medium mr-11">
              {isSupplier ? 'إصدار إيصال دفع لتسوية رصيد لـ: ' : 'إصدار إيصال قبض لتسوية رصيد لـ: '}
              <span className="text-slate-900 dark:text-text-primary font-bold">{entityName}</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* اختيار الشركة */}
             <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block text-right">الشركة المسؤولة *</label>
              <div className="relative">
                <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  required
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  className={`w-full pr-12 pl-4 py-3 bg-slate-50 dark:bg-surface-secondary border-2 border-slate-100 dark:border-border-primary rounded-2xl outline-none focus:border-${colorClass}-500 text-slate-900 dark:text-text-primary font-bold transition-all appearance-none cursor-pointer`}
                >
                  <option value="">اختر الشركة...</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* اختيار الخزينة */}
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block text-right">
                {isSupplier ? 'الدفع من خزينة *' : 'الإيداع في خزينة *'}
              </label>
              <div className="relative">
                <Wallet className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  required
                  value={formData.treasuryId}
                  onChange={(e) => setFormData({ ...formData, treasuryId: e.target.value })}
                  className={`w-full pr-12 pl-4 py-3 bg-slate-50 dark:bg-surface-secondary border-2 border-slate-100 dark:border-border-primary rounded-2xl outline-none focus:border-${colorClass}-500 text-slate-900 dark:text-text-primary font-bold transition-all appearance-none cursor-pointer`}
                >
                  <option value="">اختر الخزينة...</option>
                  {treasuries.map(treasury => (
                    <option key={treasury.id} value={treasury.id}>
                      {treasury.name} (رصيد: {Number(treasury.balance).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-surface-secondary/50 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-border-primary space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* العملة */}
              {isSupplier ? (
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block">عملة الدين</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className={`w-full px-4 py-3 bg-white dark:bg-surface-secondary border-2 border-slate-100 dark:border-border-primary rounded-2xl outline-none focus:border-${colorClass}-500 text-slate-900 dark:text-text-primary font-black transition-all appearance-none cursor-pointer`}
                  >
                    <option value="LYD">LYD (د.ل)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block">العملة</label>
                  <div className="w-full px-4 py-3 bg-white dark:bg-surface-secondary border-2 border-slate-100 dark:border-border-primary rounded-2xl text-slate-900 dark:text-text-primary font-black">
                    LYD (د.ل)
                  </div>
                </div>
              )}

              {/* المبلغ بالعملة المذكورة */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block">المبلغ ({isSupplier ? formData.currency : 'LYD'}) *</label>
                <div className="relative">
                  <Coins className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amountForeign}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!isSupplier) {
                        setFormData({ ...formData, amountForeign: val, amountLYD: val });
                      } else {
                        setFormData({ ...formData, amountForeign: val });
                      }
                    }}
                    className={`w-full pr-12 pl-4 py-3 bg-white dark:bg-surface-secondary border-2 border-slate-100 dark:border-border-primary rounded-2xl outline-none focus:border-${colorClass}-500 text-slate-900 dark:text-text-primary text-xl font-black transition-all text-right`}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {isSupplier && formData.currency !== 'LYD' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-border-primary">
                {/* سعر الصرف */}
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block">سعر الصرف (اليوم)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required={formData.currency !== 'LYD'}
                    value={formData.exchangeRate}
                    onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                    className={`w-full px-4 py-3 bg-white dark:bg-surface-secondary border-2 border-slate-100 dark:border-border-primary rounded-2xl outline-none focus:border-${colorClass}-500 text-slate-900 dark:text-text-primary font-black transition-all text-right`}
                  />
                </div>

                {/* الناتج بالدينار الليبي */}
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block">المبلغ بالدينار (للخزينة)</label>
                  <div className={`w-full px-4 py-3 bg-${colorClass}-50 dark:bg-${colorClass}-900/20 border-2 border-${colorClass}-100 dark:border-${colorClass}-800/30 rounded-2xl text-${colorClass}-700 dark:text-${colorClass}-400 font-black text-lg text-right`}>
                    {formData.amountLYD} د.ل
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Description Field */}
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block text-right">البيان (يظهر في كشف الحساب)</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-surface-secondary border-2 border-slate-100 dark:border-border-primary rounded-2xl outline-none focus:border-${colorClass}-500 text-slate-900 dark:text-text-primary font-bold transition-all text-right`}
                placeholder="مثال: تسوية جزء من الرصيد السابق..."
              />
            </div>

            {/* Notes Field */}
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1 block text-right">ملاحظات إضافية</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-surface-secondary border-2 border-slate-100 dark:border-border-primary rounded-2xl outline-none focus:border-${colorClass}-500 text-slate-900 dark:text-text-primary font-bold transition-all text-right`}
                placeholder="أي ملاحظات داخلية برقم الإيصال..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSettling}
              className={`flex-1 bg-${colorClass}-600 hover:bg-${colorClass}-700 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-${colorClass}-100 dark:shadow-none flex items-center justify-center gap-2 hover:translate-y-[-2px] active:translate-y-[0px] transition-all disabled:opacity-50`}
            >
              {isSettling ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {isSupplier ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                  {isSupplier ? 'تأكيد الدفع والتسوية' : 'تأكيد القبض والتسوية'}
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

export default SettleOpeningBalanceModal;

'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { useGetExchangeRatesQuery, useUpdateSettingMutation, useGetAllSettingsQuery } from '@/state/settingsApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { DEFAULT_PROFIT_MARGIN } from '@/constants/defaults';
import PermissionGuard from '@/components/PermissionGuard';

export default function SettingsPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [profitMargin, setProfitMargin] = useState(DEFAULT_PROFIT_MARGIN.toString());
  const [enableLineDiscount, setEnableLineDiscount] = useState(true);
  const [enableInvoiceDiscount, setEnableInvoiceDiscount] = useState(true);
  const [costCalculationMethod, setCostCalculationMethod] = useState<'manual' | 'invoice'>('manual');
  const { success, error } = useToast();

  // أسعار الصرف من قاعدة البيانات
  const { data: exchangeRates, isLoading: isLoadingRates } = useGetExchangeRatesQuery();
  const [updateSetting] = useUpdateSettingMutation();

  const [usdRate, setUsdRate] = useState('4.80');
  const [eurRate, setEurRate] = useState('5.20');
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingInventory, setIsSavingInventory] = useState(false);
  const [isSavingDiscounts, setIsSavingDiscounts] = useState(false);
  const [isSavingCostMethod, setIsSavingCostMethod] = useState(false);
  const [isSavingExternalStore, setIsSavingExternalStore] = useState(false);

  // إعدادات المحلات الخارجية
  const { data: allSettings, isLoading: isLoadingSettings } = useGetAllSettingsQuery();
  const { data: companiesResponse } = useGetCompaniesQuery({ limit: 100 });
  const [externalStoreCompanyId, setExternalStoreCompanyId] = useState('1');

  // تحديث الحقول عند تحميل البيانات
  useEffect(() => {
    if (allSettings) {
      const extStoreCompSetting = allSettings.find(s => s.key === 'EXTERNAL_STORE_COMPANY_ID');
      if (extStoreCompSetting) {
        setExternalStoreCompanyId(extStoreCompSetting.value);
      }
    }
  }, [allSettings]);
  useEffect(() => {
    if (exchangeRates) {
      setUsdRate(exchangeRates.USD_EXCHANGE_RATE.toString());
      setEurRate(exchangeRates.EUR_EXCHANGE_RATE.toString());
    }

    const savedNumber = localStorage.getItem('whatsappNumber');
    if (savedNumber) {
      setWhatsappNumber(savedNumber);
    }

    const savedThreshold = localStorage.getItem('lowStockThreshold');
    if (savedThreshold) {
      setLowStockThreshold(savedThreshold);
    }

    const savedMargin = localStorage.getItem('profitMargin');
    if (savedMargin) {
      setProfitMargin(savedMargin);
    }

    const savedLineDisc = localStorage.getItem('enableLineDiscount');
    setEnableLineDiscount(savedLineDisc === null ? true : savedLineDisc === 'true');

    const savedInvDisc = localStorage.getItem('enableInvoiceDiscount');
    setEnableInvoiceDiscount(savedInvDisc === null ? true : savedInvDisc === 'true');

    const savedCostMethod = localStorage.getItem('costCalculationMethod');
    setCostCalculationMethod((savedCostMethod as 'manual' | 'invoice') || 'manual');
  }, [exchangeRates]);

  // حفظ إعدادات المخزون فقط
  const handleSaveInventory = () => {
    // التحقق من حد المخزون
    const threshold = parseInt(lowStockThreshold);
    if (isNaN(threshold) || threshold < 0) {
      error('يرجى إدخال قيمة صحيحة لحد المخزون المنخفض');
      return;
    }

    // التحقق من هامش الربح
    const margin = parseFloat(profitMargin);
    if (isNaN(margin) || margin < 0 || margin > 100) {
      error('يرجى إدخال قيمة صحيحة لهامش الربح (0-100%)');
      return;
    }

    setIsSavingInventory(true);

    try {
      localStorage.setItem('lowStockThreshold', threshold.toString());
      localStorage.setItem('profitMargin', margin.toString());
      success('تم حفظ إعدادات المخزون بنجاح');
    } catch (err) {
      error('حدث خطأ أثناء حفظ إعدادات المخزون');
    } finally {
      setIsSavingInventory(false);
    }
  };

  // حفظ إعدادات الواتساب فقط
  const handleSaveWhatsApp = () => {
    if (!whatsappNumber.trim()) {
      error('يرجى إدخال رقم الواتساب');
      return;
    }

    // التحقق من صحة الرقم (يجب أن يحتوي على أرقام فقط)
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
    if (cleanNumber.length < 10) {
      error('رقم الواتساب غير صحيح. يجب أن يحتوي على 10 أرقام على الأقل');
      return;
    }

    setIsSaving(true);

    try {
      localStorage.setItem('whatsappNumber', cleanNumber);
      success('تم حفظ إعدادات الواتساب بنجاح');
    } catch (err) {
      error('حدث خطأ أثناء حفظ إعدادات الواتساب');
    } finally {
      setIsSaving(false);
    }
  };

  // مسح إعدادات الواتساب
  const handleClearWhatsApp = () => {
    localStorage.removeItem('whatsappNumber');
    setWhatsappNumber('');
    success('تم مسح رقم الواتساب');
  };

  // حفظ أسعار الصرف
  const handleSaveRates = async () => {
    const usd = parseFloat(usdRate);
    const eur = parseFloat(eurRate);

    if (isNaN(usd) || usd <= 0 || isNaN(eur) || eur <= 0) {
      error('يرجى إدخال أسعار صرف صحيحة');
      return;
    }

    setIsSavingRates(true);
    try {
      await updateSetting({ key: 'USD_EXCHANGE_RATE', value: usd.toString() }).unwrap();
      await updateSetting({ key: 'EUR_EXCHANGE_RATE', value: eur.toString() }).unwrap();
      success('تم تحديث أسعار الصرف بنجاح');
    } catch (err) {
      error('حدث خطأ أثناء حفظ أسعار الصرف');
    } finally {
      setIsSavingRates(false);
    }
  };

  // حفظ إعدادات الخصومات
  const handleSaveDiscountSettings = () => {
    setIsSavingDiscounts(true);

    try {
      localStorage.setItem('enableLineDiscount', enableLineDiscount.toString());
      localStorage.setItem('enableInvoiceDiscount', enableInvoiceDiscount.toString());
      success('تم حفظ إعدادات الخصومات بنجاح');
    } catch (err) {
      error('حدث خطأ أثناء حفظ إعدادات الخصومات');
    } finally {
      setIsSavingDiscounts(false);
    }
  };

  // حفظ طريقة حساب التكلفة
  const handleSaveCostMethod = () => {
    setIsSavingCostMethod(true);

    try {
      localStorage.setItem('costCalculationMethod', costCalculationMethod);
      success('تم حفظ إعدادات حساب التكلفة بنجاح');
      // Reload to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      error('حدث خطأ أثناء حفظ إعدادات حساب التكلفة');
    } finally {
      setIsSavingCostMethod(false);
    }
  };

  // حفظ إعدادات المحلات الخارجية
  const handleSaveExternalStoreSettings = async () => {
    setIsSavingExternalStore(true);
    try {
      await updateSetting({
        key: 'EXTERNAL_STORE_COMPANY_ID',
        value: externalStoreCompanyId
      }).unwrap();
      success('تم حفظ إعدادات المحلات الخارجية بنجاح');
    } catch (err) {
      error('حدث خطأ أثناء حفظ إعدادات المحلات الخارجية');
    } finally {
      setIsSavingExternalStore(false);
    }
  };

  return (
    <PermissionGuard requiredPermission="screen.system_settings">
      <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">الإعدادات</h1>
            <p className="text-text-secondary">إدارة إعدادات النظام</p>
          </div>
        </div>
      </div>

      {/* Purchase Expense Categories Card */}
      <div className="bg-white rounded-lg shadow-sm border border-border-primary p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">فئات مصروفات المشتريات</h2>
              <p className="text-sm text-text-secondary">إدارة فئات المصروفات (جمرك، شحن، نقل، إلخ)</p>
            </div>
          </div>
          <Link href="/settings/expense-categories">
            <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              إدارة الفئات
            </button>
          </Link>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-purple-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-800 mb-2">معلومات هامة</p>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• قم بإنشاء فئات المصروفات مثل: جمرك، شحن، نقل، تأمين، إلخ</li>
                <li>• اربط كل فئة بالموردين المسؤولين عنها</li>
                <li>• عند اعتماد فاتورة المشتريات، ستتمكن من إضافة المصروفات</li>
                <li>• سيتم حساب التكلفة النهائية للمنتجات تلقائياً بعد إضافة المصروفات</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Settings Card */}
      <div className="bg-white rounded-lg shadow-sm border border-border-primary p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">إعدادات المخزون</h2>
            <p className="text-sm text-text-secondary">تحديد حد المخزون المنخفض</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              حد المخزون المنخفض (عدد الصناديق)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="10"
                min="0"
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              💡 الأصناف التي يكون مخزونها أقل من أو يساوي هذا الحد ستظهر كـ "شارفت على الانتهاء"
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              هامش الربح للشركة التابعة (%)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <input
                type="number"
                value={profitMargin}
                onChange={(e) => setProfitMargin(e.target.value)}
                placeholder="20"
                min="0"
                max="100"
                step="0.1"
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              💰 عند بيع أصناف من الشركة الأم، سيتم إضافة هذا الهامش على سعر الشركة الأم
            </p>
            <p className="mt-1 text-sm text-gray-500">
              📊 مثال: إذا كان سعر الشركة الأم 100 د.ل وهامش الربح 20%، سيكون سعر البيع 120 د.ل
            </p>
          </div>

          <button
            onClick={handleSaveInventory}
            disabled={isSavingInventory}
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {isSavingInventory ? 'جاري الحفظ...' : 'حفظ إعدادات المخزون'}
          </button>
        </div>
      </div>

      {/* Cost Calculation Method Card */}
      <div className="bg-white rounded-lg shadow-sm border border-border-primary p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">آلية حساب تكلفة الأصناف</h2>
            <p className="text-sm text-text-secondary">اختر الطريقة المفضلة لحساب وتحديث تكلفة المنتجات</p>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${costCalculationMethod === 'manual'
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            onClick={() => setCostCalculationMethod('manual')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    checked={costCalculationMethod === 'manual'}
                    onChange={() => setCostCalculationMethod('manual')}
                    className="w-4 h-4 text-teal-600"
                  />
                  <h3 className="text-base font-bold text-gray-800">إدارة تكلفة الأصناف (يدوي)</h3>
                </div>
                <p className="text-sm text-gray-600 mr-6">
                  • تحديث التكلفة بشكل يدوي لكل منتج على حدة
                </p>
                <p className="text-sm text-gray-600 mr-6">
                  • مناسب للتحكم الكامل في تكلفة كل منتج
                </p>
                <p className="text-sm text-gray-600 mr-6">
                  • سيظهر في القائمة الجانبية: "تكلفة الأصناف"
                </p>
              </div>
              {costCalculationMethod === 'manual' && (
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          <div
            className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${costCalculationMethod === 'invoice'
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            onClick={() => setCostCalculationMethod('invoice')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    checked={costCalculationMethod === 'invoice'}
                    onChange={() => setCostCalculationMethod('invoice')}
                    className="w-4 h-4 text-teal-600"
                  />
                  <h3 className="text-base font-bold text-gray-800">تكلفة الفاتورة (تلقائي)</h3>
                </div>
                <p className="text-sm text-gray-600 mr-6">
                  • حساب التكلفة تلقائياً من فواتير المشتريات
                </p>
                <p className="text-sm text-gray-600 mr-6">
                  • توزيع المصروفات على المنتجات بشكل نسبي
                </p>
                <p className="text-sm text-gray-600 mr-6">
                  • سيظهر في القائمة الجانبية: "تكلفة الفاتورة"
                </p>
              </div>
              {costCalculationMethod === 'invoice' && (
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-teal-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-teal-800 mb-2">ملاحظة هامة</p>
                <ul className="text-sm text-teal-700 space-y-1">
                  <li>• يمكنك التبديل بين الطريقتين في أي وقت</li>
                  <li>• بعد الحفظ، ستحتاج لإعادة تحميل الصفحة لتطبيق التغييرات</li>
                  <li>• سيظهر في القائمة الجانبية الشاشة المختارة فقط</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveCostMethod}
            disabled={isSavingCostMethod}
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {isSavingCostMethod ? 'جاري الحفظ...' : 'حفظ إعدادات حساب التكلفة'}
          </button>
        </div>
      </div>

      {/* Discount Settings Card */}
      <div className="bg-white rounded-lg shadow-sm border border-border-primary p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">إعدادات الخصومات</h2>
            <p className="text-sm text-text-secondary">التحكم في ظهور حقول الخصم في الفواتير</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-bold text-gray-800">تفعيل الخصم على المنتج</h3>
              <p className="text-xs text-gray-500 mt-1">إظهار حقول الخصم لكل صنف في الفاتورة بشكل مستقل</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableLineDiscount}
                onChange={(e) => setEnableLineDiscount(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-bold text-gray-800">تفعيل الخصم على إجمالي الفاتورة</h3>
              <p className="text-xs text-gray-500 mt-1">إتاحة إضافة خصم نهائي على المبلغ الإجمالي للفاتورة</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableInvoiceDiscount}
                onChange={(e) => setEnableInvoiceDiscount(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          <button
            onClick={handleSaveDiscountSettings}
            disabled={isSavingDiscounts}
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {isSavingDiscounts ? 'جاري الحفظ...' : 'حفظ إعدادات الخصومات'}
          </button>
        </div>
      </div>

      {/* External Stores Settings Card */}
      <div className="bg-white rounded-lg shadow-sm border border-border-primary p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">إعدادات المحلات الخارجية</h2>
            <p className="text-sm text-text-secondary">التحكم في مصادر بيانات المحلات الخارجية</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الشركة المسؤولة عن أصناف المحلات الخارجية
            </label>
            <select
              value={externalStoreCompanyId}
              onChange={(e) => setExternalStoreCompanyId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-lg"
            >
              <option value="">اختر الشركة...</option>
              {companiesResponse?.data?.companies.map(company => (
                <option key={company.id} value={company.id.toString()}>
                  {company.name} ({company.code})
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500" dir="rtl">
              📌 سيتم عرض أصناف وأسعار ومخزون هذه الشركة فقط في بوابة المحلات الخارجية وعند ربط الأصناف الجديدة.
            </p>
          </div>

          <button
            onClick={handleSaveExternalStoreSettings}
            disabled={isSavingExternalStore}
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {isSavingExternalStore ? 'جاري الحفظ...' : 'حفظ إعدادات المحلات الخارجية'}
          </button>
        </div>
      </div>

      {/* Exchange Rate Settings Card */}
      <div className="bg-white rounded-lg shadow-sm border border-border-primary p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">أسعار صرف العملات</h2>
            <p className="text-sm text-text-secondary">تحديد أسعار الصرف مقابل الدينار الليبي (LYD)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سعر صرف الدولار (USD)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none font-bold text-gray-500">
                $
              </div>
              <input
                type="number"
                value={usdRate}
                onChange={(e) => setUsdRate(e.target.value)}
                placeholder="4.80"
                step="0.01"
                min="0"
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">1 دولار أمريكي = {usdRate || '0.00'} دينار ليبي</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سعر صرف اليورو (EUR)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none font-bold text-gray-500">
                €
              </div>
              <input
                type="number"
                value={eurRate}
                onChange={(e) => setEurRate(e.target.value)}
                placeholder="5.20"
                step="0.01"
                min="0"
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">1 يورو = {eurRate || '0.00'} دينار ليبي</p>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-4 text-sm text-indigo-700">
          📍 ملاحظة: سيتم استخدام هذه الأسعار لتحويل فواتير ومصروفات المشتريات بالعملات الأجنبية إلى الدينار الليبي تلقائياً.
        </div>

        <button
          onClick={handleSaveRates}
          disabled={isSavingRates || isLoadingRates}
          className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
        >
          {isSavingRates ? 'جاري الحفظ...' : 'حفظ أسعار الصرف'}
        </button>
      </div>

      {/* WhatsApp Settings Card */}
      <div className="bg-white rounded-lg shadow-sm border border-border-primary p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">إعدادات الواتساب</h2>
            <p className="text-sm text-text-secondary">رقم الواتساب لإرسال الفواتير</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الواتساب (مع رمز الدولة)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="مثال: 218912345678"
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                dir="ltr"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              💡 أدخل رقم الواتساب مع رمز الدولة بدون علامة + (مثال: 218912345678 لليبيا)
            </p>
            <p className="mt-1 text-sm text-gray-500">
              📱 يمكنك إدخال رقم شخصي أو رقم مجموعة واتساب
            </p>
          </div>

          {whatsappNumber && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">معاينة الرقم</p>
                  <p className="text-sm text-green-700 mt-1 font-mono" dir="ltr">
                    {whatsappNumber.replace(/[^0-9]/g, '')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSaveWhatsApp}
              disabled={isSaving}
              className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isSaving ? 'جاري الحفظ...' : 'حفظ إعدادات الواتساب'}
            </button>
            <button
              onClick={handleClearWhatsApp}
              className="px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              مسح
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-800 mb-2">كيفية الاستخدام</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• بعد حفظ رقم الواتساب، سيظهر زر "إرسال على الواتساب" في شاشة المحاسب</li>
              <li>• عند الضغط على الزر، سيتم فتح الواتساب مع الفاتورة جاهزة للإرسال</li>
              <li>• يمكنك إرسال الفاتورة لأي رقم أو مجموعة واتساب</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </PermissionGuard>
  );
}

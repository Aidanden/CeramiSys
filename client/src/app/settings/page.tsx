'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [profitMargin, setProfitMargin] = useState('20');
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToast();

  // تحميل الإعدادات من localStorage عند فتح الصفحة
  useEffect(() => {
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
  }, []);

  // حفظ الإعدادات
  const handleSave = () => {
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

    setIsSaving(true);
    
    try {
      // حفظ في localStorage
      localStorage.setItem('whatsappNumber', cleanNumber);
      localStorage.setItem('lowStockThreshold', threshold.toString());
      localStorage.setItem('profitMargin', margin.toString());
      success('تم حفظ الإعدادات بنجاح');
    } catch (err) {
      error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  // مسح الإعدادات
  const handleClear = () => {
    localStorage.removeItem('whatsappNumber');
    localStorage.removeItem('lowStockThreshold');
    localStorage.removeItem('profitMargin');
    setWhatsappNumber('');
    setLowStockThreshold('10');
    setProfitMargin('20');
    success('تم مسح الإعدادات');
  };

  return (
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
        </div>
      </div>

      {/* WhatsApp Settings Card */}
      <div className="bg-white rounded-lg shadow-sm border border-border-primary p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
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
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
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
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
            <button
              onClick={handleClear}
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
  );
}

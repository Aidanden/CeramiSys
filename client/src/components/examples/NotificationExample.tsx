/**
 * مثال على استخدام نظام الإشعارات المحسن
 * Example of using the enhanced notification system
 */

'use client';

import React from 'react';
import useNotifications from '@/hooks/useNotifications';

const NotificationExample = () => {
  const notifications = useNotifications();

  const handleProductCreate = () => {
    // محاكاة إنشاء منتج بنجاح
    notifications.products.createSuccess('بلاط سيراميك أبيض 60×60');
  };

  const handleProductError = () => {
    // محاكاة خطأ في إنشاء منتج
    notifications.products.createError('رمز المنتج موجود مسبقاً');
  };

  const handleSaleSuccess = () => {
    // محاكاة إنشاء فاتورة مبيعات بنجاح
    notifications.sales.createSuccess('INV-001', 1250.50);
  };

  const handleStockUpdate = () => {
    // محاكاة تحديث مخزون
    notifications.products.stockUpdateSuccess('بلاط سيراميك أبيض', 100);
  };

  const handleValidationError = () => {
    // محاكاة خطأ في التحقق من البيانات
    notifications.general.validationError('اسم المنتج');
  };

  const handleNetworkError = () => {
    // محاكاة خطأ في الشبكة
    notifications.general.networkError();
  };

  const handleCustomNotification = () => {
    // إشعار مخصص
    notifications.custom.success(
      '🎉 تهانينا!', 
      'تم تحقيق هدف المبيعات الشهري'
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto" dir="rtl">
      <h2 className="text-2xl font-bold mb-6 text-center">
        🔔 أمثلة على نظام الإشعارات المحسن
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* إشعارات المنتجات */}
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-semibold mb-3 text-blue-600">📦 إشعارات المنتجات</h3>
          <div className="space-y-2">
            <button
              onClick={handleProductCreate}
              className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              ✅ إنشاء منتج بنجاح
            </button>
            <button
              onClick={handleProductError}
              className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              ❌ خطأ في إنشاء منتج
            </button>
            <button
              onClick={handleStockUpdate}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              📈 تحديث مخزون
            </button>
          </div>
        </div>

        {/* إشعارات المبيعات */}
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-semibold mb-3 text-green-600">💰 إشعارات المبيعات</h3>
          <div className="space-y-2">
            <button
              onClick={handleSaleSuccess}
              className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              ✅ إنشاء فاتورة مبيعات
            </button>
          </div>
        </div>

        {/* إشعارات عامة */}
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-semibold mb-3 text-orange-600">⚠️ إشعارات عامة</h3>
          <div className="space-y-2">
            <button
              onClick={handleValidationError}
              className="w-full px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
            >
              ⚠️ خطأ في التحقق
            </button>
            <button
              onClick={handleNetworkError}
              className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              🌐 خطأ في الشبكة
            </button>
          </div>
        </div>

        {/* إشعارات مخصصة */}
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-semibold mb-3 text-purple-600">🎨 إشعارات مخصصة</h3>
          <div className="space-y-2">
            <button
              onClick={handleCustomNotification}
              className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
            >
              🎉 إشعار مخصص
            </button>
          </div>
        </div>
      </div>

      {/* معلومات الاستخدام */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">📚 كيفية الاستخدام:</h3>
        <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`// استيراد Hook
import useNotifications from '@/hooks/useNotifications';

// في المكون
const notifications = useNotifications();

// استخدام الإشعارات
notifications.products.createSuccess('اسم المنتج');
notifications.sales.createError('رسالة الخطأ');
notifications.general.validationError('اسم الحقل');`}
        </pre>
      </div>
    </div>
  );
};

export default NotificationExample;

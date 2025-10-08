'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux';

export default function TestProvisionalSales() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const token = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/provisional-sales?page=1&limit=10', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.message || 'Unknown error'}`);
      }

      setTestResult(data);
    } catch (err: any) {
      console.error('API Test Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTestSale = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const testSaleData = {
        companyId: user?.companyId || 1,
        customerId: null, // عميل نقدي
        invoiceNumber: `TEST-${Date.now()}`,
        saleType: "CASH",
        paymentMethod: "CASH",
        status: "DRAFT",
        subtotal: 100.00,
        taxAmount: 0.00,
        discountAmount: 0.00,
        total: 100.00,
        notes: "فاتورة اختبار من الواجهة الأمامية",
        lines: [
          {
            productId: 1,
            qty: 10.0,
            unitPrice: 10.00,
            subTotal: 100.00
          }
        ]
      };

      const response = await fetch('/api/provisional-sales', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testSaleData)
      });

      const data = await response.json();
      console.log('Create Response:', data);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.message || 'Unknown error'}`);
      }

      setTestResult({ message: 'تم إنشاء فاتورة اختبار بنجاح!', data });
      
      // إعادة اختبار الـ API للتأكد من إضافة البيانات
      setTimeout(testAPI, 1000);
      
    } catch (err: any) {
      console.error('Create Test Sale Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Test Page Debug:', {
      token: token ? 'exists' : 'null',
      user: user ? 'exists' : 'null',
      userCompanyId: user?.companyId,
      isSystemUser: user?.isSystemUser
    });
  }, [token, user]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">اختبار API الفواتير المبدئية</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h2 className="text-lg font-semibold mb-4">معلومات المستخدم</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Token:</strong> {token ? 'موجود' : 'غير موجود'}</p>
          <p><strong>User:</strong> {user ? 'موجود' : 'غير موجود'}</p>
          {user && (
            <>
              <p><strong>اسم المستخدم:</strong> {user.username}</p>
              <p><strong>معرف الشركة:</strong> {user.companyId}</p>
              <p><strong>مستخدم نظام:</strong> {user.isSystemUser ? 'نعم' : 'لا'}</p>
            </>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex gap-4">
          <button
            onClick={testAPI}
            disabled={loading || !token}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
          >
            {loading ? 'جاري الاختبار...' : 'اختبار قراءة البيانات'}
          </button>
          
          <button
            onClick={createTestSale}
            disabled={loading || !token}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء فاتورة اختبار'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-medium">خطأ</h3>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      {testResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-green-800 font-medium mb-2">نتيجة الاختبار</h3>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

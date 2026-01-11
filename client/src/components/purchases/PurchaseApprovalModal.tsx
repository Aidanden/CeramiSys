'use client';

import React from 'react';
import { useApprovePurchaseMutation } from '@/state/api/purchaseExpenseApi';
import { Purchase } from '@/state/purchaseApi';
import { useToast } from '@/components/ui/Toast';

interface PurchaseApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchase: Purchase | null;
}

export default function PurchaseApprovalModal({
  isOpen,
  onClose,
  onSuccess,
  purchase,
}: PurchaseApprovalModalProps) {
  const { success, error: showError } = useToast();
  const [approvePurchase, { isLoading: isApproving }] = useApprovePurchaseMutation();

  const handleSubmit = async () => {
    if (!purchase) return;

    try {
      const result = await approvePurchase({
        purchaseId: purchase.id,
        expenses: [] // اعتماد الفاتورة بدون مصروفات
      }).unwrap();

      success('تم الاعتماد', result.message || 'تم اعتماد فاتورة المشتريات بنجاح');
      onSuccess();
      onClose();
    } catch (err: any) {
      showError('خطأ', err.message || 'حدث خطأ أثناء اعتماد الفاتورة');
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen || !purchase) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">اعتماد فاتورة المشتريات</h2>
              <p className="text-gray-600 mt-1">تأكيد اعتماد الفاتورة</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Purchase Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">ملخص الفاتورة</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-blue-600">رقم الفاتورة</p>
                <p className="font-semibold text-blue-800">#{purchase.id}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600">المجموع</p>
                <p className="font-semibold text-green-700">
                  {purchase.total.toFixed(2)} {purchase.currency}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-600">عدد الأصناف</p>
                <p className="font-semibold text-blue-800">{purchase.lines.length} صنف</p>
              </div>
            </div>
            {purchase.currency !== 'LYD' && (
              <p className="text-xs text-blue-600 mt-2">
                💡 سيتم تحديد سعر الصرف عند الدفع الفعلي
              </p>
            )}
          </div>

          {/* Products List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">أصناف الفاتورة</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {purchase.lines.map((line) => (
                  <div key={line.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                    <div>
                      <span className="font-medium">{line.product?.name || 'منتج غير محدد'}</span>
                      <span className="text-gray-500 mr-2">({line.product?.sku || 'غير محدد'})</span>
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{line.qty} × {line.unitPrice.toFixed(2)} = {line.subTotal.toFixed(2)} {purchase.currency}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">ℹ️</div>
              <div>
                <h4 className="font-semibold text-yellow-800 mb-1">ملاحظة</h4>
                <p className="text-sm text-yellow-700">
                  عند اعتماد الفاتورة، سيتم تحديث المخزون وإنشاء إيصال دفع إذا كانت الفاتورة آجلة.
                  يمكنك إضافة المصروفات لاحقاً من خلال زر "إضافة مصروف".
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={isApproving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApproving ? 'جاري الاعتماد...' : 'اعتماد الفاتورة'}
          </button>
        </div>
      </div>
    </div>
  );
}

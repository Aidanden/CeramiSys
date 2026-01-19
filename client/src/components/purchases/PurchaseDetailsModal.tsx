"use client";

import React from 'react';
import { Purchase } from '@/state/purchaseApi';
import { formatArabicCurrency } from '@/utils/formatArabicNumbers';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
}

const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  isOpen,
  onClose,
  purchase
}) => {
  if (!isOpen || !purchase) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              تفاصيل فاتورة المشتريات #{purchase.invoiceNumber || purchase.id}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Purchase Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-3">معلومات الفاتورة</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">رقم الفاتورة:</span>
                  <p className="text-sm text-gray-900">{purchase.invoiceNumber || `#${purchase.id}`}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">المورد:</span>
                  <p className="text-sm text-gray-900">{purchase.supplier?.name || 'غير محدد'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">نوع الشراء:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    purchase.purchaseType === 'CASH' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {purchase.purchaseType === 'CASH' ? 'نقدي' : 'آجل'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">طريقة الدفع:</span>
                  <p className="text-sm text-gray-900">
                    {purchase.paymentMethod ? 
                      (purchase.paymentMethod === 'CASH' ? 'نقد' : 
                       purchase.paymentMethod === 'BANK' ? 'بنك' : 'بطاقة') 
                      : 'غير محدد'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">التاريخ:</span>
                  <p className="text-sm text-gray-900">
                    {new Date(purchase.createdAt).toLocaleDateString('ar-LY')}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">حالة السداد:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    purchase.isFullyPaid 
                      ? 'bg-green-100 text-green-800' 
                      : purchase.paidAmount > 0
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {purchase.isFullyPaid ? 'مدفوع' : purchase.paidAmount > 0 ? 'مدفوع جزئياً' : 'غير مدفوع'}
                  </span>
                </div>
              </div>
            </div>

            {/* Purchase Lines */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">أصناف المشتريات</h4>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        الصنف
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        الكمية
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        سعر الوحدة
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        المجموع
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchase.lines.map((line, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 border-b">
                          <div>
                            <div className="font-medium">{line.product?.name || 'غير محدد'}</div>
                            <div className="text-gray-500 text-xs">{line.product?.sku || ''}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 border-b">
                          {line.qty} {line.product?.unit || 'وحدة'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 border-b">
                          {formatArabicCurrency(line.unitPrice)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 border-b">
                          <span className="font-semibold text-green-600">
                            {formatArabicCurrency(line.subTotal)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-3">ملخص المدفوعات</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-500">المجموع الكلي</span>
                  <p className="text-lg font-bold text-gray-900">
                    {formatArabicCurrency(purchase.total)}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-500">المبلغ المدفوع</span>
                  <p className="text-lg font-bold text-blue-600">
                    {formatArabicCurrency(purchase.paidAmount)}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-500">المبلغ المتبقي</span>
                  <p className="text-lg font-bold text-red-600">
                    {formatArabicCurrency(purchase.remainingAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {purchase.payments && purchase.payments.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">تاريخ المدفوعات</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          رقم الإيصال
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          المبلغ
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          طريقة الدفع
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          تاريخ الدفع
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          ملاحظات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {purchase.payments.map((payment, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900 border-b">
                            {payment.receiptNumber || `#${payment.id}`}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 border-b">
                            <span className="font-semibold text-green-600">
                              {formatArabicCurrency(payment.amount)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 border-b">
                            {payment.paymentMethod === 'CASH' ? 'نقد' : 
                             payment.paymentMethod === 'BANK' ? 'بنك' : 'بطاقة'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 border-b">
                            {new Date(payment.paymentDate).toLocaleDateString('ar-LY')}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 border-b">
                            {payment.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetailsModal;

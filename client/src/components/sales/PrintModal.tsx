/**
 * مكون مودال الطباعة
 * Print Modal Component
 */

import React, { useRef } from 'react';
import { Sale } from '@/state/salesApi';
import { InvoicePrint } from './InvoicePrint';

interface PrintModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  enableLineDiscount?: boolean;
  enableInvoiceDiscount?: boolean;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  sale,
  isOpen,
  onClose,
  enableLineDiscount = true,
  enableInvoiceDiscount = true
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current || !sale) return;

    // إنشاء نافذة جديدة للطباعة
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
      return;
    }

    // الحصول على محتوى الطباعة
    const printContent = printRef.current.innerHTML;

    // كتابة المحتوى في النافذة الجديدة
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>طباعة فاتورة ${sale?.invoiceNumber || sale?.id || 'فاتورة'}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            direction: rtl;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .print-invoice,
            .print-receipt {
              page-break-after: always;
            }
          }
          @page {
            size: A4;
            margin: 0;
          }
        </style>
      </head>
      <body>
        ${printContent}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (!isOpen || !sale) return null;

  const isCashSale = sale.saleType === 'CASH';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">
              🖨️ معاينة الطباعة
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* معلومات الطباعة */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900 mb-1">سيتم طباعة:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✓ فاتورة المبيعات مع تفاصيل الأصناف والأمتار</li>
                    {isCashSale && (
                      <li className="text-amber-600">ℹ️ إيصال القبض يتم إصداره من شاشة المحاسب</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <div
                ref={printRef}
                className="bg-white"
                style={{
                  transform: 'scale(0.5)',
                  transformOrigin: 'top center',
                  width: '200%',
                  margin: '0 auto'
                }}
              >
                {/* الفاتورة فقط - إيصال القبض يتم إصداره من شاشة المحاسب */}
                <InvoicePrint
                  sale={sale}
                  enableLineDiscount={enableLineDiscount}
                  enableInvoiceDiscount={enableInvoiceDiscount}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              إلغاء
            </button>
            <button
              onClick={() => handlePrint()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              طباعة
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

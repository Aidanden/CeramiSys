/**
 * مكون مودال طباعة فاتورة المحل
 * Store Print Modal Component
 */

import React, { useRef } from 'react';
import { StoreInvoicePrint } from './StoreInvoicePrint';

interface StorePrintModalProps {
    invoice: any;
    storeInfo: any;
    isOpen: boolean;
    onClose: () => void;
}

export const StorePrintModal: React.FC<StorePrintModalProps> = ({
    invoice,
    storeInfo,
    isOpen,
    onClose
}) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (!printRef.current || !invoice) return;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            alert('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
            return;
        }

        const printContent = printRef.current.innerHTML;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>طباعة طلب #${invoice.invoiceNumber || invoice.id}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        direction: rtl;
                        background: white;
                    }
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        .print-invoice {
                            page-break-after: always;
                            box-shadow: none !important;
                            border: none !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            padding: 10mm !important;
                        }
                    }
                    @page {
                        size: A4;
                        margin: 10mm;
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

    if (!isOpen || !invoice) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col font-sans border border-slate-200 dark:border-gray-700 overflow-hidden max-h-[95vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="bg-white/20 p-2 rounded-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                        </span>
                        <div>
                            <h2 className="text-xl font-bold leading-none">معاينة الطباعة</h2>
                            <p className="text-blue-100 text-xs mt-1">طلب توريد بضاعة #{invoice.invoiceNumber || invoice.id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-100 dark:bg-gray-900 custom-scrollbar">
                    {/* Print Preview Container */}
                    <div className="mx-auto bg-white shadow-lg border border-gray-200 rounded-sm origin-top transform scale-[0.6] sm:scale-[0.7] md:scale-[0.85] lg:scale-100 mb-8" style={{ width: '210mm' }}>
                        <div ref={printRef}>
                            <StoreInvoicePrint
                                invoice={invoice}
                                storeInfo={storeInfo}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all font-medium shadow-sm hover:shadow active:scale-95"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        طباعة الآن
                    </button>
                </div>
            </div>
        </div>
    );
};

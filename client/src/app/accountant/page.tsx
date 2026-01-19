'use client';

import React, { useState, useRef } from 'react';
import { useGetSalesQuery, useGetCashSalesQuery, useIssueReceiptMutation, useApproveSaleMutation, useUpdateSaleMutation, Sale, salesApi } from '@/state/salesApi';
import { useCreateDispatchOrderMutation } from '@/state/warehouseApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { useGetProductsQuery } from '@/state/productsApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useGetTreasuriesQuery } from '@/state/treasuryApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux';
import { useToast } from '@/components/ui/Toast';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';
import { InvoicePrint } from '@/components/sales/InvoicePrint';
import { ReceiptPrint } from '@/components/sales/ReceiptPrint';
import { CreditPaymentReceiptPrint } from '@/components/sales/CreditPaymentReceiptPrint';
import { PaymentsHistoryPrint } from '@/components/sales/PaymentsHistoryPrint';
import {
  useGetCreditSalesStatsQuery,
  useCreatePaymentMutation,
  useDeletePaymentMutation,
  SalePayment
} from '@/state/salePaymentApi';
import { Search, Filter, X, DollarSign, FileText, Edit3, Plus, Package, Trash2, AlertTriangle, Save } from 'lucide-react';
import { useDispatch } from 'react-redux';
import html2canvas from 'html2canvas';
import { useEffect } from 'react';

export default function AccountantWorkspace() {
  // Tab state - الشركة النشطة
  const [activeCompanyId, setActiveCompanyId] = useState<number>(1);
  const dispatch = useDispatch();

  // States موحدة
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'issued' | 'pending'>('all');
  const [selectedCreditSale, setSelectedCreditSale] = useState<Sale | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<SalePayment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrintReceiptModal, setShowPrintReceiptModal] = useState(false);
  const [showPrintHistoryModal, setShowPrintHistoryModal] = useState(false);

  // States for sale approval
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [saleToApprove, setSaleToApprove] = useState<Sale | null>(null);

  // States for sale editing
  const [showEditModal, setShowEditModal] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  const [editLines, setEditLines] = useState<Array<{
    productId: number;
    qty: number;
    unitPrice: number;
  }>>([]);

  // تعيين تاريخ اليوم كـ default
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  // الوضع الافتراضي: عرض جميع الفواتير (بدون فلتر تاريخ)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [issuedReceipts, setIssuedReceipts] = useState<Set<number>>(new Set());
  const [currentInvoiceToPrint, setCurrentInvoiceToPrint] = useState<Sale | null>(null);
  const [currentSaleToPrint, setCurrentSaleToPrint] = useState<Sale | null>(null);
  const [currentSaleForWhatsApp, setCurrentSaleForWhatsApp] = useState<Sale | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const invoicePrintRef = useRef<HTMLDivElement>(null);
  const whatsappRef = useRef<HTMLDivElement>(null);
  const historyPrintRef = useRef<HTMLDivElement>(null);
  const creditReceiptRef = useRef<HTMLDivElement>(null);
  const { data: userData } = useGetCurrentUserQuery();
  const user = userData?.data;
  const { success, error: showError } = useToast();

  // تحديد قيمة receiptIssued حسب الفلتر
  const getReceiptIssuedFilter = () => {
    if (receiptFilter === 'issued') return true;
    if (receiptFilter === 'pending') return false;
    return undefined; // all
  };

  const {
    data: salesData,
    isLoading,
    isFetching,
    refetch
  } = useGetSalesQuery(
    {
      page: currentPage,
      limit: 10,
      search: searchTerm || undefined,
      companyId: activeCompanyId, // 
      receiptIssued: getReceiptIssuedFilter(),
      startDate: startDate || undefined,
      endDate: endDate || undefined
    },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true
    }
  );

  // حساب الإحصائيات من البيانات الرئيسية (بدون queries إضافية)
  // سيتم حساب الإحصائيات من salesData.pagination.total

  const [issueReceipt, { isLoading: isIssuing }] = useIssueReceiptMutation();
  const [createDispatchOrder, { isLoading: isCreatingDispatch }] = useCreateDispatchOrderMutation();
  const [approveSale, { isLoading: isApproving }] = useApproveSaleMutation();
  const [updateSale, { isLoading: isUpdating }] = useUpdateSaleMutation();

  // Credit sales API calls (استخدام نفس endpoint مع فلتر الشركة)
  // بما أن جميع الفواتير آجلة الآن، نستخدم salesData مباشرة
  const { data: creditStatsData } = useGetCreditSalesStatsQuery();
  const [createPayment, { isLoading: isCreatingPayment }] = useCreatePaymentMutation();
  const [deletePayment] = useDeletePaymentMutation();
  const { data: companiesData } = useGetCompaniesQuery({ limit: 100 });
  // تحميل الحسابات المصرفية (جميع الحسابات المصرفية النشطة)
  const { data: treasuriesData, isLoading: isTreasuriesLoading, error: treasuriesError } = useGetTreasuriesQuery({ type: 'BANK', isActive: true });
  const bankAccounts = Array.isArray(treasuriesData) ? treasuriesData : [];

  // Debug: تتبع بيانات الحسابات المصرفية
  console.log('Treasury Debug:', { treasuriesData, bankAccounts, activeCompanyId, isTreasuriesLoading, treasuriesError });

  // تحميل المنتجات فقط عند فتح مودال التعديل
  const { data: productsData } = useGetProductsQuery(
    { limit: 500 },
    { skip: !showEditModal }
  );

  /**
   * طباعة الفاتورة - Print Invoice
   * يستخدم React component بدلاً من HTML string
   */
  const printReceipt = (sale: Sale) => {
    setCurrentSaleToPrint(sale);

    // الانتظار حتى يتم render المكون
    setTimeout(() => {
      if (!printRef.current) {
        showError('فشل في تحميل الإيصال');
        setCurrentSaleToPrint(null);
        return;
      }

      // فتح نافذة الطباعة
      const printWindow = window.open('', '_blank', 'width=800,height=900');
      if (!printWindow) {
        showError('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
        setCurrentSaleToPrint(null);
        return;
      }

      // بناء محتوى HTML مع الأنماط
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>إيصال قبض - ${sale.invoiceNumber || sale.id}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', 'Segoe UI', Tahoma, sans-serif;
              direction: rtl;
              background: white;
              color: #000;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              
              .no-print {
                display: none !important;
              }
              
              @page {
                size: A4;
                margin: 10mm;
              }
            }
            
            /* تنسيق الطباعة */
            .print-receipt {
              width: 100%;
              max-width: 210mm;
              margin: 0 auto;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <div id="print-container">${printRef.current.innerHTML}</div>
          
          <script>
            // الطباعة التلقائية عند تحميل الصفحة
            window.onload = function() {
              // تأخير بسيط للتأكد من تحميل الأنماط
              setTimeout(() => {
              window.print();
              }, 300);
            };
            
            // إغلاق النافذة بعد الطباعة أو الإلغاء
              window.onafterprint = function() {
              setTimeout(() => {
                window.close();
              }, 100);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // تنظيف state بعد فترة
      setTimeout(() => {
        setCurrentSaleToPrint(null);
      }, 1000);
    }, 200);
  };

  /**
   * طباعة الفاتورة - Print Invoice
   */
  const printInvoice = (sale: Sale) => {
    setCurrentInvoiceToPrint(sale);

    setTimeout(() => {
      if (!invoicePrintRef.current) {
        showError('فشل في تحميل الفاتورة');
        setCurrentInvoiceToPrint(null);
        return;
      }

      const printWindow = window.open('', '_blank', 'width=800,height=950');
      if (!printWindow) {
        showError('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
        setCurrentInvoiceToPrint(null);
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>فاتورة مبيعات - ${sale.invoiceNumber || sale.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', 'Segoe UI', Tahoma, sans-serif; direction: rtl; }
            @page { size: A4; margin: 10mm; }
          </style>
        </head>
        <body>
          <div id="print-invoice-container">${invoicePrintRef.current.innerHTML}</div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 300);
            };
            window.onafterprint = function() {
              setTimeout(() => {
                window.close();
              }, 100);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      setTimeout(() => {
        setCurrentInvoiceToPrint(null);
      }, 1000);
    }, 200);
  };

  const [paymentMethodForReceipt, setPaymentMethodForReceipt] = useState<"CASH" | "BANK" | "CARD">("CASH");
  const [bankAccountIdForReceipt, setBankAccountIdForReceipt] = useState<number | "">("");

  const handleIssueReceipt = async (sale: Sale) => {
    if (sale.receiptIssued) {
      showError('تم إصدار إيصال قبض لهذه الفاتورة مسبقاً');
      return;
    }

    try {
      await issueReceipt(sale.id).unwrap();
      setIssuedReceipts(prev => new Set(prev).add(sale.id));
      success(`تم إصدار إيصال القبض للفاتورة ${sale.invoiceNumber || sale.id}`);
      printReceipt({ ...sale, receiptIssued: true });

      // إعادة جلب جميع البيانات بعد إصدار الإيصال
      setTimeout(() => {
        refetch();


      }, 500);
    } catch (err: any) {
      console.error('Payment error:', err);
      showError(err?.data?.message || 'حدث خطأ أثناء إنشاء إيصال القبض');
    }
  };

  const handleCreateDispatchOrder = async (sale: Sale) => {
    try {
      console.log('🔄 بدء عملية إصدار أمر الصرف...');
      console.log('📋 بيانات الفاتورة:', {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        status: sale.status,
        isAutoGenerated: sale.isAutoGenerated,
        companyId: sale.companyId,
        company: sale.company?.name
      });

      // التحقق: لا يمكن إصدار أمر صرف للفواتير التلقائية
      if (sale.isAutoGenerated) {
        showError('لا يمكن إصدار أمر صرف للفواتير التلقائية');
        return;
      }

      // إذا كانت الفاتورة مبدئية (DRAFT)، نعتمدها أولاً كآجلة
      if (sale.status === 'DRAFT') {
        console.log('📝 الفاتورة مبدئية، جاري اعتمادها كآجلة...');

        try {
          const approveResult = await approveSale({
            id: sale.id,
            saleType: 'CREDIT',
            paymentMethod: undefined
          }).unwrap();

          console.log('✅ تم اعتماد الفاتورة كآجلة بنجاح:', approveResult);
        } catch (approveErr: any) {
          console.error('❌ خطأ في اعتماد الفاتورة:', approveErr);

          // التحقق من نوع الخطأ
          const errorMessage = approveErr?.data?.message || approveErr?.message || '';
          console.error('رسالة الخطأ:', errorMessage);

          // إذا كانت الفاتورة معتمدة بالفعل، نتخطى الاعتماد ونكمل لإنشاء أمر الصرف
          if (errorMessage.includes('معتمدة بالفعل')) {
            console.log('ℹ️ الفاتورة معتمدة بالفعل، الانتقال لإنشاء أمر الصرف...');
            // لا نرجع هنا، بل نكمل لإنشاء أمر الصرف
          } else {
            // خطأ حقيقي في الاعتماد
            showError(errorMessage || 'فشل اعتماد الفاتورة. تأكد من توفر المخزون في هذه الشركة.');
            return;
          }
        }
      } else if (sale.status !== 'APPROVED') {
        showError(`لا يمكن إصدار أمر صرف لفاتورة بحالة: ${sale.status}`);
        return;
      }

      // إنشاء أمر الصرف (الفاتورة الآن معتمدة)
      console.log('📦 جاري إنشاء أمر الصرف...');
      try {
        const dispatchResult = await createDispatchOrder({ saleId: sale.id }).unwrap();
        console.log('✅ تم إنشاء أمر الصرف بنجاح:', dispatchResult);

        success(
          sale.status === 'DRAFT'
            ? `تم اعتماد الفاتورة وإصدار أمر صرف للفاتورة ${sale.invoiceNumber || sale.id}`
            : `تم إنشاء أمر صرف للفاتورة ${sale.invoiceNumber || sale.id}`
        );
      } catch (dispatchErr: any) {
        console.error('❌ خطأ في إنشاء أمر الصرف:', dispatchErr);

        const errorMsg = dispatchErr?.data?.message || dispatchErr?.message || 'فشل إنشاء أمر الصرف';
        showError(errorMsg);
        return;
      }

      // تحديث البيانات
      console.log('🔄 جاري تحديث البيانات...');
      await refetch();
      console.log('✅ تم تحديث البيانات بنجاح');

    } catch (err: any) {
      console.error('❌ خطأ عام غير متوقع:', err);
      showError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    }
  };

  // دالة إرسال الفاتورة على الواتساب (مع صورة)
  const handleSendWhatsApp = async (sale: Sale) => {
    // الحصول على رقم الواتساب من localStorage
    const whatsappNumber = localStorage.getItem('whatsappNumber');

    if (!whatsappNumber) {
      showError('يرجى تحديد رقم الواتساب من صفحة الإعدادات أولاً');
      return;
    }

    try {
      // عرض رسالة تحميل
      success('جاري تحضير الفاتورة...');

      // عرض الفاتورة للواتساب
      setCurrentSaleForWhatsApp(sale);

      // الانتظار حتى يتم render العنصر
      await new Promise(resolve => setTimeout(resolve, 1500));

      // الحصول على عنصر الفاتورة
      const invoiceElement = whatsappRef.current;

      if (!invoiceElement) {
        showError('فشل في تحميل الفاتورة');
        setCurrentSaleForWhatsApp(null);
        return;
      }

      await captureAndSend(invoiceElement, sale, whatsappNumber);

    } catch (err: any) {
      console.error('خطأ في إنشاء صورة الفاتورة:', err);
      showError(`حدث خطأ: ${err.message || 'غير معروف'}`);
      setCurrentSaleForWhatsApp(null);
    }
  };

  // دالة مساعدة لالتقاط وإرسال الصورة
  const captureAndSend = async (element: HTMLElement, sale: Sale, whatsappNumber: string) => {
    try {
      // تحويل الفاتورة إلى صورة
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      // تحويل Canvas إلى Blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showError('فشل في إنشاء الصورة');
          setCurrentSaleForWhatsApp(null);
          return;
        }

        // إنشاء رسالة تفاصيل الفاتورة
        const invoiceNumber = sale.invoiceNumber || `${sale.id}`;
        const customerName = sale.customer?.name || 'عميل نقدي';
        const companyName = sale.company?.name || '';
        const total = sale.total.toFixed(2);
        const date = new Date(sale.createdAt).toLocaleDateString('ar-LY');

        // تفاصيل الأصناف
        const itemsText = sale.lines?.map((line, index) => {
          const productName = line.product?.name || 'صنف';
          const qty = line.qty;
          const unit = line.product?.unit || 'وحدة';
          const unitPrice = line.unitPrice.toFixed(2);
          const subtotal = line.subTotal.toFixed(2);
          return `${index + 1}. *${productName}*\n   الكمية: ${qty} ${unit}\n   السعر: ${unitPrice} د.ل\n   المجموع: ${subtotal} د.ل`;
        }).join('\n\n') || '';

        const message = `
🧾 *فاتورة رقم: ${invoiceNumber}*
━━━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${customerName}
🏢 *الشركة:* ${companyName}
📅 *التاريخ:* ${date}
━━━━━━━━━━━━━━━━━━━━

📦 *تفاصيل الأصناف:*

${itemsText}

━━━━━━━━━━━━━━━━━━━━
💰 *الإجمالي:* ${total} د.ل
━━━━━━━━━━━━━━━━━━━━

✅ تم إصدار إيصال القبض

شكراً لتعاملكم معنا 🙏
        `.trim();

        try {
          // نسخ الصورة إلى الحافظة (Clipboard)
          const clipboardItem = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([clipboardItem]);

          // أيضاً تحميل الصورة كنسخة احتياطية
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `فاتورة_${invoiceNumber}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);

          // فتح الواتساب مع الرسالة
          const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');

          success('✅ تم نسخ صورة الفاتورة! اضغط Ctrl+V في الواتساب للصق الصورة وإرسالها.');

          // إخفاء الفاتورة بعد التحويل
          setTimeout(() => setCurrentSaleForWhatsApp(null), 1000);
        } catch (clipboardErr) {
          // إذا فشل النسخ إلى الحافظة، نكمل بالطريقة العادية
          console.warn('فشل النسخ إلى الحافظة:', clipboardErr);

          // تحميل الصورة
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `فاتورة_${invoiceNumber}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);

          // فتح الواتساب مع الرسالة
          const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');

          success('تم تحميل صورة الفاتورة وفتح الواتساب. يرجى إرفاق الصورة المحملة وإرسالها.');

          setTimeout(() => setCurrentSaleForWhatsApp(null), 1000);
        }
      }, 'image/png');
    } catch (err: any) {
      throw err;
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: 'all' | 'issued' | 'pending') => {
    setReceiptFilter(filter);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setReceiptFilter('pending');
    setStartDate(getTodayDate());
    setEndDate(getTodayDate());
    setCurrentPage(1);
  };

  // Handle sale approval
  const handleApproveSale = (sale: Sale) => {
    setSaleToApprove(sale);
    setShowApprovalModal(true);
  };

  const handleApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToApprove) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const saleType = formData.get('saleType') as "CASH" | "CREDIT";
    const paymentMethod = formData.get('paymentMethod') as "CASH" | "BANK" | "CARD" | undefined;
    const bankAccountId = formData.get('bankAccountId') as string | null;

    if (!saleType) {
      showError('يرجى اختيار نوع البيع');
      return;
    }

    if (saleType === 'CASH' && !paymentMethod) {
      showError('يرجى اختيار طريقة الدفع للبيع النقدي');
      return;
    }

    // التحقق من اختيار الحساب المصرفي عند الدفع بالبطاقة أو الحوالة
    if (saleType === 'CASH' && (paymentMethod === 'BANK' || paymentMethod === 'CARD') && !bankAccountId) {
      showError('يرجى اختيار الحساب المصرفي');
      return;
    }

    try {
      const result = await approveSale({
        id: saleToApprove.id,
        saleType,
        paymentMethod: saleType === 'CASH' ? paymentMethod : undefined,
        bankAccountId: bankAccountId ? Number(bankAccountId) : undefined
      }).unwrap();

      success(`تم اعتماد الفاتورة ${saleToApprove.invoiceNumber || saleToApprove.id} وخصم المخزون بنجاح`);

      // إذا كانت الفاتورة نقدية: إصدار الإيصال يتم تلقائياً من الخادم عند الاعتماد
      // هنا نقوم بالطباعة مباشرة وإظهار زر إعادة الطباعة فوراً
      if (saleType === 'CASH' && result?.data) {
        setIssuedReceipts(prev => new Set(prev).add(result.data.id));
        printReceipt({ ...result.data, receiptIssued: true } as any);
      }

      setShowApprovalModal(false);
      setSaleToApprove(null);

      // Refresh data
      refetch();


    } catch (err: any) {
      showError(err?.data?.message || 'حدث خطأ أثناء اعتماد الفاتورة');
    }
  };

  // Handle sale editing
  const handleEditSale = (sale: Sale) => {
    setSaleToEdit(sale);
    // تحميل الأسطر الحالية
    setEditLines(sale.lines.map(line => ({
      productId: line.productId,
      qty: Number(line.qty),
      unitPrice: Number(line.unitPrice)
    })));
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToEdit) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const customerId = formData.get('customerId') ? Number(formData.get('customerId')) : undefined;
    const invoiceNumber = formData.get('invoiceNumber') as string;

    // التحقق من وجود أسطر
    if (editLines.length === 0) {
      showError('يجب إضافة صنف واحد على الأقل');
      return;
    }

    // التحقق من صحة البيانات
    for (const line of editLines) {
      if (!line.productId || line.qty <= 0 || line.unitPrice <= 0) {
        showError('يرجى التأكد من صحة بيانات جميع الأصناف');
        return;
      }
    }

    try {
      await updateSale({
        id: saleToEdit.id,
        data: {
          customerId,
          invoiceNumber: invoiceNumber || undefined,
          lines: editLines
        }
      }).unwrap();

      success(`تم تعديل الفاتورة ${saleToEdit.invoiceNumber || saleToEdit.id} بنجاح`);
      setShowEditModal(false);
      setSaleToEdit(null);
      setEditLines([]);

      // Refresh data
      refetch();


    } catch (err: any) {
      showError(err?.data?.message || 'حدث خطأ أثناء تعديل الفاتورة');
    }
  };

  // دوال إدارة الأسطر في التعديل
  const addEditLine = () => {
    setEditLines(prev => [...prev, { productId: 0, qty: 1, unitPrice: 0 }]);
  };

  const removeEditLine = (index: number) => {
    setEditLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateEditLine = (index: number, field: 'productId' | 'qty' | 'unitPrice', value: number) => {
    setEditLines(prev => prev.map((line, i) =>
      i === index ? { ...line, [field]: value } : line
    ));
  };

  // دالة لتحديث السعر من السعر/متر
  const updatePriceFromUnitPrice = (index: number, pricePerUnit: number) => {
    const product = productsData?.data?.products?.find(p => p.id === editLines[index].productId);
    const unitsPerBox = product?.unitsPerBox ? Number(product.unitsPerBox) : 1;
    const totalPrice = pricePerUnit * unitsPerBox;
    updateEditLine(index, 'unitPrice', totalPrice);
  };

  // Credit sales functions
  const userFromRedux = useSelector((state: RootState) => state.auth.user);

  // Auto-select company for non-system users
  useEffect(() => {
    if (userFromRedux && !userFromRedux.isSystemUser && userFromRedux.companyId) {
      setActiveCompanyId(userFromRedux.companyId);
    }
  }, [userFromRedux]);

  // إعادة التحميل عند تغيير الشركة النشطة
  useEffect(() => {
    console.log('🔄 تغيير الشركة النشطة:', activeCompanyId);
    refetch();


    setCurrentPage(1); // إعادة تعيين الصفحة للأولى
  }, [activeCompanyId]);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreditSale) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const amount = Number(formData.get('amount'));
    const paymentMethod = formData.get('paymentMethod') as "CASH" | "BANK" | "CARD";
    const bankAccountIdRaw = formData.get('bankAccountId') as string | null;
    const bankAccountId = bankAccountIdRaw ? Number(bankAccountIdRaw) : undefined;
    const notes = formData.get('notes') as string;

    const remainingAmount = selectedCreditSale.remainingAmount || 0;

    if (amount <= 0) {
      showError('❌ المبلغ يجب أن يكون أكبر من صفر');
      return;
    }

    if (amount > remainingAmount) {
      showError(
        `❌ لا يمكن قبض مبلغ أكبر من المبلغ المتبقي!\n` +
        `المبلغ المتبقي: ${formatArabicCurrency(remainingAmount)}\n` +
        `المبلغ المُدخل: ${formatArabicCurrency(amount)}`
      );
      return;
    }

    if ((paymentMethod === 'BANK' || paymentMethod === 'CARD') && !bankAccountId) {
      showError('❌ يجب اختيار الحساب المصرفي عند اختيار حوالة أو بطاقة');
      return;
    }

    try {
      const result = await createPayment({
        saleId: selectedCreditSale.id,
        amount,
        paymentMethod,
        bankAccountId: (paymentMethod === 'BANK' || paymentMethod === 'CARD') ? bankAccountId : undefined,
        notes: notes || undefined
      }).unwrap();

      success('تم إنشاء إيصال القبض بنجاح');
      await refetch();

      const newPayment = result.data.payment;
      const updatedSale = result.data.sale;

      setShowPaymentModal(false);
      setPaymentMethodForReceipt('CASH');
      setBankAccountIdForReceipt('');

      setTimeout(() => {
        setSelectedPayment(newPayment);
        setSelectedCreditSale(updatedSale);
        setShowPrintReceiptModal(true);
      }, 300);
    } catch (err: any) {
      showError(err.data?.message || 'حدث خطأ أثناء إنشاء الدفعة');
    }
  };

  const handleDeletePayment = async (payment: SalePayment) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف إيصال القبض رقم ${payment.receiptNumber}؟`);
    if (confirmed) {
      try {
        await deletePayment(payment.id).unwrap();
        success('تم حذف الدفعة بنجاح');
        refetch();
      } catch (err: any) {
        showError(err.data?.message || 'حدث خطأ أثناء حذف الدفعة');
      }
    }
  };

  const printCreditReceipt = (payment: any, sale: any) => {
    // انتظر حتى يتم رندر الإيصال
    setTimeout(() => {
      // جرب أولاً الـ element في المودال
      let printContent = document.getElementById('credit-receipt-print-content');

      // إذا لم يوجد، جرب الـ ref المخفي
      if (!printContent && creditReceiptRef.current) {
        printContent = creditReceiptRef.current;
      }

      if (!printContent) {
        showError('فشل في تحميل الإيصال للطباعة');
        return;
      }

      const printWindow = window.open('', '_blank', 'width=800,height=900');
      if (!printWindow) {
        showError('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>إيصال قبض - ${payment.receiptNumber || payment.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', 'Segoe UI', Tahoma, sans-serif; direction: rtl; background: white; }
            @media print {
              body { margin: 0; padding: 0; }
              @page { size: A4; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <div id="print-container">${printContent.innerHTML}</div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 300);
            };
            window.onafterprint = function() {
              setTimeout(() => {
                window.close();
              }, 100);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }, 300);
  };

  const printPaymentsHistory = (sale: Sale) => {
    // فتح الـ modal أولاً لإعداد المحتوى
    setShowPrintHistoryModal(false);

    // الانتظار حتى يتم render المكون
    setTimeout(() => {
      if (!historyPrintRef.current) {
        showError('فشل في تحميل سجل الدفعات');
        return;
      }

      // فتح نافذة الطباعة
      const printWindow = window.open('', '_blank', 'width=1000,height=900');
      if (!printWindow) {
        showError('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
        return;
      }

      // بناء محتوى HTML مع الأنماط
      const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>سجل الدفعات - ${sale.invoiceNumber || sale.id}</title>
        <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', 'Segoe UI', Tahoma, sans-serif;
              direction: rtl;
              background: white;
              color: #000;
            }
            
          @media print {
              body {
                margin: 0;
                padding: 0;
          }
              
              @page {
                size: A4;
                margin: 15mm;
              }
            }
        </style>
      </head>
      <body>
          <div id="print-container">${historyPrintRef.current.innerHTML}</div>
          
        <script>
            // الطباعة التلقائية عند تحميل الصفحة
          window.onload = function() {
              setTimeout(() => {
            window.print();
              }, 300);
            };
            
            // إغلاق النافذة بعد الطباعة أو الإلغاء
            window.onafterprint = function() {
              setTimeout(() => {
                window.close();
              }, 100);
          };
        </script>
      </body>
      </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }, 100);
  };

  // البيانات الرئيسية
  const sales = salesData?.data?.sales || [];
  const pagination = salesData?.data?.pagination;

  // Debug: عرض البيانات المحملة
  React.useEffect(() => {
    if (sales.length > 0) {
      console.log('📊 الفواتير المحملة في المحاسب:', sales.length);
      console.log('🔍 أول فاتورة:', {
        id: sales[0].id,
        invoiceNumber: sales[0].invoiceNumber,
        total: sales[0].total,
        paidAmount: sales[0].paidAmount,
        remainingAmount: sales[0].remainingAmount,
        paymentsCount: sales[0].payments?.length || 0
      });
    }
  }, [sales]);

  // الإحصائيات - حساب من البيانات المحملة في الصفحة الحالية
  const totalCount = salesData?.data?.pagination?.total || 0;
  const currentSales = salesData?.data?.sales || [];
  const pendingCount = currentSales.filter(s => !s.receiptIssued).length;
  const issuedCount = currentSales.filter(s => s.receiptIssued).length;

  const pendingTotal = currentSales.filter(s => !s.receiptIssued).reduce((sum, sale) => sum + sale.total, 0);
  const issuedTotal = currentSales.filter(s => s.receiptIssued).reduce((sum, sale) => sum + sale.total, 0);
  const grandTotal = currentSales.reduce((sum, sale) => sum + sale.total, 0);

  // Debug: تتبع الفواتير المحملة
  useEffect(() => {
    console.log('📊 الفواتير المحملة:', {
      activeCompanyId,
      totalSales: sales.length,
      companies: [...new Set(sales.map((s: any) => s.companyId))],
      sales: sales.map((s: any) => ({
        id: s.id,
        companyId: s.companyId,
        invoice: s.invoiceNumber,
        status: s.status,
        saleType: s.saleType,
        total: s.total,
        paidAmount: s.paidAmount,
        remainingAmount: s.remainingAmount,
        paymentsCount: s.payments?.length || 0
      }))
    });
  }, [sales, activeCompanyId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 dark:text-text-primary tracking-tight">منصة المحاسب</h1>
            <p className="text-slate-500 dark:text-text-secondary font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              إدارة الفواتير والتحصيلات والمستندات المالية
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-surface-primary p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden">
            {companiesData?.data?.companies?.map((company: any) => (
              <button
                key={company.id}
                onClick={() => setActiveCompanyId(company.id)}
                className={`
                  px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2
                  ${activeCompanyId === company.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none translate-y-[-1px]'
                    : 'text-slate-600 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-surface-hover hover:text-blue-600 dark:hover:text-blue-400'}
                `}
              >
                <div className={`w-2 h-2 rounded-full ${activeCompanyId === company.id ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                {company.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard/Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-primary p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-text-tertiary">الفواتير الكلية</p>
                <p className="text-xl font-black text-slate-900 dark:text-text-primary">{formatArabicNumber(salesData?.data?.pagination?.total || 0)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-primary p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-text-tertiary">إجمالي المحصل اليوم</p>
                <p className="text-xl font-black text-slate-900 dark:text-text-primary">{formatArabicCurrency(creditStatsData?.data?.todayPayments || 0)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-primary p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Filter className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-text-tertiary">فواتير قيد الانتظار</p>
                <p className="text-xl font-black text-slate-900 dark:text-text-primary">
                  {formatArabicNumber(salesData?.data?.pagination?.totalPending || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-primary p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-text-tertiary">المبيعات الآجلة اليوم</p>
                <p className="text-xl font-black text-slate-900 dark:text-text-primary">{formatArabicCurrency(creditStatsData?.data?.todayCreditSales || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 relative group">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-text-tertiary group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="ابحث برقم الفاتورة، اسم العميل، أو رقم الهاتف..."
                  className="w-full pr-12 pl-4 py-4 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-text-primary font-medium transition-all"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-border-primary">
                  <button
                    onClick={() => handleFilterChange('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${receiptFilter === 'all' ? 'bg-white dark:bg-surface-selected shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-text-tertiary hover:text-slate-700 dark:hover:text-text-secondary'}`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => handleFilterChange('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${receiptFilter === 'pending' ? 'bg-white dark:bg-surface-selected shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-text-tertiary hover:text-slate-700 dark:hover:text-text-secondary'}`}
                  >
                    بانتظار الإيصال
                  </button>
                  <button
                    onClick={() => handleFilterChange('issued')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${receiptFilter === 'issued' ? 'bg-white dark:bg-surface-selected shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-text-tertiary hover:text-slate-700 dark:hover:text-text-secondary'}`}
                  >
                    تم الإصدار
                  </button>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl">
                  <Filter className="w-4 h-4 text-slate-400 dark:text-text-tertiary" />
                  <input
                    type="date"
                    className="bg-transparent text-sm font-bold text-slate-700 dark:text-text-primary outline-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <input
                    type="date"
                    className="bg-transparent text-sm font-bold text-slate-700 dark:text-text-primary outline-none"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <button
                  onClick={clearFilters}
                  className="p-3 text-slate-400 dark:text-text-tertiary hover:text-red-500 dark:hover:text-red-400 transition-colors bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl"
                  title="مسح الفلاتر"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-border-primary">
              <thead className="bg-slate-50 dark:bg-surface-secondary">
                <tr>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                    رقم الفاتورة
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                    العميل / الهاتف
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                    الإجمالي
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                    المدفوع
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                    الباقي
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                    التاريخ
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-surface-primary divide-y divide-slate-100 dark:divide-border-primary">
                {isLoading || isFetching ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-text-tertiary">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-bold">جاري التحميل...</span>
                      </div>
                    </td>
                  </tr>
                ) : sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-text-tertiary">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-10 h-10 mb-2 opacity-20" />
                        <span className="font-bold">
                          {searchTerm ? 'لا توجد نتائج للبحث' :
                            receiptFilter === 'pending' ? 'لا توجد فواتير معلقة' :
                              receiptFilter === 'issued' ? 'لا توجد فواتير مصدرة' :
                                'لا توجد فواتير'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sales.map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 dark:hover:bg-surface-hover transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 dark:text-text-primary">
                            {sale.invoiceNumber || `#${sale.id}`}
                          </span>
                          {sale.status === 'DRAFT' && (
                            <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase">
                              مبدئية
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 dark:text-text-secondary transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {sale.customer?.name || 'عميل نقدي'}
                          </span>
                          {sale.customer?.phone && (
                            <span className="text-xs text-slate-400 dark:text-text-tertiary flex items-center gap-1">
                              {sale.customer.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-black text-slate-900 dark:text-text-primary">
                          {formatArabicCurrency(sale.total || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-black text-green-600 dark:text-green-400">
                          {formatArabicCurrency(sale.paidAmount || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-black text-orange-600 dark:text-orange-400">
                          {formatArabicCurrency(sale.remainingAmount || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 dark:text-text-secondary">
                            {new Date(sale.createdAt).toLocaleDateString('ar-LY')}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-text-tertiary font-bold">
                            {new Date(sale.createdAt).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {sale.status === 'DRAFT' ? (
                            <button
                              onClick={() => {
                                setSaleToApprove(sale);
                                setShowApprovalModal(true);
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              اعتماد
                            </button>
                          ) : (
                            <>
                              {(sale.remainingAmount || 0) > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedCreditSale(sale);
                                    setShowPaymentModal(true);
                                  }}
                                  className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-xl transition-all"
                                  title="قبض مبلغ"
                                >
                                  <DollarSign className="w-5 h-5" />
                                </button>
                              )}

                              {sale.payments && sale.payments.length > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedCreditSale(sale);
                                    setShowPrintHistoryModal(true);
                                  }}
                                  className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl transition-all relative"
                                  title="عرض الإيصالات"
                                >
                                  <FileText className="w-5 h-5" />
                                  <span className="absolute -top-1 -right-1 bg-purple-600 dark:bg-purple-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                    {sale.payments.length}
                                  </span>
                                </button>
                              )}

                              {!sale.isAutoGenerated && (
                                sale.dispatchOrders && sale.dispatchOrders.length > 0 ? (
                                  <div className="p-2 text-slate-300 dark:text-slate-700 cursor-not-allowed" title="تم إصدار أمر الصرف">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleCreateDispatchOrder(sale)}
                                    disabled={isCreatingDispatch}
                                    className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-xl transition-all disabled:opacity-50"
                                    title="أمر صرف المخزن"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                  </button>
                                )
                              )}

                              <button
                                onClick={() => printInvoice(sale)}
                                className="p-2 text-slate-600 dark:text-text-secondary hover:bg-slate-100 dark:hover:bg-surface-hover rounded-xl transition-all"
                                title="طباعة الفاتورة"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>

                              {sale.saleType === 'CASH' && (
                                <button
                                  onClick={() => printReceipt(sale)}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                                  title="إعادة طباعة إيصال القبض"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                  </svg>
                                </button>
                              )}

                              {sale.saleType !== 'CASH' && sale.payments && sale.payments.length > 0 && (
                                <button
                                  onClick={() => {
                                    const lastPayment = sale.payments![sale.payments!.length - 1];
                                    setSelectedPayment(lastPayment as any);
                                    setSelectedCreditSale(sale);
                                    setShowPrintReceiptModal(true);
                                  }}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                                  title="إعادة طباعة آخر إيصال قبض"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                  </svg>
                                </button>
                              )}

                              <button
                                onClick={() => handleSendWhatsApp(sale)}
                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-xl transition-all"
                                title="إرسال على واتساب"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="bg-white dark:bg-surface-primary px-6 py-4 flex items-center justify-between border-t border-slate-100 dark:border-border-primary">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-slate-200 dark:border-border-primary text-sm font-bold rounded-xl text-slate-700 dark:text-text-secondary bg-white dark:bg-surface-secondary hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 transition-all"
                >
                  السابق
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={currentPage === pagination.pages}
                  className="px-4 py-2 border border-slate-200 dark:border-border-primary text-sm font-bold rounded-xl text-slate-700 dark:text-text-secondary bg-white dark:bg-surface-secondary hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 transition-all"
                >
                  التالي
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-text-tertiary font-medium">
                    عرض <span className="font-black text-slate-900 dark:text-text-primary">{(currentPage - 1) * pagination.limit + 1}</span> إلى{' '}
                    <span className="font-black text-slate-900 dark:text-text-primary">
                      {Math.min(currentPage * pagination.limit, pagination.total)}
                    </span>{' '}
                    من <span className="font-black text-slate-900 dark:text-text-primary">{pagination.total}</span> نتيجة
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 rounded-r-xl border border-slate-200 dark:border-border-primary bg-white dark:bg-surface-secondary text-sm font-bold text-slate-500 dark:text-text-tertiary hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="mr-1">السابق</span>
                    </button>

                    {/* أرقام الصفحات */}
                    {(() => {
                      const pages = [];
                      const totalPages = pagination.pages;
                      const maxVisible = 5;

                      let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                      if (endPage - startPage < maxVisible - 1) {
                        startPage = Math.max(1, endPage - maxVisible + 1);
                      }

                      // الصفحة الأولى
                      if (startPage > 1) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => setCurrentPage(1)}
                            className="relative inline-flex items-center px-4 py-2 border border-slate-200 dark:border-border-primary bg-white dark:bg-surface-secondary text-sm font-bold text-slate-700 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-surface-hover transition-all"
                          >
                            {formatArabicNumber(1)}
                          </button>
                        );
                        if (startPage > 2) {
                          pages.push(
                            <span key="dots1" className="relative inline-flex items-center px-4 py-2 border border-slate-200 dark:border-border-primary bg-white dark:bg-surface-secondary text-sm font-bold text-slate-400 dark:text-text-tertiary">
                              ...
                            </span>
                          );
                        }
                      }

                      // الصفحات المرئية
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-black transition-all ${currentPage === i
                              ? 'z-10 bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none'
                              : 'bg-white dark:bg-surface-secondary border-slate-200 dark:border-border-primary text-slate-700 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-surface-hover'
                              }`}
                          >
                            {formatArabicNumber(i)}
                          </button>
                        );
                      }

                      // الصفحة الأخيرة
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <span key="dots2" className="relative inline-flex items-center px-4 py-2 border border-slate-200 dark:border-border-primary bg-white dark:bg-surface-secondary text-sm font-bold text-slate-400 dark:text-text-tertiary">
                              ...
                            </span>
                          );
                        }
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="relative inline-flex items-center px-4 py-2 border border-slate-200 dark:border-border-primary bg-white dark:bg-surface-secondary text-sm font-bold text-slate-700 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-surface-hover transition-all"
                          >
                            {formatArabicNumber(totalPages)}
                          </button>
                        );
                      }

                      return pages;
                    })()}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                      disabled={currentPage === pagination.pages}
                      className="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-slate-200 dark:border-border-primary bg-white dark:bg-surface-secondary text-sm font-bold text-slate-500 dark:text-text-tertiary hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="ml-1">التالي</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden print containers */}
        <div
          ref={printRef}
          className="fixed opacity-0 pointer-events-none"
          style={{
            position: 'fixed',
            left: '-9999px',
            top: '0',
            visibility: currentSaleToPrint ? 'visible' : 'hidden'
          }}
        >
          {currentSaleToPrint && <ReceiptPrint sale={currentSaleToPrint} />}
        </div>

        <div
          ref={invoicePrintRef}
          className="fixed opacity-0 pointer-events-none"
          style={{
            position: 'fixed',
            left: '-9999px',
            top: '0',
            visibility: currentInvoiceToPrint ? 'visible' : 'hidden'
          }}
        >
          {currentInvoiceToPrint && <InvoicePrint sale={currentInvoiceToPrint} />}
        </div>

        <div
          ref={historyPrintRef}
          className="fixed opacity-0 pointer-events-none"
          style={{
            position: 'fixed',
            left: '-9999px',
            top: '0',
            visibility: selectedCreditSale && selectedCreditSale.payments && selectedCreditSale.payments.length > 0 ? 'visible' : 'hidden'
          }}
        >
          {selectedCreditSale && selectedCreditSale.payments && selectedCreditSale.payments.length > 0 && (
            <PaymentsHistoryPrint
              sale={selectedCreditSale as any}
              payments={selectedCreditSale.payments as any}
            />
          )}
        </div>

        <div
          ref={whatsappRef}
          className="fixed opacity-0 pointer-events-none"
          style={{
            position: 'fixed',
            left: '-9999px',
            top: '0',
            visibility: currentSaleForWhatsApp ? 'visible' : 'hidden',
            width: '210mm',
            backgroundColor: 'white'
          }}
        >
          {currentSaleForWhatsApp && <InvoicePrint sale={currentSaleForWhatsApp} />}
        </div>

        <div
          ref={creditReceiptRef}
          className="fixed opacity-0 pointer-events-none"
          style={{
            position: 'fixed',
            left: '-9999px',
            top: '0',
            visibility: selectedPayment && selectedCreditSale ? 'visible' : 'hidden',
            width: '210mm',
            backgroundColor: 'white'
          }}
        >
          {selectedPayment && selectedCreditSale && (
            <CreditPaymentReceiptPrint payment={selectedPayment} sale={selectedCreditSale as any} />
          )}
        </div>


        {/* Payment Modal */}
        {showPaymentModal && selectedCreditSale && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 transition-all duration-300">
            <div className="relative w-full max-w-lg bg-white dark:bg-surface-primary rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-border-primary">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-600 dark:to-indigo-600 text-white px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black">قبض مبلغ</h3>
                      <p className="text-blue-100 text-xs font-bold opacity-80">تسجيل دفعة جديدة من العميل</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedCreditSale(null);
                      setPaymentMethodForReceipt('CASH');
                      setBankAccountIdForReceipt('');
                    }}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-8">
                {/* معلومات الفاتورة */}
                <div className="mb-8 bg-slate-50 dark:bg-surface-secondary rounded-2xl p-5 border border-slate-100 dark:border-border-primary text-slate-900 dark:text-text-primary">
                  <h4 className="text-xs font-black text-slate-400 dark:text-text-tertiary uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    تفاصيل الفاتورة المستهدفة
                  </h4>
                  <div className="grid grid-cols-2 gap-y-4 text-sm font-bold">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 dark:text-text-tertiary text-xs">رقم الفاتورة</span>
                      <span className="text-slate-900 dark:text-text-primary">{selectedCreditSale.invoiceNumber || `#${selectedCreditSale.id}`}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-left">
                      <span className="text-slate-500 dark:text-text-tertiary text-xs">العميل</span>
                      <span className="text-slate-900 dark:text-text-primary truncate">{selectedCreditSale.customer?.name || 'عميل نقدي'}</span>
                    </div>
                    <div className="flex flex-col gap-1 col-span-2 pt-2 border-t border-slate-200 dark:border-border-primary/50 mt-2">
                      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                        <span className="text-blue-800 dark:text-blue-300">المبلغ المتبقي للتحصيل:</span>
                        <span className="text-blue-600 dark:text-blue-400 text-lg font-black">{formatArabicCurrency(selectedCreditSale.remainingAmount || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCreatePayment} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1">
                      المبلغ المراد قبضه <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-text-tertiary font-black">د.ل</div>
                      <input
                        type="number"
                        name="amount"
                        step="0.01"
                        min="0.01"
                        max={selectedCreditSale.remainingAmount}
                        required
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-text-primary font-black text-xl transition-all"
                        placeholder="0.00"
                        onInput={(e) => {
                          const input = e.target as HTMLInputElement;
                          const value = Number(input.value);
                          const remaining = selectedCreditSale.remainingAmount || 0;
                          if (value > remaining) {
                            input.setCustomValidity(`المبلغ لا يمكن أن يتجاوز المتبقي (${formatArabicCurrency(remaining)})`);
                          } else if (value <= 0) {
                            input.setCustomValidity('المبلغ يجب أن يكون أكبر من صفر');
                          } else {
                            input.setCustomValidity('');
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1">طريقة القبض</label>
                      <select
                        name="paymentMethod"
                        required
                        value={paymentMethodForReceipt}
                        onChange={(e) => {
                          const next = e.target.value as "CASH" | "BANK" | "CARD";
                          setPaymentMethodForReceipt(next);
                          if (next === 'CASH') setBankAccountIdForReceipt('');
                        }}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-text-primary font-bold transition-all appearance-none"
                      >
                        <option value="CASH">💵 نقداً (كاش)</option>
                        <option value="BANK">🏦 تحويل بنكي</option>
                        <option value="CARD">💳 بطاقة مصرفية</option>
                      </select>
                    </div>

                    {(paymentMethodForReceipt === 'BANK' || paymentMethodForReceipt === 'CARD') && (
                      <div className="space-y-2">
                        <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1">الحساب المودع فيه</label>
                        <select
                          name="bankAccountId"
                          required
                          value={bankAccountIdForReceipt}
                          onChange={(e) => setBankAccountIdForReceipt(e.target.value ? Number(e.target.value) : '')}
                          className="w-full px-5 py-3.5 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-text-primary font-bold transition-all appearance-none"
                          disabled={isTreasuriesLoading}
                        >
                          <option value="">اختر الحساب...</option>
                          {bankAccounts.map((account: any) => (
                            <option key={account.id} value={account.id}>
                              {account.name} {account.bankName ? `- ${account.bankName}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 dark:text-text-secondary pr-1">ملاحظات إضافية</label>
                    <textarea
                      name="notes"
                      rows={2}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-text-primary font-medium transition-all resize-none"
                      placeholder="أدخل أي ملاحظات هنا..."
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={isCreatingPayment}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      {isCreatingPayment ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          تأكيد القبض وإصدار إيصال
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPaymentModal(false);
                        setSelectedCreditSale(null);
                        setPaymentMethodForReceipt('CASH');
                        setBankAccountIdForReceipt('');
                      }}
                      className="px-8 py-4 bg-slate-100 dark:bg-surface-secondary text-slate-600 dark:text-text-secondary rounded-2xl hover:bg-slate-200 dark:hover:bg-surface-hover font-black transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}


        {/* Print Receipt Modal */}
        {showPrintReceiptModal && selectedPayment && selectedCreditSale && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden border border-slate-200 dark:border-border-primary flex flex-col">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-600 dark:to-indigo-600 text-white px-8 py-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black">معاينة إيصال القبض قبل الطباعة</h2>
                </div>
                <button onClick={() => setShowPrintReceiptModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 bg-slate-100 dark:bg-surface-secondary flex items-start justify-center">
                <div id="credit-receipt-print-content" className="bg-white rounded-lg shadow-2xl max-w-[210mm] w-full min-h-[297mm] origin-top scale-[0.85] md:scale-100">
                  <CreditPaymentReceiptPrint payment={selectedPayment} sale={selectedCreditSale as any} />
                </div>
              </div>
              <div className="bg-white dark:bg-surface-primary px-8 py-5 flex justify-end gap-4 border-t border-slate-100 dark:border-border-primary shadow-2xl">
                <button
                  onClick={() => setShowPrintReceiptModal(false)}
                  className="px-8 py-3 bg-slate-100 dark:bg-surface-hover text-slate-600 dark:text-text-secondary rounded-xl font-black transition-all hover:bg-slate-200 dark:hover:bg-surface-selected"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => selectedPayment && selectedCreditSale && printCreditReceipt(selectedPayment, selectedCreditSale)}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-200 dark:shadow-none flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  تأكيد وطباعة الإيصال
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Print History Modal */}
        {showPrintHistoryModal && selectedCreditSale && selectedCreditSale.payments && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-border-primary flex flex-col font-sans">
              <div className="bg-blue-600 text-white px-8 py-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl shadow-inner">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black">إيصالات الفاتورة: {selectedCreditSale.invoiceNumber || `#${selectedCreditSale.id}`}</h2>
                </div>
                <button onClick={() => setShowPrintHistoryModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 bg-slate-50 dark:bg-surface-secondary">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCreditSale.payments.map((payment: any) => (
                    <div key={payment.id} className="bg-white dark:bg-surface-primary border border-slate-200 dark:border-border-primary rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-text-primary">إيصال قبض #{payment.receiptNumber}</h3>
                          <p className="text-sm font-bold text-slate-400 dark:text-text-tertiary">{new Date(payment.paymentDate).toLocaleDateString('ar-LY')}</p>
                        </div>
                        <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl font-black text-sm">
                          {formatArabicCurrency(payment.amount)}
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-slate-500 dark:text-text-tertiary">الطريقة:</span>
                          <span className="text-slate-700 dark:text-text-secondary">
                            {payment.paymentMethod === 'CASH' ? 'نقداً' :
                              payment.paymentMethod === 'BANK' ? 'تحويل بنكي' :
                                payment.paymentMethod === 'CARD' ? 'بطاقة مصرفية' : payment.paymentMethod}
                          </span>
                        </div>
                        {payment.notes && (
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-500 dark:text-text-tertiary text-xs">ملاحظات:</span>
                            <p className="text-slate-700 dark:text-text-secondary text-sm italic">"{payment.notes}"</p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowPrintReceiptModal(true);
                        }}
                        className="w-full py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-black text-sm hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        طباعة الإيصال
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-surface-primary px-8 py-5 flex justify-end gap-4 border-t border-slate-100 dark:border-border-primary">
                <button onClick={() => setShowPrintHistoryModal(false)} className="px-8 py-3 bg-slate-100 dark:bg-surface-hover text-slate-600 dark:text-text-secondary rounded-xl font-black hover:bg-slate-200 transition-all">
                  إغلاق
                </button>
                <button onClick={() => selectedCreditSale && printPaymentsHistory(selectedCreditSale as any)} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none hover:scale-[1.02] transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  طباعة الكل
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedCreditSale && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl bg-white dark:bg-surface-primary rounded-3xl shadow-2xl border border-slate-200 dark:border-border-primary overflow-hidden">
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-border-primary pb-6">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-text-primary">تفاصيل وحركة الفاتورة</h3>
                  <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-surface-hover rounded-xl transition-colors text-slate-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-slate-50 dark:bg-surface-secondary p-5 rounded-2xl border border-slate-100 dark:border-border-primary">
                    <span className="text-xs font-bold text-slate-500 dark:text-text-tertiary block mb-1">رقم الفاتورة</span>
                    <span className="text-lg font-black text-slate-900 dark:text-text-primary">{selectedCreditSale.invoiceNumber || `#${selectedCreditSale.id}`}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-surface-secondary p-5 rounded-2xl border border-slate-100 dark:border-border-primary">
                    <span className="text-xs font-bold text-slate-500 dark:text-text-tertiary block mb-1">العميل</span>
                    <span className="text-lg font-black text-slate-900 dark:text-text-primary truncate">{selectedCreditSale.customer?.name || 'عميل نقدي'}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-surface-secondary p-5 rounded-2xl border border-slate-100 dark:border-border-primary">
                    <span className="text-xs font-bold text-slate-500 dark:text-text-tertiary block mb-1">صافي القيمة</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400">{formatArabicCurrency(selectedCreditSale.total)}</span>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-100 dark:border-red-900/30">
                    <span className="text-xs font-bold text-red-500 dark:text-red-400 block mb-1">المتبقي</span>
                    <span className="text-lg font-black text-red-600 dark:text-red-500">{formatArabicCurrency(selectedCreditSale.remainingAmount || 0)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-slate-900 dark:text-text-primary flex items-center gap-2">
                      <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                      سجل الدفعات والمتحصلات
                      <span className="text-sm font-bold text-slate-400 dark:text-text-tertiary mr-2">({formatArabicNumber(selectedCreditSale.payments?.length || 0)})</span>
                    </h4>
                    {selectedCreditSale.payments && selectedCreditSale.payments.length > 0 && (
                      <button
                        onClick={() => printPaymentsHistory(selectedCreditSale as any)}
                        className="px-4 py-2 bg-slate-900 dark:bg-surface-secondary text-white dark:text-text-primary rounded-xl text-xs font-black hover:bg-slate-800 dark:hover:bg-surface-hover transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        طباعة كشف الدفعات
                      </button>
                    )}
                  </div>

                  {selectedCreditSale.payments && selectedCreditSale.payments.length > 0 ? (
                    <div className="bg-slate-50 dark:bg-surface-secondary rounded-2xl border border-slate-100 dark:border-border-primary overflow-hidden">
                      <table className="w-full text-right">
                        <thead className="bg-slate-100 dark:bg-surface-hover border-b border-slate-200 dark:border-border-primary">
                          <tr>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-text-tertiary uppercase">رقم الإيصال</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-text-tertiary uppercase">التاريخ</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-text-tertiary uppercase">المبلغ</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-text-tertiary uppercase text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-border-primary/50 text-sm">
                          {selectedCreditSale.payments.map((payment: any) => (
                            <tr key={payment.id} className="hover:bg-white dark:hover:bg-surface-primary transition-colors">
                              <td className="px-6 py-4 font-black text-slate-900 dark:text-text-primary">{payment.receiptNumber}</td>
                              <td className="px-6 py-4 font-bold text-slate-600 dark:text-text-secondary">{new Date(payment.paymentDate).toLocaleDateString('ar-LY')}</td>
                              <td className="px-6 py-4 font-black text-green-600 dark:text-green-400">{formatArabicCurrency(payment.amount)}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => printCreditReceipt(payment, selectedCreditSale)}
                                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                                    title="طباعة الإيصال"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeletePayment(payment)}
                                    className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                    title="حذف الدفعة"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-slate-50 dark:bg-surface-secondary rounded-2xl border-2 border-dashed border-slate-200 dark:border-border-primary">
                      <div className="text-slate-400 mb-2 font-bold">لا توجد دفعات مسجلة لهذه الفاتورة حتى الآن</div>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedCreditSale(null);
                    }}
                    className="w-full py-4 bg-slate-100 dark:bg-surface-secondary text-slate-600 dark:text-text-secondary rounded-2xl hover:bg-slate-200 dark:hover:bg-surface-hover font-black transition-all"
                  >
                    إغلاق النافذة
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sale Edit Modal */}
        {showEditModal && saleToEdit && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-2xl max-w-5xl w-full my-8 max-h-[90vh] overflow-hidden border border-slate-200 dark:border-border-primary flex flex-col font-sans">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl shadow-inner">
                    <Edit3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">تعديل بيانات الفاتورة</h2>
                    <p className="text-orange-50 text-xs font-bold opacity-80 mt-0.5">تعديل الأصناف، الكميات، أو بيانات العميل</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditLines([]);
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50 dark:bg-surface-secondary/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-surface-primary p-6 rounded-2xl border border-slate-200 dark:border-border-primary shadow-sm space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-400 dark:text-text-tertiary uppercase pr-1">رقم الفاتورة</label>
                      <input
                        type="text"
                        name="invoiceNumber"
                        defaultValue={saleToEdit.invoiceNumber || ''}
                        className="w-full px-5 py-3 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-400 text-slate-900 dark:text-text-primary font-bold transition-all"
                        placeholder="أدخل رقم الفاتورة..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-400 dark:text-text-tertiary uppercase pr-1">العميل</label>
                      <select
                        name="customerId"
                        defaultValue={saleToEdit.customerId || ''}
                        className="w-full px-5 py-3 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-400 text-slate-900 dark:text-text-primary font-bold appearance-none transition-all"
                      >
                        <option value="">غير محدد</option>
                        {salesData?.data?.sales
                          ?.map(s => s.customer)
                          .filter((customer, index, self) =>
                            customer && self.findIndex(c => c?.id === customer.id) === index
                          )
                          .map(customer => customer && (
                            <option key={customer.id} value={customer.id}>{customer.name}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex flex-col justify-center text-center space-y-2">
                    <span className="text-orange-600 dark:text-orange-400 font-black text-sm uppercase">إجمالي الفاتورة الحالي</span>
                    <span className="text-orange-700 dark:text-orange-500 font-black text-3xl">{formatArabicCurrency(saleToEdit.total)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900 dark:text-text-primary flex items-center gap-2">
                      <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
                      قائمة الأصناف المعدلة
                      <span className="text-sm font-bold text-slate-400 dark:text-text-tertiary mr-2">({formatArabicNumber(editLines.length)})</span>
                    </h3>
                    <button
                      type="button"
                      onClick={addEditLine}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-green-100 dark:shadow-none"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة صنف جديد
                    </button>
                  </div>

                  {editLines.length === 0 ? (
                    <div className="py-20 text-center bg-white dark:bg-surface-primary rounded-3xl border-2 border-dashed border-slate-200 dark:border-border-primary flex flex-col items-center">
                      <Package className="w-12 h-12 text-slate-200 dark:text-border-primary mb-4" />
                      <p className="text-slate-400 font-bold">لا توجد أصناف في هذه القائمة، قم بإضافة صنف للبدء</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editLines.map((line, index) => {
                        const product = productsData?.data?.products?.find(p => p.id === line.productId);
                        const unitsPerBox = product?.unitsPerBox ? Number(product.unitsPerBox) : 1;
                        const subtotal = line.qty * line.unitPrice;

                        return (
                          <div key={index} className="bg-white dark:bg-surface-primary p-6 rounded-2xl border border-slate-200 dark:border-border-primary shadow-sm hover:shadow-md transition-all group">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                              <div className="lg:col-span-5 space-y-2">
                                <label className="text-xs font-black text-slate-400 dark:text-text-tertiary uppercase pr-1">الصنف</label>
                                <select
                                  value={line.productId}
                                  onChange={(e) => updateEditLine(index, 'productId', Number(e.target.value))}
                                  className="w-full px-4 py-3 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-900 dark:text-text-primary transition-all"
                                  required
                                >
                                  <option value={0}>اختر صنف...</option>
                                  {productsData?.data?.products?.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} - {p.sku}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="lg:col-span-3 space-y-2">
                                <label className="text-xs font-black text-slate-400 dark:text-text-tertiary uppercase pr-1">الكمية (صندوق)</label>
                                <input
                                  type="number"
                                  value={line.qty}
                                  onChange={(e) => updateEditLine(index, 'qty', Number(e.target.value))}
                                  className="w-full px-4 py-3 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-900 dark:text-text-primary transition-all"
                                  min="0.01" step="0.01" required
                                />
                              </div>

                              <div className="lg:col-span-3 space-y-2">
                                <label className="text-xs font-black text-slate-400 dark:text-text-tertiary uppercase pr-1">السعر/متر</label>
                                <input
                                  type="number"
                                  value={unitsPerBox > 0 ? (line.unitPrice / unitsPerBox) : 0}
                                  onChange={(e) => updatePriceFromUnitPrice(index, Number(e.target.value))}
                                  className="w-full px-4 py-3 bg-slate-50 dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-900 dark:text-text-primary transition-all"
                                  min="0" step="0.01" required
                                />
                              </div>

                              <div className="lg:col-span-1">
                                <button
                                  type="button"
                                  onClick={() => removeEditLine(index)}
                                  className="w-full p-3.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center justify-center border border-transparent hover:border-red-100 dark:hover:border-red-900/40"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-border-primary/50 flex flex-wrap gap-x-8 gap-y-2 text-xs font-bold items-center justify-between">
                              <div className="flex gap-6">
                                <div className="flex items-center gap-2 text-slate-400">
                                  <span>📏 إجمالي الأمتار:</span>
                                  <span className="text-slate-900 dark:text-text-primary">{formatArabicNumber((line.qty * unitsPerBox).toFixed(2))} م</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                  <span>📦 السعر/صندوق:</span>
                                  <span className="text-blue-600 dark:text-blue-400">{formatArabicCurrency(line.unitPrice)}</span>
                                </div>
                              </div>
                              <div className="text-lg font-black text-slate-900 dark:text-text-primary">
                                {formatArabicCurrency(subtotal)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6 flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-amber-800 dark:text-amber-400 font-black text-sm mb-1">تنبيه هام حول المخزون</h4>
                    <p className="text-amber-700/80 dark:text-amber-500/80 text-xs font-bold leading-relaxed">
                      عند حفظ التعديلات، سيتم إرجاع كميات الأصناف القديمة للمخزون وخصم الكميات الجديدة تلقائياً. يرجى التأكد من توفر الكميات المطلوبة في المخزن لتجنب أي أخطاء في النظام.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 bg-white dark:bg-surface-primary border-t border-slate-100 dark:border-border-primary flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 dark:text-text-tertiary uppercase">إجمالي الفاتورة المحدث</span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {formatArabicCurrency(editLines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0))}
                  </span>
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditLines([]);
                    }}
                    className="px-8 py-3.5 bg-slate-100 dark:bg-surface-hover text-slate-600 dark:text-text-secondary rounded-2xl font-black transition-all hover:bg-slate-200 dark:hover:bg-surface-selected"
                  >
                    إلغاء التعديل
                  </button>
                  <button
                    form="handleEditSubmit"
                    type="submit"
                    disabled={isUpdating || editLines.length === 0}
                    onClick={() => {
                      // Trigger form submission manually if button is outside form or using onClick
                      const form = document.querySelector('form');
                      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }}
                    className="px-10 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black shadow-lg shadow-orange-100 dark:shadow-none flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        حفظ التعديلات النهائية
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

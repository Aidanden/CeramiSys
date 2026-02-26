'use client';

import React, { useState, useRef } from 'react';
import { useGetCashSalesQuery, useIssueReceiptMutation, useUpdateSalePaymentMethodMutation, Sale } from '@/state/salesApi';
import { useCreateDispatchOrderMutation } from '@/state/warehouseApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { useToast } from '@/components/ui/Toast';
import { ReceiptPrint } from '@/components/sales/ReceiptPrint';
import { InvoicePrint } from '@/components/sales/InvoicePrint';
import { Search, Filter, X, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import { 
  useGetCreditSalesQuery,
  useGetCreditSalesStatsQuery,
  useCreatePaymentMutation,
  useDeletePaymentMutation,
  useUpdatePaymentMethodMutation,
  CreditSale,
  SalePayment
} from '@/state/salePaymentApi';
import { CreditPaymentReceiptPrint } from '@/components/sales/CreditPaymentReceiptPrint';
import { PaymentsHistoryPrint } from '@/components/sales/PaymentsHistoryPrint';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useGetTreasuriesQuery } from '@/state/treasuryApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux';
import { useEffect } from 'react';

export default function CashierReceiptsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'cash' | 'credit'>('cash');
  
  // Cash sales states
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'issued' | 'pending'>('all');
  
  // Credit sales states
  const [creditCurrentPage, setCreditCurrentPage] = useState(1);
  const [creditSearchTerm, setCreditSearchTerm] = useState('');
  const [filterFullyPaid, setFilterFullyPaid] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedCreditSale, setSelectedCreditSale] = useState<CreditSale | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<SalePayment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrintReceiptModal, setShowPrintReceiptModal] = useState(false);
  const [showPrintHistoryModal, setShowPrintHistoryModal] = useState(false);
  const [paymentMethodForReceipt, setPaymentMethodForReceipt] = useState<"CASH" | "BANK" | "CARD">("CASH");
  const [bankAccountIdForReceipt, setBankAccountIdForReceipt] = useState<number | "">("");
  
  // تعيين تاريخ اليوم كـ default
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  };
  
  // الوضع الافتراضي: عرض جميع الفواتير (بدون فلتر تاريخ)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [issuedReceipts, setIssuedReceipts] = useState<Set<number>>(new Set());
  const [currentSaleToPrint, setCurrentSaleToPrint] = useState<Sale | null>(null);
  const [currentSaleForWhatsApp, setCurrentSaleForWhatsApp] = useState<Sale | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const whatsappRef = useRef<HTMLDivElement>(null);
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
  } = useGetCashSalesQuery(
    {
      page: currentPage,
      limit: 20,
      search: searchTerm || undefined,
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
  
  // جلب الفواتير المعلقة للإحصائيات
  const { data: pendingData, refetch: refetchPending } = useGetCashSalesQuery(
    {
      page: 1,
      limit: 1000, // جلب جميع الفواتير للحساب
      receiptIssued: false,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    },
    {
      refetchOnMountOrArgChange: 5, // إعادة جلب البيانات كل 5 ثواني
      refetchOnFocus: true,
      refetchOnReconnect: true
    }
  );
  
  // جلب الفواتير المصدرة للإحصائيات
  const { data: issuedData, refetch: refetchIssued } = useGetCashSalesQuery(
    {
      page: 1,
      limit: 1000, // جلب جميع الفواتير للحساب
      receiptIssued: true,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    },
    {
      refetchOnMountOrArgChange: 5, // إعادة جلب البيانات كل 5 ثواني
      refetchOnFocus: true,
      refetchOnReconnect: true
    }
  );

  const [issueReceipt, { isLoading: isIssuing }] = useIssueReceiptMutation();
  const [createDispatchOrder, { isLoading: isCreatingDispatch }] = useCreateDispatchOrderMutation();
  const [updateSalePaymentMethod, { isLoading: isUpdatingSalePaymentMethod }] = useUpdateSalePaymentMethodMutation();
  
  // States for changing cash sale payment method
  const [showChangeCashMethodModal, setShowChangeCashMethodModal] = useState(false);
  const [saleToChangeMethod, setSaleToChangeMethod] = useState<Sale | null>(null);
  const [newCashPaymentMethod, setNewCashPaymentMethod] = useState<"CASH" | "BANK" | "CARD">("CASH");
  const [newCashBankAccountId, setNewCashBankAccountId] = useState<number | "">("");
  
  // Credit sales API calls
  const { data: creditSalesData, isLoading: creditSalesLoading, refetch: refetchCreditSales } = useGetCreditSalesQuery({
    page: creditCurrentPage,
    limit: 10,
    search: creditSearchTerm,
    isFullyPaid: filterFullyPaid === 'all' ? undefined : filterFullyPaid === 'paid'
  });
  const { data: creditStatsData } = useGetCreditSalesStatsQuery();
  const [createPayment, { isLoading: isCreatingPayment }] = useCreatePaymentMutation();
  const [deletePayment] = useDeletePaymentMutation();
  const { data: companiesData } = useGetCompaniesQuery({ limit: 1000 });

  // تحميل الحسابات المصرفية (جميع الحسابات المصرفية النشطة)
  const { data: treasuriesData, isLoading: isTreasuriesLoading, error: treasuriesError } = useGetTreasuriesQuery({ type: 'BANK', isActive: true });
  const bankAccounts = Array.isArray(treasuriesData) ? treasuriesData : [];

  const printReceipt = (sale: Sale) => {
    setCurrentSaleToPrint(sale);
    
    setTimeout(() => {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        showError('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
        return;
      }

      const receiptContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>إيصال قبض - ${sale.invoiceNumber || sale.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; direction: rtl; }
            @media print {
              body { margin: 0; padding: 0; }
              .receipt { page-break-after: always; }
            }
            @page { size: A4; margin: 0; }
          </style>
        </head>
        <body>
          <div id="receipt-container"></div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.print(), 100);
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(receiptContent);
      const container = printWindow.document.getElementById('receipt-container');
      if (container && printRef.current) {
        container.innerHTML = printRef.current.innerHTML;
      }
      printWindow.document.close();
      setCurrentSaleToPrint(null);
    }, 100);
  };

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
        refetchPending();
        refetchIssued();
      }, 500);
    } catch (err: any) {
      showError(err?.data?.message || 'حدث خطأ أثناء إصدار إيصال القبض');
    }
  };
  
  const handleCreateDispatchOrder = async (sale: Sale) => {
    try {
      await createDispatchOrder({ saleId: sale.id }).unwrap();
      success(`تم إنشاء أمر صرف للفاتورة ${sale.invoiceNumber || sale.id}`);
      refetch();
    } catch (err: any) {
      showError(err?.data?.message || 'حدث خطأ أثناء إنشاء أمر الصرف');
    }
  };

  const handleOpenChangeCashMethod = (sale: Sale) => {
    setSaleToChangeMethod(sale);
    setNewCashPaymentMethod(sale.paymentMethod || 'CASH');
    setNewCashBankAccountId('');
    setShowChangeCashMethodModal(true);
  };

  const handleChangeCashPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToChangeMethod) return;

    if ((newCashPaymentMethod === 'BANK' || newCashPaymentMethod === 'CARD') && !newCashBankAccountId) {
      showError('❌ يجب اختيار الحساب المصرفي عند اختيار حوالة أو بطاقة');
      return;
    }

    try {
      await updateSalePaymentMethod({
        id: saleToChangeMethod.id,
        paymentMethod: newCashPaymentMethod,
        bankAccountId: (newCashPaymentMethod === 'BANK' || newCashPaymentMethod === 'CARD') ? Number(newCashBankAccountId) : undefined,
      }).unwrap();

      success('✅ تم تغيير طريقة الدفع وتسوية حركات الخزينة بنجاح');
      setShowChangeCashMethodModal(false);
      setSaleToChangeMethod(null);
      setNewCashPaymentMethod('CASH');
      setNewCashBankAccountId('');
      refetch();
      refetchPending();
      refetchIssued();
    } catch (err: any) {
      showError(err?.data?.message || 'حدث خطأ أثناء تغيير طريقة الدفع');
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
  
  // Credit sales functions
  const currentUserFromRedux = useSelector((state: RootState) => state.auth.user);
  
  // Auto-select company for non-system users
  useEffect(() => {
    if (currentUserFromRedux && !currentUserFromRedux.isSystemUser && currentUserFromRedux.companyId) {
      setSelectedCompanyId(currentUserFromRedux.companyId);
    }
  }, [currentUserFromRedux]);
  
  // Filter credit sales by selected company
  const filteredCreditSales = creditSalesData?.data?.sales?.filter((sale: CreditSale) => {
    if (!selectedCompanyId) return true;
    return sale.companyId === selectedCompanyId;
  }) || [];
  
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreditSale) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const amount = Number(formData.get('amount'));
    const paymentMethod = formData.get('paymentMethod') as "CASH" | "BANK" | "CARD";
    const bankAccountIdRaw = formData.get('bankAccountId') as string | null;
    const bankAccountId = bankAccountIdRaw ? Number(bankAccountIdRaw) : undefined;
    const notes = formData.get('notes') as string;

    if (amount <= 0) {
      showError('المبلغ يجب أن يكون أكبر من صفر');
      return;
    }

    if (amount > selectedCreditSale.remainingAmount) {
      showError(`المبلغ يتجاوز المبلغ المتبقي (${formatArabicCurrency(selectedCreditSale.remainingAmount)})`);
      return;
    }

    if ((paymentMethod === 'BANK' || paymentMethod === 'CARD') && !bankAccountId) {
      showError('يجب اختيار الحساب المصرفي عند اختيار حوالة أو بطاقة');
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
      await refetchCreditSales();
      
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
        refetchCreditSales();
      } catch (err: any) {
        showError(err.data?.message || 'حدث خطأ أثناء حذف الدفعة');
      }
    }
  };
  
  const printCreditReceipt = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showError('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
      return;
    }
    
    const printContent = document.getElementById('receipt-print-content');
    if (!printContent) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>إيصال قبض</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; direction: rtl; }
          @media print {
            body { margin: 0; padding: 0; }
            .print-receipt { page-break-after: always; }
          }
          @page { size: A4; margin: 0; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  const printPaymentsHistory = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showError('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
      return;
    }
    
    const printContent = document.getElementById('history-print-content');
    if (!printContent) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>سجل الدفعات</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; direction: rtl; }
          @media print {
            body { margin: 0; padding: 0; }
          }
          @page { size: A4; margin: 0; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const sales = salesData?.data?.sales || [];
  const pagination = salesData?.data?.pagination;
  
  // حساب الأعداد والمبالغ من البيانات الكاملة
  const pendingSales = pendingData?.data?.sales || [];
  const issuedSales = issuedData?.data?.sales || [];
  
  const pendingCount = pendingData?.data?.pagination?.total || 0;
  const issuedCount = issuedData?.data?.pagination?.total || 0;
  const totalCount = pendingCount + issuedCount;
  
  // حساب المبالغ
  const pendingTotal = pendingSales.reduce((sum, sale) => sum + sale.total, 0);
  const issuedTotal = issuedSales.reduce((sum, sale) => sum + sale.total, 0);
  const grandTotal = pendingTotal + issuedTotal;
  

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إيصالات القبض - المحاسب</h1>
        <p className="text-gray-600 mt-1">إدارة إيصالات القبض للفواتير النقدية والآجلة</p>
      </div>
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 space-x-reverse" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('cash')}
              className={`${
                activeTab === 'cash'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              المبيعات النقدية
            </button>
            <button
              onClick={() => setActiveTab('credit')}
              className={`${
                activeTab === 'credit'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              المبيعات الآجلة
            </button>
          </nav>
        </div>
      </div>
      
      {/* Cash Sales Tab Content */}
      {activeTab === 'cash' && (
      <>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div className="relative md:col-span-3">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="بحث برقم الفاتورة، اسم العميل، أو رقم الهاتف..."
              className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          {/* Date Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              جميع التواريخ
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Receipt Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex gap-2 flex-1">
              <button
                onClick={() => handleFilterChange('pending')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  receiptFilter === 'pending'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                معلقة ({pendingCount})
              </button>
              <button
                onClick={() => handleFilterChange('issued')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  receiptFilter === 'issued'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                مصدرة ({issuedCount})
              </button>
              <button
                onClick={() => handleFilterChange('all')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  receiptFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                الكل ({totalCount})
              </button>
            </div>
            {(searchTerm || receiptFilter !== 'pending' || startDate !== getTodayDate() || endDate !== getTodayDate()) && (
              <button
                onClick={clearFilters}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="مسح الفلاتر"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">فواتير معلقة</p>
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              <p className="text-xs text-gray-500 mt-1">{pendingTotal.toFixed(2)} د.ل</p>
            </div>
            <svg className="h-10 w-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">فواتير مصدرة</p>
              <p className="text-2xl font-bold text-green-600">{issuedCount}</p>
              <p className="text-xs text-gray-500 mt-1">{issuedTotal.toFixed(2)} د.ل</p>
            </div>
            <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي المبالغ</p>
              <p className="text-2xl font-bold text-blue-600">
                {grandTotal.toFixed(2)} د.ل
              </p>
            </div>
            <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">المحاسب</p>
              <p className="text-lg font-bold text-gray-900">{user?.fullName || 'غير معروف'}</p>
            </div>
            <svg className="h-10 w-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  رقم الفاتورة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  العميل / الهاتف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  المبلغ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  طريقة الدفع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading || isFetching ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? 'لا توجد نتائج للبحث' : 
                     receiptFilter === 'pending' ? 'لا توجد فواتير معلقة' :
                     receiptFilter === 'issued' ? 'لا توجد فواتير مصدرة' :
                     'لا توجد فواتير'}
                  </td>
                </tr>
              ) : (
                sales.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.invoiceNumber || `#${sale.id}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{sale.customer?.name || 'عميل نقدي'}</div>
                        {sale.customer?.phone && (
                          <div className="text-gray-500 text-xs">{sale.customer.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {sale.total.toFixed(2)} د.ل
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.paymentMethod === 'CASH' && 'نقدي'}
                      {sale.paymentMethod === 'BANK' && 'حوالة بنكية'}
                      {sale.paymentMethod === 'CARD' && 'بطاقة'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{new Date(sale.createdAt).toLocaleDateString('ar-LY')}</div>
                        <div className="text-xs">{new Date(sale.createdAt).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {sale.receiptIssued || issuedReceipts.has(sale.id) ? (
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md">
                            تم الإصدار
                          </div>
                          <button
                            onClick={() => printReceipt(sale)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            title="إعادة طباعة الإيصال"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleOpenChangeCashMethod(sale)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                            title="تغيير طريقة الدفع"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleCreateDispatchOrder(sale)}
                            disabled={isCreatingDispatch}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors"
                            title="إنشاء أمر صرف من المخزن"
                          >
                            <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            ارسال أمر صرف
                          </button>
                          <button
                            onClick={() => handleSendWhatsApp(sale)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                            title="إرسال الفاتورة على الواتساب"
                          >
                            <svg className="h-4 w-4 ml-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            واتساب
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleIssueReceipt(sale)}
                          disabled={isIssuing}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                        >
                          <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          إصدار إيصال قبض
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                disabled={currentPage === pagination.pages}
                className="mr-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  عرض <span className="font-medium">{(currentPage - 1) * pagination.limit + 1}</span> إلى{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pagination.limit, pagination.total)}
                  </span>{' '}
                  من <span className="font-medium">{pagination.total}</span> نتيجة
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={currentPage === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    التالي
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden print container for receipts - positioned off-screen but visible for html2canvas */}
      <div 
        ref={printRef} 
        className="fixed"
        style={{ 
          position: 'fixed',
          left: '-9999px',
          top: '0',
          visibility: currentSaleToPrint ? 'visible' : 'hidden',
          pointerEvents: 'none'
        }}
      >
        {currentSaleToPrint && <ReceiptPrint sale={currentSaleToPrint} />}
      </div>

      {/* Hidden container for WhatsApp invoice - positioned off-screen but visible for html2canvas */}
      <div 
        ref={whatsappRef} 
        className="fixed"
        style={{ 
          position: 'fixed',
          left: '-9999px',
          top: '0',
          visibility: currentSaleForWhatsApp ? 'visible' : 'hidden',
          pointerEvents: 'none',
          width: '210mm',
          backgroundColor: 'white'
        }}
      >
        {currentSaleForWhatsApp && <InvoicePrint sale={currentSaleForWhatsApp} />}
      </div>

      {/* مودال تغيير طريقة الدفع للفاتورة النقدية */}
      {showChangeCashMethodModal && saleToChangeMethod && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  <div>
                    <h3 className="text-lg font-bold">تغيير طريقة الدفع</h3>
                    <p className="text-amber-50 text-xs">فاتورة رقم {saleToChangeMethod.invoiceNumber || saleToChangeMethod.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowChangeCashMethodModal(false);
                    setSaleToChangeMethod(null);
                    setNewCashPaymentMethod('CASH');
                    setNewCashBankAccountId('');
                  }}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* معلومات الفاتورة */}
              <div className="mb-5 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs block">المبلغ</span>
                    <span className="text-green-600 font-bold">{saleToChangeMethod.total.toFixed(2)} د.ل</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">طريقة الدفع الحالية</span>
                    <span className={`font-bold ${
                      saleToChangeMethod.paymentMethod === 'CASH' ? 'text-green-600' :
                      saleToChangeMethod.paymentMethod === 'BANK' ? 'text-blue-600' : 'text-purple-600'
                    }`}>
                      {saleToChangeMethod.paymentMethod === 'CASH' ? '💵 نقداً' :
                       saleToChangeMethod.paymentMethod === 'BANK' ? '🏦 حوالة' : '💳 بطاقة'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
                    ⚠️ سيتم عكس حركة الخزينة القديمة وإضافة حركة جديدة
                  </p>
                </div>
              </div>

              <form onSubmit={handleChangeCashPaymentMethod} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    طريقة الدفع الجديدة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newCashPaymentMethod}
                    onChange={(e) => {
                      const v = e.target.value as "CASH" | "BANK" | "CARD";
                      setNewCashPaymentMethod(v);
                      if (v === 'CASH') setNewCashBankAccountId('');
                    }}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                  >
                    <option value="CASH">💵 نقداً (كاش)</option>
                    <option value="BANK">🏦 تحويل بنكي</option>
                    <option value="CARD">💳 بطاقة مصرفية</option>
                  </select>
                </div>

                {(newCashPaymentMethod === 'BANK' || newCashPaymentMethod === 'CARD') && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      الحساب المصرفي <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newCashBankAccountId}
                      onChange={(e) => setNewCashBankAccountId(e.target.value ? Number(e.target.value) : '')}
                      required
                      disabled={isTreasuriesLoading}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    >
                      <option value="">-- اختر الحساب --</option>
                      {bankAccounts.map((account: any) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.balance.toFixed(2)} د.ل)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingSalePaymentMethod}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUpdatingSalePaymentMethod ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        تأكيد التغيير
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangeCashMethodModal(false);
                      setSaleToChangeMethod(null);
                      setNewCashPaymentMethod('CASH');
                      setNewCashBankAccountId('');
                    }}
                    className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm transition-all hover:bg-gray-200"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </>
      )}
      
      {/* Credit Sales Tab Content */}
      {activeTab === 'credit' && (
        <>
          {/* Credit Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative md:col-span-2">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={creditSearchTerm}
                  onChange={(e) => {
                    setCreditSearchTerm(e.target.value);
                    setCreditCurrentPage(1);
                  }}
                  placeholder="بحث برقم الفاتورة أو اسم العميل..."
                  className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">حالة السداد</label>
                <select
                  value={filterFullyPaid}
                  onChange={(e) => {
                    setFilterFullyPaid(e.target.value as any);
                    setCreditCurrentPage(1);
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                >
                  <option value="all">الكل</option>
                  <option value="paid">مسددة</option>
                  <option value="unpaid">غير مسددة</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الشركة</label>
                <select
                  value={selectedCompanyId ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedCompanyId(value ? Number(value) : null);
                  }}
                  disabled={!user?.isSystemUser}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:opacity-50"
                >
                  {user?.isSystemUser && <option value="">كل الشركات</option>}
                  {(companiesData as any)?.data?.companies?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Credit Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">إجمالي فواتير آجلة</p>
              <p className="text-2xl font-bold text-purple-600">{creditStatsData?.data?.totalCreditSales ?? 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">مسددة بالكامل</p>
              <p className="text-2xl font-bold text-green-600">{creditStatsData?.data?.fullyPaidSales ?? 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">غير مسددة</p>
              <p className="text-2xl font-bold text-orange-600">{creditStatsData?.data?.unpaidSales ?? 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">إجمالي المبلغ</p>
              <p className="text-2xl font-bold text-blue-600">{formatArabicCurrency(creditStatsData?.data?.totalAmount ?? 0)}</p>
            </div>
          </div>

          {/* Credit Sales Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الفاتورة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العميل</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجمالي</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدفوع</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الباقي</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {creditSalesLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">جاري التحميل...</td>
                    </tr>
                  ) : filteredCreditSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">لا توجد فواتير آجلة</td>
                    </tr>
                  ) : (
                    filteredCreditSales.map((sale: CreditSale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.invoiceNumber || `#${sale.id}`}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{sale.customer?.name || 'عميل'}</div>
                            {sale.customer?.phone && <div className="text-gray-500 text-xs">{sale.customer.phone}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{formatArabicCurrency(sale.total)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-semibold">{formatArabicCurrency(sale.paidAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 font-semibold">{formatArabicCurrency(sale.remainingAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {sale.isFullyPaid ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">مسددة</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700">متبقي</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedCreditSale(sale);
                                setPaymentMethodForReceipt('CASH');
                                setBankAccountIdForReceipt('');
                                setShowPaymentModal(true);
                              }}
                              disabled={sale.isFullyPaid}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
                              title="إضافة دفعة"
                            >
                              قبض
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCreditSale(sale);
                                setShowPrintHistoryModal(true);
                              }}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                              title="طباعة سجل الدفعات"
                            >
                              سجل الدفعات
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Payment Modal */}
          {showPaymentModal && selectedCreditSale && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">فاتورة: {selectedCreditSale.invoiceNumber || selectedCreditSale.id}</div>
                    <div className="text-lg font-bold text-gray-900">قبض دفعة</div>
                  </div>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentMethodForReceipt('CASH');
                      setBankAccountIdForReceipt('');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="إغلاق"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleCreatePayment} className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                      <input
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={selectedCreditSale.remainingAmount}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">المتبقي: {formatArabicCurrency(selectedCreditSale.remainingAmount)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
                      <select
                        name="paymentMethod"
                        value={paymentMethodForReceipt}
                        onChange={(e) => {
                          const next = e.target.value as "CASH" | "BANK" | "CARD";
                          setPaymentMethodForReceipt(next);
                          if (next === 'CASH') {
                            setBankAccountIdForReceipt('');
                          }
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        required
                      >
                        <option value="CASH">كاش</option>
                        <option value="BANK">حوالة</option>
                        <option value="CARD">بطاقة</option>
                      </select>
                    </div>
                  </div>

                  {(paymentMethodForReceipt === 'BANK' || paymentMethodForReceipt === 'CARD') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الحساب المصرفي (الخزينة)</label>
                      <select
                        name="bankAccountId"
                        required
                        value={bankAccountIdForReceipt}
                        onChange={(e) => setBankAccountIdForReceipt(e.target.value ? Number(e.target.value) : '')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        disabled={isTreasuriesLoading}
                      >
                        <option value="">اختر الحساب المصرفي</option>
                        {bankAccounts.map((account: any) => (
                          <option key={account.id} value={account.id}>
                            {account.name} {account.bankName ? `- ${account.bankName}` : ''}
                          </option>
                        ))}
                      </select>
                      {treasuriesError && (
                        <p className="mt-1 text-xs text-red-600">تعذر تحميل الحسابات المصرفية</p>
                      )}
                      {!isTreasuriesLoading && !treasuriesError && bankAccounts.length === 0 && (
                        <p className="mt-1 text-xs text-gray-500">لا توجد حسابات مصرفية فعّالة في الخزينة</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                    <input
                      name="notes"
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      placeholder="مثال: تحويل مصرفي"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPaymentModal(false);
                        setPaymentMethodForReceipt('CASH');
                        setBankAccountIdForReceipt('');
                      }}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingPayment}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                    >
                      {isCreatingPayment ? 'جاري الحفظ...' : 'حفظ وطباعة'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Print Receipt Modal */}
          {showPrintReceiptModal && selectedPayment && selectedCreditSale && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">إيصال رقم: {selectedPayment.receiptNumber}</div>
                    <div className="text-lg font-bold text-gray-900">طباعة إيصال قبض</div>
                  </div>
                  <button
                    onClick={() => setShowPrintReceiptModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="إغلاق"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-4">
                  <div id="receipt-print-content">
                    <CreditPaymentReceiptPrint payment={selectedPayment} sale={selectedCreditSale} />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t mt-4">
                    <button
                      onClick={() => setShowPrintReceiptModal(false)}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      إغلاق
                    </button>
                    <button
                      onClick={() => {
                        printCreditReceipt();
                        setShowPrintReceiptModal(false);
                      }}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      طباعة
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Print Payments History Modal */}
          {showPrintHistoryModal && selectedCreditSale && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">فاتورة: {selectedCreditSale.invoiceNumber || selectedCreditSale.id}</div>
                    <div className="text-lg font-bold text-gray-900">طباعة سجل الدفعات</div>
                  </div>
                  <button
                    onClick={() => setShowPrintHistoryModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="إغلاق"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-4">
                  <div id="history-print-content">
                    <PaymentsHistoryPrint sale={selectedCreditSale} payments={selectedCreditSale.payments || []} />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t mt-4">
                    <button
                      onClick={() => setShowPrintHistoryModal(false)}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      إغلاق
                    </button>
                    <button
                      onClick={() => {
                        printPaymentsHistory();
                        setShowPrintHistoryModal(false);
                      }}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      طباعة
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

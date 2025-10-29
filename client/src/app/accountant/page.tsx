'use client';

import React, { useState, useRef } from 'react';
import { useGetCashSalesQuery, useIssueReceiptMutation, useApproveSaleMutation, Sale, salesApi } from '@/state/salesApi';
import { useCreateDispatchOrderMutation } from '@/state/warehouseApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { useToast } from '@/components/ui/Toast';
import { ReceiptPrint } from '@/components/sales/ReceiptPrint';
import { InvoicePrint } from '@/components/sales/InvoicePrint';
import { Search, Filter, X } from 'lucide-react';
import { useDispatch } from 'react-redux';
import html2canvas from 'html2canvas';
import { 
  useGetCreditSalesQuery,
  useGetCreditSalesStatsQuery,
  useCreatePaymentMutation,
  useDeletePaymentMutation,
  CreditSale,
  SalePayment
} from '@/state/salePaymentApi';
import { CreditPaymentReceiptPrint } from '@/components/sales/CreditPaymentReceiptPrint';
import { PaymentsHistoryPrint } from '@/components/sales/PaymentsHistoryPrint';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux';
import { useEffect } from 'react';

export default function AccountantWorkspace() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'cash' | 'credit'>('cash');
  const dispatch = useDispatch();
  
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
  
  // States for sale approval
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [saleToApprove, setSaleToApprove] = useState<Sale | null>(null);
  
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
      limit: 10,
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
  const [approveSale, { isLoading: isApproving }] = useApproveSaleMutation();
  
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
      // RTK Query سيقوم بتحديث الـ cache تلقائياً عبر invalidatesTags
    } catch (err: any) {
      showError(err?.data?.message || 'حدث خطأ أثناء إنشاء أمر الصرف');
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

    if (!saleType) {
      showError('يرجى اختيار نوع البيع');
      return;
    }

    if (saleType === 'CASH' && !paymentMethod) {
      showError('يرجى اختيار طريقة الدفع للبيع النقدي');
      return;
    }

    try {
      await approveSale({
        id: saleToApprove.id,
        saleType,
        paymentMethod: saleType === 'CASH' ? paymentMethod : undefined
      }).unwrap();

      success(`تم اعتماد الفاتورة ${saleToApprove.invoiceNumber || saleToApprove.id} وخصم المخزون بنجاح`);
      setShowApprovalModal(false);
      setSaleToApprove(null);
      
      // Refresh data
      refetch();
      refetchPending();
      refetchIssued();
    } catch (err: any) {
      showError(err?.data?.message || 'حدث خطأ أثناء اعتماد الفاتورة');
    }
  };
  
  // Credit sales functions
  const userFromRedux = useSelector((state: RootState) => state.auth.user);
  
  // Auto-select company for non-system users
  useEffect(() => {
    if (userFromRedux && !userFromRedux.isSystemUser && userFromRedux.companyId) {
      setSelectedCompanyId(userFromRedux.companyId);
    }
  }, [userFromRedux]);
  
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreditSale) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const amount = Number(formData.get('amount'));
    const paymentMethod = formData.get('paymentMethod') as "CASH" | "BANK" | "CARD";
    const notes = formData.get('notes') as string;

    if (amount <= 0) {
      showError('المبلغ يجب أن يكون أكبر من صفر');
      return;
    }

    if (amount > selectedCreditSale.remainingAmount) {
      showError(`المبلغ يتجاوز المبلغ المتبقي (${formatArabicCurrency(selectedCreditSale.remainingAmount)})`);
      return;
    }

    try {
      const result = await createPayment({
        saleId: selectedCreditSale.id,
        amount,
        paymentMethod,
        notes: notes || undefined
      }).unwrap();
      
      success('تم إنشاء إيصال القبض بنجاح');
      await refetchCreditSales();
      
      const newPayment = result.data.payment;
      const updatedSale = result.data.sale;
      
      setShowPaymentModal(false);
      
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
  
  const printCreditReceipt = (payment: any, sale: any) => {
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
  
  const printPaymentsHistory = (sale: CreditSale) => {
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
  
  // Credit sales stats
  const creditStats = creditStatsData?.data || { 
    totalSales: 0, 
    unpaidCount: 0, 
    paidCount: 0, 
    totalAmount: 0, 
    paidAmount: 0, 
    remainingAmount: 0 
  };

  // Credit sales data
  const stats = creditStats;
  const filteredCreditSales = creditSalesData?.data?.sales?.filter((sale: CreditSale) => {
    if (!selectedCompanyId) return true;
    return sale.companyId === selectedCompanyId;
  }) || [];
  const companiesLoading = false;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          مساحة عمل المحاسب
        </h1>
        <p className="text-gray-600 mt-2">إدارة شاملة لإيصالات القبض - المبيعات النقدية والآجلة في مكان واحد</p>
      </div>
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <nav className="flex gap-2" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('cash')}
              className={`${
                activeTab === 'cash'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              } flex-1 py-3 px-4 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>المبيعات النقدية</span>
              {pendingCount > 0 && (
                <span className={`${activeTab === 'cash' ? 'bg-white text-blue-600' : 'bg-orange-100 text-orange-600'} px-2 py-0.5 rounded-full text-xs font-bold`}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('credit')}
              className={`${
                activeTab === 'credit'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              } flex-1 py-3 px-4 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>المبيعات الآجلة</span>
              {creditStats.unpaidCount > 0 && (
                <span className={`${activeTab === 'credit' ? 'bg-white text-purple-600' : 'bg-red-100 text-red-600'} px-2 py-0.5 rounded-full text-xs font-bold`}>
                  {creditStats.unpaidCount}
                </span>
              )}
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
                          {sale.dispatchOrders && sale.dispatchOrders.length > 0 ? (
                            <button
                              disabled
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-400 cursor-not-allowed opacity-75"
                              title="تم إرسال أمر الصرف"
                            >
                              <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              تم إرسال أمر صرف
                            </button>
                          ) : (
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
                          )}
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
                      ) : sale.status === 'DRAFT' ? (
                        <button
                          onClick={() => handleApproveSale(sale)}
                          disabled={isApproving}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                        >
                          <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          اعتماد الفاتورة
                        </button>
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
                    className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {formatArabicNumber(1)}
                        </button>
                      );
                      if (startPage > 2) {
                        pages.push(
                          <span key="dots1" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
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
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === i
                              ? 'z-10 bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
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
                          <span key="dots2" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        );
                      }
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
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
                    className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </>
      )}
      
      {/* Credit Sales Tab Content */}
      {activeTab === 'credit' && (
      <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">إجمالي المبيعات الآجلة</p>
              <p className="text-2xl font-bold text-gray-900">{formatArabicNumber(stats.totalCreditSales || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">المبلغ الإجمالي</p>
              <p className="text-2xl font-bold text-purple-600">{formatArabicCurrency(stats.totalAmount || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">المبلغ المدفوع</p>
              <p className="text-2xl font-bold text-green-600">{formatArabicCurrency(stats.totalPaid || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">المبلغ المتبقي</p>
              <p className="text-2xl font-bold text-orange-600">{formatArabicCurrency(stats.totalRemaining || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="ابحث برقم الفاتورة أو اسم العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Company Filter */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <select
              value={selectedCompanyId || ''}
              onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : null)}
              disabled={false}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">{user?.isSystemUser ? 'جميع الشركات' : 'الشركة المحددة'}</option>
              {companiesLoading ? (
                <option disabled>جاري تحميل الشركات...</option>
              ) : companiesData?.data?.companies && companiesData.data.companies.length > 0 ? (
                // عرض جميع الشركات في القائمة
                companiesData.data.companies.map((company) => {
                  const isUserCompany = company.id === user?.companyId;
                  const isSystemUser = user?.isSystemUser;
                  const isAvailable = isSystemUser || isUserCompany;
                  
                  return (
                    <option 
                      key={company.id} 
                      value={company.id}
                      disabled={!isAvailable}
                    >
                      {company.name} ({company.code})
                      {!isAvailable ? ' - غير متاح' : ''}
                    </option>
                  );
                })
              ) : (
                <option disabled>لا توجد شركات متاحة</option>
              )}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <select
              value={filterFullyPaid}
              onChange={(e) => setFilterFullyPaid(e.target.value as 'all' | 'paid' | 'unpaid')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">جميع الفواتير</option>
              <option value="unpaid">غير مسددة</option>
              <option value="paid">مسددة بالكامل</option>
            </select>
          </div>

          {/* Export */}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رقم الفاتورة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الشركة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المبلغ الإجمالي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المبلغ المدفوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المبلغ المتبقي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCreditSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <div className="text-6xl mb-4">📋</div>
                      <p className="text-lg font-medium mb-2">لا توجد مبيعات آجلة</p>
                      <p className="text-sm">
                        {selectedCompanyId 
                          ? 'لا توجد مبيعات آجلة للشركة المختارة'
                          : filterFullyPaid !== 'all'
                          ? `لا توجد فواتير ${filterFullyPaid === 'paid' ? 'مسددة' : 'غير مسددة'}`
                          : searchTerm
                          ? 'لا توجد نتائج للبحث'
                          : 'ابدأ بإنشاء أول فاتورة مبيعات آجلة'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCreditSales.map((sale: CreditSale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sale.invoiceNumber || `#${sale.id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium text-blue-600">{sale.company?.name}</span>
                      <span className="text-xs text-gray-500">{sale.company?.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.customer?.name || 'غير محدد'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatArabicCurrency(sale.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {formatArabicCurrency(sale.paidAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                    {formatArabicCurrency(sale.remainingAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sale.isFullyPaid 
                        ? 'bg-green-100 text-green-800' 
                        : sale.paidAmount > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {sale.isFullyPaid ? 'مسددة' : sale.paidAmount > 0 ? 'مسددة جزئياً' : 'غير مسددة'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(sale.createdAt).toLocaleDateString('ar-LY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {!sale.isFullyPaid && (
                        <button
                          onClick={() => {
                            setSelectedCreditSale(sale);
                            setShowPaymentModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="إضافة دفعة"
                        >
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedCreditSale(sale);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="عرض التفاصيل"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {creditSalesData?.data?.pagination && filteredCreditSales.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCreditCurrentPage(p => Math.max(1, p - 1))}
                disabled={creditCurrentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                السابق
              </button>
              <button
                onClick={() => setCreditCurrentPage(p => Math.min(creditSalesData.data.pagination.pages, p + 1))}
                disabled={creditCurrentPage === creditSalesData.data.pagination.pages}
                className="mr-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  عرض <span className="font-medium">{formatArabicNumber(((creditCurrentPage - 1) * 10) + 1)}</span> إلى{' '}
                  <span className="font-medium">
                    {formatArabicNumber(Math.min(creditCurrentPage * 10, creditSalesData.data.pagination.total))}
                  </span>{' '}
                  من <span className="font-medium">{formatArabicNumber(creditSalesData.data.pagination.total)}</span> نتيجة
                  {selectedCompanyId && (
                    <span className="mr-2 text-purple-600 font-medium">
                      (للشركة: {companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.name})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="mr-1">السابق</span>
                  </button>
                  
                  {/* أرقام الصفحات */}
                  {(() => {
                    const pages = [];
                    const totalPages = creditSalesData.data.pagination.pages;
                    const maxVisible = 5;
                    
                    let startPage = Math.max(1, creditCurrentPage - Math.floor(maxVisible / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                    
                    if (endPage - startPage < maxVisible - 1) {
                      startPage = Math.max(1, endPage - maxVisible + 1);
                    }
                    
                    // الصفحة الأولى
                    if (startPage > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => setCreditCurrentPage(1)}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {formatArabicNumber(1)}
                        </button>
                      );
                      if (startPage > 2) {
                        pages.push(
                          <span key="dots1" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
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
                          onClick={() => setCreditCurrentPage(i)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            creditCurrentPage === i
                              ? 'z-10 bg-purple-600 border-purple-600 text-white'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
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
                          <span key="dots2" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        );
                      }
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setCreditCurrentPage(totalPages)}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {formatArabicNumber(totalPages)}
                        </button>
                      );
                    }
                    
                    return pages;
                  })()}
                  
                  <button
                    onClick={() => setCreditCurrentPage(p => Math.min(creditSalesData.data.pagination.pages, p + 1))}
                    disabled={creditCurrentPage === creditSalesData.data.pagination.pages}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Payment Modal */}
      {showPaymentModal && selectedCreditSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">إضافة دفعة جديدة</h3>
              
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-700">
                  <div className="flex justify-between mb-1">
                    <span>رقم الفاتورة:</span>
                    <span className="font-semibold">{selectedCreditSale.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>المبلغ الإجمالي:</span>
                    <span className="font-semibold">{formatArabicCurrency(selectedCreditSale.total)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>المبلغ المدفوع:</span>
                    <span className="font-semibold text-green-600">{formatArabicCurrency(selectedCreditSale.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المبلغ المتبقي:</span>
                    <span className="font-semibold text-red-600">{formatArabicCurrency(selectedCreditSale.remainingAmount)}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreatePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المبلغ المدفوع *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    min="0.01"
                    max={selectedCreditSale.remainingAmount}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل المبلغ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    طريقة الدفع *
                  </label>
                  <select
                    name="paymentMethod"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CASH">كاش</option>
                    <option value="BANK">حوالة مصرفية</option>
                    <option value="CARD">بطاقة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ملاحظات
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ملاحظات إضافية (اختياري)"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={isCreatingPayment}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {isCreatingPayment ? 'جاري الحفظ...' : 'حفظ الدفعة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedCreditSale(null);
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedCreditSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">تفاصيل الفاتورة</h3>
              
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm text-gray-600">رقم الفاتورة:</span>
                  <div className="font-semibold">{selectedCreditSale.invoiceNumber}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">العميل:</span>
                  <div className="font-semibold">{selectedCreditSale.customer?.name || 'غير محدد'}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">المبلغ الإجمالي:</span>
                  <div className="font-semibold">{formatArabicCurrency(selectedCreditSale.total)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">المبلغ المتبقي:</span>
                  <div className="font-semibold text-red-600">{formatArabicCurrency(selectedCreditSale.remainingAmount)}</div>
                </div>
              </div>

              {/* Payments History */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">سجل الدفعات ({formatArabicNumber(selectedCreditSale.payments?.length || 0)})</h4>
                  {selectedCreditSale.payments && selectedCreditSale.payments.length > 0 && (
                    <button
                      onClick={() => printPaymentsHistory(selectedCreditSale)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                    >
                      🖨️ طباعة سجل الدفعات
                    </button>
                  )}
                </div>
                {selectedCreditSale.payments && selectedCreditSale.payments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCreditSale.payments.map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-semibold">{formatArabicCurrency(payment.amount)}</div>
                          <div className="text-sm text-gray-600">
                            {payment.receiptNumber} - {new Date(payment.paymentDate).toLocaleDateString('ar-LY')}
                          </div>
                          {payment.notes && <div className="text-xs text-gray-500">{payment.notes}</div>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => printCreditReceipt(payment, selectedCreditSale)}
                            className="text-blue-600 hover:text-blue-900"
                            title="طباعة إيصال القبض"
                          >
                            🖨️
                          </button>
                          <button
                            onClick={() => handleDeletePayment(payment)}
                            className="text-red-600 hover:text-red-900"
                            title="حذف"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">لا توجد دفعات</p>
                )}
              </div>

              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCreditSale(null);
                }}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Print Receipt Modal */}
      {showPrintReceiptModal && selectedPayment && selectedCreditSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">🖨️ معاينة إيصال القبض</h2>
              <button onClick={() => setShowPrintReceiptModal(false)} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                <div id="receipt-print-content" style={{ transform: 'scale(0.5)', transformOrigin: 'top center', width: '200%' }}>
                  <CreditPaymentReceiptPrint payment={selectedPayment} sale={selectedCreditSale} />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button onClick={() => setShowPrintReceiptModal(false)} className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                إلغاء
              </button>
              <button onClick={() => selectedPayment && selectedCreditSale && printCreditReceipt(selectedPayment, selectedCreditSale)} className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Print History Modal */}
      {showPrintHistoryModal && selectedCreditSale && selectedCreditSale.payments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">🖨️ معاينة سجل الدفعات</h2>
              <button onClick={() => setShowPrintHistoryModal(false)} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                <div id="history-print-content" style={{ transform: 'scale(0.5)', transformOrigin: 'top center', width: '200%' }}>
                  <PaymentsHistoryPrint sale={selectedCreditSale} payments={selectedCreditSale.payments} />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button onClick={() => setShowPrintHistoryModal(false)} className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                إلغاء
              </button>
              <button onClick={() => selectedCreditSale && printPaymentsHistory(selectedCreditSale)} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Approval Modal */}
      {showApprovalModal && saleToApprove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">✅ اعتماد الفاتورة</h2>
              <button 
                onClick={() => setShowApprovalModal(false)} 
                className="text-white hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleApprovalSubmit} className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  <span className="font-medium">رقم الفاتورة:</span> {saleToApprove.invoiceNumber || saleToApprove.id}
                </p>
                <p className="text-gray-700 mb-2">
                  <span className="font-medium">العميل:</span> {saleToApprove.customer?.name || 'غير محدد'}
                </p>
                <p className="text-gray-700 mb-4">
                  <span className="font-medium">المجموع:</span> {saleToApprove.total.toFixed(2)} د.ل
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع البيع *
                </label>
                <select
                  name="saleType"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر نوع البيع</option>
                  <option value="CASH">نقدي</option>
                  <option value="CREDIT">آجل</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  طريقة الدفع (للبيع النقدي)
                </label>
                <select
                  name="paymentMethod"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر طريقة الدفع</option>
                  <option value="CASH">كاش</option>
                  <option value="BANK">حوالة مصرفية</option>
                  <option value="CARD">بطاقة</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 طريقة الدفع مطلوبة فقط للبيع النقدي
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isApproving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isApproving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      جاري الاعتماد...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      اعتماد وخصم المخزون
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

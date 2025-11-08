'use client';

import React, { useState, useRef } from 'react';
import { useGetSalesQuery, useGetCashSalesQuery, useIssueReceiptMutation, useApproveSaleMutation, useUpdateSaleMutation, Sale, salesApi } from '@/state/salesApi';
import { useCreateDispatchOrderMutation } from '@/state/warehouseApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { useGetProductsQuery } from '@/state/productsApi';
import { useToast } from '@/components/ui/Toast';
import { ReceiptPrint } from '@/components/sales/ReceiptPrint';
import { InvoicePrint } from '@/components/sales/InvoicePrint';
import { Search, Filter, X, DollarSign, FileText } from 'lucide-react';
import { useDispatch } from 'react-redux';
import html2canvas from 'html2canvas';
import { 
  useGetCreditSalesStatsQuery,
  useCreatePaymentMutation,
  useDeletePaymentMutation,
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
  const [currentSaleToPrint, setCurrentSaleToPrint] = useState<Sale | null>(null);
  const [currentSaleForWhatsApp, setCurrentSaleForWhatsApp] = useState<Sale | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const whatsappRef = useRef<HTMLDivElement>(null);
  const historyPrintRef = useRef<HTMLDivElement>(null);
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
      companyId: activeCompanyId, // ✅ فلتر حسب الشركة النشطة
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
  
  // جلب الفواتير المعلقة للإحصائيات (فلتر حسب الشركة)
  const { data: pendingData, refetch: refetchPending } = useGetSalesQuery(
    {
      page: 1,
      limit: 1000,
      companyId: activeCompanyId, // ✅ فلتر حسب الشركة
      receiptIssued: false,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    },
    {
      refetchOnMountOrArgChange: 5,
      refetchOnFocus: true,
      refetchOnReconnect: true
    }
  );
  
  // جلب الفواتير المصدرة للإحصائيات (فلتر حسب الشركة)
  const { data: issuedData, refetch: refetchIssued } = useGetSalesQuery(
    {
      page: 1,
      limit: 1000,
      companyId: activeCompanyId, // ✅ فلتر حسب الشركة
      receiptIssued: true,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    },
    {
      refetchOnMountOrArgChange: 5,
      refetchOnFocus: true,
      refetchOnReconnect: true
    }
  );

  const [issueReceipt, { isLoading: isIssuing }] = useIssueReceiptMutation();
  const [createDispatchOrder, { isLoading: isCreatingDispatch }] = useCreateDispatchOrderMutation();
  const [approveSale, { isLoading: isApproving }] = useApproveSaleMutation();
  const [updateSale, { isLoading: isUpdating }] = useUpdateSaleMutation();
  
  // Credit sales API calls (استخدام نفس endpoint مع فلتر الشركة)
  // بما أن جميع الفواتير آجلة الآن، نستخدم salesData مباشرة
  const { data: creditStatsData } = useGetCreditSalesStatsQuery();
  const [createPayment, { isLoading: isCreatingPayment }] = useCreatePaymentMutation();
  const [deletePayment] = useDeletePaymentMutation();
  const { data: companiesData } = useGetCompaniesQuery({ limit: 1000 });
  const { data: productsData } = useGetProductsQuery({ limit: 1000 });

  /**
   * طباعة الفاتورة - Print Invoice
   * يستخدم React component بدلاً من HTML string
   */
  const printReceipt = (sale: Sale) => {
    setCurrentSaleToPrint(sale);
    
    // الانتظار حتى يتم render المكون
    setTimeout(() => {
      if (!printRef.current) {
        showError('فشل في تحميل الفاتورة');
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
          <title>فاتورة مبيعات - ${sale.invoiceNumber || sale.id}</title>
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
            
            /* تنسيق الطباعة من مكون InvoicePrint */
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
      await Promise.all([refetch(), refetchPending(), refetchIssued()]);
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
      refetchPending();
      refetchIssued();
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
    refetchPending();
    refetchIssued();
    setCurrentPage(1); // إعادة تعيين الصفحة للأولى
  }, [activeCompanyId]);
  
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreditSale) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const amount = Number(formData.get('amount'));
    const paymentMethod = formData.get('paymentMethod') as "CASH" | "BANK" | "CARD";
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

    try {
      const result = await createPayment({
        saleId: selectedCreditSale.id,
        amount,
        paymentMethod,
        notes: notes || undefined
      }).unwrap();
      
      success('تم إنشاء إيصال القبض بنجاح');
      await refetch();
      
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
        refetch();
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
  
  // الإحصائيات
  const pendingCount = pendingData?.data?.pagination?.total || 0;
  const issuedCount = issuedData?.data?.pagination?.total || 0;
  const totalCount = pendingCount + issuedCount;
  
  const pendingSales = pendingData?.data?.sales || [];
  const issuedSales = issuedData?.data?.sales || [];
  const pendingTotal = pendingSales.reduce((sum, sale) => sum + sale.total, 0);
  const issuedTotal = issuedSales.reduce((sum, sale) => sum + sale.total, 0);
  const grandTotal = pendingTotal + issuedTotal;
  
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          مساحة عمل المحاسب
        </h1>
        <p className="text-gray-600 mt-2">إدارة شاملة لفواتير المبيعات الآجلة - مصنفة حسب الشركة</p>
      </div>
      
      {/* Tabs حسب الشركة */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <nav className="flex gap-2" aria-label="Tabs">
            {companiesData?.data?.companies?.map((company: any) => {
              // حساب عدد الفواتير المبدئية للشركة النشطة فقط
              const companyPendingCount = company.id === activeCompanyId ? pendingCount : 0;
              
              return (
            <button
                  key={company.id}
                  onClick={() => {
                    setActiveCompanyId(company.id);
                    setCurrentPage(1);
                  }}
              className={`${
                    activeCompanyId === company.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              } flex-1 py-3 px-4 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
                  <span>{company.name}</span>
                  {companyPendingCount > 0 && (
                    <span className={`${activeCompanyId === company.id ? 'bg-white text-blue-600' : 'bg-orange-100 text-orange-600'} px-2 py-0.5 rounded-full text-xs font-bold`}>
                      {companyPendingCount}
                </span>
              )}
            </button>
              );
            })}
          </nav>
        </div>
      </div>
      
      {/* Company Sales Content */}
      {(
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
                  الإجمالي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  المدفوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الباقي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading || isFetching ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
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
                      {sale.status === 'DRAFT' && (
                        <span className="mr-2 text-xs text-yellow-600">(مبدئية)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{sale.customer?.name || 'عميل نقدي'}</div>
                        {sale.customer?.phone && (
                          <div className="text-gray-500 text-xs">{sale.customer.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatArabicCurrency(sale.total || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatArabicCurrency(sale.paidAmount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-orange-600">
                      {formatArabicCurrency(sale.remainingAmount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{new Date(sale.createdAt).toLocaleDateString('ar-LY')}</div>
                        <div className="text-xs">{new Date(sale.createdAt).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-1">
                        {/* للفواتير المبدئية: فقط زر اعتماد */}
                        {sale.status === 'DRAFT' ? (
                          <button
                            onClick={() => {
                              setSaleToApprove(sale);
                              setShowApprovalModal(true);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                            title="اعتماد الفاتورة"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            اعتماد
                          </button>
                        ) : (
                          <>
                            {/* قبض مبلغ - للفواتير المعتمدة فقط */}
                            {(sale.remainingAmount || 0) > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedCreditSale(sale);
                                  setShowPaymentModal(true);
                                }}
                                className="text-green-600 hover:text-green-900 p-1.5 rounded-md hover:bg-green-50 transition-colors"
                                title="قبض مبلغ"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* الإيصالات */}
                            {sale.payments && sale.payments.length > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedCreditSale(sale);
                                  setShowPrintHistoryModal(true);
                                }}
                                className="text-purple-600 hover:text-purple-900 p-1.5 rounded-md hover:bg-purple-50 transition-colors relative"
                                title="عرض الإيصالات"
                              >
                                <FileText className="w-4 h-4" />
                                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                  {sale.payments.length}
                                </span>
                              </button>
                            )}
                              
                            {/* أمر صرف المخزن - لا يظهر للفواتير التلقائية */}
                            {!sale.isAutoGenerated && (
                              sale.dispatchOrders && sale.dispatchOrders.length > 0 ? (
                                <button
                                  disabled
                                  className="text-gray-400 p-1.5 rounded-md cursor-not-allowed"
                                  title="تم إصدار أمر الصرف"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleCreateDispatchOrder(sale)}
                                  disabled={isCreatingDispatch}
                                  className="text-orange-600 hover:text-orange-900 p-1.5 rounded-md hover:bg-orange-50 transition-colors disabled:opacity-50"
                                  title="أمر صرف المخزن"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </button>
                              )
                            )}
                            
                            {/* طباعة الفاتورة */}
                            <button
                              onClick={() => printReceipt(sale)}
                              className="text-gray-600 hover:text-gray-900 p-1.5 rounded-md hover:bg-gray-50 transition-colors"
                              title="طباعة الفاتورة"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                            
                            {/* واتساب */}
                            <button
                              onClick={() => handleSendWhatsApp(sale)}
                              className="text-green-600 hover:text-green-900 p-1.5 rounded-md hover:bg-green-50 transition-colors"
                              title="إرسال على واتساب"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
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

      {/* Hidden print container for invoices - positioned off-screen but visible for html2canvas */}
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
        {currentSaleToPrint && <InvoicePrint sale={currentSaleToPrint} />}
      </div>

      {/* Hidden print container for payments history */}
      <div 
        ref={historyPrintRef} 
        className="fixed"
        style={{ 
          position: 'fixed',
          left: '-9999px',
          top: '0',
          visibility: selectedCreditSale && selectedCreditSale.payments && selectedCreditSale.payments.length > 0 ? 'visible' : 'hidden',
          pointerEvents: 'none'
        }}
      >
        {selectedCreditSale && selectedCreditSale.payments && selectedCreditSale.payments.length > 0 && (
          <PaymentsHistoryPrint 
            sale={selectedCreditSale as any} 
            payments={selectedCreditSale.payments as any} 
          />
        )}
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
      

      {/* Payment Modal */}
      {showPaymentModal && selectedCreditSale && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
                  قبض مبلغ من العميل
                </h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

            <div className="p-6">
              {/* معلومات الفاتورة */}
              <div className="mb-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                  معلومات الفاتورة
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">رقم الفاتورة:</span>
                    <span className="font-bold text-gray-900">{selectedCreditSale.invoiceNumber}</span>
                    </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">العميل:</span>
                    <span className="font-semibold text-gray-900">{selectedCreditSale.customer?.name || 'غير محدد'}</span>
        </div>
                  <div className="h-px bg-blue-200 my-2"></div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">صافي الفاتورة:</span>
                    <span className="font-bold text-lg text-gray-900">{formatArabicCurrency(selectedCreditSale.total)}</span>
            </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">المدفوع سابقاً:</span>
                    <span className="font-bold text-blue-600">{formatArabicCurrency(selectedCreditSale.paidAmount || 0)}</span>
              </div>
                  <div className="flex justify-between items-center bg-blue-100 -mx-4 px-4 py-2 rounded">
                    <span className="text-gray-700 font-semibold">المبلغ المتبقي:</span>
                    <span className="font-bold text-xl text-blue-600">{formatArabicCurrency(selectedCreditSale.remainingAmount || 0)}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreatePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المبلغ المدفوع *
                  </label>
                  <div className="relative">
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    min="0.01"
                    max={selectedCreditSale.remainingAmount}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل المبلغ"
                      onInput={(e) => {
                        const input = e.target as HTMLInputElement;
                        const value = Number(input.value);
                        const remaining = selectedCreditSale.remainingAmount || 0;
                        
                        if (value > remaining) {
                          input.setCustomValidity(`المبلغ لا يمكن أن يتجاوز ${formatArabicCurrency(remaining)}`);
                        } else if (value <= 0) {
                          input.setCustomValidity('المبلغ يجب أن يكون أكبر من صفر');
                        } else {
                          input.setCustomValidity('');
                        }
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    الحد الأقصى: {formatArabicCurrency(selectedCreditSale.remainingAmount || 0)}
                  </p>
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
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg disabled:opacity-50 font-semibold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isCreatingPayment ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        تأكيد وإصدار إيصال
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedCreditSale(null);
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
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
                  <div className="font-semibold text-red-600">{formatArabicCurrency(selectedCreditSale.remainingAmount || 0)}</div>
                </div>
              </div>

              {/* Payments History */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">سجل الدفعات ({formatArabicNumber(selectedCreditSale.payments?.length || 0)})</h4>
                  {selectedCreditSale.payments && selectedCreditSale.payments.length > 0 && (
                    <button
                      onClick={() => printPaymentsHistory(selectedCreditSale as any)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                    >
                      🖨️ طباعة سجل الدفعات
                    </button>
                  )}
                </div>
                {selectedCreditSale.payments && selectedCreditSale.payments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCreditSale.payments.map((payment: any) => (
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[95vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">🖨️ معاينة إيصال القبض</h2>
              <button onClick={() => setShowPrintReceiptModal(false)} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(95vh-140px)] bg-gray-100">
              <div className="bg-white rounded shadow-lg max-w-[210mm] mx-auto" style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                <CreditPaymentReceiptPrint payment={selectedPayment} sale={selectedCreditSale as any} />
                </div>
              </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end gap-3 border-t">
              <button 
                onClick={() => setShowPrintReceiptModal(false)} 
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={() => selectedPayment && selectedCreditSale && printCreditReceipt(selectedPayment, selectedCreditSale)} 
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                طباعة الإيصال
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Print History Modal */}
      {showPrintHistoryModal && selectedCreditSale && selectedCreditSale.payments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">إيصالات القبض للفاتورة: {selectedCreditSale.invoiceNumber}</h2>
              <button onClick={() => setShowPrintHistoryModal(false)} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* قائمة الإيصالات */}
              <div className="space-y-4">
                {selectedCreditSale.payments.map((payment: any, index: number) => (
                  <div key={payment.id} className="border-2 border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">إيصال قبض #{payment.receiptNumber}</h3>
                        <p className="text-sm text-gray-600">التاريخ: {new Date(payment.paymentDate).toLocaleDateString('ar-LY')}</p>
                </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        {formatArabicCurrency(payment.amount)}
                      </span>
              </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">طريقة الدفع</p>
                        <p className="text-sm font-medium text-gray-900">
                          {payment.paymentMethod === 'CASH' ? 'نقداً' :
                           payment.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' :
                           payment.paymentMethod === 'CHECK' ? 'شيك' : payment.paymentMethod}
                        </p>
                      </div>
                      {payment.notes && (
                        <div>
                          <p className="text-xs text-gray-500">ملاحظات</p>
                          <p className="text-sm font-medium text-gray-900">{payment.notes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowPrintReceiptModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        طباعة هذا الإيصال
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button onClick={() => setShowPrintHistoryModal(false)} className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                إغلاق
              </button>
              <button onClick={() => selectedCreditSale && printPaymentsHistory(selectedCreditSale as any)} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                طباعة كل الإيصالات
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

      {/* Sale Edit Modal */}
      {showEditModal && saleToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-bold">✏️ تعديل الفاتورة</h2>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditLines([]);
                }} 
                className="text-white hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6">
              {/* معلومات الفاتورة */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <span className="font-medium">رقم الفاتورة الحالي:</span> {saleToEdit.invoiceNumber || saleToEdit.id}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">المجموع القديم:</span> {formatArabicCurrency(saleToEdit.total)}
                </p>
              </div>

              {/* رقم الفاتورة */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الفاتورة
                </label>
                <input
                  type="text"
                  name="invoiceNumber"
                  defaultValue={saleToEdit.invoiceNumber || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="أدخل رقم الفاتورة"
                />
              </div>

              {/* العميل */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  العميل
                </label>
                <select
                  name="customerId"
                  defaultValue={saleToEdit.customerId || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">غير محدد</option>
                  {salesData?.data?.sales
                    ?.map(s => s.customer)
                    .filter((customer, index, self) => 
                      customer && self.findIndex(c => c?.id === customer.id) === index
                    )
                    .map(customer => customer && (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))
                  }
                </select>
              </div>

              {/* قسم الأصناف */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    الأصناف ({editLines.length})
                  </label>
                  <button
                    type="button"
                    onClick={addEditLine}
                    className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                  >
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    إضافة صنف
                  </button>
                </div>

                {editLines.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500">لا توجد أصناف. انقر على "إضافة صنف" لإضافة صنف جديد</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {editLines.map((line, index) => {
                      const product = productsData?.data?.products?.find(p => p.id === line.productId);
                      const unitsPerBox = product?.unitsPerBox ? Number(product.unitsPerBox) : null;
                      const totalUnits = unitsPerBox && line.qty ? line.qty * unitsPerBox : null;
                      const pricePerUnit = unitsPerBox && line.unitPrice ? line.unitPrice / unitsPerBox : null;
                      const subtotal = line.qty * line.unitPrice;
                      
                      return (
                      <div key={index} className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm hover:border-orange-300 transition-colors">
                        <div className="grid grid-cols-12 gap-3 items-start">
                          {/* اختيار الصنف */}
                          <div className="col-span-5">
                            <label className="block text-xs font-medium text-gray-700 mb-1">الصنف</label>
                            <select
                              value={line.productId}
                              onChange={(e) => updateEditLine(index, 'productId', Number(e.target.value))}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                              required
                            >
                              <option value={0}>اختر صنف...</option>
                              {productsData?.data?.products?.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name} - {product.sku}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* الكمية */}
                          <div className="col-span-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              الكمية {product?.unit === 'صندوق' && '(صندوق)'}
                            </label>
                            <input
                              type="number"
                              value={line.qty}
                              onChange={(e) => updateEditLine(index, 'qty', Number(e.target.value))}
                              min="0.01"
                              step="0.01"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                              required
                            />
                            {totalUnits && (
                              <p className="text-xs text-blue-600 mt-0.5">
                                📏 {formatArabicNumber(totalUnits.toFixed(2))} متر
                              </p>
                            )}
                          </div>

                          {/* السعر */}
                          <div className="col-span-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              السعر/متر
                            </label>
                            <input
                              type="number"
                              value={pricePerUnit || 0}
                              onChange={(e) => updatePriceFromUnitPrice(index, Number(e.target.value))}
                              min="0.01"
                              step="0.01"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                              required
                            />
                            {unitsPerBox && line.unitPrice > 0 && (
                              <p className="text-xs text-blue-600 mt-0.5">
                                📦 {formatArabicCurrency(line.unitPrice)}/صندوق
                              </p>
                            )}
                          </div>

                          {/* زر الحذف */}
                          <div className="col-span-1 flex items-end">
                            <button
                              type="button"
                              onClick={() => removeEditLine(index)}
                              className="w-full p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="حذف"
                            >
                              <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        {/* معلومات تفصيلية */}
                        <div className="mt-3 pt-3 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-green-50 p-2 rounded">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {/* العمود الأيسر */}
                            <div className="space-y-1">
                              {product?.unit && (
                                <p className="text-gray-600">
                                  <span className="font-medium">الوحدة:</span> {product.unit}
                                </p>
                              )}
                              {unitsPerBox && (
                                <p className="text-gray-600">
                                  <span className="font-medium">متر/صندوق:</span> {formatArabicNumber(unitsPerBox.toFixed(2))}
                                </p>
                              )}
                              {pricePerUnit && (
                                <p className="text-green-700 font-medium">
                                  السعر/متر: {formatArabicCurrency(pricePerUnit)}
                                </p>
                              )}
                            </div>
                            
                            {/* العمود الأيمن */}
                            <div className="space-y-1 text-left">
                              <p className="text-lg font-bold text-blue-700">
                                المجموع: {formatArabicCurrency(subtotal)}
                              </p>
                              {totalUnits && (
                                <p className="text-gray-600">
                                  <span className="font-medium">إجمالي الأمتار:</span> {formatArabicNumber(totalUnits.toFixed(2))} م
                                </p>
                              )}
                              {unitsPerBox && line.unitPrice > 0 && (
                                <p className="text-blue-600">
                                  السعر/صندوق: {formatArabicCurrency(line.unitPrice)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>

              {/* المجموع الجديد */}
              {editLines.length > 0 && (
                <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-700">المجموع الجديد:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatArabicCurrency(editLines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0))}
                    </span>
                  </div>
                </div>
              )}

              {/* ملاحظة تحذيرية */}
              <div className="bg-amber-50 border-r-4 border-amber-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-amber-700">
                      <strong>تنبيه:</strong> عند تعديل الأصناف أو الكميات، سيتم إرجاع المخزون القديم وخصم المخزون الجديد. تأكد من توفر المخزون الكافي.
                    </p>
                  </div>
                </div>
              </div>

              {/* الأزرار */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditLines([]);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || editLines.length === 0}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      جار التعديل...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      حفظ التعديلات
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

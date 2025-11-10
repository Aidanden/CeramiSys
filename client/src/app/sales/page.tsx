"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  useGetSalesQuery, 
  useCreateSaleMutation, 
  useDeleteSaleMutation,
  useUpdateSaleMutation,
  useGetCustomersQuery,
  useCreateCustomerMutation,
  Sale,
  Customer,
  CreateSaleRequest,
  CreateCustomerRequest
} from '@/state/salesApi';
import { 
  useCreateComplexInterCompanySaleMutation,
  CreateComplexInterCompanySaleRequest,
  ComplexInterCompanySaleLine
} from '@/state/complexInterCompanySalesApi';
import { useGetProductsQuery, productsApi } from '@/state/productsApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { formatArabicNumber, formatArabicCurrency, formatArabicQuantity, formatArabicArea } from '@/utils/formatArabicNumbers';
import { PrintModal } from '@/components/sales/PrintModal';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/app/redux';
import useNotifications from '@/hooks/useNotifications';
import { useToast } from '@/components/ui/Toast';
import SaleLineItem from './SaleLineItem';

// نوع محلي للسطر مع الحقول الإضافية
interface LocalSaleLine {
  productId: number;
  qty: number;
  unitPrice: number;
  isFromParentCompany?: boolean;
  parentUnitPrice?: number;
  branchUnitPrice?: number;
}

// نوع محلي لطلب إنشاء المبيعات
interface LocalCreateSaleRequest {
  customerId?: number;
  notes?: string;
  lines: LocalSaleLine[];
}

const SalesPage = () => {
  const notifications = useNotifications();
  const { confirm } = useToast();
  const dispatch = useDispatch();
  
  // Get current user info
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { data: currentUserData, isLoading: userLoading } = useGetCurrentUserQuery();
  
  // استخدام البيانات من API إذا كانت متوفرة، وإلا من Redux
  const user = currentUserData?.data || currentUser;
  
  // States
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [customerPhoneFilter, setCustomerPhoneFilter] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [showCreateSaleModal, setShowCreateSaleModal] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  const [editLines, setEditLines] = useState<Array<{
    productId: number;
    qty: number;
    unitPrice: number;
  }>>([]);
  
  // Sale form states
  const [saleForm, setSaleForm] = useState<LocalCreateSaleRequest>({
    customerId: undefined,
    notes: '', // ملاحظات اختيارية
    lines: []
  });

  // Product search states
  const [productCodeSearch, setProductCodeSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductFromSearch, setSelectedProductFromSearch] = useState<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const qrScannerRef = useRef<any>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // إغلاق القائمة المنسدلة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.product-dropdown-container')) {
        setShowProductDropdown(false);
      }
    };

    if (showProductDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProductDropdown]);

  // Initialize QR Scanner
  useEffect(() => {
    // التأكد من أننا في بيئة المتصفح
    if (typeof window === 'undefined') return;
    
    if (showQRScanner && !qrScannerRef.current) {
      console.log('🔍 بدء تحميل ماسح QR Code...');
      
      // بدء التهيئة فوراً بدون تأخير
      (async () => {
        try {
          // التحقق من وجود الـ div
          const qrReaderElement = document.getElementById('qr-reader');
          if (!qrReaderElement) {
            console.error('❌ عنصر qr-reader غير موجود في DOM');
            notifications.custom.error('خطأ', 'عنصر الماسح غير موجود. حاول مرة أخرى.');
            return;
          }
          
          console.log('✅ عنصر qr-reader موجود');
          
          // Dynamic import لتجنب مشاكل SSR
          const { Html5Qrcode } = await import('html5-qrcode');
          
          console.log('✅ تم تحميل المكتبة Html5Qrcode');
          
          // إنشاء ماسح جديد
          const html5QrCode = new Html5Qrcode('qr-reader');
          
          console.log('📷 طلب الوصول للكاميرا...');
          
          // الحصول على قائمة الكاميرات المتاحة
          const devices = await Html5Qrcode.getCameras();
          
          if (devices && devices.length > 0) {
            console.log('✅ تم العثور على كاميرات:', devices.length);
            
            // اختيار الكاميرا الخلفية إذا كانت متاحة
            let cameraId = devices[0].id;
            
            // البحث عن الكاميرا الخلفية
            const backCamera = devices.find(device => 
              device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('rear') ||
              device.label.toLowerCase().includes('environment')
            );
            
            if (backCamera) {
              cameraId = backCamera.id;
              console.log('📷 استخدام الكاميرا الخلفية:', backCamera.label);
            } else {
              console.log('📷 استخدام الكاميرا الافتراضية:', devices[0].label);
            }
            
            // بدء المسح
            await html5QrCode.start(
              cameraId,
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
              },
              (decodedText, decodedResult) => {
                console.log('✅ تم مسح QR Code:', decodedText);
                
                // إيقاف المسح
                html5QrCode.stop().then(() => {
                  console.log('⏹️ تم إيقاف الماسح');
                  handleQRScan(decodedText);
                  qrScannerRef.current = null;
                  setShowQRScanner(false);
                }).catch((err) => {
                  console.error('خطأ في إيقاف الماسح:', err);
                });
              },
              (errorMessage) => {
                // تجاهل أخطاء المسح العادية
              }
            );
            
            qrScannerRef.current = html5QrCode;
            console.log('✅ تم تهيئة الماسح بنجاح وبدء المسح');
            
          } else {
            console.error('❌ لم يتم العثور على كاميرات');
            notifications.custom.error('خطأ', 'لم يتم العثور على كاميرا. تأكد من السماح بالوصول للكاميرا.');
          }
          
        } catch (error: any) {
          console.error('❌ خطأ في تهيئة الماسح:', error);
          
          if (error.name === 'NotAllowedError') {
            notifications.custom.error(
              'تم رفض الوصول للكاميرا',
              'يجب السماح للمتصفح بالوصول إلى الكاميرا. اضغط على أيقونة القفل في شريط العنوان وامنح الإذن.'
            );
          } else if (error.name === 'NotFoundError') {
            notifications.custom.error('خطأ', 'لم يتم العثور على كاميرا متصلة بالجهاز.');
          } else if (error.message && error.message.includes('secure context')) {
            notifications.custom.error(
              '🔒 مطلوب اتصال آمن (HTTPS)',
              'الكاميرا تعمل فقط مع HTTPS أو localhost. يجب تفعيل SSL على الخادم أو استخدام localhost للتطوير.'
            );
          } else {
            notifications.custom.error('خطأ', `فشل في تشغيل الكاميرا: ${error.message || 'خطأ غير معروف'}`);
          }
        }
      })();
    }

    return () => {
      if (qrScannerRef.current) {
        console.log('🧹 تنظيف الماسح...');
        qrScannerRef.current.stop().catch(() => {});
        qrScannerRef.current = null;
      }
    };
  }, [showQRScanner]);

  // حساب المجموع بناءً على نوع الوحدة
  const calculateLineTotal = (line: any) => {
    const product = productsData?.data?.products?.find(p => p.id === line.productId);
    if (!product) return line.qty * line.unitPrice;
    
    // إذا كانت الوحدة صندوق، اضرب في عدد الأمتار
    if (product.unit === 'صندوق' && product.unitsPerBox) {
      const totalMeters = line.qty * Number(product.unitsPerBox);
      return totalMeters * line.unitPrice;
    }
    
    // للوحدات الأخرى (كيس، قطعة، لتر)
    return line.qty * line.unitPrice;
  };

  // دالة مساعدة للتركيز السريع على مربع اختيار الصنف
  const focusProductSelect = (lineIndex: number) => {
    const attempts = [
      () => document.querySelector(`[data-line-index="${lineIndex}"] select`) as HTMLSelectElement,
      () => document.querySelectorAll('select')[lineIndex] as HTMLSelectElement,
      () => document.querySelector(`[data-testid="sale-line-item-${lineIndex}"] select`) as HTMLSelectElement
    ];
    
    const tryFocus = (attemptIndex = 0) => {
      if (attemptIndex >= attempts.length) return;
      
      const select = attempts[attemptIndex]();
      if (select && select.offsetParent !== null) { // تأكد أن العنصر مرئي
        console.log(`🎯 تركيز ناجح على مربع اختيار الصنف - المحاولة ${attemptIndex + 1}`);
        select.focus();
        return;
      }
      
      // إعادة المحاولة مع الطريقة التالية
      requestAnimationFrame(() => tryFocus(attemptIndex + 1));
    };
    
    tryFocus();
  };

  // دالة اختيار الصنف من القائمة المنسدلة
  const handleSelectProductFromDropdown = (product: any) => {
    console.log('🎯 تم اختيار صنف من القائمة المنسدلة:', product);
    
    // إضافة بند جديد
    addSaleLine();
    const newLineIndex = saleForm.lines.length;
    
    // تحديد ما إذا كان الصنف من الشركة الأم
    const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
    const isFromParentCompany = product.createdByCompanyId !== targetCompanyId && product.createdByCompanyId === 1;
    
    // تحديث بيانات البند
    updateSaleLine(newLineIndex, 'productId', product.id);
    updateSaleLine(newLineIndex, 'isFromParentCompany', isFromParentCompany);
    
    if (product.price?.sellPrice) {
      const originalPrice = Number(product.price.sellPrice);
      const formattedPrice = Math.round(originalPrice * 100) / 100;
      updateSaleLine(newLineIndex, 'unitPrice', formattedPrice);
      
      // إذا كان من الشركة الأم، حفظ السعر للمرجعية
      if (isFromParentCompany) {
        updateSaleLine(newLineIndex, 'parentUnitPrice', originalPrice);
      }
    }
    
    // إغلاق القائمة المنسدلة ومسح البحث
    setShowProductDropdown(false);
    setProductCodeSearch('');
    setSelectedProductFromSearch(product);
    
    // التركيز على مربع اختيار الصنف للبند الجديد
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        focusProductSelect(newLineIndex);
      });
    });
    
    const companyType = isFromParentCompany ? '(من مخزن التقازي)' : '(من الشركة الحالية)';
    notifications.custom.success('تم بنجاح', `تم إضافة الصنف: ${product.name} ${companyType}`);
  };

  // Handle QR Code scan
  const handleQRScan = (qrData: string) => {
    try {
      console.log('🔍 معالجة QR Code:', qrData);
      const productData = JSON.parse(qrData);
      console.log('📦 بيانات الصنف:', productData);
      
      // البحث عن الصنف باستخدام ID أو SKU
      const product = productsData?.data?.products?.find(
        p => p.id === productData.id || p.sku === productData.sku
      );

      if (!product) {
        console.error('❌ الصنف غير موجود');
        notifications.custom.error('خطأ', 'الصنف غير موجود في النظام');
        return;
      }

      console.log('✅ تم العثور على الصنف:', product.name);

      // التحقق من أن الصنف ينتمي للشركة المستهدفة
      const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
      if (targetCompanyId && product.createdByCompanyId !== targetCompanyId) {
        const otherCompany = companiesData?.data?.companies?.find(
          c => c.id === product.createdByCompanyId
        );
        console.error('❌ الصنف من شركة أخرى');
        notifications.custom.error(
          'الصنف غير متاح',
          `الصنف "${product.name}" لا ينتمي للشركة المختارة.\n\n` +
          `هذا الصنف تابع لـ: ${otherCompany?.name || 'شركة أخرى'}`
        );
        return;
      }

      console.log('➕ إضافة سطر جديد للفاتورة...');
      
      // إضافة سطر جديد أولاً
      setSaleForm(prev => {
        const newLines = [...prev.lines, { productId: 0, qty: 1, unitPrice: 0 }];
        const newIndex = newLines.length - 1;
        
        console.log('✅ تم إضافة السطر، الفهرس:', newIndex);
        
        // تحديث السطر الجديد فوراً
        setTimeout(() => {
          console.log('🔄 تحديث بيانات السطر الجديد...');
          updateSaleLine(newIndex, 'productId', product.id);
          if (product.price?.sellPrice) {
            // السعر يُحفظ كما هو (سعر المتر المربع)
            updateSaleLine(newIndex, 'unitPrice', Number(product.price.sellPrice));
          }
          updateSaleLine(newIndex, 'qty', 1);
          
          // التركيز على مربع اختيار الصنف للصنف المُضاف
          requestAnimationFrame(() => {
            focusProductSelect(newIndex);
          });
          
          console.log('✅ تم تحديث السطر بنجاح');
          notifications.custom.success(
            'تم بنجاح',
            `تمت إضافة الصنف "${product.name}" للفاتورة`
          );
        }, 50);
        
        return {
          ...prev,
          lines: newLines
        };
      });

      setShowQRScanner(false);
    } catch (error) {
      console.error('❌ خطأ في معالجة QR Code:', error);
      notifications.custom.error('خطأ', 'QR Code غير صالح أو تالف');
    }
  };

  // API calls
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useGetSalesQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm
  });

  const { data: customersData, isLoading: customersLoading, error: customersError, refetch: refetchCustomers } = useGetCustomersQuery({ limit: 1000 });
  const { data: companiesData, isLoading: companiesLoading } = useGetCompaniesQuery({ limit: 1000 });

  // Auto-select company for non-system users and set default for system users
  useEffect(() => {
    if (user && user.companyId && !selectedCompanyId) {
      // للمستخدمين العاديين: اختيار شركتهم تلقائياً
      // لمستخدمي النظام: اختيار شركتهم كخيار افتراضي إذا لم يتم اختيار شركة بعد
      setSelectedCompanyId(user.companyId);
    }
  }, [user, selectedCompanyId]);

  // جلب جميع الأصناف ثم الفلترة في الواجهة الأمامية حسب الشركة المختارة
  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery({ 
    limit: 1000
  });
  
  const [createSale, { isLoading: isCreating }] = useCreateSaleMutation();
  const [createComplexInterCompanySale, { isLoading: isCreatingComplex }] = useCreateComplexInterCompanySaleMutation();
  const [deleteSale, { isLoading: isDeleting }] = useDeleteSaleMutation();
  const [updateSale, { isLoading: isUpdating }] = useUpdateSaleMutation();
  const [createCustomer] = useCreateCustomerMutation();

  // دالة للتعامل مع المبيعات البسيطة (أصناف من شركة واحدة فقط)
  const handleSimpleSale = async (targetCompanyId: number) => {
    // تحويل الأسعار للـ Backend: للصناديق نضرب في عدد الأمتار
    const processedLines = saleForm.lines.map(line => {
      const product = productsData?.data?.products?.find(p => p.id === line.productId);
      
      // إنشاء السطر الأساسي
      let processedLine: any = {
        productId: line.productId,
        qty: line.qty,
        unitPrice: line.unitPrice
      };
      
      // للصناديق: ضرب السعر في عدد الأمتار
      if (product?.unit === 'صندوق' && product.unitsPerBox) {
        processedLine.unitPrice = line.unitPrice * Number(product.unitsPerBox);
      }
      
      return processedLine;
    });
    
    // إضافة companyId للطلب
    const saleRequest = {
      ...saleForm,
      lines: processedLines,
      companyId: targetCompanyId
    };
    
    await createSale(saleRequest).unwrap();
    // لا نعرض إشعار هنا - سيتم عرضه في handleCreateSale
  };

  // دالة للتعامل مع المبيعات المعقدة (أصناف من الشركة الحالية والشركة الأم)
  const handleComplexInterCompanySale = async (targetCompanyId: number) => {
    // تحميل هامش الربح من الإعدادات
    const savedMargin = localStorage.getItem('profitMargin');
    const profitMargin = savedMargin ? parseFloat(savedMargin) : 20;

    // تحويل جميع البنود إلى تنسيق المبيعات المعقدة (أصناف الشركة الأم + الشركة التابعة)
    const complexLines: ComplexInterCompanySaleLine[] = saleForm.lines.map(line => {
        const product = productsData?.data?.products?.find(p => p.id === line.productId);
        
      let unitPrice = line.unitPrice;
      let branchUnitPrice = line.unitPrice;
      let parentUnitPrice: number | undefined = undefined;
      
      // إذا كان من الشركة الأم
      if (line.isFromParentCompany) {
        parentUnitPrice = line.parentUnitPrice || line.unitPrice;
        branchUnitPrice = line.branchUnitPrice || (parentUnitPrice * (1 + profitMargin / 100));
        
        // للصناديق: ضرب السعر في عدد الأمتار
        if (product?.unit === 'صندوق' && product.unitsPerBox) {
          parentUnitPrice = parentUnitPrice * Number(product.unitsPerBox);
          branchUnitPrice = branchUnitPrice * Number(product.unitsPerBox);
        }
      } else {
        // أصناف من الشركة التابعة
        branchUnitPrice = line.unitPrice;
        
        // للصناديق: ضرب السعر في عدد الأمتار
        if (product?.unit === 'صندوق' && product.unitsPerBox) {
          branchUnitPrice = branchUnitPrice * Number(product.unitsPerBox);
        }
        }
        
        return {
          productId: line.productId,
          qty: line.qty,
          parentUnitPrice,
          branchUnitPrice,
        subTotal: line.qty * branchUnitPrice,
        isFromParentCompany: line.isFromParentCompany || false
        };
      });

    // إنشاء طلب المبيعات المعقدة
    const complexSaleRequest: CreateComplexInterCompanySaleRequest = {
      customerId: saleForm.customerId!,
      branchCompanyId: targetCompanyId,
      parentCompanyId: 1, // الشركة الأم دائماً ID = 1
      lines: complexLines,
      profitMargin,
      customerSaleType: 'CREDIT', // آجل كما هو مطلوب
      customerPaymentMethod: 'CASH' // افتراضي
    };

    const result = await createComplexInterCompanySale(complexSaleRequest).unwrap();
    // لا نعرض إشعار هنا - سيتم عرضه في handleCreateSale مع تحديد نوع الفاتورة
  };

  // Handle create sale
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // تحديد الشركة المستهدفة
    const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
    
    if (!targetCompanyId) {
      notifications.custom.error('خطأ', user?.isSystemUser ? 'يجب اختيار الشركة أولاً' : 'لا يمكن تحديد شركتك');
      return;
    }
    
    // التحقق من أن المستخدم العادي لا يمكنه إنشاء فاتورة لشركة أخرى
    if (!user?.isSystemUser && selectedCompanyId && selectedCompanyId !== user?.companyId) {
      notifications.custom.error('خطأ', 'لا يمكنك إنشاء فاتورة لشركة أخرى غير شركتك');
      return;
    }
    
    if (!saleForm.customerId) {
      notifications.custom.error('خطأ', 'يجب اختيار عميل للمتابعة');
      return;
    }
    
    if (saleForm.lines.length === 0) {
      notifications.custom.error('خطأ', 'يجب إضافة بند واحد على الأقل');
      return;
    }

    // التحقق من صحة الأصناف (يجب أن تكون من الشركة الحالية أو الشركة الأم)
    const invalidLines = saleForm.lines.filter(line => {
      const product = productsData?.data?.products?.find(p => p.id === line.productId);
      if (!product) return true; // صنف غير موجود
      
      // السماح بالأصناف من الشركة الحالية أو الشركة الأم (ID = 1)
      const isFromCurrentCompany = product.createdByCompanyId === targetCompanyId;
      const isFromParentCompany = product.createdByCompanyId === 1;
      
      return !isFromCurrentCompany && !isFromParentCompany;
    });

    if (invalidLines.length > 0) {
      notifications.custom.error('خطأ', 'بعض الأصناف المختارة غير صالحة. يجب أن تكون الأصناف من الشركة الحالية أو مخزن التقازي فقط.');
      return;
    }

    try {
      // التحقق من وجود أصناف من الشركة الأم
      const hasParentCompanyItems = saleForm.lines.some(line => line.isFromParentCompany);
      
      // إذا كانت هناك أصناف من الشركة الأم، استخدم النظام المعقد
      if (hasParentCompanyItems) {
        // استخدام API المبيعات المعقدة - سينشئ:
        // 1. فاتورة واحدة للعميل (كل الأصناف)
        // 2. فاتورة بيع آجلة من الشركة الأم → الشركة التابعة
        // 3. فاتورة مشتريات من الشركة الأم
        await handleComplexInterCompanySale(targetCompanyId);
      } else {
        // استخدام API المبيعات العادي للفواتير البسيطة (أصناف الشركة التابعة فقط)
        await handleSimpleSale(targetCompanyId);
      }
      
      // إغلاق المودال فوراً
      setShowCreateSaleModal(false);
      
      // إعادة تعيين الفورم فوراً
      setSaleForm({
        customerId: undefined,
        notes: '',
        lines: []
      });
      setProductCodeSearch('');
      
      // للمستخدمين العاديين: الاحتفاظ بالشركة، لمستخدمي النظام: إعادة تعيين
      if (user?.isSystemUser) {
        setSelectedCompanyId(null);
      }
      
      // تحديث قائمة الفواتير فوراً
      await refetchSales();
      
      // إشعار فوري بعد التحديث
      if (hasParentCompanyItems) {
        notifications.custom.success(
          'تم بنجاح', 
          'تم إنشاء الفواتير المعقدة بنجاح:\n' +
          '✅ فاتورة المبيعات للعميل\n' +
          '✅ فاتورة التقازي → الإمارات\n' +
          '✅ فاتورة المشتريات\n' +
          'جميع الفواتير في انتظار موافقة المحاسب'
        );
      } else {
      notifications.custom.success('تم بنجاح', 'تم إنشاء فاتورة المبيعات بنجاح');
      }
      
      // تحديث بيانات الأصناف بعد تأخير قصير (لأن المخزون تغير)
      setTimeout(() => {
        dispatch(productsApi.util.invalidateTags(['Products', 'Product', 'ProductStats']));
      }, 1000);
    } catch (err: any) {
      notifications.custom.error('خطأ', err.data?.message || 'حدث خطأ أثناء إنشاء الفاتورة');
    }
  };

  // Handle delete sale
  const handleDeleteSale = async (sale: Sale) => {
    const confirmed = await confirm(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف فاتورة رقم ${sale.invoiceNumber || sale.id}؟`
    );

    if (confirmed) {
      try {
        await deleteSale(sale.id).unwrap();
        notifications.custom.success('تم بنجاح', 'تم حذف الفاتورة بنجاح وإرجاع الكميات للمخزن');
        refetchSales();
        // تحديث بيانات الأصناف لأن المخزون تغير
        dispatch(productsApi.util.invalidateTags(['Products', 'Product', 'ProductStats']));
      } catch (err: any) {
        notifications.custom.error('خطأ', err.data?.message || 'حدث خطأ أثناء حذف الفاتورة');
      }
    }
  };

  // Handle edit sale
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
      notifications.custom.error('خطأ', 'يجب إضافة صنف واحد على الأقل');
      return;
    }

    // التحقق من صحة البيانات
    for (const line of editLines) {
      if (!line.productId || line.qty <= 0 || line.unitPrice <= 0) {
        notifications.custom.error('خطأ', 'يرجى التأكد من صحة بيانات جميع الأصناف');
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

      notifications.custom.success('تم بنجاح', `تم تعديل الفاتورة ${saleToEdit.invoiceNumber || saleToEdit.id} بنجاح`);
      setShowEditModal(false);
      setSaleToEdit(null);
      setEditLines([]);
      refetchSales();
    } catch (err: any) {
      notifications.custom.error('خطأ', err?.data?.message || 'حدث خطأ أثناء تعديل الفاتورة');
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

  // Add line to sale
  const addSaleLine = () => {
    setSaleForm(prev => {
      const newLines = [...prev.lines, { 
        productId: 0, 
        qty: 1, 
        unitPrice: 0,
        isFromParentCompany: false,
        parentUnitPrice: 0,
        branchUnitPrice: 0
      }];
      
      // التركيز على مربع اختيار الصنف للبند الجديد بعد إضافته
      requestAnimationFrame(() => {
        const newLineIndex = newLines.length - 1;
        focusProductSelect(newLineIndex);
      });
      
      return {
        ...prev,
        lines: newLines
      };
    });
  };

  // Remove line from sale
  const removeSaleLine = (index: number) => {
    setSaleForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  // Update sale line
  const updateSaleLine = (index: number, field: string, value: any) => {
    setSaleForm(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      )
    }));
  };

  // Filter products based on search - عرض جميع الأصناف (الشركة الأم + الشركة التابعة)
  const filteredProducts = productsData?.data?.products?.filter(product => {
    const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
    
    if (!targetCompanyId) {
      return false; // لا تعرض أي أصناف إذا لم يتم تحديد الشركة
    }
    
    // عرض أصناف الشركة الحالية + أصناف الشركة الأم دائماً
    const isFromCurrentCompany = product.createdByCompanyId === targetCompanyId;
    const isFromParentCompany = product.createdByCompanyId === 1; // الشركة الأم
    
    if (!isFromCurrentCompany && !isFromParentCompany) {
      return false;
    }
    
    // البحث في الاسم والكود معاً
    if (productCodeSearch) {
      const matchesName = product.name.toLowerCase().includes(productCodeSearch.toLowerCase());
      const matchesCode = product.sku.toLowerCase().includes(productCodeSearch.toLowerCase());
      return matchesName || matchesCode;
    }
    return true;
  }) || [];

  // Auto-select product when exact code match is found (with debounce)
  const handleProductCodeSearch = (code: string) => {
    setProductCodeSearch(code);
    
    // إلغاء أي timeout سابق
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    // إذا كان الحقل فارغاً، لا نفعل شيء
    if (!code || code.trim() === '') {
      setIsSearching(false);
      return;
    }
    
    // تفعيل مؤشر البحث
    setIsSearching(true);
    
    // الانتظار 800ms بعد توقف المستخدم عن الكتابة
    searchTimeoutRef.current = setTimeout(() => {
      // تحديد الشركة المستهدفة
      const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
      
      if (!productsData?.data?.products || !targetCompanyId) {
        return;
      }

      // البحث فقط في أصناف الشركة المستهدفة
      const exactMatch = productsData.data.products.find(
        product => product.sku.toLowerCase() === code.toLowerCase() 
          && product.createdByCompanyId === targetCompanyId
      );
      
      if (exactMatch) {
        // Auto-add the product to the sale lines
        addSaleLine();
        const newLineIndex = saleForm.lines.length;
        updateSaleLine(newLineIndex, 'productId', exactMatch.id);
        // Set the official price if available
        if (exactMatch.price?.sellPrice) {
          // السعر يُحفظ كما هو (سعر المتر المربع)
          updateSaleLine(newLineIndex, 'unitPrice', Number(exactMatch.price.sellPrice));
        }
        
        // التركيز على مربع اختيار الصنف للصنف المُضاف
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            focusProductSelect(newLineIndex);
          });
        });
        
        setProductCodeSearch(''); // Clear search after selection
        notifications.custom.success('تم بنجاح', `تم إضافة الصنف: ${exactMatch.name}`);
      } else {
        // الصنف غير موجود في مخزن الشركة المختارة
        const productExistsInOtherCompany = productsData.data.products.find(
          product => product.sku.toLowerCase() === code.toLowerCase()
        );
        
        if (productExistsInOtherCompany) {
          const otherCompany = companiesData?.data?.companies?.find(
            c => c.id === productExistsInOtherCompany.createdByCompanyId
          );
          const currentCompany = companiesData?.data?.companies?.find(
            c => c.id === targetCompanyId
          );
          
          if (user?.isSystemUser) {
            notifications.custom.error(
              'الصنف غير متاح', 
              `الصنف "${code}" (${productExistsInOtherCompany.name}) غير موجود في مخزن الشركة المختارة.\n\n` +
              `هذا الصنف تابع لـ: ${otherCompany?.name || 'شركة أخرى'}\n` +
              `الشركة المختارة: ${currentCompany?.name || 'غير محددة'}\n\n` +
              `يرجى اختيار صنف من مخزن الشركة المختارة فقط.`
            );
          } else {
            notifications.custom.error(
              'الصنف غير متاح', 
              `الصنف "${code}" (${productExistsInOtherCompany.name}) غير موجود في مخزن شركتك.\n\n` +
              `هذا الصنف تابع لـ: ${otherCompany?.name || 'شركة أخرى'}\n\n` +
              `يمكنك فقط بيع الأصناف التابعة لشركتك.`
            );
          }
        } else {
          notifications.custom.warning('غير موجود', `الصنف بالكود "${code}" غير موجود في النظام.`);
        }
      }
      
      // إيقاف مؤشر البحث
      setIsSearching(false);
      searchTimeoutRef.current = null;
    }, 800); // الانتظار 800ms
  };

  if (salesLoading || userLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 text-success-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">إدارة المبيعات</h1>
              <p className="text-text-secondary">إدارة فواتير المبيعات والعملاء</p>
            </div>
          </div>
          <button
            onClick={() => {
              const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
              if (!targetCompanyId) {
                notifications.custom.error('تنبيه', user?.isSystemUser ? 'يجب اختيار الشركة أولاً' : 'لا يمكن تحديد شركتك');
                return;
              }
              setShowCreateSaleModal(true);
            }}
            disabled={user?.isSystemUser ? !selectedCompanyId : !user?.companyId}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              (user?.isSystemUser ? selectedCompanyId : user?.companyId)
                ? 'bg-success-600 hover:bg-success-700 text-white shadow-md hover:shadow-lg' 
                : 'bg-background-tertiary text-text-muted cursor-not-allowed'
            }`}
            title={(user?.isSystemUser ? !selectedCompanyId : !user?.companyId) ? 'يجب اختيار الشركة أولاً' : 'إنشاء فاتورة جديدة'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            فاتورة جديدة
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-text-primary">{formatArabicNumber(salesData?.data?.pagination?.total || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">فواتير مبدئية</p>
              <p className="text-2xl font-bold text-warning-600">{formatArabicNumber(salesData?.data?.sales?.filter((sale: any) => sale.status === 'DRAFT').length || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">فواتير معتمدة</p>
              <p className="text-2xl font-bold text-success-600">{formatArabicNumber(salesData?.data?.sales?.filter((sale: any) => sale.status === 'APPROVED').length || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">إجمالي القيمة</p>
              <p className="text-2xl font-bold text-purple-600">{formatArabicCurrency(salesData?.data?.sales?.reduce((sum: number, sale: any) => sum + sale.total, 0) || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Company Selection */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
        <label className="block text-sm font-bold text-blue-900 mb-2">
          🏢 {user?.isSystemUser ? 'اختر الشركة للعمل عليها' : 'الشركة المحددة'} *
        </label>
        <select
          value={selectedCompanyId || ''}
          onChange={(e) => {
            const newCompanyId = e.target.value ? Number(e.target.value) : null;
            console.log('🏢 تغيير الشركة المختارة:', newCompanyId);
            setSelectedCompanyId(newCompanyId);
            // تنظيف البنود عند تغيير الشركة لضمان عدم بقاء أصناف من شركة أخرى
            setSaleForm(prev => ({
              ...prev,
              lines: []
            }));
            // تنظيف البحث
            setProductCodeSearch('');
          }}
          disabled={!user?.isSystemUser}
          className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-lg font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {user?.isSystemUser && <option value="">-- اختر الشركة أولاً --</option>}
          {companiesLoading ? (
            <option disabled>جاري تحميل الشركات...</option>
          ) : companiesData?.data?.companies && companiesData.data.companies.length > 0 ? (
            // عرض الشركات حسب صلاحية المستخدم
            companiesData.data.companies
              .filter((company) => {
                // مستخدمو النظام يرون جميع الشركات
                if (user?.isSystemUser) {
                  return true;
                }
                // المستخدمون العاديون يرون شركتهم فقط
                return company.id === user?.companyId;
              })
              .map((company) => (
                <option 
                  key={company.id} 
                  value={company.id}
                >
                  {company.name} ({company.code})
                  {company.id === user?.companyId ? ' - شركتك' : ''}
                </option>
              ))
          ) : (
            <option disabled>
              {user?.isSystemUser 
                ? 'لا توجد شركات في النظام' 
                : 'لا يمكن العثور على شركتك'}
            </option>
          )}
        </select>
        {!selectedCompanyId && (
          <p className="text-sm text-blue-700 mt-2 font-medium">
            ⚠️ يجب اختيار الشركة أولاً لتتمكن من إنشاء فاتورة جديدة
          </p>
        )}
        {selectedCompanyId && (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-green-700 font-medium">
              ✅ تم اختيار الشركة - يمكنك الآن إنشاء فاتورة جديدة
            </p>
            <p className="text-xs text-blue-600">
              💡 ملاحظة: سيتم عرض الأصناف الخاصة بهذه الشركة فقط، ولا يمكن إضافة أصناف من شركات أخرى
            </p>
            {user?.isSystemUser ? (
              <p className="text-xs text-purple-600">
                👑 مستخدم نظام: يمكنك إنشاء فواتير لأي شركة
              </p>
            ) : (
              <p className="text-xs text-gray-600">
                🔒 مستخدم عادي: يمكنك إنشاء فواتير لشركتك فقط
              </p>
            )}
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="البحث برقم الفاتورة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Customer Name Filter */}
          <div className="relative">
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <input
              type="text"
              placeholder="البحث بأسم الزبون..."
              value={customerNameFilter}
              onChange={(e) => setCustomerNameFilter(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Customer Phone Filter */}
          <div className="relative">
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <input
              type="text"
              placeholder="البحث برقم الهاتف..."
              value={customerPhoneFilter}
              onChange={(e) => setCustomerPhoneFilter(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Clear Filters Button */}
          {(searchTerm || customerNameFilter || customerPhoneFilter) && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setCustomerNameFilter('');
                setCustomerPhoneFilter('');
              }}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              مسح الفلاتر
            </button>
          )}
        </div>
        
        {/* عرض عدد النتائج المفلترة */}
        {(customerNameFilter || customerPhoneFilter) && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-800">
                <span className="font-semibold">النتائج المفلترة: {formatArabicNumber(salesData?.data?.sales?.filter((sale: Sale) => {
                  if (customerNameFilter && sale.customer) {
                    const customerName = sale.customer.name?.toLowerCase() || '';
                    if (!customerName.includes(customerNameFilter.toLowerCase())) {
                      return false;
                    }
                  }
                  if (customerPhoneFilter && sale.customer) {
                    const customerPhone = sale.customer.phone || '';
                    if (!customerPhone.includes(customerPhoneFilter)) {
                      return false;
                    }
                  }
                  return true;
                }).length || 0)}</span>
                {' '}من أصل {formatArabicNumber(salesData?.data?.sales?.length || 0)} فاتورة
              </p>
            </div>
          </div>
        )}
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
                  المجموع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الملاحظات
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
              {salesData?.data?.sales
                ?.filter((sale: Sale) => {
                  // فلترة بأسم الزبون
                  if (customerNameFilter && sale.customer) {
                    const customerName = sale.customer.name?.toLowerCase() || '';
                    if (!customerName.includes(customerNameFilter.toLowerCase())) {
                      return false;
                    }
                  }
                  
                  // فلترة برقم الهاتف
                  if (customerPhoneFilter && sale.customer) {
                    const customerPhone = sale.customer.phone || '';
                    if (!customerPhone.includes(customerPhoneFilter)) {
                      return false;
                    }
                  }
                  
                  return true;
                })
                ?.map((sale) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-semibold text-green-600">
                      {formatArabicCurrency(sale.total)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sale.status === 'DRAFT' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : sale.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {sale.status === 'DRAFT' ? 'مبدئية' : 
                       sale.status === 'APPROVED' ? 'معتمدة' : 'ملغية'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.notes || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(sale.createdAt).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSaleToPrint(sale);
                          setShowPrintModal(true);
                        }}
                        className="text-green-600 hover:text-green-900 p-1 rounded"
                        title="طباعة الفاتورة"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="عرض التفاصيل"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {sale.status === 'DRAFT' && (
                        <button
                          onClick={() => handleEditSale(sale)}
                          className={`p-1 rounded ${sale.isAutoGenerated ? 'text-gray-400 cursor-not-allowed' : 'text-orange-600 hover:text-orange-900'}`}
                          title={sale.isAutoGenerated ? 'لا يمكن تعديل الفواتير التلقائية - عدّل الفاتورة الأصلية' : 'تعديل الفاتورة'}
                          disabled={isUpdating || sale.isAutoGenerated}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteSale(sale)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="حذف"
                        disabled={isDeleting}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {salesData?.data?.pagination && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage >= salesData.data.pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  عرض{' '}
                  <span className="font-medium">
                    {((currentPage - 1) * 10) + 1}
                  </span>{' '}
                  إلى{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 10, salesData.data.pagination.total)}
                  </span>{' '}
                  من{' '}
                  <span className="font-medium">{salesData.data.pagination.total}</span>{' '}
                  نتيجة
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {Array.from({ length: salesData.data.pagination.pages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Sale Modal */}
      {showCreateSaleModal && selectedCompanyId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-7xl shadow-lg rounded-md bg-white min-h-[90vh]">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">إنشاء فاتورة مبيعات جديدة</h3>
              
              {/* عرض الشركة المختارة */}
              <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-900">🏢 الشركة:</span>
                  <span className="text-sm font-semibold text-blue-700">
                    {companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.name}
                  </span>
                  <span className="text-xs text-blue-600">
                    ({companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.code})
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  💡 سيتم البيع من مخزون هذه الشركة فقط
                </p>
              </div>

              {/* ملاحظة مهمة عن البيع بالمتر */}
              <div className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border-2 border-blue-300">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <p className="text-sm text-blue-900 font-bold mb-1">
                      ملاحظة مهمة: البيع بالمتر المربع
                    </p>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      • للأصناف التي وحدتها "صندوق": البيع يتم <strong>بالمتر المربع</strong><br/>
                      • سيتم <strong>التقريب للأعلى</strong> لعدد الصناديق (مثال: 4.5 صندوق → 5 صناديق)<br/>
                      • سيحصل العميل على <strong>عدد الأمتار الكامل</strong> للصناديق المباعة<br/>
                      • <strong>لا يوجد بيع لنصف صندوق</strong> - دائماً صناديق كاملة
                    </p>
                  </div>
                </div>
              </div>

              {/* تنبيه إذا لم تكن هناك أصناف */}
              {selectedCompanyId && filteredProducts.length === 0 && (
                <div className="mb-4 bg-red-50 p-4 rounded-lg border-2 border-red-300">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-sm text-red-800 font-bold mb-1">
                        لا توجد أصناف متاحة لهذه الشركة!
                      </p>
                      <p className="text-xs text-red-700">
                        لا يمكن إنشاء فاتورة بدون أصناف. يرجى إضافة أصناف أولاً من صفحة "الأصناف والمخزن" للشركة المختارة.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {productsLoading && (
                <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium">
                    ⏳ جاري تحميل الأصناف...
                  </p>
                </div>
              )}
              
              <form onSubmit={handleCreateSale} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      العميل *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={saleForm.customerId || ''}
                        onChange={(e) => setSaleForm(prev => ({
                          ...prev,
                          customerId: e.target.value ? Number(e.target.value) : undefined
                        }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">اختر عميل</option>
                        {customersLoading ? (
                          <option disabled>جاري تحميل العملاء...</option>
                        ) : customersError ? (
                          <option disabled>خطأ في تحميل العملاء</option>
                        ) : customersData?.data?.customers?.length === 0 ? (
                          <option disabled>لا توجد عملاء</option>
                        ) : (
                          customersData?.data?.customers
                            ?.filter((customer: Customer) => !customer.phone?.startsWith('BRANCH'))
                            ?.map((customer: Customer) => (
                              <option key={customer.id} value={customer.id}>
                                {customer.name}
                              </option>
                            ))
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCreateCustomerModal(true)}
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors flex items-center gap-1 whitespace-nowrap"
                        title="إضافة عميل جديد"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">عميل</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      مطلوب - يجب اختيار عميل للمتابعة
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الفاتورة
                    </label>
                    <input
                      type="text"
                      value="سيتم توليده تلقائياً"
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      سيتم توليد رقم الفاتورة تلقائياً عند الحفظ
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      📝 ملاحظات (اختياري)
                    </label>
                    <textarea
                      value={saleForm.notes || ''}
                      onChange={(e) => setSaleForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="أضف أي ملاحظات حول الفاتورة..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 سيحدد المحاسب نوع البيع وطريقة الدفع عند اعتماد الفاتورة
                    </p>
                  </div>
                </div>

                {/* Sale Lines */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-base font-bold text-gray-800">
                      📋 بنود الفاتورة *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={addSaleLine}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all duration-200 font-medium bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-lg"
                      >
                        <span className="text-lg">➕</span>
                        <span>إضافة بند</span>
                      </button>
                    </div>
                  </div>

                  {/* Product Search Filters */}
                  <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔍</span>
                        <h4 className="text-sm font-bold text-gray-700">البحث عن المنتجات</h4>
                      </div>
                      {selectedCompanyId && (
                        <span className="text-xs text-blue-700 font-medium bg-blue-100 px-2 py-1 rounded">
                          أصناف {companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.name} فقط
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          اختيار الصنف
                        </label>
                        <div className="relative product-dropdown-container">
                          <input
                            type="text"
                            value={productCodeSearch}
                            onChange={(e) => {
                              setProductCodeSearch(e.target.value);
                              setShowProductDropdown(e.target.value.length > 0);
                            }}
                            onFocus={() => setShowProductDropdown(productCodeSearch.length > 0)}
                            placeholder="ابحث بالاسم أو الكود..."
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          />
                          
                          {/* القائمة المنسدلة للأصناف */}
                          {showProductDropdown && productCodeSearch && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {filteredProducts.length > 0 ? (
                                filteredProducts.slice(0, 10).map((product: any) => {
                                  const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
                                  const isFromParentCompany = product.createdByCompanyId !== targetCompanyId && product.createdByCompanyId === 1;
                                  
                                  return (
                                    <button
                                      key={product.id}
                                      type="button"
                                      onClick={() => handleSelectProductFromDropdown(product)}
                                      className={`w-full px-3 py-2 text-right focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors ${
                                        isFromParentCompany 
                                          ? 'hover:bg-orange-50 focus:bg-orange-50' 
                                          : 'hover:bg-blue-50 focus:bg-blue-50'
                                      }`}
                                    >
                                      <div className="flex justify-between items-center">
                                        <div className="text-sm">
                                          <div className={`font-medium ${isFromParentCompany ? 'text-orange-900' : 'text-gray-900'}`}>
                                            {product.name}
                                            {isFromParentCompany && (
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mr-2">
                                                مخزن التقازي
                                              </span>
                                            )}
                                          </div>
                                          <div className={`text-xs ${isFromParentCompany ? 'text-orange-600' : 'text-gray-500'}`}>
                                            كود: {product.sku}
                                          </div>
                                        </div>
                                        <div className={`text-xs font-medium ${isFromParentCompany ? 'text-orange-600' : 'text-blue-600'}`}>
                                          {product.price?.sellPrice ? `${Number(product.price.sellPrice).toFixed(2)} د.ل` : 'غير محدد'}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                  لا توجد أصناف مطابقة
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          💡 ابحث واختر الصنف لإضافته تلقائياً للفاتورة
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          مسح QR Code
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowQRScanner(!showQRScanner);
                          }}
                          className="w-full px-3 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          {showQRScanner ? 'إغلاق الماسح' : 'مسح QR Code'}
                        </button>
                        <p className="text-xs text-gray-500 mt-1">
                          📱 امسح الكود لإضافة الصنف تلقائياً
                        </p>
                      </div>
                    </div>
                    
                    {/* QR Scanner Camera */}
                    {showQRScanner && (
                      <div className="mt-3 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div>
                              <h4 className="text-sm font-bold text-purple-900">📱 ماسح QR Code</h4>
                              <p className="text-xs text-purple-700">وجّه الكاميرا نحو QR Code</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowQRScanner(false)}
                            className="text-purple-600 hover:text-purple-800 font-bold text-xl"
                          >
                            ✕
                          </button>
                        </div>
                        
                        {/* Camera Preview */}
                        <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
                        
                        <div className="mt-3 flex items-start gap-2 text-xs text-purple-700 bg-white p-2 rounded">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="font-medium">💡 نصائح:</p>
                            <ul className="list-disc list-inside mt-1 space-y-0.5">
                              <li>📱 <strong>اسمح للمتصفح بالوصول إلى الكاميرا</strong> (ضروري!)</li>
                              <li>💡 تأكد من إضاءة جيدة - استخدم زر الفلاش إذا لزم الأمر</li>
                              <li>🎯 ضع QR Code في المربع المحدد</li>
                              <li>📷 على الموبايل: سيتم استخدام الكاميرا الخلفية تلقائياً</li>
                              <li>✅ سيتم إضافة الصنف تلقائياً عند المسح الناجح</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    {productCodeSearch && (
                      <div className="mt-3 flex justify-between items-center p-2 bg-white rounded-md border border-blue-200">
                        <div className="text-xs font-medium text-gray-600">
                          📊 عرض {filteredProducts.length} منتج من أصل {productsData?.data?.products?.length || 0}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProductCodeSearch('');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                        >
                          ✖️ مسح البحث
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {saleForm.lines.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                        <div className="text-6xl mb-3">📝</div>
                        <p className="text-gray-600 font-medium mb-2">لا توجد بنود في الفاتورة</p>
                        <p className="text-sm text-gray-500">اضغط على "إضافة بند" لبدء إنشاء الفاتورة</p>
                      </div>
                    ) : (
                      saleForm.lines.map((line, index) => {
                        const selectedProduct = productsData?.data?.products?.find(p => p.id === line.productId);
                        const currentCompanyId = user?.isSystemUser ? selectedCompanyId : (user?.companyId || null);
                        console.log(`🔍 تمرير currentCompanyId للـ SaleLineItem: ${currentCompanyId}`);
                        
                        return (
                          <SaleLineItem
                            key={`sale-line-${index}`}
                            line={line}
                            index={index}
                            selectedProduct={selectedProduct}
                            productsData={productsData}
                            currentCompanyId={currentCompanyId}
                            updateSaleLine={updateSaleLine}
                            removeSaleLine={removeSaleLine}
                            calculateLineTotal={calculateLineTotal}
                            formatArabicCurrency={formatArabicCurrency}
                            filteredProducts={filteredProducts}
                          />
                        );
                      })
                    )}
                  </div>

                  {saleForm.lines.length > 0 && (
                    <>
                      {/* مؤشر نوع الفاتورة */}
                      {(() => {
                        const hasParentItems = saleForm.lines.some(line => line.isFromParentCompany);
                        const hasCurrentItems = saleForm.lines.some(line => !line.isFromParentCompany);
                        
                        if (hasParentItems && hasCurrentItems) {
                          return (
                            <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-orange-600">🔄</span>
                                <span className="text-sm font-medium text-orange-700">
                                  فاتورة مختلطة - سيتم إنشاء فواتير متعددة تلقائياً
                                </span>
                              </div>
                              <div className="text-xs text-orange-600 mt-1">
                                • فاتورة مبيعات للعميل • فاتورة مبيعات من مخزن التقازي (آجلة) • فاتورة مشتريات لمخزن التقازي
                              </div>
                            </div>
                          );
                        } else if (hasParentItems) {
                          return (
                            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-600">🏢</span>
                                <span className="text-sm font-medium text-blue-700">
                                  فاتورة من مخزن التقازي - سيتم إنشاء فواتير متعددة تلقائياً
                                </span>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-green-600">✅</span>
                                <span className="text-sm font-medium text-green-700">
                                  فاتورة بسيطة - من الشركة الحالية فقط
                                </span>
                              </div>
                            </div>
                          );
                        }
                      })()}
                      
                      {/* المجموع الإجمالي */}
                      <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-700">المجموع الإجمالي:</span>
                          <span className="text-2xl font-bold text-green-600">
                            {formatArabicCurrency(saleForm.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0))}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-4 pt-8 border-t-2 border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateSaleModal(false);
                      setProductCodeSearch('');
                    }}
                    className="flex items-center gap-2 px-8 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 font-medium text-base"
                  >
                    <span>❌</span>
                    <span>إلغاء</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || isCreatingComplex || !saleForm.customerId}
                    className={`flex items-center gap-2 px-8 py-3 rounded-lg shadow-md transition-all duration-200 font-medium text-base ${
                      !saleForm.customerId
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-lg'
                    } ${(isCreating || isCreatingComplex) ? 'opacity-50' : ''}`}
                  >
                    <span>{(isCreating || isCreatingComplex) ? '⏳' : '💾'}</span>
                    <span>
                      {!saleForm.customerId 
                        ? 'اختر العميل أولاً' 
                        : (isCreating || isCreatingComplex) ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      {showCreateCustomerModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">إضافة عميل جديد</h3>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const customerData: CreateCustomerRequest = {
                  name: formData.get('name') as string,
                  phone: formData.get('phone') as string || undefined,
                  note: formData.get('note') as string || undefined,
                };

                try {
                  const result = await createCustomer(customerData).unwrap();
                  
                  // إغلاق المودال أولاً
                  setShowCreateCustomerModal(false);
                  
                  // انتظار قصير جداً للتأكد من تحديث الـ cache
                  setTimeout(() => {
                    // تحديد العميل الجديد تلقائياً في النموذج
                    if (result.data?.id) {
                      setSaleForm(prev => ({ ...prev, customerId: result.data.id }));
                    }
                    notifications.custom.success('تم بنجاح', 'تم إضافة العميل بنجاح واختياره تلقائياً');
                  }, 100);
                } catch (err: any) {
                  notifications.custom.error('خطأ', err.data?.message || 'حدث خطأ أثناء إضافة العميل');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم العميل *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ملاحظات
                  </label>
                  <textarea
                    name="note"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateCustomerModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    إضافة العميل
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                تفاصيل الفاتورة #{selectedSale.invoiceNumber || selectedSale.id}
              </h3>
              
              <div className="space-y-4">
                {/* معلومات الشركة */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-900">الشركة:</span>
                    <span className="text-sm font-semibold text-blue-700">{selectedSale.company?.name}</span>
                    <span className="text-xs text-blue-600">({selectedSale.company?.code})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">العميل:</span> {selectedSale.customer?.name || 'غير محدد'}
                  </div>
                  <div>
                    <span className="font-medium">التاريخ:</span> {new Date(selectedSale.createdAt).toLocaleDateString('en-US')}
                  </div>
                  <div>
                    <span className="font-medium">الحالة:</span> 
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedSale.status === 'DRAFT' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : selectedSale.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedSale.status === 'DRAFT' ? 'مبدئية' : 
                       selectedSale.status === 'APPROVED' ? 'معتمدة' : 'ملغية'}
                    </span>
                  </div>
                  {selectedSale.notes && (
                    <div>
                      <span className="font-medium">الملاحظات:</span> {selectedSale.notes}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">بنود الفاتورة:</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">كود الصنف</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الصنف</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الكمية</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">سعر الوحدة</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">المجموع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedSale.lines.map((line, index) => {
                          // حساب الأمتار المربعة وسعر المتر للأصناف بوحدة صندوق
                          const isBox = line.product?.unit === 'صندوق';
                          const unitsPerBox = line.product?.unitsPerBox ? Number(line.product.unitsPerBox) : null;
                          
                          // الكمية: إذا صندوق نعرض الأمتار، وإلا نعرض الكمية العادية
                          const displayQty = isBox && unitsPerBox ? line.qty * unitsPerBox : line.qty;
                          const displayUnit = isBox ? 'م²' : (line.product?.unit || 'وحدة');
                          
                          // السعر: إذا صندوق نعرض سعر المتر، وإلا نعرض سعر الوحدة
                          const displayPrice = isBox && unitsPerBox ? line.unitPrice / unitsPerBox : line.unitPrice;
                          
                          return (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm font-mono text-gray-600">{line.product?.sku}</td>
                              <td className="px-4 py-2 text-sm">
                                {line.product?.name}
                                {isBox && (
                                  <span className="block text-xs text-gray-500 mt-0.5">
                                    ({line.qty} صندوق × {unitsPerBox?.toFixed(2)} م²)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <span className="font-medium text-blue-600">{formatArabicArea(displayQty)}</span>
                                <span className="text-gray-600 mr-1">{displayUnit}</span>
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <span className="font-medium">{formatArabicCurrency(displayPrice)}</span>
                                {isBox && <span className="text-gray-500 text-xs block">/م²</span>}
                              </td>
                              <td className="px-4 py-2 text-sm font-medium text-green-600">{formatArabicCurrency(line.subTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-right text-lg font-bold">
                    المجموع الإجمالي: {formatArabicCurrency(selectedSale.total)}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setSelectedSale(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
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
                  {customersData?.data?.customers?.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
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

      <PrintModal
        sale={saleToPrint}
        isOpen={showPrintModal}
        onClose={() => {
          setShowPrintModal(false);
          setSaleToPrint(null);
        }}
      />
    </div>
  );
};

export default SalesPage;

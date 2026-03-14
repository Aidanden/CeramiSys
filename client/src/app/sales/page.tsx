"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { getProfitMargin } from '@/constants/defaults';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/app/redux';
import useNotifications from '@/hooks/useNotifications';
import { useToast } from '@/components/ui/Toast';
import SaleLineItem from './SaleLineItem';
import { SCREEN_PERMISSIONS } from '@/constants/screenPermissions';
import { hasScreenAccess } from '@/types/permissions';

// نوع محلي للسطر مع الحقول الإضافية
interface LocalSaleLine {
  productId: number;
  qty: number;
  unitPrice: number;
  unit?: string;
  unitsPerBox?: number;
  isFromParentCompany?: boolean;
  parentUnitPrice?: number;
  branchUnitPrice?: number;
  discountPercentage?: number;
  discountAmount?: number;
  profitMargin?: number;
}

// نوع محلي لطلب إنشاء المبيعات
interface LocalCreateSaleRequest {
  customerId?: number;
  notes?: string;
  totalDiscountPercentage?: number;
  totalDiscountAmount?: number;
  createdAt?: string;
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
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'DRAFT' | 'APPROVED'>('all');
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
    discountPercentage?: number;
    discountAmount?: number;
    isFromParentCompany?: boolean;
    parentUnitPrice?: number;
    branchUnitPrice?: number;
    profitMargin?: number;
  }>>([]);
  const [editTotalDiscountPercentage, setEditTotalDiscountPercentage] = useState(0);
  const [editTotalDiscountAmount, setEditTotalDiscountAmount] = useState(0);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const customerSearchRef = useRef<HTMLDivElement>(null);

  // Sale form states
  const [saleForm, setSaleForm] = useState<LocalCreateSaleRequest>({
    customerId: undefined,
    notes: '', // ملاحظات اختيارية
    totalDiscountPercentage: 0,
    totalDiscountAmount: 0,
    createdAt: new Date().toISOString().split('T')[0], // القيمة الافتراضية التاريخ الحالي
    lines: []
  });

  // Settings from localStorage
  const [enableLineDiscount, setEnableLineDiscount] = useState(true);
  const [enableInvoiceDiscount, setEnableInvoiceDiscount] = useState(true);

  useEffect(() => {
    const savedLineDisc = localStorage.getItem('enableLineDiscount');
    setEnableLineDiscount(savedLineDisc === null ? true : savedLineDisc === 'true');

    const savedInvDisc = localStorage.getItem('enableInvoiceDiscount');
    setEnableInvoiceDiscount(savedInvDisc === null ? true : savedInvDisc === 'true');
  }, [showCreateSaleModal, showEditModal, selectedSale, showPrintModal]);

  // Product search states
  const [productNameSearch, setProductNameSearch] = useState(''); // البحث بالاسم (like)
  const [productCodeSearch, setProductCodeSearch] = useState(''); // البحث بالكود (=)
  const [isSearching, setIsSearching] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false); // قائمة البحث بالكود
  const [showNameDropdown, setShowNameDropdown] = useState(false); // قائمة البحث بالاسم
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

  // إغلاق القوائم المنسدلة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.code-dropdown-container')) {
        setShowCodeDropdown(false);
      }
      if (!target.closest('.name-dropdown-container')) {
        setShowNameDropdown(false);
      }
    };

    if (showCodeDropdown || showNameDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCodeDropdown, showNameDropdown]);

  // إغلاق قائمة العملاء عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerSuggestions(false);
      }
    };

    if (showCustomerSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCustomerSuggestions]);

  // Initialize QR Scanner
  useEffect(() => {
    // التأكد من أننا في بيئة المتصفح
    if (typeof window === 'undefined') return;

    if (showQRScanner && !qrScannerRef.current) {
      console.log('🔍 بدء تحميل ماسح QR Code...');

      // تأخير صغير لضمان أن الـ DOM جاهز
      setTimeout(async () => {
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
      }, 100); // تأخير 100ms لضمان جاهزية DOM
    }

    return () => {
      if (qrScannerRef.current) {
        console.log('🧹 تنظيف الماسح...');
        qrScannerRef.current.stop().catch(() => { });
        qrScannerRef.current = null;
      }
    };
  }, [showQRScanner]);

  // حساب المجموع بناءً على نوع الوحدة
  const calculateLineTotal = (line: any) => {
    const product = productsData?.data?.products?.find(p => p.id === line.productId);
    let baseTotal = 0;

    // المجموع = الكمية × إجمالي الوحدات (الأمتار/القطع) × سعر البيع
    // سعر البيع في قاعدة البيانات = سعر الوحدة الواحدة (متر أو قطعة)
    if (product?.unit === 'صندوق' && product?.unitsPerBox) {
      // للصناديق: المجموع = عدد الصناديق × عدد الأمتار/القطع في الصندوق × سعر الوحدة
      baseTotal = (line.qty || 0) * Number(product.unitsPerBox) * (line.unitPrice || 0);
    } else {
      // للوحدات الفردية: المجموع = الكمية × سعر البيع
      baseTotal = (line.qty || 0) * (line.unitPrice || 0);
    }

    return baseTotal - (line.discountAmount || 0);
  };

  // دالة مساعدة للحصول على المخزون المتاح للمنتج
  const getProductStock = (product: any, targetCompanyId: number | null) => {
    if (!product?.stock || !Array.isArray(product.stock) || product.stock.length === 0) {
      return { boxes: 0, quantity: 0, source: 'غير متوفر' };
    }

    // البحث عن مخزون الشركة المستهدفة أولاً
    let stockInfo = product.stock.find((s: any) => s.companyId === targetCompanyId);
    let source = 'المخزن المحلي';

    // إذا لم يوجد مخزون في الشركة المستهدفة، نبحث في الشركة الأم (التقازي)
    if ((!stockInfo || stockInfo.boxes === 0) && targetCompanyId !== 1) {
      stockInfo = product.stock.find((s: any) => s.companyId === 1);
      source = 'مخزن التقازي';
    }

    if (!stockInfo) {
      return { boxes: 0, quantity: 0, source: 'غير متوفر' };
    }

    return {
      boxes: stockInfo.boxes || 0,
      quantity: stockInfo.quantity || 0,
      source
    };
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

    // تحديد ما إذا كان الصنف من الشركة الأم
    const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
    const isFromParentCompany = product.createdByCompanyId !== targetCompanyId && product.createdByCompanyId === 1;

    // التحقق من وجود الصنف في الفاتورة
    const existingLineIndex = saleForm.lines.findIndex(line => line.productId === product.id);

    if (existingLineIndex !== -1) {
      // الصنف موجود بالفعل - زيادة الكمية
      const currentQty = saleForm.lines[existingLineIndex].qty || 0;
      updateSaleLine(existingLineIndex, 'qty', currentQty + 1);

      const companyType = isFromParentCompany ? '(من مخزن التقازي)' : '(من الشركة الحالية)';
      notifications.custom.success('تم بنجاح', `تم زيادة كمية الصنف: ${product.name} ${companyType}`);

      // التركيز على السطر الموجود
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          focusProductSelect(existingLineIndex);
        });
      });
    } else {
      // الصنف غير موجود - إضافة بند جديد
      addSaleLine();
      const newLineIndex = saleForm.lines.length;

      // تحديث بيانات البند
      updateSaleLine(newLineIndex, 'productId', product.id);
      updateSaleLine(newLineIndex, 'isFromParentCompany', isFromParentCompany);

      if (product.price?.sellPrice) {
        const originalPrice = Number(product.price.sellPrice);

        if (isFromParentCompany) {
          const margin = Number(localStorage.getItem('profitMargin')) || getProfitMargin();
          const branchPrice = Math.round(originalPrice * (1 + margin / 100) * 100) / 100;
          updateSaleLine(newLineIndex, 'unitPrice', branchPrice);
          updateSaleLine(newLineIndex, 'parentUnitPrice', originalPrice);
          updateSaleLine(newLineIndex, 'branchUnitPrice', branchPrice);
          updateSaleLine(newLineIndex, 'profitMargin', margin);
        } else {
          const formattedPrice = Math.round(originalPrice * 100) / 100;
          updateSaleLine(newLineIndex, 'unitPrice', formattedPrice);
        }
      }

      // التركيز على مربع اختيار الصنف للبند الجديد
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          focusProductSelect(newLineIndex);
        });
      });

      const companyType = isFromParentCompany ? '(من مخزن التقازي)' : '(من الشركة الحالية)';
      notifications.custom.success('تم بنجاح', `تم إضافة الصنف: ${product.name} ${companyType}`);
    }

    // إغلاق القوائم المنسدلة ومسح البحث
    setShowCodeDropdown(false);
    setShowNameDropdown(false);
    setProductCodeSearch('');
    setProductNameSearch('');
    setSelectedProductFromSearch(product);
  };

  // دالة اختيار الصنف من القائمة المنسدلة للتعديل
  const handleSelectProductForEdit = (product: any) => {
    console.log('🎯 تم اختيار صنف من القائمة المنسدلة للتعديل:', product);

    // تحديد السعر الصحيح (للصناديق: سعر البيع × عدد الأمتار)
    let unitPrice = product.price?.sellPrice ? Number(product.price.sellPrice) : 0;
    unitPrice = Number(unitPrice.toFixed(2));

    // تحديد ما إذا كان الصنف من الشركة الأم
    const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
    const isFromParentCompany = product.createdByCompanyId !== targetCompanyId && product.createdByCompanyId === 1;

    // التحقق من وجود الصنف في القائمة
    const existingLineIndex = editLines.findIndex(line => line.productId === product.id);

    if (existingLineIndex !== -1) {
      // الصنف موجود: زيادة الكمية بمقدار 1
      setEditLines(prev => prev.map((line, index) => {
        if (index === existingLineIndex) {
          const newQty = Number((line.qty + 1).toFixed(2));
          return { ...line, qty: newQty };
        }
        return line;
      }));
      const source = isFromParentCompany ? '(من مخزن التقازي)' : '';
      notifications.custom.info('تحديث الكمية', `تم زيادة كمية ${product.name} ${source} إلى ${editLines[existingLineIndex].qty + 1}`);
    } else {
      // الصنف غير موجود: إضافة بند جديد
      const margin = Number(localStorage.getItem('profitMargin')) || getProfitMargin();
      const branchPrice = isFromParentCompany ? Math.round(unitPrice * (1 + margin / 100) * 100) / 100 : unitPrice;

      setEditLines(prev => [...prev, {
        productId: product.id,
        qty: 1,
        unitPrice: branchPrice,
        discountPercentage: 0,
        discountAmount: 0,
        isFromParentCompany: isFromParentCompany,
        parentUnitPrice: isFromParentCompany ? unitPrice : 0,
        branchUnitPrice: isFromParentCompany ? branchPrice : 0,
        profitMargin: isFromParentCompany ? margin : 0
      }]);
      const source = isFromParentCompany ? '(من مخزن التقازي)' : '';
      notifications.custom.success('تم بنجاح', `تم إضافة الصنف: ${product.name} ${source}`);
    }

    // إغلاق القوائم المنسدلة ومسح البحث
    setShowCodeDropdown(false);
    setShowNameDropdown(false);
    setProductCodeSearch('');
    setProductNameSearch('');
  };

  // Handle QR Code scan
  const handleQRScan = (qrData: string) => {
    try {
      console.log('🔍 معالجة QR Code:', qrData);
      const productData = JSON.parse(qrData);
      console.log('📦 بيانات الصنف من QR:', productData);

      // البحث عن الصنف باستخدام ID أولاً (الأكثر دقة)
      // ثم SKU مع التحقق من الشركة المنشئة
      let product = productsData?.data?.products?.find(
        p => p.id === productData.id
      );

      // إذا لم يتم العثور بالـ ID، نبحث بالـ SKU مع الشركة المنشئة
      if (!product && productData.sku) {
        // البحث بالـ SKU مع نفس الشركة المنشئة من QR Code (إذا كانت موجودة)
        if (productData.createdByCompanyId) {
          product = productsData?.data?.products?.find(
            p => p.sku === productData.sku && p.createdByCompanyId === productData.createdByCompanyId
          );
        }

        // إذا لم يتم العثور، نبحث بالـ SKU فقط
        if (!product) {
          product = productsData?.data?.products?.find(
            p => p.sku === productData.sku
          );
        }
      }

      if (!product) {
        console.error('❌ الصنف غير موجود في قائمة الأصناف');
        console.log('📋 عدد الأصناف المتاحة:', productsData?.data?.products?.length || 0);
        console.log('📋 بيانات QR:', productData);
        notifications.custom.error('خطأ', 'الصنف غير موجود في النظام. تأكد من أن الصنف موجود في قاعدة البيانات.');
        return;
      }

      console.log('✅ تم العثور على الصنف:', product.name, 'ID:', product.id, 'الشركة:', product.createdByCompanyId);

      // التحقق من أن الصنف ينتمي للشركة المستهدفة أو الشركة الأم (التقازي)
      const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
      const isFromCurrentCompany = product.createdByCompanyId === targetCompanyId;

      // الصنف يعتبر من الشركة الأم فقط إذا:
      // 1. الصنف من التقازي (createdByCompanyId === 1)
      // 2. الشركة الحالية ليست التقازي (targetCompanyId !== 1)
      const isFromParentCompany = product.createdByCompanyId === 1 && targetCompanyId !== 1;

      // التحقق من صلاحية بيع أصناف الشركة الأم
      const hasParentSellPermission = user?.permissions?.includes(SCREEN_PERMISSIONS.SELL_PARENT_COMPANY_ITEMS) ||
        user?.permissions?.includes(SCREEN_PERMISSIONS.ALL);

      if (isFromParentCompany && !hasParentSellPermission) {
        notifications.custom.error('خطأ في الصلاحية', 'ليس لديك صلاحية لبيع أصناف من مخزن الشركة الأم (التقازي)');
        return;
      }

      console.log('🏢 التحقق من الشركة:', {
        targetCompanyId,
        productCompanyId: product.createdByCompanyId,
        isFromCurrentCompany,
        isFromParentCompany
      });

      if (targetCompanyId && !isFromCurrentCompany && !isFromParentCompany) {
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

      // التحقق من وجود الصنف في الفاتورة
      const existingLineIndex = saleForm.lines.findIndex(line => line.productId === product.id);

      if (existingLineIndex !== -1) {
        // الصنف موجود بالفعل - زيادة الكمية
        console.log('🔄 الصنف موجود بالفعل في السطر:', existingLineIndex);

        setSaleForm(prev => {
          const updatedLines = [...prev.lines];
          const currentQty = updatedLines[existingLineIndex].qty || 0;
          updatedLines[existingLineIndex] = {
            ...updatedLines[existingLineIndex],
            qty: currentQty + 1
          };

          console.log('✅ تم زيادة الكمية من', currentQty, 'إلى', currentQty + 1);

          return {
            ...prev,
            lines: updatedLines
          };
        });

        // التركيز على السطر الموجود
        requestAnimationFrame(() => {
          focusProductSelect(existingLineIndex);
        });

        const sourceCompany = isFromParentCompany ? '(من مخزن التقازي)' : '(من الشركة الحالية)';
        notifications.custom.success(
          'تم بنجاح',
          `تم زيادة كمية الصنف "${product.name}" ${sourceCompany}`
        );
      } else {
        // الصنف غير موجود - إضافة سطر جديد
        console.log('➕ إضافة سطر جديد للفاتورة مع بيانات الصنف...');

        // حساب السعر
        const unitPrice = product.price?.sellPrice ? Number(product.price.sellPrice) : 0;

        // إضافة سطر جديد مع بيانات الصنف مباشرة (بدون setTimeout)
        setSaleForm(prev => {
          const newLine = {
            productId: product.id,
            qty: 1,
            unitPrice: unitPrice,
            isFromParentCompany: isFromParentCompany,
            parentUnitPrice: isFromParentCompany ? unitPrice : 0,
            branchUnitPrice: 0
          };

          const newLines = [...prev.lines, newLine];
          const newIndex = newLines.length - 1;

          console.log('✅ تم إضافة السطر بالبيانات:', {
            index: newIndex,
            productId: product.id,
            productName: product.name,
            productCompanyId: product.createdByCompanyId,
            isFromParentCompany: isFromParentCompany,
            unitPrice: unitPrice
          });

          // التركيز على مربع اختيار الصنف للصنف المُضاف
          requestAnimationFrame(() => {
            focusProductSelect(newIndex);
          });

          return {
            ...prev,
            lines: newLines
          };
        });

        // إظهار رسالة النجاح مع توضيح مصدر الصنف
        const sourceCompany = isFromParentCompany ? '(من مخزن التقازي)' : '(من الشركة الحالية)';
        notifications.custom.success(
          'تم بنجاح',
          `تمت إضافة الصنف "${product.name}" ${sourceCompany}`
        );
      }

      setShowQRScanner(false);
    } catch (error) {
      console.error('❌ خطأ في معالجة QR Code:', error);
      notifications.custom.error('خطأ', 'QR Code غير صالح أو تالف. تأكد من صحة رمز QR.');
    }
  };

  // API calls
  const targetCompanyIdForSales = user?.isSystemUser ? selectedCompanyId : user?.companyId;
  const shouldSkipSalesQuery = Boolean(user?.isSystemUser && !selectedCompanyId);

  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useGetSalesQuery(
    {
      page: currentPage,
      limit: 10,
      search: searchTerm,
      companyId: targetCompanyIdForSales || undefined,
      status: invoiceStatusFilter === 'all' ? undefined : invoiceStatusFilter
    },
    {
      skip: shouldSkipSalesQuery
    }
  );

  const { data: customersData, isLoading: customersLoading, error: customersError, refetch: refetchCustomers } = useGetCustomersQuery({ limit: 50000 });
  const { data: companiesData, isLoading: companiesLoading } = useGetCompaniesQuery({ limit: 1000 });

  // Auto-select company for non-system users and set default for system users
  useEffect(() => {
    if (user && user.companyId && !selectedCompanyId) {
      // للمستخدمين العاديين: اختيار شركتهم تلقائياً
      // لمستخدمي النظام: اختيار شركتهم كخيار افتراضي إذا لم يتم اختيار شركة بعد
      setSelectedCompanyId(user.companyId);
    }
  }, [user, selectedCompanyId]);

  // إعادة تعيين الصفحة عند تغيير الشركة لضمان عرض الفواتير الخاصة بها فقط
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCompanyId]);

  // إعادة تعيين الصفحة عند تغيير فلتر حالة الفاتورة
  useEffect(() => {
    setCurrentPage(1);
  }, [invoiceStatusFilter]);

  // جلب الأصناف حسب الشركة المختارة:
  // - شركة 1 (التقازي): أصناف شركة 1 فقط
  // - شركة 2+ (الإمارات وغيرها): جميع الأصناف
  const targetCompanyIdForProducts = user?.isSystemUser ? selectedCompanyId : user?.companyId;
  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery({
    limit: 10000, // زيادة الـ limit لجلب جميع الأصناف (يوجد أكثر من 2600 صنف)
    // نمرر الـ targetCompanyIdForProducts دائماً ليقوم الخادم بالفلترة بناءً على صلاحية "بيع أصناف الشركة الأم"
    companyId: targetCompanyIdForProducts || undefined
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
        unitPrice: line.unitPrice,
        discountPercentage: line.discountPercentage,
        discountAmount: line.discountAmount,
        profitMargin: line.profitMargin || 0
      };

      // للصناديق: ضرب السعر في عدد الأمتار
      if (product?.unit === 'صندوق' && product.unitsPerBox) {
        processedLine.unitPrice = line.unitPrice * Number(product.unitsPerBox);
      }

      return processedLine;
    });

    // إضافة companyId للطلب
    const saleRequest: any = {
      ...saleForm,
      lines: processedLines,
      companyId: targetCompanyId,
      totalDiscountPercentage: saleForm.totalDiscountPercentage || 0,
      totalDiscountAmount: saleForm.totalDiscountAmount || 0
    };

    await createSale(saleRequest).unwrap();
    // لا نعرض إشعار هنا - سيتم عرضه في handleCreateSale
  };

  // دالة للتعامل مع المبيعات المعقدة (أصناف من الشركة الحالية والشركة الأم)
  const handleComplexInterCompanySale = async (targetCompanyId: number) => {
    // تحميل هامش الربح من الإعدادات
    const savedMargin = localStorage.getItem('profitMargin');
    const profitMargin = savedMargin ? parseFloat(savedMargin) : getProfitMargin();

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
        subTotal: line.qty * branchUnitPrice - (line.discountAmount || 0),
        isFromParentCompany: line.isFromParentCompany || false,
        profitMargin: line.isFromParentCompany ? (line.profitMargin ?? profitMargin) : 0,
        discountPercentage: line.discountPercentage,
        discountAmount: line.discountAmount
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
      customerPaymentMethod: 'CASH', // افتراضي
      totalDiscountPercentage: saleForm.totalDiscountPercentage || 0,
      totalDiscountAmount: saleForm.totalDiscountAmount || 0,
      createdAt: saleForm.createdAt
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

      // إغلاق المودال
      setShowCreateSaleModal(false);

      // إعادة تعيين الفورم فوراً
      setSaleForm({
        customerId: undefined,
        notes: '',
        lines: [],
        createdAt: new Date().toISOString().split('T')[0]
      });
      setSelectedCustomerName('');
      setShowCustomerSuggestions(false);

      // تحديث قائمة الفواتير فوراً
      setCurrentPage(1);
      refetchSales();

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

    // تحميل هامش الربح من الإعدادات (سيُستخدم فقط للأصناف الجديدة أو إذا لم يكن محفوظاً)
    const savedMargin = localStorage.getItem('profitMargin');
    const defaultProfitMargin = savedMargin ? parseFloat(savedMargin) : getProfitMargin();

    // تحميل الأسطر الحالية مع التأكد من عدم وجود قيم سالبة
    // ومع إضافة معلومة isFromParentCompany من بيانات المنتج
    // مهم: في قاعدة البيانات، السعر للصناديق مخزون مضروباً في unitsPerBox
    // لذلك يجب قسمته لنحصل على سعر الوحدة الواحدة (المتر/القطعة)
    setEditLines(sale.lines.map(line => {
      const product = productsData?.data?.products?.find(p => p.id === line.productId);

      // الأولوية للبيانات المحفوظة في السطر، وإذا لم توجد نلجأ للتحقق من المنتج
      const isFromParentCompany = line.isFromParentCompany ?? (product?.createdByCompanyId === 1 && sale.companyId !== 1);

      // تحديد السعر الصحيح: إذا كان صندوق، نقسم على unitsPerBox للحصول على سعر الوحدة
      let unitPrice = Math.max(0, Number(line.unitPrice));
      if (product?.unit === 'صندوق' && product.unitsPerBox) {
        unitPrice = unitPrice / Number(product.unitsPerBox);
      }

      // استخدام هامش الربح المحفوظ في الفاتورة، أو الافتراضي إذا لم يكن موجوداً
      const lineProfitMargin = (line.profitMargin !== undefined && line.profitMargin !== null)
        ? Number(line.profitMargin)
        : defaultProfitMargin;

      return {
        id: line.id, // 👈 إضافة الـ id هنا لحماية السطر من التحديث التلقائي
        productId: line.productId,
        qty: Math.max(0, Number(line.qty)),
        unitPrice: unitPrice,
        discountPercentage: Math.max(0, Number(line.discountPercentage || 0)),
        discountAmount: Math.max(0, Number(line.discountAmount || 0)),
        isFromParentCompany: isFromParentCompany,
        parentUnitPrice: line.parentUnitPrice ?? (isFromParentCompany ? (product?.price?.sellPrice || 0) : undefined),
        branchUnitPrice: line.branchUnitPrice ?? (isFromParentCompany ? unitPrice : undefined),
        profitMargin: isFromParentCompany ? lineProfitMargin : 0
      };
    }));
    // مسح حقول البحث
    setProductCodeSearch('');
    setProductNameSearch('');
    setShowCodeDropdown(false);
    setShowNameDropdown(false);

    // تحميل قيم الخصم الإجمالي
    setEditTotalDiscountPercentage(Math.max(0, Number(sale.totalDiscountPercentage || 0)));
    setEditTotalDiscountAmount(Math.max(0, Number(sale.totalDiscountAmount || 0)));

    // تعيين الشركة المختارة للبحث عن المنتجات
    if (sale.companyId) {
      setSelectedCompanyId(sale.companyId);
    }
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToEdit) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const customerId = formData.get('customerId') ? Number(formData.get('customerId')) : undefined;
    const invoiceNumber = formData.get('invoiceNumber') as string;
    const createdAt = formData.get('createdAt') as string;

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
      // تحويل الأسعار للـ Backend: للصناديق نضرب في عدد الأمتار
      const processedLines = editLines.map(line => {
        const product = productsData?.data?.products?.find(p => p.id === line.productId);

        let processedLine: any = {
          productId: line.productId,
          qty: line.qty,
          unitPrice: line.unitPrice,
          discountPercentage: line.discountPercentage,
          discountAmount: line.discountAmount,
          isFromParentCompany: line.isFromParentCompany || false,
          parentUnitPrice: line.parentUnitPrice || 0,
          branchUnitPrice: line.branchUnitPrice || 0,
          profitMargin: line.profitMargin || 0
        };

        // للصناديق: ضرب السعر في عدد الأمتار قبل الحفظ
        if (product?.unit === 'صندوق' && product.unitsPerBox) {
          processedLine.unitPrice = line.unitPrice * Number(product.unitsPerBox);
        }

        return processedLine;
      });

      await updateSale({
        id: saleToEdit.id,
        data: {
          customerId,
          invoiceNumber: invoiceNumber || undefined,
          createdAt: createdAt || undefined,
          lines: processedLines,
          totalDiscountPercentage: editTotalDiscountPercentage || 0,
          totalDiscountAmount: editTotalDiscountAmount || 0
        }
      }).unwrap();

      notifications.custom.success('تم بنجاح', `تم تعديل الفاتورة ${saleToEdit.invoiceNumber || saleToEdit.id} بنجاح`);
      setShowEditModal(false);
      setSaleToEdit(null);
      setEditLines([]);
      setProductCodeSearch('');
      setProductNameSearch('');
      setShowCodeDropdown(false);
      setShowNameDropdown(false);
      refetchSales();
    } catch (err: any) {
      notifications.custom.error('خطأ', err?.data?.message || 'حدث خطأ أثناء تعديل الفاتورة');
    }
  };

  // دوال إدارة الأسطر في التعديل
  const addEditLine = () => {
    setEditLines(prev => [...prev, {
      productId: 0,
      qty: 1,
      unitPrice: 0,
      discountPercentage: 0,
      discountAmount: 0,
      isFromParentCompany: false,
      parentUnitPrice: 0,
      branchUnitPrice: 0,
      profitMargin: 0
    }]);
  };

  const removeEditLine = (index: number) => {
    setEditLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateEditLine = useCallback((index: number, field: string, value: any) => {
    setEditLines(prev => prev.map((line, i) => {
      if (i !== index) return line;

      const newLine = { ...line, [field]: value };
      const product = productsData?.data?.products?.find(p => p.id === newLine.productId);

      // حساب الخصم التلقائي
      if (field === 'discountPercentage' || field === 'qty' || field === 'unitPrice' || field === 'productId') {
        // حساب totalBeforeDiscount: للصناديق نضرب في unitsPerBox
        let totalBeforeDiscount = 0;
        if (product?.unit === 'صندوق' && product?.unitsPerBox) {
          totalBeforeDiscount = Math.max(0, Number((newLine.qty * Number(product.unitsPerBox) * newLine.unitPrice).toFixed(2)));
        } else {
          totalBeforeDiscount = Math.max(0, Number((newLine.qty * newLine.unitPrice).toFixed(2)));
        }

        if (field === 'discountPercentage') {
          const discPerc = Math.max(0, Math.min(100, Number(value))); // بين 0 و 100
          newLine.discountPercentage = discPerc;
          newLine.discountAmount = Math.max(0, Number(((discPerc / 100) * totalBeforeDiscount).toFixed(2)));
        } else if (field === 'qty' || field === 'unitPrice') {
          // تحديث قيمة الخصم بناءً على النسبة القديمة إذا تغير السعر أو الكمية
          const discPerc = Math.max(0, Math.min(100, Number(newLine.discountPercentage || 0)));
          newLine.discountPercentage = discPerc;
          newLine.discountAmount = Math.max(0, Number(((discPerc / 100) * totalBeforeDiscount).toFixed(2)));
        }
      } else if (field === 'discountAmount') {
        // حساب totalBeforeDiscount: للصناديق نضرب في unitsPerBox
        let totalBeforeDiscount = 0;
        if (product?.unit === 'صندوق' && product?.unitsPerBox) {
          totalBeforeDiscount = Math.max(0, Number((newLine.qty * Number(product.unitsPerBox) * newLine.unitPrice).toFixed(2)));
        } else {
          totalBeforeDiscount = Math.max(0, Number((newLine.qty * newLine.unitPrice).toFixed(2)));
        }

        const discAmount = Math.max(0, Math.min(totalBeforeDiscount, Number(value))); // بين 0 والمجموع
        newLine.discountAmount = discAmount;
        if (totalBeforeDiscount > 0) {
          newLine.discountPercentage = Math.max(0, Number(((discAmount / totalBeforeDiscount) * 100).toFixed(2)));
        }
      }

      return newLine;
    }));
  }, [productsData]);

  // دالة لتحديث السعر من السعر/متر
  const updatePriceFromUnitPrice = (index: number, pricePerUnit: number) => {
    const product = productsData?.data?.products?.find(p => p.id === editLines[index].productId);
    const unitsPerBox = product?.unitsPerBox ? Number(product.unitsPerBox) : 1;
    const totalPrice = Number((pricePerUnit * unitsPerBox).toFixed(2));
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
        branchUnitPrice: 0,
        profitMargin: 0
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
  const updateSaleLine = useCallback((index: number, field: string, value: any) => {
    setSaleForm(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      )
    }));
  }, []);

  // Debug: عرض عدد الأصناف المتاحة
  console.log('🔍 Products Debug:', {
    totalProducts: productsData?.data?.products?.length || 0,
    selectedCompanyId,
    targetCompanyIdForProducts,
    productCodeSearch,
    productNameSearch,
    sampleProducts: productsData?.data?.products?.slice(0, 3).map(p => ({ id: p.id, sku: p.sku, name: p.name, companyId: p.createdByCompanyId }))
  });

  // فلترة الأصناف بالكود (مطابقة تامة =)
  const filteredByCode = productsData?.data?.products?.filter(product => {
    if (!productCodeSearch) return false;
    // مطابقة تامة للكود
    return product.sku.toLowerCase() === productCodeSearch.toLowerCase();
  }) || [];

  // فلترة الأصناف بالاسم (like - جزء من الاسم)
  const filteredByName = productsData?.data?.products?.filter(product => {
    if (!productNameSearch) return false;
    // البحث بجزء من الاسم
    return product.name.toLowerCase().includes(productNameSearch.toLowerCase());
  }) || [];

  // Debug: عرض نتائج الفلترة
  if (productCodeSearch) {
    console.log('🔢 Code Search Results:', { search: productCodeSearch, count: filteredByCode.length, results: filteredByCode.slice(0, 3) });
  }
  if (productNameSearch) {
    console.log('🔍 Name Search Results:', { search: productNameSearch, count: filteredByName.length, results: filteredByName.slice(0, 3) });
  }

  // دالة البحث بالكود - تعرض القائمة تحت خانة الكود
  const handleProductCodeSearch = (code: string) => {
    setProductCodeSearch(code);
    setShowCodeDropdown(code.length > 0);
    setShowNameDropdown(false); // إغلاق قائمة الاسم
  };

  // دالة البحث بالاسم - تعرض القائمة تحت خانة الاسم
  const handleProductNameSearch = (name: string) => {
    setProductNameSearch(name);
    setShowNameDropdown(name.length > 0);
    setShowCodeDropdown(false); // إغلاق قائمة الكود
  };

  // Legacy auto-select code (disabled - now using dropdown selection)
  const legacyAutoSelect = (code: string) => {
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
        setProductNameSearch('');
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
    <div className="p-4 w-full">
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
              <h1 className="text-3xl font-bold text-slate-800 dark:text-text-primary">إدارة المبيعات</h1>
              <p className="text-slate-500 dark:text-text-secondary">إدارة فواتير المبيعات والعملاء</p>
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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${(user?.isSystemUser ? selectedCompanyId : user?.companyId)
              ? 'bg-success-600 hover:bg-success-700 text-white shadow-md hover:shadow-lg'
              : 'bg-slate-100 dark:bg-surface-secondary text-slate-400 dark:text-text-tertiary cursor-not-allowed'
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
        <div className="bg-white dark:bg-surface-primary p-6 rounded-lg shadow-sm border border-slate-200 dark:border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-text-secondary text-sm">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-text-primary">{formatArabicNumber(salesData?.data?.pagination?.total || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-primary p-6 rounded-lg shadow-sm border border-slate-200 dark:border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-text-secondary text-sm">فواتير مبدئية</p>
              <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">{formatArabicNumber(salesData?.data?.sales?.filter((sale: any) => sale.status === 'DRAFT').length || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-primary p-6 rounded-lg shadow-sm border border-slate-200 dark:border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-text-secondary text-sm">فواتير معتمدة</p>
              <p className="text-2xl font-bold text-success-600 dark:text-success-400">{formatArabicNumber(salesData?.data?.sales?.filter((sale: any) => sale.status === 'APPROVED').length || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-primary p-6 rounded-lg shadow-sm border border-slate-200 dark:border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-text-secondary text-sm">إجمالي القيمة</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatArabicCurrency(salesData?.data?.sales?.reduce((sum: number, sale: any) => sum + sale.total, 0) || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Company Selection */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800/30 relative z-40">
        <label className="block text-sm font-bold text-blue-900 dark:text-blue-300 mb-2">
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
            setProductNameSearch('');
          }}
          disabled={!user?.isSystemUser}
          className="w-full px-4 py-3 border-2 border-blue-300 dark:border-blue-800/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary text-lg font-medium disabled:bg-slate-100 dark:disabled:bg-surface-elevated disabled:cursor-not-allowed relative z-50 outline-none transition-all"
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

      {shouldSkipSalesQuery && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">اختر شركة لعرض فواتيرها</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">سيتم عرض فواتير الشركة المختارة فقط، وبالترتيب من الأحدث إلى الأقدم.</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-surface-primary p-6 rounded-lg shadow-sm border border-slate-200 dark:border-border-primary mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Invoice Status Filter */}
          <div className="relative">
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <select
              value={invoiceStatusFilter}
              onChange={(e) => setInvoiceStatusFilter(e.target.value as 'all' | 'DRAFT' | 'APPROVED')}
              className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all"
            >
              <option value="all">حالة الفاتورة: الكل</option>
              <option value="DRAFT">حالة الفاتورة: مبدئية</option>
              <option value="APPROVED">حالة الفاتورة: معتمدة</option>
            </select>
          </div>

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
              className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all"
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
              className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all"
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
              className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Clear Filters Button */}
          {(searchTerm || customerNameFilter || customerPhoneFilter || invoiceStatusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCustomerNameFilter('');
                setCustomerPhoneFilter('');
                setInvoiceStatusFilter('all');
              }}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors whitespace-nowrap"
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
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-800 dark:text-blue-300">
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
      <div className="bg-white dark:bg-surface-primary rounded-lg shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-full">
            <thead className="bg-slate-50 dark:bg-surface-secondary">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-500 dark:text-text-secondary uppercase tracking-wider w-32">
                  رقم الفاتورة
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500 dark:text-text-secondary uppercase tracking-wider w-40">
                  الشركة
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500 dark:text-text-secondary uppercase tracking-wider w-48">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500 dark:text-text-secondary uppercase tracking-wider w-32">
                  المجموع
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500 dark:text-text-secondary uppercase tracking-wider w-28">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500 dark:text-text-secondary uppercase tracking-wider min-w-[200px]">
                  الملاحظات
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500 dark:text-text-secondary uppercase tracking-wider w-32">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-500 dark:text-text-secondary uppercase tracking-wider w-40">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-primary divide-y divide-slate-200 dark:divide-border-primary">
              {shouldSkipSalesQuery ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-text-secondary">
                    يجب اختيار الشركة أولاً لعرض الفواتير
                  </td>
                </tr>
              ) : (
                salesData?.data?.sales
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
                    <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors">
                      <td className="px-6 py-4 text-base font-semibold text-slate-800 dark:text-text-primary">
                        {sale.invoiceNumber || `#${sale.id}`}
                      </td>
                      <td className="px-6 py-4 text-base text-slate-800 dark:text-text-primary">
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-600 dark:text-blue-400">{sale.company?.name}</span>
                          <span className="text-xs text-slate-500 dark:text-text-tertiary">{sale.company?.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-base text-slate-800 dark:text-text-primary">
                        {sale.customer?.name || 'غير محدد'}
                      </td>
                      <td className="px-6 py-4 text-base text-slate-800 dark:text-text-primary">
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {formatArabicCurrency(sale.total)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${sale.status === 'DRAFT'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                          : sale.status === 'APPROVED'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                          }`}>
                          {sale.status === 'DRAFT' ? 'مبدئية' :
                            sale.status === 'APPROVED' ? 'معتمدة' : 'ملغية'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-base text-slate-800 dark:text-text-primary break-words">
                        {sale.notes || <span className="text-slate-400 dark:text-text-tertiary">-</span>}
                      </td>
                      <td className="px-6 py-4 text-base text-slate-800 dark:text-text-primary">
                        {new Date(sale.createdAt).toLocaleDateString('en-US')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSaleToPrint(sale);
                              setShowPrintModal(true);
                            }}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 rounded"
                            title="طباعة الفاتورة"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setSelectedSale(sale)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded"
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
                              className={`p-1 rounded ${sale.isAutoGenerated ? 'text-slate-400 dark:text-text-tertiary cursor-not-allowed' : 'text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300'}`}
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
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded"
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
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {salesData?.data?.pagination && (
        <div className="bg-white dark:bg-surface-primary px-4 py-3 flex items-center justify-between border-t border-slate-200 dark:border-border-primary sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-border-primary text-sm font-medium rounded-md text-slate-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors"
            >
              السابق
            </button>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage >= salesData.data.pagination.pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-border-primary text-sm font-medium rounded-md text-slate-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors"
            >
              التالي
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700 dark:text-text-secondary">
                عرض{' '}
                <span className="font-medium text-slate-900 dark:text-text-primary">
                  {((currentPage - 1) * 10) + 1}
                </span>{' '}
                إلى{' '}
                <span className="font-medium text-slate-900 dark:text-text-primary">
                  {Math.min(currentPage * 10, salesData.data.pagination.total)}
                </span>{' '}
                من{' '}
                <span className="font-medium text-slate-900 dark:text-text-primary">{salesData.data.pagination.total}</span>{' '}
                نتيجة
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                {Array.from({ length: salesData.data.pagination.pages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${currentPage === i + 1
                      ? 'z-10 bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-surface-secondary border-slate-300 dark:border-border-primary text-slate-500 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-surface-hover'
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

      {/* Create Sale Modal */}
      {showCreateSaleModal && selectedCompanyId && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-6 border dark:border-border-primary w-[98%] max-w-[1800px] shadow-lg rounded-md bg-white dark:bg-surface-primary min-h-[95vh]">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-slate-800 dark:text-text-primary mb-4">إنشاء فاتورة مبيعات جديدة</h3>

              {/* عرض الشركة المختارة */}
              <div className="mb-4 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-800/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-300">🏢 الشركة:</span>
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    {companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.name}
                  </span>
                  <span className="text-xs text-blue-600 dark:text-blue-500">
                    ({companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.code})
                  </span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                  💡 سيتم البيع من مخزون هذه الشركة فقط
                </p>
              </div>

              {/* ملاحظة مهمة عن البيع بالمتر */}
              <div className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-800/30">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <p className="text-sm text-blue-900 dark:text-blue-300 font-bold mb-1">
                      ملاحظة مهمة: البيع بالمتر المربع
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
                      • للأصناف التي وحدتها "صندوق": البيع يتم <strong>بالمتر المربع</strong><br />
                      • سيتم <strong>التقريب للأعلى</strong> لعدد الصناديق (مثال: 4.5 صندوق → 5 صناديق)<br />
                      • سيحصل العميل على <strong>عدد الأمتار الكامل</strong> للصناديق المباعة<br />
                      • <strong>لا يوجد بيع لنصف صندوق</strong> - دائماً صناديق كاملة
                    </p>
                  </div>
                </div>
              </div>

              {/* تنبيه إذا لم تكن هناك أصناف - نتحقق من البيانات الأصلية وليس نتائج البحث */}
              {selectedCompanyId && !productsLoading && productsData?.data?.products?.length === 0 && (
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
                <div className="mb-4 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-800/30">
                  <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                    ⏳ جاري تحميل الأصناف...
                  </p>
                </div>
              )}

              <form onSubmit={handleCreateSale} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="relative" ref={customerSearchRef}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-1">
                      العميل *
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={selectedCustomerName || customerSearchTerm}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCustomerSearchTerm(value);
                            setSelectedCustomerName('');
                            setSaleForm(prev => ({ ...prev, customerId: undefined }));
                            setShowCustomerSuggestions(true);
                          }}
                          onFocus={() => setShowCustomerSuggestions(true)}
                          placeholder="ابحث عن العميل بالاسم أو الهاتف..."
                          className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all"
                          required={!saleForm.customerId}
                        />
                        {customersLoading && (
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        )}

                        {/* Customer Suggestions Dropdown */}
                        {showCustomerSuggestions && !customersLoading && (
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-surface-elevated border border-slate-300 dark:border-border-primary rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {customersData?.data?.customers
                              ?.filter((customer: Customer) =>
                                !customer.phone?.startsWith('BRANCH') &&
                                (customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                  customer.phone?.includes(customerSearchTerm))
                              )
                              ?.map((customer: Customer) => (
                                <div
                                  key={customer.id}
                                  onClick={() => {
                                    setSaleForm(prev => ({ ...prev, customerId: customer.id }));
                                    setSelectedCustomerName(customer.name);
                                    setCustomerSearchTerm('');
                                    setShowCustomerSuggestions(false);
                                  }}
                                  className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-surface-hover cursor-pointer border-b border-slate-100 dark:border-border-primary last:border-b-0 transition-colors"
                                >
                                  <div className="font-medium text-slate-900 dark:text-text-primary">{customer.name}</div>
                                  {customer.phone && (
                                    <div className="text-xs text-slate-500 dark:text-text-tertiary">📱 {customer.phone}</div>
                                  )}
                                </div>
                              ))}
                            {customersData?.data?.customers
                              ?.filter((customer: Customer) =>
                                !customer.phone?.startsWith('BRANCH') &&
                                (customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                  customer.phone?.includes(customerSearchTerm))
                              )?.length === 0 && (
                                <div className="px-3 py-2 text-slate-500 dark:text-text-tertiary text-sm">
                                  لا توجد نتائج
                                </div>
                              )}
                          </div>
                        )}
                      </div>
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
                    {saleForm.customerId && selectedCustomerName && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        ✓ تم اختيار: {selectedCustomerName}
                      </p>
                    )}
                    {!saleForm.customerId && (
                      <p className="text-xs text-gray-500 mt-1">
                        مطلوب - ابحث واختر عميل للمتابعة
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-1">
                      📅 تاريخ الفاتورة *
                    </label>
                    <input
                      type="date"
                      value={saleForm.createdAt || ''}
                      onChange={(e) => setSaleForm(prev => ({ ...prev, createdAt: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      يمكنك اختيار تاريخ قديم إذا لزم الأمر
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-1">
                      رقم الفاتورة
                    </label>
                    <input
                      type="text"
                      value="سيتم توليده تلقائياً"
                      readOnly
                      className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-md bg-slate-50 dark:bg-surface-secondary text-slate-500 dark:text-text-tertiary cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      سيتم توليد رقم الفاتورة تلقائياً عند الحفظ
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-1">
                      📝 ملاحظات (اختياري)
                    </label>
                    <textarea
                      value={saleForm.notes || ''}
                      onChange={(e) => setSaleForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all"
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
                    <label className="block text-base font-bold text-slate-800 dark:text-text-primary">
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
                  <div className="mb-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-surface-secondary dark:to-blue-900/10 border-2 border-slate-200 dark:border-border-primary rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔍</span>
                        <h4 className="text-sm font-bold text-slate-700 dark:text-text-primary">البحث عن المنتجات</h4>
                      </div>
                      {selectedCompanyId && (
                        <span className="text-xs text-blue-700 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                          أصناف {companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.name} فقط
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* البحث بالكود - مطابقة تامة = */}
                      <div className="relative code-dropdown-container">
                        <label className="block text-xs font-medium text-slate-700 dark:text-text-secondary mb-1">
                          🔢 البحث بالكود (مطابقة تامة)
                        </label>
                        <input
                          type="text"
                          value={productCodeSearch}
                          onChange={(e) => handleProductCodeSearch(e.target.value)}
                          onFocus={() => productCodeSearch && setShowCodeDropdown(true)}
                          placeholder="أدخل الكود بالضبط..."
                          className="w-full px-3 py-2 border-2 border-blue-300 dark:border-blue-800/30 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all font-mono"
                        />
                        {/* القائمة المنسدلة للبحث بالكود */}
                        {showCodeDropdown && productCodeSearch && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-surface-elevated border border-blue-300 dark:border-blue-800/30 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {filteredByCode.length > 0 ? (
                              filteredByCode.map((product: any) => {
                                const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
                                const isFromParentCompany = product.createdByCompanyId !== targetCompanyId && product.createdByCompanyId === 1;
                                return (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => handleSelectProductFromDropdown(product)}
                                    className={`w-full px-3 py-2 text-right focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors ${isFromParentCompany ? 'hover:bg-orange-50' : 'hover:bg-blue-50'
                                      }`}
                                  >
                                    <div className="flex justify-between items-start gap-3">
                                      <div className="text-sm flex-1">
                                        <div className={`font-medium ${isFromParentCompany ? 'text-orange-900 dark:text-orange-300' : 'text-slate-900 dark:text-text-primary'}`}>
                                          {product.name}
                                          {isFromParentCompany && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 mr-2">
                                              مخزن التقازي
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-text-tertiary mt-1">كود: {product.sku}</div>
                                        {/* عرض معلومات المخزون */}
                                        {(() => {
                                          const stockInfo = getProductStock(product, targetCompanyId || null);
                                          return (
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stockInfo.boxes > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                }`}>
                                                📦 {stockInfo.boxes} {product.unit || 'وحدة'}
                                                {product.unit === 'صندوق' && product.unitsPerBox && (
                                                  <span className="text-[10px]">
                                                    ({stockInfo.quantity.toFixed(2)} م²)
                                                  </span>
                                                )}
                                              </span>
                                              <span className="text-[10px] text-gray-500">
                                                {stockInfo.source}
                                              </span>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                      <div className="text-xs font-medium text-blue-600 whitespace-nowrap">
                                        {product.price?.sellPrice ? `${Number(product.price.sellPrice).toFixed(2)} د.ل` : 'غير محدد'}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                لا يوجد صنف بهذا الكود
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* البحث بالاسم - like */}
                      <div className="relative name-dropdown-container">
                        <label className="block text-xs font-medium text-slate-700 dark:text-text-secondary mb-1">
                          🔍 البحث بالاسم (جزء من الاسم)
                        </label>
                        <input
                          type="text"
                          value={productNameSearch}
                          onChange={(e) => handleProductNameSearch(e.target.value)}
                          onFocus={() => productNameSearch && setShowNameDropdown(true)}
                          placeholder="ابحث بجزء من الاسم..."
                          className="w-full px-3 py-2 border-2 border-slate-300 dark:border-border-primary rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all"
                        />
                        {/* القائمة المنسدلة للبحث بالاسم */}
                        {showNameDropdown && productNameSearch && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-surface-elevated border border-slate-300 dark:border-border-primary rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {filteredByName.length > 0 ? (
                              filteredByName.slice(0, 10).map((product: any) => {
                                const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
                                const isFromParentCompany = product.createdByCompanyId !== targetCompanyId && product.createdByCompanyId === 1;
                                return (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => handleSelectProductFromDropdown(product)}
                                    className={`w-full px-3 py-2 text-right focus:outline-none border-b border-slate-100 dark:border-border-primary last:border-b-0 transition-colors ${isFromParentCompany ? 'hover:bg-orange-50 dark:hover:bg-orange-900/10' : 'hover:bg-blue-50 dark:hover:bg-blue-900/10'
                                      }`}
                                  >
                                    <div className="flex justify-between items-start gap-3">
                                      <div className="text-sm flex-1">
                                        <div className={`font-medium ${isFromParentCompany ? 'text-orange-900' : 'text-gray-900'}`}>
                                          {product.name}
                                          {isFromParentCompany && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mr-2">
                                              مخزن التقازي
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">كود: {product.sku}</div>
                                        {/* عرض معلومات المخزون */}
                                        {(() => {
                                          const stockInfo = getProductStock(product, targetCompanyId || null);
                                          return (
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stockInfo.boxes > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                📦 {stockInfo.boxes} {product.unit || 'وحدة'}
                                                {product.unit === 'صندوق' && product.unitsPerBox && (
                                                  <span className="text-[10px]">
                                                    ({stockInfo.quantity.toFixed(2)} م²)
                                                  </span>
                                                )}
                                              </span>
                                              <span className="text-[10px] text-gray-500">
                                                {stockInfo.source}
                                              </span>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                      <div className={`text-xs font-medium whitespace-nowrap ${isFromParentCompany ? 'text-orange-600' : 'text-blue-600'}`}>
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
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-text-secondary mb-1">
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
                        <p className="text-xs text-slate-500 dark:text-text-tertiary mt-1">
                          📱 امسح الكود لإضافة الصنف تلقائياً
                        </p>
                      </div>
                    </div>

                    {/* QR Scanner Camera */}
                    {showQRScanner && (
                      <div className="mt-3 p-4 bg-purple-50 dark:bg-purple-900/10 border-2 border-purple-300 dark:border-purple-800/30 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div>
                              <h4 className="text-sm font-bold text-purple-900 dark:text-purple-300">📱 ماسح QR Code</h4>
                              <p className="text-xs text-purple-700 dark:text-purple-400">وجّه الكاميرا نحو QR Code</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowQRScanner(false)}
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-bold text-xl"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Camera Preview */}
                        <div id="qr-reader" className="rounded-lg overflow-hidden ring-2 ring-purple-100 dark:ring-purple-900/30"></div>

                        <div className="mt-3 flex items-start gap-2 text-xs text-purple-700 dark:text-purple-300 bg-white dark:bg-surface-secondary p-2 rounded">
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
                    {(productCodeSearch || productNameSearch) && (
                      <div className="mt-3 flex justify-between items-center p-2 bg-white dark:bg-surface-secondary rounded-md border border-blue-200 dark:border-blue-800/30">
                        <div className="text-xs font-medium text-slate-600 dark:text-text-secondary">
                          📊 عرض {productCodeSearch ? filteredByCode.length : filteredByName.length} منتج من أصل {productsData?.data?.products?.length || 0}
                          {productCodeSearch && <span className="text-blue-600 dark:text-blue-400 mr-2">| كود: {productCodeSearch}</span>}
                          {productNameSearch && <span className="text-green-600 dark:text-green-400 mr-2">| اسم: {productNameSearch}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProductCodeSearch('');
                            setProductNameSearch('');
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        >
                          ✖️ مسح البحث
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {saleForm.lines.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 dark:bg-surface-secondary border-2 border-dashed border-slate-300 dark:border-border-primary rounded-lg">
                        <div className="text-6xl mb-3">📝</div>
                        <p className="text-slate-600 dark:text-text-primary font-medium mb-2">لا توجد بنود في الفاتورة</p>
                        <p className="text-sm text-slate-500 dark:text-text-secondary">اضغط على "إضافة بند" لبدء إنشاء الفاتورة</p>
                      </div>
                    ) : (
                      saleForm.lines.map((line, index) => {
                        const selectedProduct = productsData?.data?.products?.find(p => p.id === line.productId);
                        const currentCompanyId = user?.isSystemUser ? selectedCompanyId : (user?.companyId || null);

                        // Debug log للتحقق من البيانات
                        if (line.productId && !selectedProduct) {
                          console.warn(`⚠️ الصنف ${line.productId} غير موجود في productsData. عدد الأصناف: ${productsData?.data?.products?.length || 0}`);
                        }
                        console.log(`🔍 SaleLineItem render:`, {
                          lineIndex: index,
                          productId: line.productId,
                          isFromParentCompany: line.isFromParentCompany,
                          currentCompanyId,
                          selectedProductFound: !!selectedProduct,
                          selectedProductName: selectedProduct?.name
                        });

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
                            filteredProducts={productsData?.data?.products || []}
                            enableLineDiscount={enableLineDiscount}
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
                            <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/10 dark:to-yellow-900/10 border-2 border-orange-300 dark:border-orange-800/30 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-orange-600 dark:text-orange-400">🔄</span>
                                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                  فاتورة مختلطة - سيتم إنشاء فواتير متعددة تلقائياً
                                </span>
                              </div>
                              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                • فاتورة مبيعات للعميل • فاتورة مبيعات من مخزن التقازي (آجلة) • فاتورة مشتريات لمخزن التقازي
                              </div>
                            </div>
                          );
                        } else if (hasParentItems) {
                          return (
                            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-2 border-blue-300 dark:border-blue-800/30 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-600 dark:text-blue-400">🏢</span>
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                  فاتورة من مخزن التقازي - سيتم إنشاء فواتير متعددة تلقائياً
                                </span>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-2 border-green-300 dark:border-border-primary rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 dark:text-green-400">✅</span>
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                  فاتورة بسيطة - من الشركة الحالية فقط
                                </span>
                              </div>
                            </div>
                          );
                        }
                      })()}

                      {/* خصم إجمالي الفاتورة */}
                      {enableInvoiceDiscount && (
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-surface-secondary border-2 border-slate-200 dark:border-border-primary rounded-lg">
                          <label className="block text-sm font-bold text-slate-700 dark:text-text-primary mb-3">
                            💸 خصم إجمالي الفاتورة:
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-slate-500 dark:text-text-tertiary mb-1">نسبة الخصم (%)</label>
                              <input
                                type="number"
                                value={saleForm.totalDiscountPercentage || 0}
                                onChange={(e) => {
                                  let perc = Number(e.target.value);
                                  if (perc < 0) perc = 0;
                                  if (perc > 100) perc = 100;

                                  const subTotal = saleForm.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);
                                  const amount = (subTotal * perc) / 100;

                                  setSaleForm(prev => ({
                                    ...prev,
                                    totalDiscountPercentage: perc,
                                    totalDiscountAmount: amount
                                  }));
                                }}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-md focus:ring-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary"
                                min="0"
                                max="100"
                                step="any"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 dark:text-text-tertiary mb-1">مبلغ الخصم (د.ل)</label>
                              <input
                                type="number"
                                value={saleForm.totalDiscountAmount || 0}
                                onChange={(e) => {
                                  let amount = Number(e.target.value);
                                  const subTotal = saleForm.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);

                                  if (amount < 0) amount = 0;
                                  if (amount > subTotal) amount = subTotal;

                                  const perc = subTotal > 0 ? (amount / subTotal) * 100 : 0;

                                  setSaleForm(prev => ({
                                    ...prev,
                                    totalDiscountAmount: amount,
                                    totalDiscountPercentage: Number(perc.toFixed(2))
                                  }));
                                }}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-md focus:ring-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary"
                                min="0"
                                step="any"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* المجموع الإجمالي */}
                      <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 border-2 border-green-300 dark:border-border-primary rounded-lg">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-sm text-slate-800 dark:text-text-primary font-bold">
                            <span>إجمالي الفاتورة:</span>
                            <span>{formatArabicCurrency(saleForm.lines.reduce((sum, line) => {
                              // استخدام calculateLineTotal للحساب الصحيح (يأخذ بعين الاعتبار الأصناف من الشركة الأم)
                              const lineTotal = calculateLineTotal({ ...line, discountAmount: 0 }); // بدون خصم هنا
                              return sum + lineTotal;
                            }, 0))}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm text-red-600 font-medium">
                            <span>قيمة الخصم:</span>
                            <span>-{formatArabicCurrency(Math.max(0,
                              saleForm.lines.reduce((sum, line) => sum + Math.max(0, Number(line.discountAmount || 0)), 0) + Math.max(0, Number(saleForm.totalDiscountAmount || 0))
                            ))}</span>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-green-200 dark:border-border-primary">
                            <span className="text-lg font-bold text-slate-700 dark:text-text-secondary">الصافي النهائي:</span>
                            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {formatArabicCurrency(Math.max(0,
                                saleForm.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0) - Math.max(0, Number(saleForm.totalDiscountAmount || 0))
                              ))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-4 pt-8 border-t-2 border-slate-200 dark:border-border-primary mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateSaleModal(false);
                      setProductCodeSearch('');
                      setProductNameSearch('');
                    }}
                    className="flex items-center gap-2 px-8 py-3 border-2 border-slate-300 dark:border-border-primary rounded-lg text-slate-700 dark:text-text-primary hover:bg-slate-100 dark:hover:bg-surface-hover hover:border-slate-400 dark:hover:border-border-primary transition-all duration-200 font-medium text-base"
                  >
                    <span>❌</span>
                    <span>إلغاء</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || isCreatingComplex || !saleForm.customerId}
                    className={`flex items-center gap-2 px-8 py-3 rounded-lg shadow-md transition-all duration-200 font-medium text-base ${!saleForm.customerId
                      ? 'bg-slate-300 dark:bg-surface-secondary text-slate-500 dark:text-text-tertiary cursor-not-allowed'
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
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border dark:border-border-primary w-96 shadow-lg rounded-md bg-white dark:bg-surface-primary">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-slate-800 dark:text-text-primary mb-4">إضافة عميل جديد</h3>

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
                      setSelectedCustomerName(result.data.name);
                      setCustomerSearchTerm('');
                    }
                    notifications.custom.success('تم بنجاح', 'تم إضافة العميل بنجاح واختياره تلقائياً');
                  }, 100);
                } catch (err: any) {
                  notifications.custom.error('خطأ', err.data?.message || 'حدث خطأ أثناء إضافة العميل');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-1">
                    اسم العميل *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-1">
                    ملاحظات
                  </label>
                  <textarea
                    name="note"
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary transition-all"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateCustomerModal(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-md text-slate-700 dark:text-text-primary hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-7 border dark:border-border-primary w-11/12 max-w-5xl shadow-lg rounded-md bg-white dark:bg-surface-primary">
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-text-primary mb-5">
                تفاصيل الفاتورة #{selectedSale!.invoiceNumber || selectedSale!.id}
              </h3>

              <div className="space-y-4">
                {/* معلومات الشركة */}
                <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-800/30">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-blue-900 dark:text-blue-300">الشركة:</span>
                    <span className="text-base font-semibold text-blue-700 dark:text-blue-400">{selectedSale!.company?.name}</span>
                    <span className="text-sm text-blue-600 dark:text-blue-500">({selectedSale!.company?.code})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-base text-slate-800 dark:text-text-primary">
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-text-secondary">العميل:</span> {selectedSale!.customer?.name || 'غير محدد'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-text-secondary">التاريخ:</span> {new Date(selectedSale!.createdAt).toLocaleDateString('en-US')}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-text-secondary">الحالة:</span>
                    <span className={`ml-2 px-2 py-1 text-sm font-semibold rounded-full ${selectedSale!.status === 'DRAFT'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                      : selectedSale!.status === 'APPROVED'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                      }`}>
                      {selectedSale!.status === 'DRAFT' ? 'مبدئية' :
                        selectedSale!.status === 'APPROVED' ? 'معتمدة' : 'ملغية'}
                    </span>
                  </div>
                  {selectedSale!.notes && (
                    <div className="col-span-2">
                      <span className="font-semibold text-slate-500 dark:text-text-secondary">الملاحظات:</span> {selectedSale!.notes}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-text-primary mb-3">بنود الفاتورة:</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-border-primary">
                      <thead className="bg-slate-50 dark:bg-surface-secondary">
                        <tr>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-slate-500 dark:text-text-secondary">كود الصنف</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-slate-500 dark:text-text-secondary">الصنف</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-slate-500 dark:text-text-secondary">الكمية</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-slate-500 dark:text-text-secondary">سعر الوحدة</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-slate-500 dark:text-text-secondary">الإجمالي</th>
                          {enableLineDiscount && <th className="px-4 py-2 text-right text-sm font-semibold text-slate-500 dark:text-text-secondary">الخصم</th>}
                          <th className="px-4 py-2 text-right text-sm font-semibold text-slate-500 dark:text-text-secondary">الصافي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-border-primary">
                        {selectedSale!.lines.map((line, index) => {
                          // حساب الأمتار المربعة وسعر المتر للأصناف بوحدة صندوق
                          const isBox = line.product?.unit === 'صندوق';
                          const unitsPerBox = line.product?.unitsPerBox ? Number(line.product.unitsPerBox) : null;

                          // السعر: إذا صندوق نعرض سعر المتر، وإلا نعرض سعر الوحدة
                          // ملاحظة: السعر المحفوظ في قاعدة البيانات هو سعر الصندوق للصناديق
                          const displayPrice = isBox && unitsPerBox ? line.unitPrice / unitsPerBox : line.unitPrice;

                          return (
                            <tr key={index} className="text-slate-800 dark:text-text-primary">
                              <td className="px-4 py-2 text-sm font-mono text-slate-500 dark:text-text-tertiary">{line.product?.sku}</td>
                              <td className="px-4 py-2 text-base font-semibold">
                                {line.product?.name}
                                {isBox && unitsPerBox && (
                                  <span className="block text-xs text-slate-500 dark:text-text-tertiary mt-0.5">
                                    ({formatArabicNumber(unitsPerBox)} م²/صندوق)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-base">
                                <span className="font-medium text-blue-600 dark:text-blue-400">{formatArabicNumber(line.qty)}</span>
                                <span className="text-slate-500 dark:text-text-tertiary mr-1">{line.product?.unit || 'وحدة'}</span>
                                {isBox && unitsPerBox && (
                                  <span className="block text-xs text-blue-500 dark:text-blue-400 font-medium whitespace-nowrap">
                                    {formatArabicArea(line.qty * unitsPerBox)} م²
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-base">
                                <span className="font-medium">{formatArabicCurrency(displayPrice)}</span>
                                {isBox && <span className="text-slate-500 dark:text-text-tertiary text-xs block">/م²</span>}
                              </td>
                              <td className="px-4 py-2 text-base">
                                {formatArabicCurrency(line.qty * line.unitPrice)}
                              </td>
                              {enableLineDiscount && (
                                <td className="px-4 py-2 text-base text-red-600 dark:text-red-400">
                                  {line.discountAmount && line.discountAmount > 0 ? (
                                    <>
                                      <span>{formatArabicCurrency(line.discountAmount)}</span>
                                      <span className="text-xs block">({formatArabicNumber(line.discountPercentage || 0)}%)</span>
                                    </>
                                  ) : '-'}
                                </td>
                              )}
                              <td className="px-4 py-2 text-base font-medium text-green-600 dark:text-green-400">{formatArabicCurrency(line.subTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t dark:border-border-primary pt-4 space-y-2">
                  <div className="flex justify-between items-center text-slate-800 dark:text-text-primary text-base font-bold">
                    <span>إجمالي الفاتورة:</span>
                    <span>{formatArabicCurrency(Math.max(0, selectedSale!.lines.reduce((sum, line) => sum + (Math.max(0, Number(line.qty)) * Math.max(0, Number(line.unitPrice))), 0)))}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-600 dark:text-red-400 text-base">
                    <span className="font-medium">قيمة الخصم:</span>
                    <span>-{formatArabicCurrency(Math.max(0,
                      selectedSale!.lines.reduce((sum, line) => sum + Math.max(0, Number(line.discountAmount || 0)), 0) + Math.max(0, Number(selectedSale!.totalDiscountAmount || 0))
                    ))}</span>
                  </div>

                  <div className="flex justify-between items-center text-xl font-bold border-t-2 border-double border-blue-600 dark:border-blue-500 pt-3 mt-2 text-blue-700 dark:text-blue-400">
                    <span>الصافي النهائي:</span>
                    <span>{formatArabicCurrency(Math.max(0, Number(selectedSale!.total)))}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setSelectedSale(null)}
                    className="px-5 py-2.5 text-base bg-slate-600 dark:bg-surface-secondary text-white dark:text-text-primary rounded-md hover:bg-slate-700 dark:hover:bg-surface-hover transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-surface-primary rounded-lg shadow-xl max-w-[1600px] w-[96%] my-4 max-h-[95vh] overflow-y-auto border dark:border-border-primary">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-bold">✏️ تعديل الفاتورة</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditLines([]);
                  setProductCodeSearch('');
                  setProductNameSearch('');
                  setShowCodeDropdown(false);
                  setShowNameDropdown(false);
                }}
                className="text-white hover:text-white/80 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6">
              {/* معلومات الفاتورة */}
              <div className="mb-6 bg-slate-50 dark:bg-surface-secondary p-4 rounded-lg border dark:border-border-primary">
                <p className="text-slate-700 dark:text-text-primary mb-2">
                  <span className="font-medium text-slate-500 dark:text-text-secondary">رقم الفاتورة الحالي:</span> {saleToEdit.invoiceNumber || saleToEdit.id}
                </p>
                <p className="text-slate-700 dark:text-text-primary">
                  <span className="font-medium text-slate-500 dark:text-text-secondary">المجموع القديم:</span> {formatArabicCurrency(saleToEdit.total)}
                </p>
              </div>

              {/* رقم الفاتورة */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-2">
                  رقم الفاتورة
                </label>
                <input
                  type="text"
                  name="invoiceNumber"
                  defaultValue={saleToEdit.invoiceNumber || ''}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary transition-all"
                  placeholder="أدخل رقم الفاتورة"
                />
              </div>

              {/* العميل */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-2">
                  العميل
                </label>
                <select
                  name="customerId"
                  defaultValue={saleToEdit.customerId || ''}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary transition-all"
                >
                  <option value="">غير محدد</option>
                  {customersData?.data?.customers?.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* التاريخ */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-2">
                  📅 تاريخ الفاتورة
                </label>
                <input
                  type="date"
                  name="createdAt"
                  defaultValue={saleToEdit.createdAt ? new Date(saleToEdit.createdAt).toISOString().split('T')[0] : ''}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  يمكنك تعديل تاريخ الفاتورة إذا لزم الأمر
                </p>
              </div>

              {/* Product Search Filters */}
              <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900/10 dark:to-blue-900/10 border-2 border-slate-200 dark:border-border-primary rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔍</span>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-text-primary">البحث عن المنتجات</h4>
                  </div>
                  {saleToEdit && (
                    <span className="text-xs text-blue-700 dark:text-blue-300 font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                      أصناف {companiesData?.data?.companies?.find(c => c.id === saleToEdit.companyId)?.name || 'الشركة'} فقط
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* البحث بالكود - مطابقة تامة = */}
                  <div className="relative code-dropdown-container">
                    <label className="block text-xs font-medium text-slate-700 dark:text-text-secondary mb-1">
                      🔢 البحث بالكود (مطابقة تامة)
                    </label>
                    <input
                      type="text"
                      value={productCodeSearch}
                      onChange={(e) => handleProductCodeSearch(e.target.value)}
                      onFocus={() => productCodeSearch && setShowCodeDropdown(true)}
                      placeholder="أدخل الكود بالضبط..."
                      className="w-full px-3 py-2 border-2 border-blue-300 dark:border-blue-800/30 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary transition-all font-mono"
                    />
                    {/* القائمة المنسدلة للبحث بالكود */}
                    {showCodeDropdown && productCodeSearch && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-surface-primary border border-blue-300 dark:border-blue-800/50 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredByCode.length > 0 ? (
                          filteredByCode.map((product: any) => {
                            const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
                            const isFromParentCompany = product.createdByCompanyId !== targetCompanyId && product.createdByCompanyId === 1;
                            const existingLine = editLines.find(line => line.productId === product.id);
                            const isInInvoice = !!existingLine;
                            return (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleSelectProductForEdit(product)}
                                className={`w-full px-3 py-2 text-right focus:outline-none border-b border-slate-100 dark:border-border-primary last:border-b-0 transition-colors ${isInInvoice ? 'bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20' : (isFromParentCompany ? 'hover:bg-orange-50 dark:hover:bg-orange-900/10' : 'hover:bg-blue-50 dark:hover:bg-blue-900/10')
                                  }`}
                              >
                                <div className="flex justify-between items-start gap-3">
                                  <div className="text-sm flex-1">
                                    <div className={`font-medium ${isFromParentCompany ? 'text-orange-900 dark:text-orange-300' : 'text-slate-900 dark:text-text-primary'}`}>
                                      {product.name}
                                      {isFromParentCompany && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mr-2">
                                          مخزن التقازي
                                        </span>
                                      )}
                                      {isInInvoice && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-600 dark:bg-green-500 text-white mr-2">
                                          ✓ موجود (الكمية: {existingLine.qty})
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-text-secondary mt-1">كود: {product.sku}</div>
                                    {/* عرض معلومات المخزون */}
                                    {(() => {
                                      const stockInfo = getProductStock(product, targetCompanyId || null);
                                      return (
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stockInfo.boxes > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                            }`}>
                                            📦 {stockInfo.boxes} {product.unit || 'وحدة'}
                                            {product.unit === 'صندوق' && product.unitsPerBox && (
                                              <span className="text-[10px]">
                                                ({stockInfo.quantity.toFixed(2)} م²)
                                              </span>
                                            )}
                                          </span>
                                          <span className="text-[10px] text-gray-500">
                                            {stockInfo.source}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                    {product.price?.sellPrice ? `${Number(product.price.sellPrice).toFixed(2)} د.ل` : 'غير محدد'}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            لا يوجد صنف بهذا الكود
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* البحث بالاسم - like */}
                  <div className="relative name-dropdown-container">
                    <label className="block text-xs font-medium text-slate-700 dark:text-text-secondary mb-1">
                      🔍 البحث بالاسم (جزء من الاسم)
                    </label>
                    <input
                      type="text"
                      value={productNameSearch}
                      onChange={(e) => handleProductNameSearch(e.target.value)}
                      onFocus={() => productNameSearch && setShowNameDropdown(true)}
                      placeholder="ابحث بجزء من الاسم..."
                      className="w-full px-3 py-2 border-2 border-slate-300 dark:border-border-primary rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary transition-all"
                    />
                    {/* القائمة المنسدلة للبحث بالاسم */}
                    {showNameDropdown && productNameSearch && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-surface-primary border border-slate-300 dark:border-border-primary rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredByName.length > 0 ? (
                          filteredByName.slice(0, 10).map((product: any) => {
                            const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
                            const isFromParentCompany = product.createdByCompanyId !== targetCompanyId && product.createdByCompanyId === 1;
                            const existingLine = editLines.find(line => line.productId === product.id);
                            const isInInvoice = !!existingLine;
                            return (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleSelectProductForEdit(product)}
                                className={`w-full px-3 py-2 text-right focus:outline-none border-b border-slate-100 dark:border-border-primary last:border-b-0 transition-colors ${isInInvoice ? 'bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20' : (isFromParentCompany ? 'hover:bg-orange-50 dark:hover:bg-orange-900/10' : 'hover:bg-blue-50 dark:hover:bg-blue-900/10')
                                  }`}
                              >
                                <div className="flex justify-between items-start gap-3">
                                  <div className="text-sm flex-1">
                                    <div className={`font-medium ${isFromParentCompany ? 'text-orange-900 dark:text-orange-300' : 'text-slate-900 dark:text-text-primary'}`}>
                                      {product.name}
                                      {isFromParentCompany && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 mr-2">
                                          مخزن التقازي
                                        </span>
                                      )}
                                      {isInInvoice && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-600 dark:bg-green-500 text-white mr-2">
                                          ✓ موجود (الكمية: {existingLine.qty})
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-text-secondary mt-1">كود: {product.sku}</div>
                                    {/* عرض معلومات المخزون */}
                                    {(() => {
                                      const stockInfo = getProductStock(product, targetCompanyId || null);
                                      return (
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stockInfo.boxes > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            📦 {stockInfo.boxes} {product.unit || 'وحدة'}
                                            {product.unit === 'صندوق' && product.unitsPerBox && (
                                              <span className="text-[10px]">
                                                ({stockInfo.quantity.toFixed(2)} م²)
                                              </span>
                                            )}
                                          </span>
                                          <span className="text-[10px] text-gray-500">
                                            {stockInfo.source}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className={`text-xs font-medium whitespace-nowrap ${isFromParentCompany ? 'text-orange-600' : 'text-blue-600'}`}>
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
                </div>

                {(productCodeSearch || productNameSearch) && (
                  <div className="mt-3 flex justify-between items-center p-2 bg-white dark:bg-surface-secondary rounded-md border border-blue-200 dark:border-blue-800/30">
                    <div className="text-xs font-medium text-slate-600 dark:text-text-secondary">
                      📊 عرض {productCodeSearch ? filteredByCode.length : filteredByName.length} منتج من أصل {productsData?.data?.products?.length || 0}
                      {productCodeSearch && <span className="text-blue-600 dark:text-blue-400 mr-2">| كود: {productCodeSearch}</span>}
                      {productNameSearch && <span className="text-green-600 dark:text-green-400 mr-2">| اسم: {productNameSearch}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProductCodeSearch('');
                        setProductNameSearch('');
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      ✖️ مسح البحث
                    </button>
                  </div>
                )}
              </div>

              {/* قسم الأصناف */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary">
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
                  <div className="text-center py-12 bg-slate-50 dark:bg-surface-secondary border-2 border-dashed border-slate-300 dark:border-border-primary rounded-lg">
                    <div className="text-6xl mb-3">📝</div>
                    <p className="text-slate-600 dark:text-text-primary font-medium mb-2">لا توجد بنود في الفاتورة</p>
                    <p className="text-sm text-slate-500 dark:text-text-secondary">اضغط على "إضافة صنف" لبدء التعديل</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {editLines.map((line, index) => {
                      const selectedProduct = productsData?.data?.products?.find(p => p.id === line.productId);
                      const currentCompanyId = user?.isSystemUser ? selectedCompanyId : (user?.companyId || null);

                      return (
                        <SaleLineItem
                          key={`edit-line-${index}`}
                          line={line}
                          index={index}
                          selectedProduct={selectedProduct}
                          productsData={productsData}
                          currentCompanyId={currentCompanyId}
                          updateSaleLine={updateEditLine}
                          removeSaleLine={removeEditLine}
                          calculateLineTotal={calculateLineTotal}
                          formatArabicCurrency={formatArabicCurrency}
                          filteredProducts={productsData?.data?.products || []}
                          enableLineDiscount={enableLineDiscount}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* خصم إجمالي الفاتورة (تعديل) */}
              {enableInvoiceDiscount && (
                <div className="mb-6 p-4 bg-slate-50 dark:bg-surface-secondary border-2 border-slate-200 dark:border-border-primary rounded-lg">
                  <label className="block text-sm font-bold text-slate-700 dark:text-text-primary mb-3">
                    💸 خصم إجمالي الفاتورة:
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-text-tertiary mb-1">نسبة الخصم (%)</label>
                      <input
                        type="number"
                        value={editTotalDiscountPercentage || 0}
                        onChange={(e) => {
                          let perc = Number(e.target.value);
                          perc = Math.max(0, Math.min(100, perc));

                          const subTotal = Math.max(0, Number(editLines.reduce((sum, line) => {
                            const lineTotal = calculateLineTotal(line);
                            return sum + lineTotal;
                          }, 0).toFixed(2)));
                          const amount = Math.max(0, Number(((subTotal * perc) / 100).toFixed(2)));

                          setEditTotalDiscountPercentage(perc);
                          setEditTotalDiscountAmount(amount);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-md focus:ring-orange-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary"
                        min="0"
                        max="100"
                        step="any"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-text-tertiary mb-1">مبلغ الخصم (د.ل)</label>
                      <input
                        type="number"
                        value={editTotalDiscountAmount || 0}
                        onChange={(e) => {
                          let amount = Number(e.target.value);
                          const subTotal = Math.max(0, Number(editLines.reduce((sum, line) => {
                            const lineTotal = calculateLineTotal(line);
                            return sum + lineTotal;
                          }, 0).toFixed(2)));

                          amount = Math.max(0, Math.min(subTotal, amount));

                          const perc = subTotal > 0 ? Math.max(0, Number(((amount / subTotal) * 100).toFixed(2))) : 0;

                          setEditTotalDiscountAmount(Number(amount.toFixed(2)));
                          setEditTotalDiscountPercentage(perc);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-md focus:ring-orange-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary"
                        min="0"
                        step="any"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* المجموع الجديد */}
              {editLines.length > 0 && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800/30">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm text-slate-800 dark:text-text-primary font-bold">
                      <span>إجمالي الفاتورة:</span>
                      <span>{formatArabicCurrency(Number(editLines.reduce((sum, line) => {
                        // استخدام calculateLineTotal للحساب الصحيح (يأخذ بعين الاعتبار الأصناف من الشركة الأم)
                        const lineTotal = calculateLineTotal({ ...line, discountAmount: 0 }); // بدون خصم هنا
                        return sum + lineTotal;
                      }, 0).toFixed(2)))}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-red-600 dark:text-red-400 font-medium">
                      <span>قيمة الخصم:</span>
                      <span>-{formatArabicCurrency(Math.max(0, Number(
                        ((enableLineDiscount ? editLines.reduce((sum, line) => sum + Math.max(0, Number(line.discountAmount || 0)), 0) : 0) + (enableInvoiceDiscount ? Math.max(0, Number(editTotalDiscountAmount || 0)) : 0)).toFixed(2)
                      )))}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-border-primary">
                      <span className="text-lg font-bold text-slate-700 dark:text-text-secondary">الصافي النهائي:</span>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatArabicCurrency(Math.max(0, Number(
                          (editLines.reduce((sum, line) => {
                            // استخدام calculateLineTotal للحساب الصحيح مع الخصم
                            const lineTotal = enableLineDiscount ? calculateLineTotal(line) : calculateLineTotal({ ...line, discountAmount: 0 });
                            return sum + lineTotal;
                          }, 0) - (enableInvoiceDiscount ? Math.max(0, Number(editTotalDiscountAmount || 0)) : 0)).toFixed(2)
                        )))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ملاحظة تحذيرية */}
              <div className="bg-amber-50 dark:bg-amber-900/10 border-r-4 border-amber-400 p-4 mb-6 rounded-l-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-500 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
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
                    setProductCodeSearch('');
                    setProductNameSearch('');
                    setShowCodeDropdown(false);
                    setShowNameDropdown(false);
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-surface-secondary text-slate-700 dark:text-text-primary rounded-lg hover:bg-slate-300 dark:hover:bg-surface-hover transition-colors"
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
        </div >
      )}

      <PrintModal
        sale={saleToPrint}
        isOpen={showPrintModal}
        onClose={() => {
          setShowPrintModal(false);
          setSaleToPrint(null);
        }}
        enableLineDiscount={enableLineDiscount}
        enableInvoiceDiscount={enableInvoiceDiscount}
      />
    </div >
  );
};

export default SalesPage;

import React, { useRef, useEffect } from 'react';
import { useGetUserScreensQuery } from '@/state/permissionsApi';

// CSS لمنع التكرار
const preventDuplicateCSS = `
  /* إخفاء أي حقول مكررة */
  .sale-line-item [data-duplicate="true"] {
    display: none !important;
  }
  
  /* التأكد من عدم وجود تداخل في الحقول */
  .sale-line-item input[type="number"] {
    position: relative;
    z-index: 10;
  }
  
  /* منع أي عناصر من الظهور خارج الحاوية */
  .sale-line-item {
    overflow: hidden;
    contain: layout style paint;
  }
  
  /* إخفاء أي عناصر مكررة بناءً على الـ id */
  .sale-line-item [id*="qty-"]:not([id*="qty-${Date.now()}"]) ~ [id*="qty-"] {
    display: none !important;
  }
`;

// إضافة CSS للصفحة
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('prevent-duplicate-fields');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'prevent-duplicate-fields';
    style.textContent = preventDuplicateCSS;
    document.head.appendChild(style);
  }
}

interface SaleLineItemProps {
  line: any;
  index: number;
  selectedProduct: any;
  productsData: any;
  currentCompanyId: number | null;
  updateSaleLine: (index: number, field: string, value: any) => void;
  removeSaleLine: (index: number) => void;
  calculateLineTotal: (line: any) => number;
  formatArabicCurrency: (amount: number) => string;
  filteredProducts: any[];
  enableLineDiscount?: boolean;
}

const SaleLineItem: React.FC<SaleLineItemProps> = ({
  line,
  index,
  selectedProduct,
  productsData,
  currentCompanyId,
  updateSaleLine,
  removeSaleLine,
  calculateLineTotal,
  formatArabicCurrency,
  filteredProducts,
  enableLineDiscount = true
}) => {
  // تحميل هامش الربح من الإعدادات
  const [profitMargin, setProfitMargin] = React.useState(20);

  React.useEffect(() => {
    const savedMargin = localStorage.getItem('profitMargin');
    if (savedMargin) {
      setProfitMargin(parseFloat(savedMargin));
    }
  }, []);

  // فلترة الأصناف حسب نوع البند (يجب أن يكون قبل استخدامه)
  const lineFilteredProducts = filteredProducts.filter((product: any) => {
    if (!currentCompanyId) {
      return false;
    }

    if (line.isFromParentCompany) {
      // عرض أصناف الشركة الأم (التقازي = ID 1) فقط
      const isFromParent = product.createdByCompanyId === 1;
      return isFromParent;
    } else {
      // عرض أصناف الشركة الحالية فقط
      const isFromCurrent = product.createdByCompanyId === currentCompanyId;
      return isFromCurrent;
    }
  });

  // Debug log للتحقق من الفلترة
  console.log('🔍 SaleLineItem فلترة:', {
    lineIndex: index,
    isFromParentCompany: line.isFromParentCompany,
    currentCompanyId,
    productId: line.productId,
    filteredCount: lineFilteredProducts.length,
    totalProducts: filteredProducts.length,
    selectedProductExists: !!selectedProduct,
    selectedProductName: selectedProduct?.name,
    selectedProductCompanyId: selectedProduct?.createdByCompanyId,
    // عينة من الأصناف المفلترة
    sampleFilteredProducts: lineFilteredProducts.slice(0, 3).map((p: any) => ({ id: p.id, name: p.name, companyId: p.createdByCompanyId }))
  });

  // التأكد من أن الصنف المختار موجود في القائمة المفلترة
  // إذا لم يكن موجوداً (مثل عند إضافته عبر QR Code)، نضيفه
  const displayProducts = React.useMemo(() => {
    // إذا لم يكن هناك صنف مختار، نعرض القائمة المفلترة
    if (!line.productId) {
      return lineFilteredProducts;
    }

    // التحقق من وجود الصنف المختار في القائمة المفلترة
    const existsInFiltered = lineFilteredProducts.some((p: any) => p.id === line.productId);

    if (!existsInFiltered) {
      // البحث عن الصنف في جميع الأصناف (filteredProducts) أو استخدام selectedProduct
      const productToAdd = selectedProduct || filteredProducts.find((p: any) => p.id === line.productId);

      if (productToAdd) {
        // إضافة الصنف المختار في بداية القائمة
        console.log('➕ إضافة الصنف المختار للقائمة:', productToAdd.name);
        return [productToAdd, ...lineFilteredProducts];
      }
    }

    // إذا كان الصنف موجوداً في القائمة المفلترة
    return lineFilteredProducts;
  }, [lineFilteredProducts, selectedProduct, line.productId, filteredProducts]);

  // Debug log لـ displayProducts
  console.log('📋 displayProducts:', {
    lineIndex: index,
    displayCount: displayProducts.length,
    lineProductId: line.productId,
    hasSelectedProduct: !!selectedProduct,
    lineFilteredCount: lineFilteredProducts.length
  });

  // حالات محلية للحقول لتجنب فقدان التركيز
  const [localPrice, setLocalPrice] = React.useState(line.unitPrice || '');
  const [localQty, setLocalQty] = React.useState(line.qty > 0 ? line.qty : '');
  const [localDiscountPercentage, setLocalDiscountPercentage] = React.useState(Math.max(0, Number(line.discountPercentage || 0)));
  const [localDiscountAmount, setLocalDiscountAmount] = React.useState(Math.max(0, Number(line.discountAmount || 0)));
  const [isDiscountEnabled, setIsDiscountEnabled] = React.useState(line.discountPercentage > 0 || line.discountAmount > 0);
  
  // هامش الربح المحلي للتعديل (فقط للأصناف من الشركة الأم)
  const [localProfitMargin, setLocalProfitMargin] = React.useState(() => {
    // إذا كان من الشركة الأم ولديه سعر، نحسب هامش الربح الفعلي
    if (line.isFromParentCompany && line.parentUnitPrice && line.unitPrice) {
      const calculatedMargin = ((line.unitPrice - line.parentUnitPrice) / line.parentUnitPrice) * 100;
      return Math.max(0, Math.round(calculatedMargin));
    }
    return profitMargin;
  });
  
  // تحديث هامش الربح المحلي عندما يتغير من الإعدادات (فقط للأصناف الجديدة)
  React.useEffect(() => {
    if (!line.isFromParentCompany || !line.unitPrice) {
      setLocalProfitMargin(profitMargin);
    }
  }, [profitMargin, line.isFromParentCompany, line.unitPrice]);

  // جلب صلاحيات المستخدم
  const canApplyDiscount = enableLineDiscount; // استخدام الإعداد الممرر من الصفحة الرئيسية

  // تحديث الحالات المحلية عند تغيير القيم من الخارج
  React.useEffect(() => {
    setLocalPrice(line.unitPrice || '');
  }, [line.unitPrice]);

  // تحديث localQty فقط عندما يتغير line.qty من الخارج (وليس من debounce)
  const prevLineQtyRef = React.useRef(line.qty);
  React.useEffect(() => {
    // تحديث فقط إذا كانت القيمة مختلفة ولم تأتِ من التحديث المحلي
    if (line.qty !== prevLineQtyRef.current && String(line.qty) !== String(localQty)) {
      setLocalQty(line.qty > 0 ? line.qty : '');
      prevLineQtyRef.current = line.qty;
    }
  }, [line.qty, localQty]);

  // السعر غير قابل للتعديل - يُحدث فقط من قاعدة البيانات عند اختيار الصنف
  // تم إلغاء debounce للسعر لأنه لا يمكن تعديله يدوياً

  // debounce للكمية مع التحقق من المخزون
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const qtyValue = localQty === '' ? 0 : Number(localQty);
      const currentLineQty = Number(line.qty) || 0;
      
      // تحديث فقط إذا كانت القيمة مختلفة
      if (Math.abs(qtyValue - currentLineQty) > 0.001) {
        // التحقق من المخزون قبل التحديث
        const product = displayProducts.find((p: any) => p.id === line.productId);
        if (product && product.stock && qtyValue > 0) {
          // البحث عن المخزون في الشركة المالكة للصنف أولاً، ثم في الشركة المختارة
          let stockForCompany = product.stock.find((s: any) => s.companyId === product.createdByCompanyId);
          if (!stockForCompany || stockForCompany.boxes === 0) {
            stockForCompany = product.stock.find((s: any) => s.companyId === currentCompanyId);
          }
          const availableStock = stockForCompany?.boxes || 0;
          if (qtyValue > availableStock) {
            console.warn(`⚠️ الكمية المطلوبة (${qtyValue}) أكبر من المتوفر في المخزون (${availableStock})`);
            // إعادة تعيين الكمية للحد الأقصى المتاح
            setLocalQty(availableStock.toString());
            updateSaleLine(index, 'qty', availableStock);
            return;
          }
        }
        updateSaleLine(index, 'qty', qtyValue);
        prevLineQtyRef.current = qtyValue;
      }
    }, 300); // زيادة الوقت قليلاً لتجنب التحديثات السريعة

    return () => clearTimeout(timer);
  }, [localQty, index, updateSaleLine, line.productId, displayProducts, currentCompanyId]);

  // تحديث الخصم عند تغيير السعر أو الكمية
  React.useEffect(() => {
    if (isDiscountEnabled) {
      const price = Math.max(0, Number(localPrice) || 0);
      const qty = Math.max(0, Number(localQty) || 0);
      
      // حساب totalBeforeDiscount: للصناديق نضرب في عدد الأمتار/القطع
      let totalBeforeDiscount = 0;
      if (selectedProduct?.unit === 'صندوق' && selectedProduct?.unitsPerBox) {
        // للصناديق: المجموع = الكمية × عدد الأمتار × سعر الوحدة
        totalBeforeDiscount = qty * Number(selectedProduct.unitsPerBox) * price;
      } else {
        // للوحدات الفردية: المجموع = الكمية × السعر
        totalBeforeDiscount = qty * price;
      }

      if (totalBeforeDiscount > 0) {
        // التأكد من أن الخصم غير سالب ولا يتجاوز المجموع
        const discAmount = Math.max(0, Math.min(totalBeforeDiscount, Number(localDiscountAmount)));
        // حساب النسبة بناءً على المبلغ المدخل
        const percentage = Math.max(0, Math.min(100, (discAmount / totalBeforeDiscount) * 100));
        setLocalDiscountPercentage(Number(percentage.toFixed(2)));

        updateSaleLine(index, 'discountAmount', Number(discAmount.toFixed(2)));
        updateSaleLine(index, 'discountPercentage', Number(percentage.toFixed(2)));
      }
    } else {
      setLocalDiscountAmount(0);
      setLocalDiscountPercentage(0);
      updateSaleLine(index, 'discountAmount', 0);
      updateSaleLine(index, 'discountPercentage', 0);
    }
  }, [localDiscountAmount, localPrice, localQty, isDiscountEnabled, index, updateSaleLine, selectedProduct]);

  return (
    <div
      data-line-index={index}
      data-product-id={line.productId || 'new'}
      data-testid={`sale-line-item-${index}`}
      className={`sale-line-item p-5 bg-white rounded-xl shadow-md border-2 transition-all duration-300 hover:shadow-lg ${line.isFromParentCompany
        ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-white hover:border-orange-300'
        : 'border-gray-200 hover:border-blue-300'
        }`}
      style={{
        position: 'relative',
        zIndex: 1,
        isolation: 'isolate'
      }}>

      {/* Header Row - نوع الصنف */}
      <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">نوع الصنف:</span>
          <select
            value={line.isFromParentCompany ? 'parent' : 'current'}
            onChange={(e) => {
              const isFromParent = e.target.value === 'parent';
              updateSaleLine(index, 'isFromParentCompany', isFromParent);
              // إعادة تعيين الصنف عند تغيير النوع
              updateSaleLine(index, 'productId', 0);
              updateSaleLine(index, 'unitPrice', 0);
              updateSaleLine(index, 'parentUnitPrice', 0);
              updateSaleLine(index, 'branchUnitPrice', 0);
            }}
            className={`px-3 py-2 border rounded-lg text-sm font-medium focus:ring-2 focus:outline-none transition-colors ${line.isFromParentCompany
              ? 'border-slate-300 bg-slate-100 text-slate-800 focus:ring-slate-200 focus:border-slate-400'
              : 'border-slate-300 bg-white text-slate-700 focus:ring-blue-200 focus:border-blue-400'
              }`}
          >
            <option value="current">الشركة الحالية</option>
            <option value="parent">مخزن التقازي</option>
          </select>

          {line.isFromParentCompany && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-200 text-slate-700 border border-slate-300">
              مخزن التقازي
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => removeSaleLine(index)}
          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="حذف البند"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Content - Responsive Grid */}
      {/* ⚠️ تحذير: هذا هو المكان الوحيد لحقول الكمية والسعر والمجموع - لا يجب تكرارها */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-3 items-end ${selectedProduct?.unit === 'صندوق' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'
          }`}
        data-line-index={index}
        data-testid={`sale-line-item-${index}`}
      >

        {/* اختيار الصنف - قائمة منسدلة عادية */}
        <div className={selectedProduct?.unit === 'صندوق' ? 'lg:col-span-2' : 'lg:col-span-2'}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الصنف *
          </label>
          <select
            value={line.productId}
            onChange={(e) => {
              const productId = Number(e.target.value);
              const product = displayProducts.find((p: any) => p.id === productId);

              updateSaleLine(index, 'productId', productId);

              if (product) {
                // عرض سعر البيع الأصلي من قاعدة البيانات دائماً
                const originalPrice = Number(product.price?.sellPrice || 0);
                // تنسيق السعر لإزالة الأرقام العشرية الزائدة
                const formattedPrice = Math.round(originalPrice * 100) / 100;
                updateSaleLine(index, 'unitPrice', formattedPrice);

                if (line.isFromParentCompany) {
                  // حفظ سعر الشركة الأم للمرجعية والتحقق من الحد الأدنى
                  updateSaleLine(index, 'parentUnitPrice', originalPrice);
                  // حساب السعر المقترح مع هامش الربح (للعرض فقط)
                  const suggestedPrice = originalPrice * (1 + profitMargin / 100);
                  updateSaleLine(index, 'branchUnitPrice', suggestedPrice);

                  console.log(`💰 صنف من الشركة الأم:`, {
                    product: product.name,
                    originalPrice,
                    suggestedPrice: suggestedPrice,
                    profitMargin
                  });
                }
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none transition-colors bg-white"
            required
          >
            <option value={0}>
              {displayProducts.length > 0
                ? 'اختر الصنف...'
                : (line.isFromParentCompany
                  ? 'لا توجد أصناف من مخزن التقازي'
                  : (currentCompanyId === 1
                    ? 'لا توجد أصناف في مخزن التقازي'
                    : 'لا توجد أصناف من الشركة الحالية'))
              }
            </option>
            {/* إذا كان هناك صنف مختار ولكنه غير موجود في displayProducts، نعرضه */}
            {selectedProduct && line.productId && !displayProducts.some((p: any) => p.id === line.productId) && (
              <option key={selectedProduct.id} value={selectedProduct.id}>
                {selectedProduct.name} ({selectedProduct.sku})
              </option>
            )}
            {displayProducts.map((product: any) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </select>
        </div>

        {/* الكمية */}
        <div>
          <label htmlFor={`qty-${index}-${line.productId || 'new'}`} className="block text-sm font-medium text-gray-700 mb-2">
            {selectedProduct?.unit === 'صندوق' ? 'الصناديق' : 'الكمية'}
            {selectedProduct && selectedProduct.stock && (
              <span className="text-xs text-blue-600 block mt-1">
                متوفر: {(() => {
                  // البحث عن المخزون في الشركة المالكة للصنف أولاً
                  let stock = selectedProduct.stock.find((s: any) => s.companyId === selectedProduct.createdByCompanyId);
                  if (!stock || stock.boxes === 0) {
                    stock = selectedProduct.stock.find((s: any) => s.companyId === currentCompanyId);
                  }
                  return stock?.boxes || 0;
                })()} {selectedProduct.unit === 'صندوق' ? 'صندوق' : 'وحدة'}
              </span>
            )}
          </label>
          <input
            id={`qty-${index}-${line.productId || 'new'}`}
            type="number"
            value={localQty}
            onChange={(e) => {
              const value = e.target.value;
              setLocalQty(value);
            }}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-colors ${selectedProduct && selectedProduct.stock && Number(localQty) > ((() => {
              let stock = selectedProduct.stock.find((s: any) => s.companyId === selectedProduct.createdByCompanyId);
              if (!stock || stock.boxes === 0) {
                stock = selectedProduct.stock.find((s: any) => s.companyId === currentCompanyId);
              }
              return stock?.boxes || 0;
            })())
              ? 'border-red-300 bg-red-50 focus:ring-red-200 focus:border-red-500'
              : 'border-gray-300 bg-white focus:ring-blue-200 focus:border-blue-400'
              }`}
            placeholder="أدخل الكمية"
            min="0"
            max={(() => {
              if (!selectedProduct?.stock) return undefined;
              let stock = selectedProduct.stock.find((s: any) => s.companyId === selectedProduct.createdByCompanyId);
              if (!stock || stock.boxes === 0) {
                stock = selectedProduct.stock.find((s: any) => s.companyId === currentCompanyId);
              }
              return stock?.boxes || undefined;
            })()}
            required
          />
          {selectedProduct && selectedProduct.stock && Number(localQty) > ((() => {
            let stock = selectedProduct.stock.find((s: any) => s.companyId === selectedProduct.createdByCompanyId);
            if (!stock || stock.boxes === 0) {
              stock = selectedProduct.stock.find((s: any) => s.companyId === currentCompanyId);
            }
            return stock?.boxes || 0;
          })()) && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <span>⚠️</span>
                <span>الكمية المطلوبة أكبر من المتوفر في المخزون ({(() => {
                  let stock = selectedProduct.stock.find((s: any) => s.companyId === selectedProduct.createdByCompanyId);
                  if (!stock || stock.boxes === 0) {
                    stock = selectedProduct.stock.find((s: any) => s.companyId === currentCompanyId);
                  }
                  return stock?.boxes || 0;
                })()})</span>
              </p>
            )}
        </div>

        {/* إجمالي الأمتار المربعة (للصناديق فقط) */}
        {selectedProduct?.unit === 'صندوق' && selectedProduct?.unitsPerBox && line.qty > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              إجمالي الأمتار
            </label>
            <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
              <span className="text-sm font-bold text-blue-700 block text-center">
                {((line.qty || 0) * Number(selectedProduct.unitsPerBox)).toFixed(2)} م²
              </span>
            </div>
          </div>
        )}

        {/* السعر */}
        <div>
          <label htmlFor={`price-${index}-${line.productId || 'new'}`} className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <span>سعر البيع</span>
            <span className="text-red-600 text-xs">🔒</span>
          </label>
          
          {/* إذا كان من الشركة الأم (التقازي) */}
          {line.isFromParentCompany && line.parentUnitPrice ? (
            <div className="space-y-2">
              {/* سعر الشركة الأم */}
              <div className="flex items-center justify-between text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-600">سعر التقازي:</span>
                <span className="font-bold text-slate-700">{formatArabicCurrency(line.parentUnitPrice)}</span>
              </div>
              
              {/* هامش الربح - قابل للتعديل */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 whitespace-nowrap">هامش الربح:</label>
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="number"
                    value={localProfitMargin}
                    onChange={(e) => {
                      let margin = Math.max(0, Math.min(100, Number(e.target.value)));
                      setLocalProfitMargin(margin);
                      
                      // حساب السعر الجديد
                      const basePrice = line.parentUnitPrice || 0;
                      const newPrice = basePrice * (1 + margin / 100);
                      
                      // تحديث السعر في الـ line
                      updateSaleLine(index, 'unitPrice', Number(newPrice.toFixed(2)));
                      updateSaleLine(index, 'branchUnitPrice', Number(newPrice.toFixed(2)));
                    }}
                    className="w-16 px-2 py-1 text-sm border border-blue-300 rounded-md text-center focus:ring-2 focus:ring-blue-400"
                    min="0"
                    max="100"
                    step="1"
                  />
                  <span className="text-xs text-blue-600 font-medium">%</span>
                </div>
              </div>
              
              {/* السعر النهائي */}
              <div className="flex items-center justify-between p-2 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg">
                <span className="text-xs font-medium text-green-700">السعر النهائي:</span>
                <span className="font-bold text-green-700">
                  {formatArabicCurrency(line.parentUnitPrice * (1 + localProfitMargin / 100))}
                </span>
              </div>
            </div>
          ) : (
            /* السعر العادي للأصناف من الشركة الحالية */
            <div className="w-full px-3 py-2 border-2 border-gray-300 bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold">
              {formatArabicCurrency(Number(localPrice) || 0)}
            </div>
          )}
        </div>

        {/* المجموع */}
        <div className={canApplyDiscount ? 'lg:col-span-1' : ''}>
          <label htmlFor={`total-${index}-${line.productId || 'new'}`} className="block text-sm font-medium text-gray-700 mb-2">المجموع</label>
          <div
            id={`total-${index}-${line.productId || 'new'}`}
            className={`px-3 py-2 rounded-lg border-2 ${calculateLineTotal(line) > 0
              ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'
              : 'bg-gray-50 border-gray-200'
              }`}
          >
            <span className={`text-sm font-bold block text-center ${calculateLineTotal(line) > 0 ? 'text-green-700' : 'text-gray-500'
              }`}>
              {calculateLineTotal(line) > 0 ? formatArabicCurrency(calculateLineTotal(line)) : '---'}
            </span>
          </div>
        </div>

        {/* حقل الخصم - يظهر فقط إذا كان للمستخدم صلاحية */}
        {canApplyDiscount && (
          <div className="lg:col-span-6 mt-3 pt-3 border-t border-dashed border-gray-200">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDiscountEnabled}
                  onChange={(e) => setIsDiscountEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">تطبيق خصم</span>
              </label>

              {isDiscountEnabled && (
                <div className="flex items-center gap-3 flex-1 animate-in fade-in slide-in-from-right-2 duration-300">
                  <div className="w-40">
                    <label className="block text-xs text-gray-500 mb-1">مبلغ الخصم (د.ل)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={localDiscountAmount}
                        onChange={(e) => {
                          let val = Number(e.target.value);
                          const price = Math.max(0, Number(localPrice) || 0);
                          const qty = Math.max(0, Number(localQty) || 0);
                          
                          // حساب totalBeforeDiscount: للصناديق نضرب في عدد الأمتار/القطع
                          let totalBeforeDiscount = 0;
                          if (selectedProduct?.unit === 'صندوق' && selectedProduct?.unitsPerBox) {
                            // للصناديق: المجموع = الكمية × عدد الأمتار × سعر الوحدة
                            totalBeforeDiscount = qty * Number(selectedProduct.unitsPerBox) * price;
                          } else {
                            // للوحدات الفردية: المجموع = الكمية × السعر
                            totalBeforeDiscount = qty * price;
                          }
                          
                          const maxDiscPerc = Number(selectedProduct?.group?.maxDiscountPercentage || 100);
                          const maxAllowedAmount = Math.max(0, (totalBeforeDiscount * maxDiscPerc) / 100);

                          val = Math.max(0, Math.min(val, maxAllowedAmount));

                          setLocalDiscountAmount(val);
                        }}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                        min="0"
                        step="any"
                      />
                    </div>
                  </div>

                  <div className="w-32">
                    <label className="block text-xs text-gray-500 mb-1">النسبة (%)</label>
                    <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600">
                      {localDiscountPercentage}%
                    </div>
                  </div>

                  {selectedProduct?.group && (
                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                        مجموعة: {selectedProduct.group.name} | أقصى خصم: {selectedProduct.group.maxDiscountPercentage}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        أقصى مبلغ مسموح: {(() => {
                          const price = Number(localPrice) || 0;
                          const qty = Number(localQty) || 0;
                          let totalBeforeDiscount = 0;
                          
                          if (selectedProduct?.unit === 'صندوق' && selectedProduct?.unitsPerBox) {
                            // للصناديق: المجموع = الكمية × عدد الأمتار × سعر الوحدة
                            totalBeforeDiscount = qty * Number(selectedProduct.unitsPerBox) * price;
                          } else {
                            // للوحدات الفردية: المجموع = الكمية × السعر
                            totalBeforeDiscount = qty * price;
                          }
                          
                          const maxAmount = (totalBeforeDiscount * selectedProduct.group.maxDiscountPercentage) / 100;
                          return formatArabicCurrency(maxAmount);
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>


    </div>
  );
};

// استخدام React.memo لمنع إعادة الرندر غير الضرورية
export default React.memo(SaleLineItem, (prevProps, nextProps) => {
  // مقارنة دقيقة للخصائص المهمة
  return (
    prevProps.index === nextProps.index &&
    prevProps.line.productId === nextProps.line.productId &&
    prevProps.line.qty === nextProps.line.qty &&
    prevProps.line.unitPrice === nextProps.line.unitPrice &&
    prevProps.line.isFromParentCompany === nextProps.line.isFromParentCompany &&
    prevProps.line.discountPercentage === nextProps.line.discountPercentage &&
    prevProps.line.discountAmount === nextProps.line.discountAmount
  );
});

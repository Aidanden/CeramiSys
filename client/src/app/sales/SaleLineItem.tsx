import React, { useRef, useEffect } from 'react';
import { getProfitMargin } from '@/constants/defaults';

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
  const [localQty, setLocalQty] = React.useState(line.qty > 0 ? line.qty : '');
  const [localDiscountAmount, setLocalDiscountAmount] = React.useState(Math.max(0, Number(line.discountAmount || 0)));
  const [isDiscountEnabled, setIsDiscountEnabled] = React.useState(line.discountPercentage > 0 || line.discountAmount > 0);
  const [profitMargin, setProfitMargin] = React.useState(getProfitMargin());
  const [isManualPrice, setIsManualPrice] = React.useState(false);
  const prevProductIdRef = useRef(line.productId);
  const prevIsFromParentRef = useRef(line.isFromParentCompany);

  React.useEffect(() => {
    const savedMargin = localStorage.getItem('profitMargin');
    if (savedMargin) setProfitMargin(parseFloat(savedMargin));
  }, []);

  const lineFilteredProducts = filteredProducts.filter((product: any) => {
    if (!currentCompanyId) return false;
    return line.isFromParentCompany
      ? product.createdByCompanyId === 1
      : product.createdByCompanyId === currentCompanyId;
  });

  const displayProducts = React.useMemo(() => {
    if (!line.productId) return lineFilteredProducts;
    const existsInFiltered = lineFilteredProducts.some((p: any) => p.id === line.productId);
    if (!existsInFiltered) {
      const productToAdd = selectedProduct || filteredProducts.find((p: any) => p.id === line.productId);
      if (productToAdd) return [productToAdd, ...lineFilteredProducts];
    }
    return lineFilteredProducts;
  }, [lineFilteredProducts, selectedProduct, line.productId, filteredProducts]);

  React.useEffect(() => {
    if (String(line.qty) !== String(localQty)) {
      setLocalQty(line.qty > 0 ? line.qty : '');
    }
  }, [line.qty]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const qtyValue = localQty === '' ? 0 : Number(localQty);
      if (Math.abs(qtyValue - (line.qty || 0)) > 0.001) {
        updateSaleLine(index, 'qty', qtyValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localQty, index, updateSaleLine]);

  // إعادة تعيين علامة السعر اليدوي عند تغيير الصنف أو نوع الشركة
  useEffect(() => {
    const productChanged = line.productId !== prevProductIdRef.current;
    const companyChanged = line.isFromParentCompany !== prevIsFromParentRef.current;
    if (productChanged || companyChanged) {
      prevProductIdRef.current = line.productId;
      prevIsFromParentRef.current = line.isFromParentCompany;
      setIsManualPrice(false);
    }
  }, [line.productId, line.isFromParentCompany]);

  // تحديث السعر تلقائياً عند تغيير نوع الشركة أو الصنف أو هامش الربح الخاص بالبند
  useEffect(() => {
    if (!line.productId) return;
    // إذا قام المستخدم بتغيير السعر يدوياً، لا نعيد تعيينه
    if (isManualPrice) return;

    const p = productsData?.data?.products?.find((item: any) => item.id === line.productId);
    if (!p) return;

    const basePrice = Number(p.price?.sellPrice || 0);

    // الأولوية القصوى لهامش الربح المحفوظ في السطر (line.profitMargin)
    const hasSavedMargin = line.profitMargin !== undefined && line.profitMargin !== null;
    const currentMargin = line.isFromParentCompany
      ? (hasSavedMargin ? Number(line.profitMargin) : profitMargin)
      : 0;

    const calculatedPrice = Math.round(basePrice * (1 + currentMargin / 100) * 100) / 100;

    // متى نقوم بالتحديث التلقائي للسعر والهامش؟
    // فقط إذا كان صنفاً جديداً (ليس له id) أو إذا قام المستخدم بتغيير الصنف يدوياً
    const isNewItem = !line.id;
    const productChanged = line.productId !== prevProductIdRef.current;

    if (isNewItem || productChanged) {
      updateSaleLine(index, 'unitPrice', calculatedPrice);
      if (line.isFromParentCompany) {
        updateSaleLine(index, 'parentUnitPrice', basePrice);
        updateSaleLine(index, 'branchUnitPrice', calculatedPrice);
        if (!hasSavedMargin) {
          updateSaleLine(index, 'profitMargin', currentMargin);
        }
      }
    } else {
      // للفواتير القديمة (تعديل): نكتفي بتحديث سعر التكلفة للعرض فقط
      if (line.isFromParentCompany && !line.parentUnitPrice) {
        updateSaleLine(index, 'parentUnitPrice', basePrice);
      }
    }
  }, [line.productId, line.isFromParentCompany, line.profitMargin, profitMargin, productsData, index, updateSaleLine, isManualPrice]);

  // حساب الخصم بناءً على السعر الحالي والكمية
  useEffect(() => {
    if (isDiscountEnabled && enableLineDiscount) {
      const price = Number(line.unitPrice) || 0;
      const qty = Number(localQty) || 0;
      let totalBeforeDisc = (selectedProduct?.unit === 'صندوق' && selectedProduct?.unitsPerBox)
        ? qty * Number(selectedProduct.unitsPerBox) * price
        : qty * price;

      if (totalBeforeDisc > 0) {
        const discAmount = Math.max(0, Math.min(totalBeforeDisc, Number(localDiscountAmount)));
        const percentage = (discAmount / totalBeforeDisc) * 100;
        updateSaleLine(index, 'discountAmount', Number(discAmount.toFixed(2)));
        updateSaleLine(index, 'discountPercentage', Number(percentage.toFixed(2)));
      }
    } else {
      updateSaleLine(index, 'discountAmount', 0);
      updateSaleLine(index, 'discountPercentage', 0);
    }
  }, [localDiscountAmount, isDiscountEnabled, enableLineDiscount, line.unitPrice, localQty, index, updateSaleLine, selectedProduct]);

  return (
    <div className="bg-white dark:bg-surface-secondary border border-slate-100 dark:border-border-primary rounded-lg p-3 mb-2 shadow-sm transition-all hover:border-blue-200 dark:hover:border-blue-800/50">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">

        {/* القسم الأول: التحكم والاسم */}
        <div className="flex flex-1 items-center gap-3">
          <div className="flex-shrink-0 flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-300 dark:text-text-tertiary">#{index + 1}</span>
            <button
              onClick={() => removeSaleLine(index)}
              className="text-slate-300 dark:text-text-tertiary hover:text-red-500 dark:hover:text-red-400 p-1 transition-colors"
              title="حذف الصنف"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <select
              value={line.productId}
              onChange={(e) => {
                const pid = Number(e.target.value);
                updateSaleLine(index, 'productId', pid);
                // السعر سيحدث تلقائياً بواسطة useEffect
              }}
              className="w-full bg-transparent text-sm font-bold text-slate-800 dark:text-text-primary outline-none truncate cursor-pointer"
            >
              <option value={0}>إختر صنف...</option>
              {displayProducts.map((p: any) => (
                <option key={p.id} value={p.id} className="dark:bg-surface-primary">{p.name} ({p.sku})</option>
              ))}
            </select>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={() => updateSaleLine(index, 'isFromParentCompany', !line.isFromParentCompany)}
                className={`text-[9px] px-1.5 py-0.5 rounded font-black ${line.isFromParentCompany ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400'
                  }`}
              >
                {line.isFromParentCompany ? 'التقازي' : 'محلي'}
              </button>
              {line.isFromParentCompany && (
                <div className="flex items-center gap-2">
                  {/* إظهار هامش الربح فقط للأصناف الجديدة المضافة لإتاحة تعديلها */}
                  {!line.id && (
                    <div className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/20 px-2 py-0.5 rounded-md border border-orange-300 dark:border-orange-800/30 shadow-sm">
                      <span className="text-[10px] font-black text-orange-700 dark:text-orange-300 whitespace-nowrap">هامش الربح:</span>
                      <input
                        type="number"
                        value={line.profitMargin ?? profitMargin}
                        onChange={(e) => {
                          setIsManualPrice(false); // إعادة تعيين السعر اليدوي لحساب السعر من الهامش
                          updateSaleLine(index, 'profitMargin', Number(e.target.value));
                        }}
                        className="w-12 bg-white dark:bg-surface-primary border border-orange-200 dark:border-orange-800/30 rounded px-1 text-xs font-black text-orange-800 dark:text-orange-300 outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800/50"
                      />
                      <span className="text-[10px] font-black text-orange-700 dark:text-orange-300">%</span>
                    </div>
                  )}
                </div>
              )}
              {selectedProduct?.unit === 'صندوق' && selectedProduct?.unitsPerBox && (
                <span className="text-[9px] font-bold text-slate-400 dark:text-text-tertiary">عبوة: {selectedProduct.unitsPerBox}</span>
              )}
              {/* عرض معلومات المخزون */}
              {selectedProduct && selectedProduct.stock && Array.isArray(selectedProduct.stock) && selectedProduct.stock.length > 0 && (() => {
                // البحث عن مخزون الشركة المستهدفة أولاً
                let stockInfo = selectedProduct.stock.find((s: any) => s.companyId === currentCompanyId);
                let source = 'محلي';

                // إذا لم يوجد مخزون في الشركة المستهدفة، نبحث في الشركة الأم (التقازي)
                if ((!stockInfo || stockInfo.boxes === 0) && currentCompanyId !== 1) {
                  stockInfo = selectedProduct.stock.find((s: any) => s.companyId === 1);
                  source = 'التقازي';
                }

                if (stockInfo && stockInfo.boxes > 0) {
                  return (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${stockInfo.boxes > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                      📦 {stockInfo.boxes} {selectedProduct.unit || 'وحدة'}
                      {selectedProduct.unit === 'صندوق' && selectedProduct.unitsPerBox && (
                        <span className="text-[8px]"> ({stockInfo.quantity?.toFixed(2)} م²)</span>
                      )}
                      <span className="text-[8px] opacity-70"> • {source}</span>
                    </span>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* القسم الثاني: البيانات الرقمية (Responsive) */}
        <div className="grid grid-cols-2 sm:flex sm:items-center items-end gap-3 sm:gap-6 bg-slate-50/50 dark:bg-surface-primary p-2 sm:p-0 rounded-lg">

          {/* الكمية وإجمالي م2 */}
          <div className="flex flex-col sm:items-center">
            <span className="text-[9px] font-bold text-slate-400 dark:text-text-tertiary sm:hidden">الكمية</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localQty}
                onChange={(e) => setLocalQty(e.target.value)}
                className="w-14 bg-white dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded px-1.5 py-1 text-sm text-center font-black text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
              />
              {selectedProduct?.unit === 'صندوق' && selectedProduct?.unitsPerBox && (
                <div className="flex flex-col items-center px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded border border-emerald-100 dark:border-emerald-800/30 min-w-[50px]">
                  <span className="text-[10px] font-black">{(Number(localQty || 0) * Number(selectedProduct.unitsPerBox)).toFixed(2)}</span>
                  <span className="text-[8px] font-bold uppercase">م²</span>
                </div>
              )}
            </div>
          </div>

          {/* السعر */}
          <div className="flex flex-col sm:items-center min-w-[80px]">
            <span className="text-[9px] font-bold text-slate-400 dark:text-text-tertiary sm:hidden">السعر</span>
            <input
              type="number"
              step="0.01"
              value={line.unitPrice || ''}
              onChange={(e) => {
                const newPrice = Number(e.target.value);
                setIsManualPrice(true); // تعليم السعر كسعر يدوي
                updateSaleLine(index, 'unitPrice', newPrice);
                // تحديث سعر الفرع أيضاً لضمان استخدام السعر اليدوي في الفواتير المعقدة
                updateSaleLine(index, 'branchUnitPrice', newPrice);

                // عكس حساب هامش الربح إذا كان الصنف من الشركة الأم
                if (line.isFromParentCompany) {
                  const p = productsData?.data?.products?.find((item: any) => item.id === line.productId);
                  const basePrice = Number(p?.price?.sellPrice || 0);
                  if (basePrice > 0) {
                    const newMargin = ((newPrice / basePrice) - 1) * 100;
                    // نحدث الهامش بدقة 2 خانة عشرية
                    updateSaleLine(index, 'profitMargin', Number(newMargin.toFixed(2)));
                  }
                }
              }}
              className="w-24 bg-white dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded px-1.5 py-1 text-sm text-center font-bold text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
            />
          </div>

          {/* الخصم */}
          {enableLineDiscount && (
            <div className="flex flex-col sm:items-center">
              <span className="text-[9px] font-bold text-slate-400 dark:text-text-tertiary sm:hidden">خصم</span>
              <div className="flex items-center gap-1.5 h-full">
                <input
                  type="checkbox"
                  checked={isDiscountEnabled}
                  onChange={e => setIsDiscountEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600"
                />
                <div className="w-14 h-6 flex items-center">
                  {isDiscountEnabled && (
                    <input
                      type="number"
                      value={localDiscountAmount}
                      onChange={e => setLocalDiscountAmount(Number(e.target.value))}
                      className="w-full border-b border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-xs text-center font-bold outline-none"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* الصافي */}
          <div className="flex flex-col sm:items-end min-w-[100px] col-span-2 sm:col-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-border-primary">
            <span className="text-[9px] font-bold text-slate-400 dark:text-text-tertiary sm:hidden text-left w-full block">الصافي</span>
            <span className="text-base font-black text-blue-600 dark:text-blue-400">
              {formatArabicCurrency(calculateLineTotal(line))}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default React.memo(SaleLineItem, (p, n) => {
  return (
    p.index === n.index &&
    p.line.productId === n.line.productId &&
    p.line.qty === n.line.qty &&
    p.line.unitPrice === n.line.unitPrice &&
    p.line.isFromParentCompany === n.line.isFromParentCompany &&
    p.line.profitMargin === n.line.profitMargin &&
    p.line.discountPercentage === n.line.discountPercentage &&
    p.line.discountAmount === n.line.discountAmount &&
    p.enableLineDiscount === n.enableLineDiscount
  );
});

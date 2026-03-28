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
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                          }
                        }}
                        className="w-16 bg-white dark:bg-surface-primary border border-orange-200 dark:border-orange-800/30 rounded px-1.5 py-1 text-sm font-black text-orange-800 dark:text-orange-300 outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800/50"
                      />
                      <span className="text-[10px] font-black text-orange-700 dark:text-orange-300">%</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* بيانات الصنف البارزة: عبوة، مخزون، إجمالي م² */}
            {line.productId > 0 && selectedProduct && (
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {selectedProduct.unit === 'صندوق' && selectedProduct.unitsPerBox && (
                  <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/30 rounded-md px-2.5 py-1">
                    <span className="text-xs font-semibold text-purple-500 dark:text-purple-400">العبوة:</span>
                    <span className="text-sm font-black text-purple-700 dark:text-purple-300">{selectedProduct.unitsPerBox} م²/صندوق</span>
                  </div>
                )}
                {selectedProduct.stock && Array.isArray(selectedProduct.stock) && (() => {
                  let stockInfo = selectedProduct.stock.find((s: any) => s.companyId === currentCompanyId);
                  let source = 'محلي';
                  if ((!stockInfo || stockInfo.boxes === 0) && currentCompanyId !== 1) {
                    stockInfo = selectedProduct.stock.find((s: any) => s.companyId === 1);
                    source = 'التقازي';
                  }
                  if (!stockInfo) return null;
                  return (
                    <div className={`flex items-center gap-1 border rounded-md px-2.5 py-1 ${
                      stockInfo.boxes > 0
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30'
                    }`}>
                      <span className={`text-xs font-semibold ${
                        stockInfo.boxes > 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                      }`}>📦 المخزون ({source}):</span>
                      <span className={`text-sm font-black ${
                        stockInfo.boxes > 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                      }`}>{stockInfo.boxes} {selectedProduct.unit || 'وحدة'}</span>
                      {selectedProduct.unit === 'صندوق' && selectedProduct.unitsPerBox && (
                        <span className={`text-xs font-bold ${
                          stockInfo.boxes > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>= {stockInfo.quantity?.toFixed(1)} م²</span>
                      )}
                    </div>
                  );
                })()}
                {selectedProduct.unit === 'صندوق' && selectedProduct.unitsPerBox && Number(localQty) > 0 && (
                  <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-md px-2.5 py-1">
                    <span className="text-xs font-semibold text-blue-500 dark:text-blue-400">الإجمالي:</span>
                    <span className="text-sm font-black text-blue-700 dark:text-blue-300">{(Number(localQty) * Number(selectedProduct.unitsPerBox)).toFixed(2)} م²</span>
                  </div>
                )}
              </div>
            )}
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
                onWheel={(e) => e.currentTarget.blur()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                className="w-16 bg-white dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded px-1.5 py-1.5 text-base text-center font-black text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
              />
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
              onWheel={(e) => e.currentTarget.blur()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              className={`bg-white dark:bg-surface-secondary border rounded px-2 py-1.5 text-center font-bold outline-none focus:ring-2 transition-all ${line.isFromParentCompany ? 'w-28 text-base text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700 focus:ring-orange-200 dark:focus:ring-orange-800/50' : 'w-24 text-base text-slate-800 dark:text-text-primary border-slate-200 dark:border-border-primary focus:ring-blue-100 dark:focus:ring-blue-900/50'}`}
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
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
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
            <span className="text-lg font-black text-blue-600 dark:text-blue-400">
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

import React, { useRef, useEffect } from 'react';

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
  const [profitMargin, setProfitMargin] = React.useState(20);

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

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const qtyValue = localQty === '' ? 0 : Number(localQty);
      if (Math.abs(qtyValue - (line.qty || 0)) > 0.001) {
        updateSaleLine(index, 'qty', qtyValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localQty, index, updateSaleLine]);

  React.useEffect(() => {
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
    <div className="bg-white border border-slate-100 rounded-lg p-3 mb-2 shadow-sm transition-all hover:border-blue-200">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">

        {/* القسم الأول: التحكم والاسم */}
        <div className="flex flex-1 items-center gap-3">
          <div className="flex-shrink-0 flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-300">#{index + 1}</span>
            <button
              onClick={() => removeSaleLine(index)}
              className="text-slate-300 hover:text-red-500 p-1"
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
                const p = displayProducts.find((item: any) => item.id === pid);
                updateSaleLine(index, 'productId', pid);
                if (p) {
                  const sellPrice = Number(p.price?.sellPrice || 0);
                  updateSaleLine(index, 'unitPrice', Math.round(sellPrice * 100) / 100);
                  if (line.isFromParentCompany) {
                    updateSaleLine(index, 'parentUnitPrice', sellPrice);
                    updateSaleLine(index, 'branchUnitPrice', sellPrice * (1 + profitMargin / 100));
                  }
                }
              }}
              className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none truncate cursor-pointer"
            >
              <option value={0}>إختر صنف...</option>
              {displayProducts.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={() => updateSaleLine(index, 'isFromParentCompany', !line.isFromParentCompany)}
                className={`text-[9px] px-1.5 py-0.5 rounded font-black ${line.isFromParentCompany ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
                  }`}
              >
                {line.isFromParentCompany ? 'التقازي' : 'محلي'}
              </button>
              {selectedProduct?.unit === 'صندوق' && selectedProduct?.unitsPerBox && (
                <span className="text-[9px] font-bold text-slate-400">عبوة: {selectedProduct.unitsPerBox}</span>
              )}
            </div>
          </div>
        </div>

        {/* القسم الثاني: البيانات الرقمية (Responsive) */}
        <div className="grid grid-cols-2 sm:flex sm:items-center items-end gap-3 sm:gap-6 bg-slate-50/50 p-2 sm:p-0 rounded-lg">

          {/* الكمية وإجمالي م2 */}
          <div className="flex flex-col sm:items-center">
            <span className="text-[9px] font-bold text-slate-400 sm:hidden">الكمية</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localQty}
                onChange={(e) => setLocalQty(e.target.value)}
                className="w-14 bg-white border border-slate-200 rounded px-1.5 py-1 text-sm text-center font-black outline-none focus:ring-2 focus:ring-blue-100"
              />
              {selectedProduct?.unit === 'صندوق' && selectedProduct?.unitsPerBox && (
                <div className="flex flex-col items-center px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 min-w-[50px]">
                  <span className="text-[10px] font-black">{(Number(localQty || 0) * Number(selectedProduct.unitsPerBox)).toFixed(2)}</span>
                  <span className="text-[8px] font-bold uppercase">م²</span>
                </div>
              )}
            </div>
          </div>

          {/* السعر */}
          <div className="flex flex-col sm:items-center min-w-[80px]">
            <span className="text-[9px] font-bold text-slate-400 sm:hidden">السعر</span>
            <span className="text-sm font-bold text-slate-600">{formatArabicCurrency(line.unitPrice || 0)}</span>
          </div>

          {/* الخصم */}
          {enableLineDiscount && (
            <div className="flex flex-col sm:items-center">
              <span className="text-[9px] font-bold text-slate-400 sm:hidden">خصم</span>
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
                      className="w-full border-b border-red-200 bg-red-50/50 text-red-600 text-xs text-center font-bold outline-none"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* الصافي */}
          <div className="flex flex-col sm:items-end min-w-[100px] col-span-2 sm:col-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <span className="text-[9px] font-bold text-slate-400 sm:hidden text-left w-full block">الصافي</span>
            <span className="text-base font-black text-blue-600">
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
    p.line.discountPercentage === n.line.discountPercentage &&
    p.line.discountAmount === n.line.discountAmount &&
    p.enableLineDiscount === n.enableLineDiscount
  );
});

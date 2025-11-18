import React, { useState, useEffect } from 'react';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';

interface PurchaseLineItemProps {
  line: {
    productId: number;
    qty: number;
    unitPrice: number;
  };
  index: number;
  products: any[];
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
}

const PurchaseLineItem: React.FC<PurchaseLineItemProps> = ({
  line,
  index,
  products,
  onUpdate,
  onRemove
}) => {
  // Local state for price and quantity to avoid focus loss
  const [localQty, setLocalQty] = useState(line.qty.toString());
  const [localPrice, setLocalPrice] = useState(line.unitPrice.toString());

  // Update local state when line changes from parent
  useEffect(() => {
    setLocalQty(line.qty.toString());
  }, [line.qty]);

  useEffect(() => {
    setLocalPrice(line.unitPrice.toString());
  }, [line.unitPrice]);

  // Debounce updates to parent
  useEffect(() => {
    const timer = setTimeout(() => {
      const qty = parseFloat(localQty) || 0;
      if (qty !== line.qty) {
        onUpdate(index, 'qty', qty);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localQty]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const price = parseFloat(localPrice) || 0;
      if (price !== line.unitPrice) {
        onUpdate(index, 'unitPrice', price);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localPrice]);

  const selectedProduct = products.find(p => p.id === line.productId);
  const total = line.qty * line.unitPrice;

  // حساب عدد الصناديق والأمتار المربعة
  const getBoxesAndMeters = () => {
    if (!selectedProduct || selectedProduct.unit !== 'صندوق') {
      return null;
    }

    const metersPerBox = selectedProduct.metersPerBox || 1;
    const boxes = Math.ceil(line.qty / metersPerBox); // تقريب للأعلى
    const totalMeters = boxes * metersPerBox;

    return { boxes, totalMeters, metersPerBox };
  };

  const boxInfo = getBoxesAndMeters();

  return (
    <div 
      data-line-index={index}
      data-product-id={line.productId || 'new'}
      data-testid={`purchase-line-item-${index}`}
      className="p-3 sm:p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-md"
      style={{ 
        position: 'relative',
        zIndex: 1,
        isolation: 'isolate' 
      }}>
      
      {/* Header Row - زر الحذف */}
      <div className="flex items-center justify-between mb-3 p-2 bg-slate-50 rounded-md border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">بند رقم {formatArabicNumber(index + 1)}</span>
        </div>
        
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
          title="حذف البند"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Content - Responsive Grid */}
      <div 
        className={`grid gap-2 items-end ${
          selectedProduct?.unit === 'صندوق' 
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6' 
            : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5'
        }`}
        data-line-index={index}
        data-testid={`purchase-line-item-${index}`}
      >
        {/* اختيار الصنف */}
        <div className={selectedProduct?.unit === 'صندوق' ? 'col-span-2 sm:col-span-3 md:col-span-2 lg:col-span-2' : 'col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-2'}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الصنف *
          </label>
          <select
            value={line.productId}
            onChange={(e) => {
              const productId = Number(e.target.value);
              const product = products.find((p: any) => p.id === productId);
              
              onUpdate(index, 'productId', productId);
              
              if (product) {
                const originalPrice = Number(product.latestPricing?.purchasePrice || 0);
                const formattedPrice = Math.round(originalPrice * 100) / 100;
                onUpdate(index, 'unitPrice', formattedPrice);
                setLocalPrice(formattedPrice.toString());
              }
            }}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-200 focus:border-blue-400 focus:outline-none transition-colors bg-white"
            required
          >
            <option value={0}>اختر الصنف...</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </select>
        </div>
        
        {/* الكمية */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {selectedProduct?.unit === 'صندوق' ? 'الكمية (م²)' : 'الكمية'}
          </label>
          <input
            type="number"
            value={localQty}
            onChange={(e) => setLocalQty(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-200 focus:border-blue-400 focus:outline-none transition-colors bg-white"
            placeholder="0"
            min="0"
            step="0.01"
            required
          />
        </div>
        
        {/* إجمالي الأمتار (للصناديق فقط) */}
        {selectedProduct?.unit === 'صندوق' && boxInfo && (
          <div className="hidden md:block">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              إجمالي م²
            </label>
            <div className="px-2 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-md">
              <span className="text-sm font-bold text-blue-700 block text-center">
                {formatArabicNumber(boxInfo.totalMeters)} م²
              </span>
            </div>
          </div>
        )}
        
        {/* السعر */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {selectedProduct?.unit === 'صندوق' ? 'السعر/م²' : 'السعر'}
          </label>
          <input
            type="number"
            value={localPrice}
            onChange={(e) => setLocalPrice(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-200 focus:border-blue-400 focus:outline-none transition-colors bg-white"
            placeholder="0"
            min="0"
            step="0.01"
            required
          />
        </div>
        
        {/* المجموع */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المجموع</label>
          <div className={`px-2 py-1.5 rounded-md border ${
            total > 0 
              ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <span className={`text-sm font-bold block text-center ${
              total > 0 ? 'text-green-700' : 'text-gray-500'
            }`}>
              {total > 0 ? formatArabicCurrency(total) : '---'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseLineItem;

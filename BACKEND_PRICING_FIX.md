# إصلاح إرسال الأسعار للـ Backend

## 🎯 المشكلة

عند **إنشاء الفاتورة** في Frontend:
- خانة السعر: تعرض سعر المتر (120.50 د.ل/م²) ✅
- المجموع: يحسب بالأمتار (30 × 120.50 = 3,615 د.ل) ✅

لكن عند **إتمام الفاتورة** (إرسال للـ Backend):
- البيانات المُرسلة: `qty: 5, unitPrice: 120.50`
- Backend يحسب: `5 × 120.50 = 602.50` ❌ (خطأ!)
- المفروض: `30 × 120.50 = 3,615` ✅

## 🛠️ الحل المطبق

### قبل الإرسال للـ Backend، نحول الأسعار:

```typescript
// تحويل الأسعار للـ Backend: للصناديق نضرب في عدد الأمتار
const processedLines = saleForm.lines.map(line => {
  const product = productsData?.data?.products?.find(p => p.id === line.productId);
  
  if (product?.unit === 'صندوق' && product.unitsPerBox) {
    // للصناديق: السعر النهائي = سعر المتر × عدد الأمتار في الصندوق
    return {
      ...line,
      unitPrice: line.unitPrice * Number(product.unitsPerBox)
    };
  }
  
  // للوحدات الأخرى: السعر يبقى كما هو
  return line;
});
```

## 📊 مثال عملي

### بلاط سيراميك أبيض 60×60:
- **عدد الأمتار في الصندوق**: 6 م²
- **الكمية المدخلة**: 5 صناديق
- **السعر المعروض**: 120.50 د.ل/م²

### البيانات في Frontend:
```javascript
line = {
  qty: 5,           // عدد الصناديق
  unitPrice: 120.50 // سعر المتر
}
```

### البيانات المُرسلة للـ Backend:
```javascript
processedLine = {
  qty: 5,           // عدد الصناديق
  unitPrice: 723    // سعر الصندوق (120.50 × 6)
}
```

### النتيجة في Backend:
```
المجموع = 5 × 723 = 3,615 د.ل ✅
```

## 🔧 الملفات المعدلة

### 1. المبيعات العادية:
**الملف**: `/client/src/app/sales/page.tsx`
```typescript
// في دالة handleCreateSale
const processedLines = saleForm.lines.map(line => {
  const product = productsData?.data?.products?.find(p => p.id === line.productId);
  
  if (product?.unit === 'صندوق' && product.unitsPerBox) {
    return {
      ...line,
      unitPrice: line.unitPrice * Number(product.unitsPerBox)
    };
  }
  
  return line;
});

const saleRequest = {
  ...saleForm,
  lines: processedLines,
  companyId: targetCompanyId
};
```

### 2. فواتير الشركات المترابطة:
**الملف**: `/client/src/app/inter-company-sales/page.tsx`
```typescript
// في دالة handleSubmit
const processedLines = lines.map(line => {
  const product = productsData?.data?.products?.find((p: any) => p.id === line.productId);
  
  if (product?.unit === 'صندوق' && product.unitsPerBox) {
    return {
      ...line,
      parentUnitPrice: line.parentUnitPrice * Number(product.unitsPerBox),
      branchUnitPrice: line.branchUnitPrice * Number(product.unitsPerBox)
    };
  }
  
  return line;
});

await createSale({
  customerId,
  saleType,
  paymentMethod: saleType === 'CASH' ? paymentMethod : undefined,
  lines: processedLines
}).unwrap();
```

## ✅ النتيجة النهائية

### في Frontend (للمستخدم):
- **خانة السعر**: 120.50 د.ل/م² (واضح ومفهوم)
- **المجموع**: 3,615 د.ل (صحيح)

### في Backend (للحسابات):
- **البيانات المستلمة**: `qty: 5, unitPrice: 723`
- **الحساب**: `5 × 723 = 3,615 د.ل` (صحيح)
- **قاعدة البيانات**: تحفظ البيانات بشكل صحيح

## 🧪 اختبار الإصلاح

### خطوات الاختبار:
1. أنشئ فاتورة مبيعات جديدة
2. أضف صنف بوحدة "صندوق" (مثل: بلاط سيراميك)
3. أدخل الكمية: 5 صناديق
4. **تحقق**: السعر المعروض = 120.50 د.ل/م²
5. **تحقق**: المجموع المعروض = 3,615 د.ل
6. **اضغط "إنشاء الفاتورة"**
7. **تحقق**: الفاتورة المحفوظة تحتوي على المجموع الصحيح

### النتيجة المتوقعة:
- ✅ Frontend يعرض الأسعار بالمتر
- ✅ Backend يستلم الأسعار بالصندوق
- ✅ الحسابات صحيحة في كل مكان
- ✅ قاعدة البيانات تحفظ البيانات الصحيحة

## 📝 ملاحظات مهمة

### للوحدات الأخرى (كيس، قطعة، لتر):
- **لا تحويل**: الأسعار تُرسل كما هي
- **السبب**: هذه الوحدات لا تحتاج تحويل

### للصناديق فقط:
- **تحويل**: سعر المتر → سعر الصندوق
- **الصيغة**: `سعر الصندوق = سعر المتر × عدد الأمتار`

---

**تاريخ الإصلاح**: أكتوبر 2025  
**الحالة**: مطبق ✅  
**النتيجة**: Frontend يعرض بالمتر، Backend يحسب بالصندوق

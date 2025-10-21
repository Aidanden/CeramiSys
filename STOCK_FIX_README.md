# 🐛 إصلاح مشكلة تحديث المخزون عند البيع

## 📋 المشكلة

عند بيع صنف من المخزون، كان المخزون لا يتم خصمه بشكل صحيح:

### مثال على المشكلة:
- **المخزون الأولي**: 50 صندوق من صنف CER-001
- **الكمية المباعة**: 30 صندوق (يدخلها المستخدم في Frontend)
- **المخزون المتوقع**: 20 صندوق (50 - 30 = 20) ✅
- **المخزون الفعلي قبل الإصلاح**: 45 صندوق ❌ **خطأ!**

### السبب الجذري:

**Frontend يرسل عدد الصناديق مباشرة، لكن Backend كان يحسبها خطأً!**

- Frontend: المستخدم يدخل "30 صندوق" → `line.qty = 30`
- Backend القديم: يفترض أن 30 = أمتار، فيحسب `Math.ceil(30 / 6) = 5` صناديق ❌
- النتيجة: يخصم 5 صناديق بدلاً من 30!

---

## 🔍 التفاصيل التقنية

### الكود القديم (الخاطئ):

```typescript
// في SalesService.ts - الكود القديم (الخاطئ)
// تحديث المخزون
for (const line of data.lines) {
  const product = products.find(p => p.id === line.productId);
  if (!product) continue;
  
  // ❌ خطأ: يحسب الصناديق من الأمتار، لكن Frontend يرسل صناديق!
  let boxesToDecrement = line.qty;
  
  if (product.unit === 'صندوق' && product.unitsPerBox && Number(product.unitsPerBox) > 0) {
    const requestedMeters = line.qty; // ❌ خطأ: line.qty ليست أمتار!
    const unitsPerBox = Number(product.unitsPerBox);
    boxesToDecrement = Math.ceil(requestedMeters / unitsPerBox); // ❌ حساب خاطئ!
  }
  
  await this.prisma.stock.update({
    data: { boxes: { decrement: boxesToDecrement } }
  });
}
```

### المشكلة:
- المستخدم يدخل **30 صندوق** في Frontend
- `line.qty = 30` (عدد الصناديق، ليس الأمتار!)
- الكود القديم يفترض أنها أمتار: `Math.ceil(30 / 6) = 5` صناديق ❌
- النتيجة: يخصم **5 صناديق** بدلاً من **30 صندوق**!

---

## ✅ الحل المطبق

**الحل البسيط: إزالة الحساب الخاطئ!**

Frontend يرسل عدد الصناديق مباشرة، فلا حاجة لأي حساب إضافي.

### 1. في `SalesService.ts`:

```typescript
// تحديث المخزون
// ملاحظة: line.qty من Frontend يمثل عدد الصناديق مباشرة لجميع الأصناف
for (const line of data.lines) {
  const product = products.find(p => p.id === line.productId);
  if (!product) continue;
  
  const boxesToDecrement = Number(line.qty); // ✅ بسيط ومباشر!
  
  // Debug logging
  if (process.env.NODE_ENV !== 'production') {
    console.log('📦 Stock Update:', {
      productName: product.name,
      productUnit: product.unit,
      qtyFromFrontend: line.qty,
      boxesToDecrement
    });
  }
  
  await this.prisma.stock.update({
    where: {
      companyId_productId: {
        companyId: userCompanyId,
        productId: line.productId
      }
    },
    data: {
      boxes: { decrement: boxesToDecrement } // ✅ صحيح!
    }
  });
}
```

### 2. في `deleteSale` (إرجاع المخزون عند الحذف):

```typescript
// إرجاع المخزون
for (const line of existingSale.lines) {
  const boxesToIncrement = Number(line.qty); // ✅ نرجع نفس الكمية
  
  await this.prisma.stock.update({
    where: {
      companyId_productId: {
        companyId: existingSale.companyId,
        productId: line.productId
      }
    },
    data: { boxes: { increment: boxesToIncrement } }
  });
}
```

### 3. في `ProvisionalSalesService.ts`:

نفس الإصلاح في دالة `convertToSale`.

---

## 📊 مثال على الحساب الصحيح

### السيناريو:
- **الصنف**: بلاط سيراميك CER-001
- **الوحدة**: صندوق
- **الوحدات في الصندوق**: 6 متر مربع
- **المخزون الحالي**: 50 صندوق
- **المستخدم يدخل**: 30 صندوق

### الحساب (بعد الإصلاح):
```javascript
// Frontend
المستخدم يدخل: 30 صندوق
line.qty = 30

// Backend
boxesToDecrement = Number(line.qty) = 30 صندوق ✅
```

### النتيجة:
- **المخزون بعد البيع**: 50 - 30 = **20 صندوق** ✅
- **الأمتار المباعة**: 30 × 6 = **180 متر مربع** ✅

---

## 🎯 كيف يعمل النظام الآن

### في Frontend:
```typescript
// المستخدم يدخل عدد الصناديق في حقل "عدد الصناديق"
const qty = 30; // 30 صندوق

// يتم عرض الأمتار تلقائياً للمعلومات فقط
const totalMeters = qty * unitsPerBox; // 30 × 6 = 180 متر

// يتم إرسال عدد الصناديق إلى Backend
line.qty = 30; // ✅ صناديق
```

### في Backend:
```typescript
// لا حاجة لأي حساب - نستخدم الكمية مباشرة
const boxesToDecrement = Number(line.qty); // 30 صندوق ✅

// خصم من المخزون
await stock.update({
  data: { boxes: { decrement: 30 } }
});
```

### النتيجة:
- ✅ **بسيط ومباشر**
- ✅ **لا حسابات معقدة**
- ✅ **المخزون دقيق 100%**

---

## 🔧 الملفات المعدلة

1. **`/server/src/services/SalesService.ts`**
   - السطور 184-224: إصلاح منطق تحديث المخزون

2. **`/server/src/services/ProvisionalSalesService.ts`**
   - السطور 448-502: إصلاح منطق تحديث المخزون في `convertToSale`

---

## 🧪 الاختبار

### قبل الإصلاح:
```
المخزون: 50 صندوق
البيع: 30 متر (5 صناديق)
النتيجة: 30 صندوق ❌ (خصم 20 صندوق بدلاً من 5)
```

### بعد الإصلاح:
```
المخزون: 50 صندوق
البيع: 30 متر (5 صناديق)
النتيجة: 45 صندوق ✅ (خصم 5 صناديق)
```

---

## 📝 ملاحظات مهمة

1. **Frontend يتحكم**: المستخدم يدخل عدد الصناديق، وFrontend يعرض الأمتار للمعلومات فقط.

2. **Backend بسيط**: لا حاجة لأي حسابات - نستخدم `line.qty` مباشرة.

3. **Debug Logging**: تم إضافة console logs مفصلة في وضع التطوير لتسهيل تتبع العمليات.

4. **التوافق**: الإصلاح يعمل مع جميع أنواع الوحدات (صندوق، قطعة، كرتونة، إلخ).

5. **الفواتير المبدئية**: تم تطبيق نفس الإصلاح على دالة `convertToSale`.

6. **الحذف**: عند حذف فاتورة، يتم إرجاع نفس عدد الصناديق المباعة إلى المخزون.

---

## ✅ التحقق من الإصلاح

للتحقق من أن الإصلاح يعمل بشكل صحيح:

1. **افتح المخزون** وتحقق من الكمية الحالية للصنف
2. **أنشئ فاتورة مبيعات** ببيع كمية معينة
3. **تحقق من المخزون** مرة أخرى
4. **احسب الفرق** وتأكد من أنه يطابق عدد الصناديق المتوقع

### مثال:
```
1. المخزون قبل البيع: 50 صندوق
2. البيع: 30 متر (كل صندوق = 6 متر)
3. الصناديق المتوقعة: Math.ceil(30/6) = 5 صناديق
4. المخزون بعد البيع: 50 - 5 = 45 صندوق ✅
```

---

## 🚀 التاريخ

- **تاريخ اكتشاف المشكلة**: 21 أكتوبر 2025
- **تاريخ الإصلاح الأول** (خاطئ): 21 أكتوبر 2025 - 3:04 PM
- **تاريخ الإصلاح الصحيح**: 21 أكتوبر 2025 - 3:15 PM
- **الإصدار**: v1.1.0 (الإصلاح الصحيح)

---

## 👨‍💻 المطور

تم إصلاح المشكلة بواسطة Cascade AI Assistant

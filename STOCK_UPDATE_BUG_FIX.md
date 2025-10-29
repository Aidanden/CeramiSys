# إصلاح مشكلة تحديث المخزون - Bug Fix

## 🐛 المشكلة الحقيقية:

عند الضغط على زر "إدارة المخزون" وتعديل الكمية، كان يتم **إضافة سطر جديد** في جدول `stock` بدلاً من **تعديل السطر الموجود**.

### السبب الجذري:

**`companyId` كان hardcoded بقيمة `1` في Frontend!**

```typescript
// ❌ الكود الخاطئ في /client/src/app/products/page.tsx
await updateStock({
  companyId: 1,  // ❌ hardcoded!
  productId: selectedProduct.id,
  quantity: boxes
});
```

### لماذا كان يُنشئ سطر جديد؟

في `schema.prisma`، جدول `Stock` له unique constraint:

```prisma
model Stock {
  id        Int      @id @default(autoincrement())
  companyId Int
  productId Int
  boxes     Decimal
  
  @@unique([companyId, productId])  // ⚠️ كل صنف له سطر واحد لكل شركة
}
```

**السيناريو**:
1. المستخدم من شركة ID = 2 (مثلاً "صالة الإمارات")
2. الصنف موجود بسطر في `stock`: `(companyId: 2, productId: 123)`
3. Frontend يرسل: `(companyId: 1, productId: 123)` ❌
4. `upsert` لا يجد السطر `(1, 123)` لأن السطر الموجود هو `(2, 123)`
5. يُنشئ سطر جديد `(1, 123)` ❌
6. **النتيجة**: سطرين للصنف نفسه! ❌

---

## ✅ الحل المطبق:

### 1. في `/client/src/app/products/page.tsx`:

#### إصلاح `handleUpdateStock`:
```typescript
// ✅ بعد الإصلاح
const handleUpdateStock = async (boxes: number) => {
  if (!selectedProduct || !currentUser?.companyId) return;
  
  try {
    await updateStock({
      companyId: currentUser.companyId,  // ✅ من المستخدم الحالي
      productId: selectedProduct.id,
      quantity: boxes
    }).unwrap();
    // ...
  } catch (error: any) {
    notifications.products.stockUpdateError(error?.data?.message);
  }
};
```

#### إصلاح `handleUpdatePrice`:
```typescript
// ✅ بعد الإصلاح
const handleUpdatePrice = async (sellPrice: number) => {
  if (!selectedProduct || !currentUser?.companyId) return;
  
  try {
    await updatePrice({
      companyId: currentUser.companyId,  // ✅ من المستخدم الحالي
      productId: selectedProduct.id,
      sellPrice
    }).unwrap();
    // ...
  } catch (error: any) {
    notifications.products.priceUpdateError(error?.data?.message);
  }
};
```

### 2. في `/server/src/services/ProductService.ts`:

إضافة `try-catch` لمعالجة أخطاء Prisma:

```typescript
async updateStock(data: UpdateStockDto): Promise<void> {
  try {
    // التحقق من وجود الصنف
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
      include: {
        saleLines: { select: { id: true }, take: 1 },
        purchaseLines: { select: { id: true }, take: 1 },
      }
    });

    if (!product) {
      throw new Error('الصنف غير موجود');
    }

    // التحقق من استخدام الصنف في فواتير
    if (product.saleLines.length > 0 || product.purchaseLines.length > 0) {
      throw new Error('لا يمكن تعديل مخزون صنف مستخدم في فواتير');
    }

    // استخدام upsert: تحديث إذا موجود، إنشاء إذا غير موجود
    await this.prisma.stock.upsert({
      where: {
        companyId_productId: {
          companyId: data.companyId,  // ✅ الآن يستلم القيمة الصحيحة
          productId: data.productId,
        }
      },
      update: { boxes: data.quantity },
      create: {
        companyId: data.companyId,
        productId: data.productId,
        boxes: data.quantity,
      }
    });
  } catch (error: any) {
    // إعادة رمي الأخطاء المعروفة
    if (error.message.includes('غير موجود') || error.message.includes('مستخدم في فواتير')) {
      throw error;
    }
    // تحويل أخطاء Prisma إلى رسائل مفهومة
    console.error('خطأ في updateStock:', error);
    throw new Error('فشل في تحديث المخزون: ' + (error.message || 'خطأ غير معروف'));
  }
}
```

---

## 📊 الفرق بين قبل وبعد:

### ❌ قبل الإصلاح:

| المستخدم | companyId المُرسل | السطر الموجود | النتيجة |
|----------|------------------|---------------|---------|
| من شركة 2 | 1 (hardcoded) | (2, 123) | سطر جديد (1, 123) ❌ |
| من شركة 3 | 1 (hardcoded) | (3, 123) | سطر جديد (1, 123) ❌ |

**المشكلة**: تكرار سطور في جدول `stock`!

### ✅ بعد الإصلاح:

| المستخدم | companyId المُرسل | السطر الموجود | النتيجة |
|----------|------------------|---------------|---------|
| من شركة 2 | 2 (من المستخدم) | (2, 123) | تحديث السطر (2, 123) ✅ |
| من شركة 3 | 3 (من المستخدم) | (3, 123) | تحديث السطر (3, 123) ✅ |

**النتيجة**: سطر واحد فقط لكل صنف في كل شركة!

---

## 🧪 الاختبار:

### السيناريو 1: تعديل مخزون موجود
```
1. سجل دخول كمستخدم من "صالة الإمارات" (companyId: 2)
2. افتح صفحة الأصناف
3. اضغط "إدارة المخزون" على صنف "لتر زيت تنظيف"
4. غيّر الكمية من 5000 إلى 6000
5. احفظ

✅ النتيجة المتوقعة:
- يتم تحديث نفس السطر في stock
- الكمية تصبح 6000
- لا يتم إنشاء سطر جديد
- companyId يبقى 2
```

### السيناريو 2: تعديل مخزون صنف جديد
```
1. أنشئ صنف جديد (ليس له سطر في stock)
2. اضغط "إدارة المخزون"
3. أدخل الكمية الأولى: 100

✅ النتيجة المتوقعة:
- يتم إنشاء سطر جديد في stock
- companyId = companyId المستخدم الحالي
- الكمية = 100
```

### السيناريو 3: محاولة تعديل صنف مستخدم
```
1. اختر صنف مستخدم في فاتورة مبيعات
2. حاول تعديل مخزونه

❌ النتيجة المتوقعة:
- يتم رفض العملية
- رسالة: "لا يمكن تعديل مخزون صنف مستخدم في فواتير"
- Status: 400
```

---

## 📁 الملفات المعدلة:

1. ✅ `/client/src/app/products/page.tsx`
   - إصلاح `handleUpdateStock` - استخدام `currentUser.companyId`
   - إصلاح `handleUpdatePrice` - استخدام `currentUser.companyId`

2. ✅ `/server/src/services/ProductService.ts`
   - إضافة `try-catch` في `updateStock`
   - إضافة error logging
   - معالجة أفضل لأخطاء Prisma

---

## 🎯 النتيجة النهائية:

| | قبل | بعد |
|---|-----|-----|
| **companyId** | hardcoded (1) | من المستخدم الحالي |
| **تكرار السطور** | ✅ يحدث | ❌ لا يحدث |
| **تحديث السطر** | ❌ ينشئ جديد | ✅ يحدث الموجود |
| **Error Handling** | ضعيف | محسّن |
| **Logging** | لا يوجد | موجود |

---

## 💡 الدروس المستفادة:

1. **لا تستخدم hardcoded values** - دائماً استخدم بيانات المستخدم الحالي
2. **افهم unique constraints** - في Prisma قبل استخدام `upsert`
3. **أضف logging** - لتتبع الأخطاء بسهولة
4. **اختبر بمستخدمين مختلفين** - من شركات مختلفة

---

## ✅ الخلاصة:

تم إصلاح المشكلة بشكل كامل! الآن:
- ✅ يتم تحديث السطر الموجود بدلاً من إنشاء سطر جديد
- ✅ كل شركة لها سطر واحد فقط لكل صنف
- ✅ `companyId` يأتي من المستخدم الحالي
- ✅ معالجة أخطاء محسّنة
- ✅ logging لتتبع المشاكل

**المشكلة كانت بسيطة لكن تأثيرها كبير - hardcoded value واحد سبب كل هذه المشاكل!** 🎉

# إصلاح مشكلة تحديث المخزون - الحل النهائي

## 🐛 المشكلة:

عند الضغط على زر "إدارة المخزون" وتعديل الكمية، كان يتم **إضافة سطر جديد** في جدول `stock` بدلاً من **تعديل السطر الموجود**.

### الأسباب:
1. ❌ استخدام `upsert` الذي ينشئ سطر جديد إذا لم يجد السطر
2. ❌ `companyId` كان hardcoded بقيمة `1` في Frontend

---

## ✅ الحل المطبق:

### 1. في `/server/src/services/ProductService.ts`:

**استبدال `upsert` بـ `update` فقط (PATCH)**:

```typescript
async updateStock(data: UpdateStockDto): Promise<void> {
  // 1️⃣ التحقق من وجود الصنف
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

  // 2️⃣ التحقق من استخدام الصنف في فواتير
  if (product.saleLines.length > 0 || product.purchaseLines.length > 0) {
    throw new Error('لا يمكن تعديل مخزون صنف مستخدم في فواتير مبيعات أو مشتريات');
  }

  // 3️⃣ التحقق من وجود سطر المخزون
  const existingStock = await this.prisma.stock.findUnique({
    where: {
      companyId_productId: {
        companyId: data.companyId,
        productId: data.productId,
      }
    }
  });

  if (!existingStock) {
    throw new Error('لا يوجد مخزون لهذا الصنف في هذه الشركة');
  }

  // 4️⃣ تحديث السطر الموجود فقط (PATCH) - لا إنشاء سطور جديدة
  await this.prisma.stock.update({
    where: {
      companyId_productId: {
        companyId: data.companyId,
        productId: data.productId,
      }
    },
    data: {
      boxes: data.quantity
    }
  });
}
```

### 2. في `/client/src/app/products/page.tsx`:

**إصلاح `companyId` hardcoded**:

```typescript
// ❌ قبل
const handleUpdateStock = async (boxes: number) => {
  await updateStock({
    companyId: 1,  // ❌ hardcoded!
    productId: selectedProduct.id,
    quantity: boxes
  });
};

// ✅ بعد
const handleUpdateStock = async (boxes: number) => {
  if (!selectedProduct || !currentUser?.companyId) return;
  
  await updateStock({
    companyId: currentUser.companyId,  // ✅ من المستخدم الحالي
    productId: selectedProduct.id,
    quantity: boxes
  }).unwrap();
};
```

---

## 📊 الفرق بين `upsert` و `update`:

| العملية | `upsert` | `update` |
|---------|----------|----------|
| **السطر موجود** | يحدثه ✅ | يحدثه ✅ |
| **السطر غير موجود** | ينشئ سطر جديد ❌ | يرمي خطأ ✅ |
| **الاستخدام** | Create OR Update | Update فقط |
| **HTTP Method** | PUT | PATCH |

---

## 🎯 السلوك الجديد:

### ✅ سيناريو 1: تعديل مخزون موجود (صنف غير مستخدم)
```
1. المستخدم من شركة "صالة الإمارات" (companyId: 2)
2. الصنف "لتر زيت تنظيف" له سطر في stock: (companyId: 2, productId: 123, boxes: 5000)
3. المستخدم يغير الكمية إلى 6000
4. النظام يتحقق:
   ✅ الصنف موجود
   ✅ الصنف غير مستخدم في فواتير
   ✅ سطر المخزون موجود
5. النظام يحدث السطر: (companyId: 2, productId: 123, boxes: 6000)
6. ✅ النتيجة: نفس السطر مع الكمية الجديدة
```

### ❌ سيناريو 2: محاولة تعديل صنف مستخدم
```
1. الصنف "بلاط سيراميك" مستخدم في فاتورة مبيعات
2. المستخدم يحاول تعديل مخزونه
3. النظام يرفض:
   ❌ رسالة: "لا يمكن تعديل مخزون صنف مستخدم في فواتير"
   ❌ Status: 400
```

### ❌ سيناريو 3: محاولة تعديل مخزون غير موجود
```
1. الصنف موجود لكن ليس له سطر في جدول stock
2. المستخدم يحاول تعديل مخزونه
3. النظام يرفض:
   ❌ رسالة: "لا يوجد مخزون لهذا الصنف في هذه الشركة"
   ❌ Status: 404
```

---

## 📁 الملفات المعدلة:

1. ✅ `/server/src/services/ProductService.ts`
   - استبدال `upsert` بـ `update`
   - إضافة التحقق من وجود السطر
   - إزالة `create` من العملية

2. ✅ `/client/src/app/products/page.tsx`
   - إصلاح `handleUpdateStock` - استخدام `currentUser.companyId`
   - إصلاح `handleUpdatePrice` - استخدام `currentUser.companyId`

3. ✅ `/server/src/controllers/ProductController.ts`
   - معالجة الأخطاء بشكل صحيح (404, 400, 500)
   - بدون `console.error` للأخطاء المتوقعة

---

## 🧪 الاختبار:

### اختبار 1: تعديل مخزون موجود
```bash
# الخطوات:
1. افتح صفحة الأصناف
2. اختر صنف غير مستخدم في فواتير
3. اضغط "إدارة المخزون"
4. غيّر الكمية من 100 إلى 150
5. احفظ

# النتيجة المتوقعة:
✅ يتم تحديث نفس السطر في stock
✅ الكمية تصبح 150
✅ لا يتم إنشاء سطر جديد
✅ رسالة: "تم تحديث المخزون بنجاح"
```

### اختبار 2: محاولة تعديل صنف مستخدم
```bash
# الخطوات:
1. اختر صنف مستخدم في فاتورة
2. اضغط "إدارة المخزون"
3. حاول تغيير الكمية

# النتيجة المتوقعة:
❌ يتم رفض العملية
❌ رسالة: "لا يمكن تعديل مخزون صنف مستخدم في فواتير"
❌ Status: 400
```

### اختبار 3: التحقق من قاعدة البيانات
```sql
-- قبل التعديل
SELECT * FROM "Stock" WHERE "productId" = 123 AND "companyId" = 2;
-- النتيجة: 1 سطر، boxes = 5000

-- بعد التعديل (تغيير إلى 6000)
SELECT * FROM "Stock" WHERE "productId" = 123 AND "companyId" = 2;
-- النتيجة: 1 سطر، boxes = 6000 ✅

-- التحقق من عدم وجود سطور مكررة
SELECT "productId", "companyId", COUNT(*) 
FROM "Stock" 
GROUP BY "productId", "companyId" 
HAVING COUNT(*) > 1;
-- النتيجة: 0 سطور (لا توجد تكرارات) ✅
```

---

## 📈 التحسينات المطبقة:

### 1️⃣ منع إنشاء سطور جديدة:
- ✅ استخدام `update` بدلاً من `upsert`
- ✅ التحقق من وجود السطر قبل التحديث
- ✅ رمي خطأ واضح إذا لم يكن السطر موجوداً

### 2️⃣ حماية البيانات:
- ✅ منع تعديل مخزون الأصناف المستخدمة في فواتير
- ✅ نفس منطق الحذف (consistency)
- ✅ الحفاظ على سلامة البيانات

### 3️⃣ تحسين معالجة الأخطاء:
- ✅ رسائل خطأ واضحة ومحددة
- ✅ Status codes صحيحة (404, 400, 500)
- ✅ بدون `console.error` للأخطاء المتوقعة

### 4️⃣ استخدام `companyId` الصحيح:
- ✅ من المستخدم الحالي بدلاً من hardcoded
- ✅ يعمل مع جميع الشركات
- ✅ لا تعارض بين الشركات

### 5️⃣ الأداء:
- ✅ استخدام `select: { id: true }` للتحقق السريع
- ✅ استخدام `take: 1` لجلب record واحد فقط
- ✅ استعلامات محسّنة

---

## 🎉 النتيجة النهائية:

| | قبل | بعد |
|---|-----|-----|
| **إنشاء سطور جديدة** | ✅ يحدث | ❌ لا يحدث |
| **تحديث السطر الموجود** | ❌ أحياناً | ✅ دائماً |
| **تكرار السطور** | ✅ يحدث | ❌ لا يحدث |
| **companyId** | hardcoded (1) | من المستخدم |
| **حماية البيانات** | ضعيفة | قوية |
| **رسائل الخطأ** | غير واضحة | واضحة |

---

## 💡 الدروس المستفادة:

1. **`upsert` vs `update`**: استخدم `update` عندما تريد تحديث فقط، و`upsert` عندما تريد Create OR Update
2. **لا hardcoded values**: دائماً استخدم بيانات المستخدم الحالي
3. **التحقق من الوجود**: تحقق من وجود السطر قبل التحديث
4. **رسائل خطأ واضحة**: ساعد المستخدم على فهم المشكلة
5. **حماية البيانات**: منع العمليات الخطرة على البيانات المستخدمة

---

## ✅ الخلاصة:

تم إصلاح المشكلة بشكل كامل! الآن:
- ✅ يتم تحديث السطر الموجود فقط (PATCH)
- ✅ لا يتم إنشاء سطور جديدة أبداً
- ✅ كل شركة لها سطر واحد فقط لكل صنف
- ✅ `companyId` يأتي من المستخدم الحالي
- ✅ حماية قوية للبيانات
- ✅ رسائل خطأ واضحة

**المشكلة كانت في استخدام `upsert` بدلاً من `update` + hardcoded `companyId`!** 🎉

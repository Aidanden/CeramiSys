# 🔧 Scripts إصلاح قاعدة البيانات

## المشكلة

عند إضافة عميل جديد، يظهر الخطأ التالي:
```
Unique constraint failed on the fields: (`id`)
```

### السبب الجذري

المشكلة تحدث عندما يكون **sequence** الخاص بـ auto-increment في PostgreSQL غير متزامن مع البيانات الفعلية في الجدول. هذا يحدث عادة عند:

1. **استيراد بيانات** من مصدر خارجي بـ IDs محددة
2. **حذف سجلات** ثم إعادة إدخالها
3. **تعديل يدوي** للـ IDs في قاعدة البيانات
4. **Migration** غير صحيح

### مثال على المشكلة

```
آخر عميل في الجدول: ID = 150
الـ sequence الحالي: 145

عند إضافة عميل جديد:
- PostgreSQL يحاول استخدام ID = 146
- لكن ID = 146 موجود بالفعل في الجدول!
- النتيجة: Unique constraint error ❌
```

---

## الحلول المتاحة

### ✅ الحل التلقائي (مدمج في الكود)

الكود الآن يحتوي على **auto-fix** يعمل تلقائياً عند حدوث المشكلة:

```typescript
// في SalesService.ts
if (error.code === 'P2002' && error.meta?.target?.includes('id')) {
  // 1. الحصول على أعلى ID موجود
  const maxId = lastCustomer?.id || 0;
  
  // 2. إصلاح الـ sequence
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Customer"', 'id'), ${maxId}, true);`
  );
  
  // 3. إعادة المحاولة
  const customer = await prisma.customer.create({ data });
}
```

**المزايا:**
- ✅ يعمل تلقائياً بدون تدخل
- ✅ يصلح المشكلة فوراً
- ✅ لا حاجة لتشغيل scripts يدوياً

---

### 🛠️ الحل اليدوي (Scripts)

إذا أردت إصلاح المشكلة **قبل** حدوثها، يمكنك تشغيل أحد الـ scripts التالية:

#### 1️⃣ إصلاح جدول Customer فقط

```bash
cd server
npm run fix:customer-sequence
```

**الناتج:**
```
🔧 بدء إصلاح sequence جدول Customer...
📊 أعلى ID موجود: 150
✅ تم إصلاح الـ sequence بنجاح!
🎯 الـ sequence الآن عند: 150
📝 العميل التالي سيحصل على ID: 151
```

#### 2️⃣ إصلاح جميع الجداول

```bash
cd server
npm run fix:all-sequences
```

**الناتج:**
```
🔧 بدء إصلاح جميع الـ sequences...

📋 معالجة جدول: Customer
   📊 أعلى ID: 150
   ✅ تم إصلاح sequence Customer

📋 معالجة جدول: Company
   📊 أعلى ID: 5
   ✅ تم إصلاح sequence Company

📋 معالجة جدول: Product
   📊 أعلى ID: 320
   ✅ تم إصلاح sequence Product

...

✨ تم الانتهاء من إصلاح جميع الـ sequences!
```

---

## 📝 متى تستخدم الـ Scripts؟

### استخدم الـ Scripts في الحالات التالية:

1. **بعد استيراد بيانات** من ملف SQL أو CSV
2. **بعد migration** كبير للبيانات
3. **عند ظهور المشكلة** في جداول متعددة
4. **كإجراء وقائي** بعد تعديلات يدوية على قاعدة البيانات

### لا تحتاج الـ Scripts في الحالات التالية:

- ✅ الاستخدام العادي للنظام (الـ auto-fix يعمل تلقائياً)
- ✅ إضافة عملاء جدد من الواجهة (الكود يصلح المشكلة تلقائياً)

---

## 🔍 كيف تتحقق من المشكلة؟

### تشغيل SQL Query يدوياً:

```sql
-- 1. الحصول على أعلى ID في الجدول
SELECT MAX(id) FROM "Customer";
-- مثال: 150

-- 2. الحصول على قيمة الـ sequence الحالية
SELECT last_value FROM "Customer_id_seq";
-- مثال: 145

-- 3. إذا كان last_value < MAX(id)، هناك مشكلة! ❌
```

### إصلاح يدوي في SQL:

```sql
-- إصلاح الـ sequence
SELECT setval(pg_get_serial_sequence('"Customer"', 'id'), 
  (SELECT MAX(id) FROM "Customer"), 
  true
);
```

---

## 📚 ملاحظات تقنية

### كيف يعمل `setval`؟

```sql
SELECT setval(sequence_name, new_value, is_called);
```

- **sequence_name**: اسم الـ sequence
- **new_value**: القيمة الجديدة
- **is_called**: 
  - `true`: القيمة التالية ستكون `new_value + 1`
  - `false`: القيمة التالية ستكون `new_value`

### مثال:

```sql
-- إذا كان آخر ID = 150
SELECT setval('"Customer_id_seq"', 150, true);

-- القيمة التالية ستكون: 151 ✅
```

---

## 🎯 الخلاصة

1. **الحل التلقائي موجود** في الكود ويعمل فوراً عند حدوث المشكلة
2. **الـ Scripts متاحة** للإصلاح اليدوي أو الوقائي
3. **المشكلة نادرة** في الاستخدام العادي
4. **لا داعي للقلق** - النظام يصلح نفسه تلقائياً! ✨

---

## 📞 الدعم

إذا استمرت المشكلة بعد تطبيق الحلول:
1. تحقق من logs الـ server
2. شغّل `npm run fix:all-sequences`
3. تحقق من صلاحيات قاعدة البيانات

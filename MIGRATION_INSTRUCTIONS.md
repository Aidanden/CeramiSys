 # تعليمات تشغيل Migration للمبيعات الآجلة

## ⚠️ مهم جداً: يجب تشغيل هذه الخطوات قبل استخدام النظام

---

## الخطوة 1: تشغيل Migration

افتح Terminal في مجلد الخادم وشغل الأمر التالي:

```bash
cd server
npx prisma migrate dev --name add_credit_sales_and_payments
```

### ماذا سيحدث؟
- سيتم إضافة الحقول الجديدة لجدول `Sale`:
  - `paidAmount` (المبلغ المدفوع)
  - `remainingAmount` (المبلغ المتبقي)
  - `isFullyPaid` (هل تم السداد بالكامل)
  - تحويل `paymentMethod` إلى اختياري

- سيتم إنشاء جدول جديد `SalePayment` لإيصالات القبض

- سيتم تحديث Prisma Client تلقائياً

---

## الخطوة 2: تحديث البيانات الموجودة (اختياري)

إذا كان لديك فواتير مبيعات موجودة بالفعل، شغل هذا الأمر لتحديثها:

```bash
npx prisma db execute --file ./prisma/migrations/update_existing_sales.sql
```

أو يمكنك تشغيل هذا SQL يدوياً:

```sql
-- تحديث الفواتير النقدية الموجودة
UPDATE "Sale"
SET 
  "paidAmount" = "total",
  "remainingAmount" = 0,
  "isFullyPaid" = true
WHERE "saleType" = 'CASH';

-- تحديث الفواتير الآجلة الموجودة
UPDATE "Sale"
SET 
  "paidAmount" = 0,
  "remainingAmount" = "total",
  "isFullyPaid" = false,
  "paymentMethod" = NULL
WHERE "saleType" = 'CREDIT';
```

---

## الخطوة 3: إعادة تشغيل الخادم

```bash
npm run dev
```

---

## الخطوة 4: التحقق من النجاح

### في Terminal:
يجب أن ترى:
```
✔ Generated Prisma Client
✔ Migration applied successfully
```

### في المتصفح:
1. افتح `http://localhost:3030/credit-sales`
2. يجب أن تظهر الصفحة بدون أخطاء
3. جرب إنشاء فاتورة آجلة وإضافة دفعة

---

## حل المشاكل الشائعة

### المشكلة 1: خطأ "Property 'paidAmount' does not exist"
**الحل:** تأكد من تشغيل Migration بنجاح

### المشكلة 2: خطأ "Property 'salePayment' does not exist"
**الحل:** شغل `npx prisma generate` لتحديث Prisma Client

### المشكلة 3: الفواتير القديمة لا تظهر بشكل صحيح
**الحل:** شغل SQL لتحديث البيانات الموجودة (الخطوة 2)

---

## التحقق من Schema

للتأكد من أن Schema محدث بشكل صحيح:

```bash
npx prisma db pull
npx prisma generate
```

---

## ملاحظات إضافية

### إذا كنت تستخدم Production Database:
1. خذ نسخة احتياطية من قاعدة البيانات أولاً
2. اختبر Migration على قاعدة بيانات تجريبية
3. شغل Migration على Production في وقت قليل الاستخدام

### إذا واجهت مشاكل:
1. تحقق من ملف `schema.prisma` - يجب أن يحتوي على جميع التعديلات
2. احذف مجلد `node_modules/.prisma` وشغل `npx prisma generate`
3. تأكد من أن قاعدة البيانات تعمل بشكل صحيح

---

## الأوامر المفيدة

```bash
# عرض حالة Migrations
npx prisma migrate status

# إعادة تطبيق آخر Migration
npx prisma migrate reset

# توليد Prisma Client فقط
npx prisma generate

# فتح Prisma Studio لعرض البيانات
npx prisma studio
```

---

## بعد نجاح Migration

✅ يمكنك الآن:
- إنشاء فواتير آجلة
- إضافة دفعات متعددة لكل فاتورة
- عرض سجل الدفعات
- حذف دفعات
- عرض إحصائيات المبيعات الآجلة

---

## الدعم

إذا واجهت أي مشاكل، راجع:
1. ملف `CREDIT_SALES_GUIDE.md` للتفاصيل الكاملة
2. Prisma Documentation: https://www.prisma.io/docs/
3. سجلات الأخطاء في Terminal

---

**ملاحظة مهمة:** لا تنسى تشغيل Migration على جميع البيئات (Development, Staging, Production)

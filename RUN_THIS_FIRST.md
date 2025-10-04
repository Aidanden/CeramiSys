# ⚠️ يجب تشغيل هذه الأوامر أولاً!

## ✅ تم إصلاح:
- ✅ مشكلة TypeScript في Controller
- ✅ مشكلة ترتيب المسارات في Routes

## ⚠️ المشكلة المتبقية:
الخادم لا يعمل بسبب أن Prisma Client لم يتم تحديثه بعد تعديل Schema.

---

## ✅ الحل (شغل هذه الأوامر بالترتيب):

### الخطوة 1: توليد Prisma Client
افتح Terminal في مجلد `server` وشغل:

```bash
cd server
npx prisma generate
```

**ماذا سيحدث؟**
- سيتم تحديث Prisma Client ليتعرف على الحقول الجديدة
- سيتم إنشاء Types جديدة للـ TypeScript
- الأخطاء في `SalesService.ts` و `SalePaymentService.ts` ستختفي

---

### الخطوة 2: تشغيل Migration (لتحديث قاعدة البيانات)
```bash
npx prisma migrate dev --name add_credit_sales_and_payments
```

**ماذا سيحدث؟**
- سيتم إضافة الحقول الجديدة لجدول `Sale`:
  - `paidAmount` (المبلغ المدفوع)
  - `remainingAmount` (المبلغ المتبقي)
  - `isFullyPaid` (هل تم السداد بالكامل)
  
- سيتم إنشاء جدول جديد `SalePayment` لإيصالات القبض

- سيتم تحديث Prisma Client تلقائياً

---

### الخطوة 3: تحديث البيانات الموجودة (اختياري)
إذا كان لديك فواتير مبيعات موجودة بالفعل، شغل:

```bash
npx prisma studio
```

ثم نفذ هذا SQL في قاعدة البيانات:

```sql
-- تحديث الفواتير النقدية الموجودة
UPDATE "Sale"
SET 
  "paidAmount" = "total",
  "remainingAmount" = 0,
  "isFullyPaid" = true
WHERE "saleType" = 'CASH'
  AND "paidAmount" IS NULL;

-- تحديث الفواتير الآجلة الموجودة
UPDATE "Sale"
SET 
  "paidAmount" = 0,
  "remainingAmount" = "total",
  "isFullyPaid" = false
WHERE "saleType" = 'CREDIT'
  AND "paidAmount" IS NULL;
```

أو استخدم الملف الجاهز:
```bash
npx prisma db execute --file ./prisma/update_existing_sales.sql
```

---

### الخطوة 4: إعادة تشغيل الخادم
```bash
npm run dev
```

---

## 🎯 بعد تشغيل الأوامر:

### 1. تحقق من نجاح العملية:
يجب أن ترى في Terminal:
```
✔ Generated Prisma Client
✔ Migration applied successfully
```

### 2. افتح المتصفح:
```
http://localhost:3000/credit-sales
```

### 3. جرب النظام:
- أنشئ فاتورة آجلة جديدة
- أضف دفعة للفاتورة
- شاهد الإحصائيات

---

## 📝 ملاحظات مهمة:

1. **لا تنسى Prisma Generate**: هذا هو الأهم!
2. **Migration مرة واحدة فقط**: لا تشغله أكثر من مرة
3. **النسخ الاحتياطي**: إذا كنت في Production، خذ نسخة احتياطية أولاً

---

## 🆘 إذا واجهت مشاكل:

### خطأ "paidAmount does not exist"
```bash
npx prisma generate
```

### خطأ "Migration failed"
```bash
npx prisma migrate reset
npx prisma migrate dev
```

### الخادم لا يعمل
```bash
# احذف node_modules/.prisma
rm -rf node_modules/.prisma
npx prisma generate
npm run dev
```

---

## ✅ قائمة التحقق:

- [ ] شغلت `npx prisma generate`
- [ ] شغلت `npx prisma migrate dev`
- [ ] الخادم يعمل بدون أخطاء
- [ ] فتحت صفحة المبيعات الآجلة
- [ ] جربت إضافة دفعة

---

**بعد تشغيل هذه الأوامر، النظام سيعمل بشكل كامل! 🚀**

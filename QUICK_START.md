# 🚀 دليل البدء السريع - نظام المبيعات الآجلة

## خطوات سريعة للتشغيل

### 1️⃣ تشغيل Migration (مهم!)
```bash
cd server
npx prisma migrate dev --name add_credit_sales_and_payments
```

### 2️⃣ إعادة تشغيل الخادم
```bash
npm run dev
```

### 3️⃣ افتح الصفحة
```
http://localhost:3000/credit-sales
```

---

## ✨ الميزات الجديدة

### 📊 صفحة المبيعات الآجلة
- عرض جميع الفواتير الآجلة
- إحصائيات شاملة (إجمالي، مدفوع، متبقي)
- فلترة حسب حالة السداد
- بحث في الفواتير

### 💰 نظام الدفعات
- إضافة دفعات متعددة لكل فاتورة
- رقم إيصال قبض تلقائي
- اختيار طريقة الدفع
- إضافة ملاحظات

### 📝 سجل الدفعات
- عرض جميع الدفعات لكل فاتورة
- حذف دفعات
- تحديث تلقائي للمبالغ

---

## 🎯 كيفية الاستخدام

### إنشاء فاتورة آجلة
1. اذهب إلى صفحة المبيعات
2. اختر نوع البيع: "آجل"
3. لا تحدد طريقة الدفع (ستكون فارغة)
4. احفظ الفاتورة

### إضافة دفعة
1. اذهب إلى صفحة المبيعات الآجلة
2. اضغط 💰 بجانب الفاتورة
3. أدخل المبلغ
4. اختر طريقة الدفع
5. احفظ

---

## 📁 الملفات المهمة

### الباك إند
- `server/prisma/schema.prisma` - Schema المحدث
- `server/src/services/SalePaymentService.ts` - منطق الدفعات
- `server/src/controllers/SalePaymentController.ts` - API
- `server/src/routes/salePaymentRoutes.ts` - المسارات

### الفرونت إند
- `client/src/state/salePaymentApi.ts` - API Client
- `client/src/app/credit-sales/page.tsx` - الصفحة الرئيسية
- `client/src/app/(components)/Sidebar/index.tsx` - رابط في السايد بار

---

## 🔧 حل المشاكل

### خطأ TypeScript؟
```bash
cd server
npx prisma generate
```

### الصفحة لا تعمل؟
1. تأكد من تشغيل Migration
2. أعد تشغيل الخادم
3. امسح الكاش: Ctrl+Shift+R

### البيانات غير صحيحة؟
```bash
cd server
npx prisma studio
```

---

## 📚 مزيد من التفاصيل

- **دليل كامل**: `CREDIT_SALES_GUIDE.md`
- **تعليمات Migration**: `MIGRATION_INSTRUCTIONS.md`

---

## ✅ قائمة التحقق

- [ ] تشغيل Migration
- [ ] إعادة تشغيل الخادم
- [ ] فتح صفحة المبيعات الآجلة
- [ ] إنشاء فاتورة آجلة تجريبية
- [ ] إضافة دفعة تجريبية
- [ ] التحقق من الإحصائيات

---

**جاهز للاستخدام! 🎉**

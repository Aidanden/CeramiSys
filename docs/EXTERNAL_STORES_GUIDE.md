# نظام إدارة المحلات الخارجية - دليل التشغيل

## 📋 نظرة عامة

تم إضافة نظام كامل لإدارة المحلات الخارجية التي تبيع منتجات التقازي. النظام يتضمن:
- إدارة المحلات وبياناتها
- ربط المنتجات بكل محل
- إنشاء مستخدمين للمحلات
- بوابة منفصلة للمحلات لإصدار الفواتير
- نظام موافقة/رفض الفواتير من المحاسب

---

## 🚀 خطوات التشغيل

### 1. تشغيل Database Migration

```bash
cd server
npx prisma migrate dev --name add_external_stores
npx prisma generate
```

### 2. إعادة تشغيل السيرفر

```bash
# في مجلد server
npm run dev
```

### 3. تشغيل Frontend

```bash
# في مجلد client
npm run dev
```

---

## 📁 الملفات التي تم إنشاؤها

### Backend (Server)

#### Database Schema
- `server/prisma/schema.prisma` - تم إضافة 6 نماذج جديدة

#### Controllers
- `server/src/controllers/ExternalStoreController.ts` - إدارة المحلات
- `server/src/controllers/ExternalStoreAuthController.ts` - مصادقة المحلات
- `server/src/controllers/ExternalStoreInvoiceController.ts` - إدارة الفواتير

#### Routes
- `server/src/routes/externalStoreRoutes.ts` - مسارات إدارة المحلات
- `server/src/routes/externalStoreAuthRoutes.ts` - مسارات المصادقة
- `server/src/routes/externalStorePortalRoutes.ts` - مسارات بوابة المحلات
- `server/src/routes/externalStoreInvoiceRoutes.ts` - مسارات الفواتير

#### Middleware
- `server/src/middleware/auth.ts` - تم إضافة `authenticateStoreToken`

### Frontend (Client)

#### State Management
- `client/src/state/externalStoresApi.ts` - API للمحلات
- `client/src/state/externalStoreInvoicesApi.ts` - API للفواتير

#### Pages
- `client/src/app/external-stores/page.tsx` - صفحة إدارة المحلات
- `client/src/app/external-store-invoices/page.tsx` - صفحة إدارة الفواتير

#### Configuration
- `client/src/config/permissions.ts` - تم إضافة صلاحيات المحلات
- `client/src/app/redux.tsx` - تم إضافة APIs الجديدة

---

## 🔐 الصلاحيات

تم إضافة الصلاحيات التالية لدور **المحاسب**:

```typescript
EXTERNAL_STORES: {
  CREATE: 'external_stores:create',
  READ: 'external_stores:read',
  UPDATE: 'external_stores:update',
  DELETE: 'external_stores:delete',
  LIST: 'external_stores:list',
  MANAGE_PRODUCTS: 'external_stores:manage_products',
  MANAGE_USERS: 'external_stores:manage_users',
  APPROVE_INVOICES: 'external_stores:approve_invoices',
  REJECT_INVOICES: 'external_stores:reject_invoices',
  VIEW_REPORTS: 'external_stores:view_reports'
}
```

---

## 📊 قاعدة البيانات

### الجداول الجديدة

1. **ExternalStore** - بيانات المحلات
   - id, name, ownerName, phone1, phone2, address, googleMapsUrl, isActive

2. **ExternalStoreUser** - مستخدمي المحلات
   - id, storeId, username, password, isActive, lastLogin

3. **ExternalStoreSession** - جلسات تسجيل الدخول
   - id, userId, token, expiresAt, isActive

4. **ExternalStoreProduct** - ربط المنتجات بالمحلات
   - id, storeId, productId

5. **ExternalStoreInvoice** - فواتير المحلات
   - id, storeId, total, status, notes, rejectionReason

6. **ExternalStoreInvoiceLine** - أسطر الفواتير
   - id, invoiceId, productId, qty, unitPrice, subTotal

---

## 🔌 API Endpoints

### إدارة المحلات (للمحاسب)

```
GET    /api/external-stores              - قائمة المحلات
POST   /api/external-stores              - إنشاء محل جديد
GET    /api/external-stores/:id          - تفاصيل محل
PUT    /api/external-stores/:id          - تحديث محل
DELETE /api/external-stores/:id          - حذف محل
POST   /api/external-stores/:id/users    - إنشاء مستخدم للمحل
GET    /api/external-stores/:id/products - منتجات المحل
POST   /api/external-stores/:id/products - ربط منتجات
DELETE /api/external-stores/:id/products/:productId - إزالة منتج
```

### بوابة المحلات

```
POST   /api/store-portal/auth/login           - تسجيل دخول
POST   /api/store-portal/auth/logout          - تسجيل خروج
GET    /api/store-portal/auth/me              - معلومات المستخدم
PUT    /api/store-portal/auth/change-password - تغيير كلمة المرور
GET    /api/store-portal/invoices             - قائمة الفواتير
POST   /api/store-portal/invoices             - إنشاء فاتورة
GET    /api/store-portal/invoices/:id         - تفاصيل فاتورة
PUT    /api/store-portal/invoices/:id         - تحديث فاتورة معلقة
DELETE /api/store-portal/invoices/:id         - حذف فاتورة معلقة
GET    /api/store-portal/products             - المنتجات المتاحة
GET    /api/store-portal/invoices/stats       - إحصائيات
```

### إدارة الفواتير (للمحاسب)

```
GET    /api/external-store-invoices           - قائمة جميع الفواتير
GET    /api/external-store-invoices/:id       - تفاصيل فاتورة
POST   /api/external-store-invoices/:id/approve - الموافقة على فاتورة
POST   /api/external-store-invoices/:id/reject  - رفض فاتورة
GET    /api/external-store-invoices/stats     - إحصائيات
```

---

## 💻 كيفية الاستخدام

### 1. إضافة محل جديد (المحاسب)

1. افتح `/external-stores`
2. اضغط "إضافة محل جديد"
3. أدخل البيانات:
   - اسم المحل
   - اسم صاحب المحل
   - رقم الهاتف الأول (مطلوب)
   - رقم الهاتف الثاني (اختياري)
   - العنوان (اختياري)
   - رابط خرائط جوجل (اختياري)
4. اضغط "حفظ"

### 2. ربط المنتجات بالمحل

1. افتح تفاصيل المحل
2. اختر المنتجات من قائمة منتجات التقازي
3. احفظ التغييرات

### 3. إنشاء مستخدم للمحل

1. افتح تفاصيل المحل
2. اضغط "إنشاء مستخدم"
3. أدخل:
   - اسم المستخدم
   - كلمة المرور
4. احفظ البيانات

### 4. تسجيل دخول المحل

1. افتح `/store-portal/login`
2. أدخل اسم المستخدم وكلمة المرور
3. سجل الدخول

### 5. إصدار فاتورة من المحل

1. افتح `/store-portal/invoices`
2. اضغط "إنشاء فاتورة جديدة"
3. اختر المنتجات والكميات
4. احفظ الفاتورة

### 6. الموافقة على الفواتير (المحاسب)

1. افتح `/external-store-invoices`
2. اختر الفاتورة المطلوبة
3. اضغط "عرض" لرؤية التفاصيل
4. اضغط "الموافقة" أو "رفض"
5. في حالة الرفض، أدخل السبب

---

## 🎨 الصفحات المتاحة

### للمحاسب (Admin Panel)

- `/external-stores` - إدارة المحلات
- `/external-store-invoices` - إدارة الفواتير

### لمستخدمي المحلات (Store Portal)

- `/store-portal/login` - تسجيل الدخول
- `/store-portal/dashboard` - لوحة التحكم (قيد التطوير)
- `/store-portal/invoices` - الفواتير (قيد التطوير)
- `/store-portal/products` - المنتجات (قيد التطوير)

---

## ⚠️ ملاحظات مهمة

### 1. رمز شركة التقازي
في الكود، تم استخدام `'TAQAZI'` كرمز للشركة الأم. تأكد من:
- وجود شركة برمز `TAQAZI` في جدول `Company`
- أو تعديل الرمز في الكود ليطابق رمز شركتك

### 2. المصادقة المنفصلة
- نظام المحلات له مصادقة منفصلة تماماً
- التوكنات مختلفة عن النظام الرئيسي
- الجلسات مخزنة في جدول منفصل

### 3. حالات الفواتير
- **PENDING**: في انتظار المعالجة
- **APPROVED**: تمت الموافقة عليها
- **REJECTED**: تم رفضها

### 4. سلوك الموافقة على الفاتورة
حالياً، الموافقة على الفاتورة تقوم فقط بتحديث الحالة. إذا أردت:
- خصم المخزون من التقازي
- إنشاء فاتورة مبيعات
- أي إجراء آخر

يمكنك تعديل دالة `approveInvoice` في `ExternalStoreInvoiceController.ts`

---

## 🔧 التخصيص والتطوير

### إضافة ميزات جديدة

1. **Dashboard للمحلات**: أنشئ `/store-portal/dashboard/page.tsx`
2. **صفحة المنتجات**: أنشئ `/store-portal/products/page.tsx`
3. **التقارير**: أنشئ صفحات التقارير المطلوبة
4. **نسيت كلمة المرور**: نفذ وظيفة إرسال البريد الإلكتروني

### تعديل السلوك

- **خصم المخزون**: عدل `approveInvoice` في Controller
- **إشعارات**: أضف إشعارات عند تغيير حالة الفاتورة
- **صلاحيات إضافية**: عدل `permissions.ts`

---

## 🐛 استكشاف الأخطاء

### خطأ: Property 'externalStore' does not exist

**الحل**: قم بتشغيل:
```bash
cd server
npx prisma generate
```

### خطأ: Cannot find module '@/state/externalStoresApi'

**الحل**: تأكد من:
1. وجود الملف في المسار الصحيح
2. إعادة تشغيل dev server

### الفواتير لا تظهر

**الحل**: تحقق من:
1. وجود بيانات في قاعدة البيانات
2. صلاحيات المستخدم
3. حالة الفلتر (PENDING/APPROVED/REJECTED)

---

## 📞 الدعم

للمساعدة أو الاستفسارات:
- راجع الكود المصدري
- تحقق من console logs
- استخدم Prisma Studio لفحص قاعدة البيانات: `npx prisma studio`

---

## ✅ قائمة التحقق

- [x] Database Schema
- [x] Backend Controllers
- [x] Backend Routes
- [x] Authentication Middleware
- [x] State Management APIs
- [x] Permissions Configuration
- [x] External Stores Management Page
- [x] Invoices Management Page
- [ ] Store Portal Login Page
- [ ] Store Portal Dashboard
- [ ] Store Portal Invoices Page
- [ ] Store Portal Products Page
- [ ] Store Portal Reports Page

---

تم إنشاء هذا النظام بواسطة Antigravity AI 🚀

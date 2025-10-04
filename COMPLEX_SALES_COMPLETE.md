# نظام المبيعات المعقدة - التوثيق الكامل

## 📋 الفكرة الأساسية:

### السيناريو:
1. **شركة التقازي (الشركة الأم)** لديها أصناف ومخزون
2. **شركة الإمارات (الفرع)** تريد بيع أصناف التقازي للعميل
3. **العميل** يشتري من شركة الإمارات بهامش ربح

### العمليات التي تحدث:
1. ✅ **خصم المخزون** من شركة التقازي (الأم)
2. ✅ **فاتورة بيع آجل** من التقازي → الإمارات (دائماً آجل)
3. ✅ **فاتورة بيع للعميل** من الإمارات → العميل (نقدي أو آجل حسب الاختيار)

---

## 🔄 تدفق العملية:

```
┌─────────────────┐
│  شركة التقازي   │ (الشركة الأم)
│   (المخزون)     │
└────────┬────────┘
         │ 1. خصم المخزون
         │ 2. فاتورة بيع آجل
         ↓
┌─────────────────┐
│  شركة الإمارات  │ (الفرع)
│   (الوسيط)      │
└────────┬────────┘
         │ 3. فاتورة بيع (نقدي/آجل)
         │    + هامش الربح
         ↓
┌─────────────────┐
│     العميل      │
└─────────────────┘
```

---

## 🎯 الحقول المطلوبة:

### في الواجهة الأمامية:
1. **العميل** - من قائمة العملاء
2. **الشركة الأم** - شركة التقازي (مصدر البضاعة)
3. **هامش الربح** - نسبة مئوية (مثلاً 20%)
4. **نوع فاتورة العميل** - نقدي أو آجل ⭐ **جديد**
5. **طريقة الدفع** - كاش، حوالة، بطاقة ⭐ **جديد**
6. **بنود الفاتورة** - الأصناف والكميات

---

## 📊 الفواتير المُنشأة:

### 1. فاتورة من التقازي → الإمارات:
```typescript
{
  companyId: parentCompanyId,        // شركة التقازي
  customerId: customerId,            // العميل (للربط)
  invoiceNumber: "PR-1-1234567890",
  total: parentSaleTotal,            // السعر الأصلي
  saleType: "CREDIT",                // دائماً آجل
  paymentMethod: "CASH",             // افتراضي
  paidAmount: 0,                     // لم يُدفع بعد
  remainingAmount: parentSaleTotal,  // المبلغ المتبقي
  isFullyPaid: false                 // غير مدفوع
}
```

### 2. فاتورة من الإمارات → العميل:
```typescript
{
  companyId: branchCompanyId,        // شركة الإمارات
  customerId: customerId,            // العميل
  invoiceNumber: "BR-2-1234567890",
  total: customerSaleTotal,          // السعر + هامش الربح
  saleType: customerSaleType,        // نقدي أو آجل ⭐
  paymentMethod: customerPaymentMethod, // كاش/حوالة/بطاقة ⭐
  paidAmount: (نقدي) ? total : 0,   // حسب النوع
  remainingAmount: (آجل) ? total : 0,
  isFullyPaid: (نقدي) ? true : false
}
```

---

## 🔧 التحديثات المطبقة:

### 1. **Types** (Frontend & Backend):
```typescript
interface CreateComplexInterCompanySaleRequest {
  customerId: number;
  branchCompanyId: number;
  parentCompanyId: number;
  lines: ComplexInterCompanySaleLine[];
  profitMargin?: number;
  customerSaleType: 'CASH' | 'CREDIT';      // ⭐ جديد
  customerPaymentMethod: 'CASH' | 'BANK' | 'CARD'; // ⭐ جديد
}
```

### 2. **Service Logic**:
```typescript
// في ComplexInterCompanySaleService.ts
const customerSaleType = data.customerSaleType || 'CASH';
const customerPaymentMethod = data.customerPaymentMethod || 'CASH';
const customerPaidAmount = customerSaleType === 'CASH' ? customerSaleTotal : 0;
const customerRemainingAmount = customerSaleType === 'CASH' ? 0 : customerSaleTotal;
const customerIsFullyPaid = customerSaleType === 'CASH';
```

### 3. **UI Components**:
```tsx
{/* نوع فاتورة العميل */}
<select value={customerSaleType} onChange={...}>
  <option value="CASH">نقدي</option>
  <option value="CREDIT">آجل</option>
</select>

{/* طريقة الدفع */}
<select value={customerPaymentMethod} onChange={...}>
  <option value="CASH">كاش</option>
  <option value="BANK">حوالة مصرفية</option>
  <option value="CARD">بطاقة مصرفية</option>
</select>
```

---

## 📁 الملفات المحدثة:

### Frontend:
1. ✅ `/client/src/state/complexInterCompanySalesApi.ts` - إضافة الحقول الجديدة
2. ✅ `/client/src/app/complex-inter-company-sales/page.tsx` - إضافة UI للحقول
3. ✅ `/client/src/state/complexInterCompanySalesSlice.ts` - Redux slice

### Backend:
4. ✅ `/server/src/services/ComplexInterCompanySaleService.ts` - تحديث المنطق
5. ✅ `/server/src/routes/complexInterCompanySaleRoutes.ts` - المسارات
6. ✅ `/server/src/controllers/ComplexInterCompanySaleController.ts` - المعالج

---

## 🧪 كيفية الاختبار:

### 1. إنشاء عملية بيع نقدية:
```
1. اختر العميل
2. اختر الشركة الأم (التقازي)
3. حدد هامش الربح (20%)
4. نوع الفاتورة: نقدي
5. طريقة الدفع: كاش
6. أضف البنود
7. احفظ
```

**النتيجة**:
- ✅ فاتورة آجل من التقازي → الإمارات
- ✅ فاتورة نقدية من الإمارات → العميل (مدفوعة بالكامل)

### 2. إنشاء عملية بيع آجلة:
```
1. اختر العميل
2. اختر الشركة الأم (التقازي)
3. حدد هامش الربح (25%)
4. نوع الفاتورة: آجل
5. طريقة الدفع: حوالة مصرفية
6. أضف البنود
7. احفظ
```

**النتيجة**:
- ✅ فاتورة آجل من التقازي → الإمارات
- ✅ فاتورة آجلة من الإمارات → العميل (غير مدفوعة)

---

## ✅ المميزات:

1. **مرونة في نوع الفاتورة**: نقدي أو آجل
2. **خيارات دفع متعددة**: كاش، حوالة، بطاقة
3. **حساب تلقائي**: للمبالغ المدفوعة والمتبقية
4. **خصم مخزون دقيق**: من الشركة الأم
5. **فواتير منفصلة**: للشركة الأم والفرع
6. **هامش ربح مرن**: قابل للتعديل

---

## 🚀 النظام جاهز للاستخدام!

جميع المتطلبات تم تطبيقها:
- ✅ فاتورة بيع آجل من التقازي → الإمارات
- ✅ فاتورة بيع من الإمارات → العميل (نقدي/آجل)
- ✅ خانة نوع الفاتورة
- ✅ خانة طريقة الدفع
- ✅ هامش الربح
- ✅ خصم المخزون

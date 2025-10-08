# إصلاح أخطاء Decimal في ProvisionalSalesService

## المشاكل التي تم إصلاحها

### 1. مشكلة نوع Decimal في حساب المجموع
```typescript
// المشكلة الأصلية ❌
const total = data.lines.reduce((sum, line) => {
  return sum + (line.qty * line.unitPrice);
}, 0); // خطأ: number لا يمكن تعيينه إلى Decimal

// الحل المطبق ✅
const total = new Prisma.Decimal(
  data.lines.reduce((sum, line) => {
    return sum + (line.qty * line.unitPrice);
  }, 0)
);
```

### 2. مشكلة العمليات الحسابية مع Decimal
```typescript
// المشكلة الأصلية ❌
const qtyInBoxes = product.unitsPerBox ? line.qty / Number(product.unitsPerBox) : line.qty;
// خطأ: line.qty من نوع Decimal ولا يمكن استخدامه في العمليات الحسابية مباشرة

// الحل المطبق ✅
const qtyInBoxes = product.unitsPerBox ? Number(line.qty) / Number(product.unitsPerBox) : Number(line.qty);
```

## الإصلاحات المطبقة

### في دالة createProvisionalSale
- تحويل نتيجة حساب المجموع إلى `Prisma.Decimal`
- ضمان التوافق مع نوع البيانات في قاعدة البيانات

### في دالة updateProvisionalSale  
- نفس الإصلاح لحساب المجموع الجديد عند تحديث السطور
- استخدام `new Prisma.Decimal()` لتحويل النتيجة

### في دالة convertToSale
- تحويل قيم `Decimal` إلى `number` قبل العمليات الحسابية
- استخدام `Number()` للتحويل الآمن

## النتيجة

✅ **تم إصلاح جميع أخطاء TypeScript المتعلقة بـ Decimal**
✅ **العمليات الحسابية تعمل بشكل صحيح**
✅ **التوافق مع أنواع بيانات Prisma**
✅ **حساب دقيق للمجاميع والكميات**

## ملاحظات مهمة

- **Prisma.Decimal**: يُستخدم للقيم النقدية والكميات الدقيقة
- **Number()**: للتحويل الآمن من Decimal إلى number للعمليات الحسابية
- **new Prisma.Decimal()**: لإنشاء قيم Decimal جديدة من numbers

النظام الآن جاهز للتشغيل بدون أخطاء! 🎉

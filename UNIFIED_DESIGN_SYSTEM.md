# نظام التصميم الموحد لمشروع CeramiSys

## نظرة عامة
تم تطبيق نظام تصميم موحد على جميع شاشات المشروع لضمان تجربة مستخدم متسقة واحترافية.

## المبادئ الأساسية للتصميم

### 1. بطاقات الإحصائيات (Stats Cards)
```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-xl shadow-lg text-white">
    <div className="flex items-center justify-between mb-2">
      <div className="text-sm font-medium opacity-90">العنوان</div>
      <div className="text-2xl">🎯</div>
    </div>
    <div className="text-3xl font-bold">القيمة</div>
    <div className="text-xs mt-1 opacity-75">وصف إضافي</div>
  </div>
</div>
```

**المواصفات:**
- استخدام `gradient-to-br` للخلفية
- ألوان متدرجة حسب نوع البطاقة
- أيقونات رموز تعبيرية (emoji) بدلاً من SVG
- نص بحجم `text-3xl` للقيمة الرئيسية
- `rounded-xl` و `shadow-lg` للتصميم

### 2. قسم الفلاتر (Filters Section)
```tsx
<div className="bg-white p-4 rounded-xl shadow-md mb-6">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* فلتر 1 */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">🏢 العنوان</label>
      <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
        <option>الخيار 1</option>
      </select>
    </div>
  </div>
</div>
```

**المواصفات:**
- خلفية بيضاء مع `rounded-xl` و `shadow-md`
- استخدام `grid` للتنظيم
- `py-2.5` للـ inputs و selects
- أيقونات emoji في الـ labels

### 3. الجداول (Tables)
```tsx
<div className="bg-white rounded-xl shadow-lg overflow-hidden">
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
        <tr>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
            العمود
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {/* الصفوف */}
      </tbody>
    </table>
  </div>
</div>
```

**المواصفات:**
- `rounded-xl` و `shadow-lg` للجدول
- `gradient-to-r` للـ header
- `hover:bg-gray-50` للصفوف
- `divide-y` للفواصل

### 4. رسالة "لا توجد بيانات" (Empty State)
```tsx
<tr>
  <td colSpan={9} className="px-6 py-12 text-center">
    <div className="flex flex-col items-center justify-center text-gray-500">
      <div className="text-6xl mb-4">📋</div>
      <p className="text-lg font-medium mb-2">لا توجد بيانات</p>
      <p className="text-sm">رسالة توضيحية</p>
    </div>
  </td>
</tr>
```

**المواصفات:**
- أيقونة كبيرة `text-6xl`
- نص رئيسي `text-lg font-medium`
- نص ثانوي `text-sm`
- محاذاة مركزية

### 5. Pagination
```tsx
<div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
  <div className="text-sm text-gray-700">
    عرض {start} إلى {end} من {total} نتيجة
  </div>
  <div className="flex gap-2">
    <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium">
      السابق
    </button>
    <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium">
      التالي
    </button>
  </div>
</div>
```

## الألوان المستخدمة

### بطاقات الإحصائيات:
- **أزرق**: `from-blue-500 to-blue-600` - للإحصائيات العامة
- **بنفسجي**: `from-purple-500 to-purple-600` - للمبالغ المالية
- **أخضر**: `from-green-500 to-green-600` - للقيم الإيجابية
- **أحمر**: `from-red-500 to-red-600` - للقيم السلبية أو التحذيرات
- **برتقالي**: `from-orange-500 to-orange-600` - للقيم المتوسطة

### حالات البيانات:
- **نجاح/متوفر**: `bg-green-100 text-green-800`
- **خطأ/غير متوفر**: `bg-red-100 text-red-800`
- **تحذير/جزئي**: `bg-yellow-100 text-yellow-800`
- **معلومات**: `bg-blue-100 text-blue-800`

## الأيقونات

استخدام الرموز التعبيرية (Emoji) بدلاً من مكتبات الأيقونات:
- 🏢 للشركات
- 👤 للمستخدمين
- 📦 للأصناف
- 💰 للمبالغ المالية
- 📊 للإحصائيات
- 🔍 للبحث
- ✅ للنجاح
- ❌ للخطأ
- ⏳ للانتظار
- 📋 للقوائم
- 🖨️ للطباعة
- 👁️ للعرض

## التنسيق العربي

### الأرقام:
```typescript
formatArabicNumber(value) // أرقام عربية (0-9)
```

### العملة:
```typescript
formatArabicCurrency(value) // مع "د.ل" (دينار ليبي)
```

### التواريخ:
```typescript
new Date(date).toLocaleDateString('ar-LY')
```

## الشاشات المطبقة

### ✅ شاشة المبيعات الآجلة
- بطاقات إحصائيات بـ gradient
- فلاتر متعددة (الشركة، البحث، الحالة)
- جدول مع عمود الشركة
- رسائل فارغة ديناميكية
- pagination محسن

### 🔄 شاشة الأصناف (قيد التحديث)
- سيتم تطبيق نفس التصميم
- إضافة بطاقات gradient
- تحسين الفلاتر
- تحسين الجدول

### 🔄 شاشة المستخدمين (قيد التحديث)
- سيتم تطبيق نفس التصميم
- إضافة بطاقات gradient
- تحسين الفلاتر
- تحسين الجدول

### 🔄 شاشة الشركات (قيد التحديث)
- سيتم تطبيق نفس التصميم
- إضافة بطاقات gradient
- تحسين الفلاتر
- تحسين الجدول

## ملاحظات مهمة

1. **التناسق**: جميع الشاشات يجب أن تتبع نفس النمط
2. **الألوان**: استخدام نفس مجموعة الألوان في كل مكان
3. **المسافات**: استخدام `p-4`, `p-5`, `p-6` بشكل متسق
4. **الحواف**: `rounded-lg` للعناصر الصغيرة، `rounded-xl` للكبيرة
5. **الظلال**: `shadow-sm` للعناصر الصغيرة، `shadow-md` للمتوسطة، `shadow-lg` للكبيرة

## الخطوات التالية

1. ✅ تطبيق التصميم على شاشة المبيعات الآجلة
2. 🔄 تطبيق التصميم على شاشة الأصناف
3. 🔄 تطبيق التصميم على شاشة المستخدمين
4. 🔄 تطبيق التصميم على شاشة الشركات
5. ✅ التأكد من التناسق الكامل بين جميع الشاشات

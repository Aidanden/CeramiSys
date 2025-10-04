# مرجع سريع للمكونات - نظام التصميم الموحد

## 🎨 بطاقات الإحصائيات (Stats Cards)

### البطاقة الزرقاء (Blue Card)
```tsx
<div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-xl shadow-lg text-white">
  <div className="flex items-center justify-between mb-2">
    <div className="text-sm font-medium opacity-90">العنوان</div>
    <div className="text-2xl">📊</div>
  </div>
  <div className="text-3xl font-bold">{formatArabicNumber(value)}</div>
  <div className="text-xs mt-1 opacity-75">وصف</div>
</div>
```

### البطاقة الخضراء (Green Card)
```tsx
<div className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-xl shadow-lg text-white">
  <div className="flex items-center justify-between mb-2">
    <div className="text-sm font-medium opacity-90">العنوان</div>
    <div className="text-2xl">✅</div>
  </div>
  <div className="text-3xl font-bold">{formatArabicNumber(value)}</div>
  <div className="text-xs mt-1 opacity-75">وصف</div>
</div>
```

### البطاقة البرتقالية (Orange Card)
```tsx
<div className="bg-gradient-to-br from-orange-500 to-orange-600 p-5 rounded-xl shadow-lg text-white">
  <div className="flex items-center justify-between mb-2">
    <div className="text-sm font-medium opacity-90">العنوان</div>
    <div className="text-2xl">⚠️</div>
  </div>
  <div className="text-3xl font-bold">{formatArabicNumber(value)}</div>
  <div className="text-xs mt-1 opacity-75">وصف</div>
</div>
```

### البطاقة البنفسجية (Purple Card)
```tsx
<div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-xl shadow-lg text-white">
  <div className="flex items-center justify-between mb-2">
    <div className="text-sm font-medium opacity-90">العنوان</div>
    <div className="text-2xl">💰</div>
  </div>
  <div className="text-3xl font-bold">{formatArabicCurrency(value)}</div>
  <div className="text-xs mt-1 opacity-75">وصف</div>
</div>
```

### البطاقة الحمراء (Red Card)
```tsx
<div className="bg-gradient-to-br from-red-500 to-red-600 p-5 rounded-xl shadow-lg text-white">
  <div className="flex items-center justify-between mb-2">
    <div className="text-sm font-medium opacity-90">العنوان</div>
    <div className="text-2xl">❌</div>
  </div>
  <div className="text-3xl font-bold">{formatArabicNumber(value)}</div>
  <div className="text-xs mt-1 opacity-75">وصف</div>
</div>
```

---

## 🔍 قسم الفلاتر (Filters Section)

### فلتر بحث (Search Filter)
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">🔍 البحث</label>
  <input
    type="text"
    placeholder="ابحث..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  />
</div>
```

### فلتر قائمة منسدلة (Select Filter)
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">📊 الفئة</label>
  <select
    value={selectedValue}
    onChange={(e) => setSelectedValue(e.target.value)}
    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
  >
    <option value="">الكل</option>
    <option value="option1">خيار 1</option>
    <option value="option2">خيار 2</option>
  </select>
</div>
```

### Container الفلاتر الكامل
```tsx
<div className="bg-white p-4 rounded-xl shadow-md mb-6">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* فلتر 1 */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">🔍 البحث</label>
      <input ... />
    </div>
    
    {/* فلتر 2 */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">📊 الفئة</label>
      <select ... />
    </div>
    
    {/* فلتر 3 */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">🏢 الشركة</label>
      <select ... />
    </div>
  </div>
</div>
```

---

## 📋 الجداول (Tables)

### Container الجدول
```tsx
<div className="bg-white rounded-xl shadow-lg overflow-hidden">
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      {/* المحتوى */}
    </table>
  </div>
</div>
```

### Header الجدول
```tsx
<thead className="bg-gradient-to-r from-gray-50 to-gray-100">
  <tr>
    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
      العمود 1
    </th>
    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
      العمود 2
    </th>
  </tr>
</thead>
```

### Body الجدول
```tsx
<tbody className="bg-white divide-y divide-gray-200">
  {data.map((item) => (
    <tr key={item.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {item.value}
      </td>
    </tr>
  ))}
</tbody>
```

---

## 📭 Empty State (لا توجد بيانات)

### Empty State للأصناف
```tsx
<tr>
  <td colSpan={8} className="px-6 py-12 text-center">
    <div className="flex flex-col items-center justify-center text-gray-500">
      <div className="text-6xl mb-4">📦</div>
      <p className="text-lg font-medium mb-2">لا توجد أصناف</p>
      <p className="text-sm">
        {searchTerm 
          ? 'لا توجد نتائج للبحث'
          : 'ابدأ بإضافة أول صنف'}
      </p>
    </div>
  </td>
</tr>
```

### Empty State للمستخدمين
```tsx
<tr>
  <td colSpan={7} className="px-6 py-12 text-center">
    <div className="flex flex-col items-center justify-center text-gray-500">
      <div className="text-6xl mb-4">👥</div>
      <p className="text-lg font-medium mb-2">لا توجد مستخدمين</p>
      <p className="text-sm">
        {searchTerm 
          ? 'لا توجد نتائج للبحث'
          : 'ابدأ بإضافة أول مستخدم'}
      </p>
    </div>
  </td>
</tr>
```

### Empty State للشركات
```tsx
<tr>
  <td colSpan={7} className="px-6 py-12 text-center">
    <div className="flex flex-col items-center justify-center text-gray-500">
      <div className="text-6xl mb-4">🏢</div>
      <p className="text-lg font-medium mb-2">لا توجد شركات</p>
      <p className="text-sm">
        {searchTerm 
          ? 'لا توجد نتائج للبحث'
          : 'ابدأ بإضافة أول شركة'}
      </p>
    </div>
  </td>
</tr>
```

---

## 📄 Pagination

### Pagination كامل
```tsx
{data?.pagination && filteredData.length > 0 && (
  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
    <div className="text-sm text-gray-700">
      عرض {formatArabicNumber(((currentPage - 1) * 10) + 1)} إلى {formatArabicNumber(Math.min(currentPage * 10, filteredData.length))} من {formatArabicNumber(filteredData.length)} نتيجة
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        السابق
      </button>
      <button
        onClick={() => setCurrentPage(prev => prev + 1)}
        disabled={currentPage >= data.pagination.pages}
        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        التالي
      </button>
    </div>
  </div>
)}
```

---

## 🎯 Badges (شارات الحالة)

### Badge نجاح (Success)
```tsx
<span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full bg-green-100 text-green-800 border border-green-300">
  ✅ نشط
</span>
```

### Badge تحذير (Warning)
```tsx
<span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
  ⏳ معلق
</span>
```

### Badge خطأ (Error)
```tsx
<span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-300">
  ❌ غير نشط
</span>
```

### Badge معلومات (Info)
```tsx
<span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
  ℹ️ معلومة
</span>
```

---

## 🎨 الأيقونات المستخدمة (Emojis)

### أيقونات عامة
- 🏢 الشركات
- 👥 المستخدمين
- 📦 الأصناف
- 💰 المبالغ المالية
- 📊 الإحصائيات
- 🔍 البحث
- 📋 القوائم

### أيقونات الحالة
- ✅ نجاح / نشط / متوفر
- ❌ خطأ / غير نشط / غير متوفر
- ⏳ انتظار / معلق / جزئي
- ⚠️ تحذير
- ℹ️ معلومات

### أيقونات الإجراءات
- 👁️ عرض
- ✏️ تعديل
- 🗑️ حذف
- 🖨️ طباعة
- 📥 تصدير
- ➕ إضافة

### أيقونات الأدوار
- 👨‍💼 مدير
- 💵 صراف
- 📝 محاسب
- 🔧 مستخدم عادي

---

## 🎨 دالات التنسيق

### تنسيق الأرقام
```typescript
import { formatArabicNumber } from '@/utils/formatArabicNumbers';

// استخدام
{formatArabicNumber(1234)} // => 1,234
```

### تنسيق العملة
```typescript
import { formatArabicCurrency } from '@/utils/formatArabicNumbers';

// استخدام
{formatArabicCurrency(1234.50)} // => 1,234.50 د.ل
```

### تنسيق التاريخ
```typescript
// استخدام
{new Date(date).toLocaleDateString('ar-LY')}
```

---

## 📝 ملاحظات مهمة

1. **الألوان**: استخدم نفس الألوان في كل مكان للتناسق
2. **المسافات**: `p-4` للصغير، `p-5` للمتوسط، `p-6` للكبير
3. **الحواف**: `rounded-lg` للصغير، `rounded-xl` للكبير
4. **الظلال**: `shadow-sm` للصغير، `shadow-md` للمتوسط، `shadow-lg` للكبير
5. **الأيقونات**: استخدم emoji بدلاً من SVG للبساطة

---

## 🚀 نصائح للتطبيق

1. **انسخ والصق**: استخدم الأكواد الجاهزة أعلاه مباشرة
2. **عدّل القيم**: غيّر النصوص والقيم حسب حاجتك
3. **حافظ على التناسق**: استخدم نفس class names
4. **اختبر**: تأكد من التصميم على أحجام شاشات مختلفة

---

## ✅ Checklist التطبيق

### شاشة الأصناف
- [ ] تحديث بطاقات الإحصائيات (4 بطاقات)
- [ ] تحسين قسم الفلاتر (grid layout)
- [ ] تحديث header الجدول (gradient)
- [ ] إضافة empty state محسن
- [ ] تحديث pagination

### شاشة المستخدمين
- [ ] إضافة بطاقات الإحصائيات (4 بطاقات)
- [ ] تحسين قسم الفلاتر (grid layout)
- [ ] تحديث header الجدول (gradient)
- [ ] إضافة empty state محسن
- [ ] تحديث pagination

### شاشة الشركات
- [ ] تحديث بطاقات الإحصائيات (gradient)
- [ ] تحسين قسم الفلاتر (grid layout)
- [ ] تحديث header الجدول (gradient)
- [ ] إضافة empty state محسن
- [ ] تحديث pagination

---

**ملاحظة نهائية:** جميع الأكواد أعلاه جاهزة للاستخدام المباشر. فقط انسخ والصق وعدّل النصوص والقيم حسب حاجتك! 🎉

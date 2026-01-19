# خطة تطبيق الدارك مود على الشاشات المتبقية

## الشاشات المطلوبة:
1. ✅ حركة الخزينة - `treasury/page.tsx`
2. ⏳ المرتبات - `payroll/page.tsx`
3. ⏳ الموظفين - `users/page.tsx`
4. ⏳ المصروفات المعدومة - `bad-debts/page.tsx`
5. ⏳ حسابات العملاء - `customer-accounts/page.tsx`
6. ⏳ حسابات الموردين - `supplier-accounts/page.tsx`

## التحسينات المطلوبة لكل شاشة:

### 1. الألوان والخلفيات:
- استبدال `bg-white` بـ `bg-white dark:bg-surface-primary`
- استبدال `bg-gray-50` بـ `bg-slate-50 dark:bg-surface-secondary`
- استبدال `bg-gray-100` بـ `bg-slate-100 dark:bg-surface-hover`
- استبدال `bg-gray-800` بـ `bg-surface-primary dark:bg-surface-primary`

### 2. النصوص:
- استبدال `text-gray-900` بـ `text-slate-900 dark:text-text-primary`
- استبدال `text-gray-600` بـ `text-slate-600 dark:text-text-secondary`
- استبدال `text-gray-500` بـ `text-slate-500 dark:text-text-tertiary`
- استبدال `text-white` بـ `text-white dark:text-text-primary`

### 3. الحدود:
- استبدال `border-gray-200` بـ `border-slate-200 dark:border-border-primary`
- استبدال `border-gray-300` بـ `border-slate-300 dark:border-border-primary`
- استبدال `border-gray-700` بـ `border-border-primary dark:border-border-primary`

### 4. الأزرار والعناصر التفاعلية:
- إضافة `dark:` variants لجميع حالات hover و focus
- تحسين التباين في الوضع الداكن
- إضافة transitions سلسة

### 5. الجداول والكروت:
- تطبيق نفس النمط المستخدم في شاشة المحاسب
- إضافة shadows و borders متناسقة
- تحسين spacing و padding

### 6. المودالات:
- تطبيق نفس التصميم الاحترافي من شاشة المحاسب
- استخدام backdrop-blur
- تحسين الرؤوس والأزرار

## ترتيب التنفيذ:
1. حركة الخزينة (الأولوية)
2. المرتبات
3. حسابات العملاء
4. حسابات الموردين
5. المصروفات المعدومة
6. الموظفين

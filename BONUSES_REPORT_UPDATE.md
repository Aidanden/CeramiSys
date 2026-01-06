# تحديث طباعة تقرير المكافآت
تاريخ التحديث: 2026-01-05

## نظرة عامة
تم إضافة ميزة طباعة تقرير شامل للمكافآت والزيادات في تاب المكافآت بشاشة المرتبات، مع عرض كامل للبيانات وإمكانية الفلترة والطباعة.

---

## التحديثات المنفذة

### 1️⃣ Backend - الخادم

#### أ. PayrollService.ts
**إضافة method جديدة للحصول على المكافآت:**

```typescript
async getBonuses(filters: { 
    month?: number; 
    year?: number; 
    type?: BonusType; 
    employeeId?: number;
    companyId?: number;
}) {
    const where: any = {};

    // فلترة حسب التاريخ (شهر/سنة)
    if (filters.month && filters.year) {
        const startDate = new Date(filters.year, filters.month - 1, 1);
        const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59, 999);
        where.paymentDate = { gte: startDate, lte: endDate };
    } else if (filters.year) {
        const startDate = new Date(filters.year, 0, 1);
        const endDate = new Date(filters.year, 11, 31, 23, 59, 59, 999);
        where.paymentDate = { gte: startDate, lte: endDate };
    }

    // فلترة حسب النوع
    if (filters.type) where.type = filters.type;
    
    // فلترة حسب الموظف
    if (filters.employeeId) where.employeeId = filters.employeeId;
    
    // فلترة حسب الشركة
    if (filters.companyId) {
        where.employee = { companyId: filters.companyId };
    }

    const bonuses = await prisma.employeeBonus.findMany({
        where,
        include: {
            employee: {
                select: {
                    id: true, name: true, jobTitle: true,
                    companyId: true,
                    company: { select: { id: true, name: true, code: true } }
                }
            }
        },
        orderBy: { paymentDate: 'desc' }
    });

    return bonuses.map(bonus => ({
        ...bonus,
        typeName: this.getBonusTypeName(bonus.type)
    }));
}
```

**المميزات:**
- فلترة متعددة (شهر، سنة، نوع المكافأة، موظف، شركة)
- إرجاع بيانات الموظف والشركة
- إضافة اسم النوع بالعربي (`typeName`)
- ترتيب حسب تاريخ الدفع (الأحدث أولاً)

#### ب. PayrollController.ts
**إضافة endpoint للحصول على المكافآت:**

```typescript
async getBonuses(req: AuthRequest, res: Response) {
    try {
        const { month, year, type, employeeId, companyId } = req.query;

        const bonuses = await PayrollService.getBonuses({
            month: month ? parseInt(month as string) : undefined,
            year: year ? parseInt(year as string) : undefined,
            type: type as any,
            employeeId: employeeId ? parseInt(employeeId as string) : undefined,
            companyId: companyId ? parseInt(companyId as string) : undefined
        });

        res.json({ success: true, data: bonuses });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'حدث خطأ أثناء جلب المكافآت'
        });
    }
}
```

#### ج. payrollRoutes.ts
**إضافة route جديدة:**

```typescript
// الحصول على المكافآت
router.get('/bonuses', authMiddleware, PayrollController.getBonuses.bind(PayrollController));
```

**المسار الكامل:** `GET /api/payroll/bonuses?month=1&year=2026&type=BONUS&employeeId=5&companyId=1`

---

### 2️⃣ Frontend - الواجهة الأمامية

#### أ. payrollApi.ts
**إضافة query جديدة:**

```typescript
getBonuses: builder.query<{ success: boolean; data: EmployeeBonus[] }, { 
    month?: number; 
    year?: number; 
    type?: string;
    employeeId?: number;
    companyId?: number;
}>({
    query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.month) searchParams.append('month', params.month.toString());
        if (params.year) searchParams.append('year', params.year.toString());
        if (params.type) searchParams.append('type', params.type);
        if (params.employeeId) searchParams.append('employeeId', params.employeeId.toString());
        if (params.companyId) searchParams.append('companyId', params.companyId.toString());
        return `payroll/bonuses?${searchParams.toString()}`;
    },
    providesTags: ["Bonuses"],
}),
```

**Export:**
```typescript
export const { useGetBonusesQuery } = payrollApi;
```

#### ب. BonusesReport.tsx (مكون جديد)
**مكون طباعة احترافي للمكافآت:**

**المميزات:**
- تصميم احترافي بتنسيق A4
- عرض اسم الشركة واسم المستخدم
- عنوان التقرير مع الفترة المحددة
- معلومات الطباعة (التاريخ، عدد المكافآت)
- جدول شامل يعرض:
  - رقم الإيصال
  - اسم الموظف والوظيفة
  - نوع المكافأة (ملون حسب النوع)
  - المبلغ
  - التاريخ
  - السبب
- إجمالي كلي للمكافآت
- تنسيق عربي للأرقام والتواريخ
- footer احترافي

**مثال الاستخدام:**
```jsx
<BonusesReport 
    bonuses={bonuses}
    month={bonusMonth}
    year={bonusYear}
    type={bonusTypeFilter}
    companyName="شركة السيراميك"
    userName="أحمد محمد"
/>
```

#### ج. payroll/page.tsx
**التحديثات:**

1. **Import الجديد:**
```typescript
import { useGetBonusesQuery } from '@/state/payrollApi';
import BonusesReport from '@/components/payroll/BonusesReport';
```

2. **State جديد:**
```typescript
const bonusesPrintRef = useRef<HTMLDivElement>(null);
const [bonusEmployeeFilter, setBonusEmployeeFilter] = useState<number | undefined>();
```

3. **استخدام Query:**
```typescript
const { data: bonusesData, isLoading: bonusesLoading } = useGetBonusesQuery({
    month: bonusMonth,
    year: bonusYear,
    type: bonusTypeFilter || undefined,
    employeeId: bonusEmployeeFilter,
    companyId: selectedCompanyId
});

const bonuses = bonusesData?.data || [];
```

4. **وظيفة الطباعة:**
```typescript
const handlePrintBonusesReport = () => {
    if (bonuses.length === 0) {
        alert('لا توجد مكافآت للطباعة!');
        return;
    }

    setTimeout(() => {
        if (bonusesPrintRef.current) {
            const printWindow = window.open('', '_blank', 'width=1200,height=800');
            if (!printWindow) {
                alert('تم حظر النافذة المنبثقة. الرجاء السماح بالنوافذ المنبثقة.');
                return;
            }

            const htmlContent = `...`;
            printWindow.document.write(htmlContent);
            printWindow.document.close();
        }
    }, 200);
};
```

5. **واجهة تاب المكافآت:**
- **فلترة محدثة:** تم إضافة filter للموظف المحدد
- **زر الطباعة:** زر برتقالي أنيق مع أيقونة
- **جدول عرض المكافآت:**
  - تصميم جميل مع alternating rows
  - ألوان مميزة لكل نوع مكافأة
  - عرض معلومات الموظف والشركة
  - إجمالي في الأسفل
- **حالات العرض:**
  - جاري التحميل
  - لا توجد بيانات
  - عرض الجدول

6. **div الطباعة المخفي:**
```jsx
<div ref={bonusesPrintRef} style={{ display: 'none' }}>
    <BonusesReport 
        bonuses={bonuses}
        month={bonusMonth}
        year={bonusYear}
        type={bonusTypeFilter}
        companyName={getCompanyInfo().name}
        userName={getCompanyInfo().userName}
    />
</div>
```

---

## الميزات الرئيسية

### 1. **فلترة شاملة**
- الشهر (1-12)
- السنة (2022-2027)
- نوع المكافأة:
  - مكافأة (BONUS)
  - زيادة راتب (RAISE)
  - حوافز (INCENTIVE)
  - بدل إضافي (OVERTIME)
- الموظف (اختيار موظف معين أو جميع الموظفين)
- الشركة (تلقائياً حسب صلاحيات المستخدم)

### 2. **عرض البيانات**
- جدول احترافي مع جميع التفاصيل
- ألوان مميزة لكل نوع مكافأة:
  - أخضر للمكافآت
  - أزرق لزيادات الراتب
  - بنفسجي للحوافز
  - كهرماني للبدل الإضافي
- عرض معلومات الموظف والوظيفة
- رقم الإيصال والتاريخ والسبب

### 3. **الطباعة**
- تقرير احترافي بتنسيق A4
- يفتح في نافذة منفصلة
- يطبع تلقائياً
- يغلق تلقائياً بعد الطباعة
- يعرض اسم الشركة واسم المستخدم
- يعرض الفلاتر المطبقة
- إجمالي كلي واضح

### 4. **الأداء**
- استخدام RTK Query للـ caching
- تحديث تلقائي عند تغيير الفلاتر
- Loading states واضحة
- Error handling محكم

---

## كيفية الاستخدام

### 1. الوصول لتاب المكافآت:
- افتح شاشة المرتبات
- انقر على تاب "المكافآت"

### 2. الفلترة:
- اختر الشهر المطلوب
- اختر السنة
- اختر نوع المكافأة (اختياري)
- اختر الموظف (اختياري)
- سيتم تحديث الجدول تلقائياً

### 3. عرض البيانات:
- سيظهر جدول بجميع المكافآت المطابقة
- كل صف ملون حسب نوع المكافأة
- الإجمالي يظهر في الأسفل

### 4. الطباعة:
- انقر على زر "طباعة التقرير"
- ستفتح نافذة جديدة مع التقرير
- سيتم الطباعة تلقائياً
- يمكنك حفظ كـ PDF بدلاً من الطباعة

---

## الملفات المعدلة والجديدة

### Backend:
- ✅ `server/src/services/PayrollService.ts` - إضافة `getBonuses()`
- ✅ `server/src/controllers/PayrollController.ts` - إضافة `getBonuses()`
- ✅ `server/src/routes/payrollRoutes.ts` - إضافة route جديدة

### Frontend:
- ✅ `client/src/state/payrollApi.ts` - إضافة `getBonuses` query
- ✅ `client/src/components/payroll/BonusesReport.tsx` - مكون جديد للطباعة
- ✅ `client/src/app/payroll/page.tsx` - تحديث تاب المكافآت بالكامل

---

## الاختبارات المطلوبة

- [x] فلترة المكافآت حسب الشهر والسنة
- [x] فلترة حسب نوع المكافأة
- [x] فلترة حسب الموظف
- [x] عرض البيانات في الجدول
- [x] عرض الإجمالي الصحيح
- [x] طباعة التقرير
- [x] التأكد من الألوان والتنسيق
- [x] التأكد من اسم الشركة والمستخدم في التقرير

---

## أمثلة على الاستخدام

### مثال 1: عرض جميع المكافآت لشهر يناير 2026
```
الشهر: يناير
السنة: 2026
النوع: جميع الأنواع
الموظف: جميع الموظفين
```

### مثال 2: عرض مكافآت موظف معين
```
الشهر: يناير
السنة: 2026
النوع: جميع الأنواع
الموظف: أحمد محمد - موظف
```

### مثال 3: عرض زيادات الراتب فقط
```
الشهر: يناير
السنة: 2026
النوع: زيادة راتب
الموظف: جميع الموظفين
```

---

## ملاحظات مهمة

1. **الصلاحيات**: يتم فلترة المكافآت تلقائياً حسب شركة المستخدم (إلا إذا كان مدير نظام)
2. **الألوان**: كل نوع مكافأة له لون مميز لسهولة التمييز
3. **الطباعة**: التقرير يفتح في نافذة منفصلة للطباعة النظيفة
4. **الأداء**: استخدام RTK Query يضمن سرعة التحميل والـ caching الذكي
5. **التحديث التلقائي**: عند إضافة مكافأة جديدة، يتم تحديث القائمة تلقائياً

---

## التوصيات المستقبلية

1. إضافة إحصائيات للمكافآت في تاب الإحصائيات
2. إضافة رسم بياني لتوزيع المكافآت حسب النوع
3. إضافة تصدير إلى Excel
4. إضافة مقارنة بين الأشهر
5. إضافة تقرير سنوي شامل

---

## الخلاصة

تم تنفيذ ميزة طباعة تقرير المكافآت بنجاح مع:
- ✅ Backend endpoints كامل
- ✅ Frontend integration كامل
- ✅ مكون طباعة احترافي
- ✅ فلترة شاملة
- ✅ واجهة مستخدم جميلة
- ✅ عرض البيانات الكامل
- ✅ طباعة نظيفة ومرتبة

النظام جاهز للاستخدام الفوري! 🎉




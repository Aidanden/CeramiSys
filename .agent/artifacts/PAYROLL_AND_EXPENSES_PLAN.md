# خطة تنفيذ نظام المرتبات والمصروفات المعدومة

## نظرة عامة
تطوير نظام متكامل لإدارة المرتبات والمصروفات المعدومة مع التكامل الكامل مع نظام الخزينة.

---

## الجزء الأول: تعديلات قاعدة البيانات (Prisma Schema)

### نماذج البيانات الجديدة:

```prisma
// ========== نظام المرتبات ==========

// الموظف
model Employee {
  id            Int               @id @default(autoincrement())
  name          String
  jobTitle      String?           // المسمى الوظيفي
  phone         String?
  email         String?
  baseSalary    Decimal           @db.Decimal(18, 4)  // الراتب الأساسي
  companyId     Int
  isActive      Boolean           @default(true)
  hireDate      DateTime?         // تاريخ التعيين
  notes         String?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  company       Company           @relation(fields: [companyId], references: [id])
  salaryPayments SalaryPayment[]
  bonuses       EmployeeBonus[]
  
  @@index([companyId])
  @@index([isActive])
}

// صرف مرتب
model SalaryPayment {
  id            Int               @id @default(autoincrement())
  employeeId    Int
  amount        Decimal           @db.Decimal(18, 4)  // المبلغ المصروف
  month         Int               // الشهر (1-12)
  year          Int               // السنة
  treasuryId    Int               // الخزينة المستخدمة
  receiptNumber String?           // رقم إيصال الصرف
  paymentDate   DateTime          @default(now())
  notes         String?
  createdBy     String?
  createdAt     DateTime          @default(now())
  employee      Employee          @relation(fields: [employeeId], references: [id])
  
  @@unique([employeeId, month, year])  // لا يمكن صرف نفس الشهر مرتين
  @@index([employeeId])
  @@index([month, year])
  @@index([treasuryId])
}

// المكافآت والزيادات
model EmployeeBonus {
  id            Int               @id @default(autoincrement())
  employeeId    Int
  type          BonusType         // نوع: مكافأة أو زيادة
  amount        Decimal           @db.Decimal(18, 4)
  reason        String?           // سبب المكافأة/الزيادة
  treasuryId    Int
  receiptNumber String?
  paymentDate   DateTime          @default(now())
  effectiveDate DateTime?         // تاريخ السريان (للزيادات)
  notes         String?
  createdBy     String?
  createdAt     DateTime          @default(now())
  employee      Employee          @relation(fields: [employeeId], references: [id])
  
  @@index([employeeId])
  @@index([type])
  @@index([paymentDate])
}

// ========== نظام المصروفات المعدومة ==========

// بند المصروف المعدوم
model BadDebtCategory {
  id            Int               @id @default(autoincrement())
  name          String            // اسم البند
  description   String?
  companyId     Int?
  isActive      Boolean           @default(true)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  expenses      BadDebtExpense[]
  
  @@index([companyId])
  @@index([isActive])
}

// صرف مصروف معدوم
model BadDebtExpense {
  id            Int               @id @default(autoincrement())
  categoryId    Int
  amount        Decimal           @db.Decimal(18, 4)
  description   String?
  treasuryId    Int
  receiptNumber String?
  paymentDate   DateTime          @default(now())
  notes         String?
  createdBy     String?
  createdAt     DateTime          @default(now())
  category      BadDebtCategory   @relation(fields: [categoryId], references: [id])
  
  @@index([categoryId])
  @@index([treasuryId])
  @@index([paymentDate])
}

// ========== التعدادات الجديدة ==========

enum BonusType {
  BONUS       // مكافأة
  RAISE       // زيادة راتب
  INCENTIVE   // حافز
  OVERTIME    // إضافي
}
```

### تعديلات على النماذج الموجودة:

```prisma
// إضافة للـ Company
model Company {
  // ... الحقول الموجودة ...
  employees     Employee[]
}

// إضافة للـ TransactionSource enum
enum TransactionSource {
  // ... القيم الموجودة ...
  SALARY        // صرف مرتب
  BONUS         // مكافأة
  BAD_DEBT      // مصروف معدوم
}
```

---

## الجزء الثاني: الخدمات (Backend Services)

### 1. PayrollService.ts
- إدارة الموظفين (CRUD)
- صرف المرتبات
- صرف المكافآت والزيادات
- إحصائيات المرتبات

### 2. BadDebtService.ts
- إدارة بنود المصروفات المعدومة (CRUD)
- صرف المصروفات المعدومة
- إحصائيات المصروفات

---

## الجزء الثالث: المتحكمات (Controllers)

### 1. PayrollController.ts
### 2. BadDebtController.ts

---

## الجزء الرابع: المسارات (Routes)

### 1. payrollRoutes.ts
### 2. badDebtRoutes.ts

---

## الجزء الخامس: الواجهة الأمامية (Frontend)

### 1. صفحة المرتبات (/payroll)
- تبويب الموظفين
- تبويب صرف المرتبات
- تبويب المكافآت والزيادات
- تبويب الإحصائيات

### 2. صفحة المصروفات المعدومة (/bad-debts)
- تبويب بنود المصروفات
- تبويب صرف المصروفات
- تبويب الإحصائيات

### 3. مكونات الطباعة
- إيصال صرف مرتب
- إيصال صرف مكافأة
- إيصال صرف مصروف معدوم

---

## ترتيب التنفيذ:

1. ✅ إنشاء خطة التنفيذ
2. ⏳ تحديث Schema الـ Prisma
3. ⏳ إنشاء PayrollService
4. ⏳ إنشاء BadDebtService
5. ⏳ إنشاء Controllers
6. ⏳ إنشاء Routes
7. ⏳ إنشاء Frontend APIs
8. ⏳ إنشاء صفحات الواجهة
9. ⏳ اختبار النظام

---

## ملاحظات التكامل مع الخزينة:

عند كل عملية صرف:
1. التحقق من كفاية رصيد الخزينة
2. خصم المبلغ من الخزينة
3. إنشاء حركة في TreasuryTransaction
4. توليد رقم إيصال فريد
5. تسجيل العملية


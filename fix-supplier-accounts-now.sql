-- ========================================
-- 🔧 إصلاح فوري لحسابات الموردين
-- ========================================

-- الخطوة 1: تحديث عملة القيود في حسابات الموردين
-- يتم ربطها بعملة فاتورة المشتريات الأصلية
UPDATE "SupplierAccount" sa
SET currency = p.currency
FROM "Purchase" p
WHERE sa."referenceType" = 'PURCHASE'
  AND sa."referenceId" = p.id
  AND p.currency IS NOT NULL;

-- الخطوة 2: تحديث عملة إيصالات الدفع للفواتير الرئيسية
UPDATE "SupplierPaymentReceipt" spr
SET currency = p.currency
FROM "Purchase" p
WHERE spr."purchaseId" = p.id
  AND spr.type = 'MAIN_PURCHASE'
  AND p.currency IS NOT NULL;

-- الخطوة 3: إعادة حساب الأرصدة لكل عملة على حدة
-- (هذا يتطلب حذف وإعادة بناء الأرصدة)
-- ملاحظة: هذا الجزء اختياري - الكود الجديد سيحسب الأرصدة بشكل صحيح

-- التحقق من النتائج:
SELECT 
  s.name as "المورد",
  sa."referenceType" as "النوع",
  sa.amount as "المبلغ",
  sa.currency as "العملة",
  sa."transactionType" as "نوع الحركة",
  sa."transactionDate" as "التاريخ"
FROM "SupplierAccount" sa
INNER JOIN "Supplier" s ON s.id = sa."supplierId"
ORDER BY sa."transactionDate" DESC
LIMIT 20;

-- عرض الأرصدة حسب العملة:
SELECT 
  s.name as "المورد",
  sa.currency as "العملة",
  SUM(CASE WHEN sa."transactionType" = 'CREDIT' THEN sa.amount ELSE 0 END) as "إجمالي الديون",
  SUM(CASE WHEN sa."transactionType" = 'DEBIT' THEN sa.amount ELSE 0 END) as "إجمالي المدفوع",
  SUM(CASE WHEN sa."transactionType" = 'CREDIT' THEN sa.amount ELSE -sa.amount END) as "الرصيد"
FROM "Supplier" s
INNER JOIN "SupplierAccount" sa ON sa."supplierId" = s.id
GROUP BY s.name, sa.currency
ORDER BY s.name, sa.currency;


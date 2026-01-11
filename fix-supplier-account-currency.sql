-- 🔧 إصلاح العملات في حسابات الموردين
-- يجب تشغيل هذا السكريبت لتحديث البيانات القديمة

-- 1. تحديث عملة القيود في حسابات الموردين بناءً على عملة فاتورة المشتريات
UPDATE "SupplierAccount" sa
SET currency = p.currency
FROM "Purchase" p
WHERE sa."referenceType" = 'PURCHASE'
  AND sa."referenceId" = p.id
  AND p.currency IS NOT NULL
  AND sa.currency = 'LYD'
  AND p.currency != 'LYD';

-- 2. تحديث عملة القيود المرتبطة بمصروفات المشتريات
UPDATE "SupplierAccount" sa
SET currency = pe.currency
FROM "PurchaseExpense" pe
INNER JOIN "SupplierPaymentReceipt" spr ON spr."purchaseId" = pe."purchaseId" AND spr.type = 'EXPENSE'
WHERE sa."referenceType" = 'PURCHASE'
  AND sa."referenceId" = spr.id
  AND pe.currency IS NOT NULL
  AND sa.currency = 'LYD'
  AND pe.currency != 'LYD';

-- 3. التحقق من النتائج
SELECT 
  sa.id,
  sa."supplierId",
  s.name as supplier_name,
  sa."referenceType",
  sa."referenceId",
  sa.amount,
  sa.currency,
  sa."transactionDate"
FROM "SupplierAccount" sa
INNER JOIN "Supplier" s ON s.id = sa."supplierId"
WHERE sa.currency != 'LYD'
ORDER BY sa."transactionDate" DESC
LIMIT 20;

-- 4. عرض الأرصدة حسب العملة لكل مورد
SELECT 
  s.id,
  s.name,
  sa.currency,
  SUM(CASE WHEN sa."transactionType" = 'CREDIT' THEN sa.amount ELSE 0 END) as total_credit,
  SUM(CASE WHEN sa."transactionType" = 'DEBIT' THEN sa.amount ELSE 0 END) as total_debit,
  SUM(CASE WHEN sa."transactionType" = 'CREDIT' THEN sa.amount ELSE -sa.amount END) as balance
FROM "Supplier" s
INNER JOIN "SupplierAccount" sa ON sa."supplierId" = s.id
GROUP BY s.id, s.name, sa.currency
ORDER BY s.name, sa.currency;


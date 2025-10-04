-- تحديث الفواتير الموجودة بعد إضافة حقول المبيعات الآجلة
-- يجب تشغيل هذا SQL بعد تطبيق Migration

-- 1. تحديث الفواتير النقدية الموجودة
-- البيع النقدي = مدفوع بالكامل
UPDATE "Sale"
SET 
  "paidAmount" = "total",
  "remainingAmount" = 0,
  "isFullyPaid" = true
WHERE "saleType" = 'CASH'
  AND "paidAmount" IS NULL;

-- 2. تحديث الفواتير الآجلة الموجودة
-- البيع الآجل = غير مدفوع (افتراضياً)
UPDATE "Sale"
SET 
  "paidAmount" = 0,
  "remainingAmount" = "total",
  "isFullyPaid" = false,
  "paymentMethod" = NULL
WHERE "saleType" = 'CREDIT'
  AND "paidAmount" IS NULL;

-- 3. التحقق من النتائج
SELECT 
  "saleType",
  COUNT(*) as "count",
  SUM("total") as "totalAmount",
  SUM("paidAmount") as "totalPaid",
  SUM("remainingAmount") as "totalRemaining"
FROM "Sale"
GROUP BY "saleType";

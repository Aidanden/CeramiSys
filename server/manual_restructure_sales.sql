-- Manual migration to restructure Sales table as provisional sales
-- تحويل جدول المبيعات ليصبح كالفواتير المبدئية

-- 1. إنشاء enum SaleStatus
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'APPROVED', 'CANCELLED');

-- 2. إضافة الحقول الجديدة مع قيم افتراضية
ALTER TABLE "Sale" 
ADD COLUMN "status" "SaleStatus" DEFAULT 'DRAFT',
ADD COLUMN "notes" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedBy" TEXT;

-- 3. تحديث الحقول الموجودة
-- تحويل saleType و paymentMethod إلى nullable
ALTER TABLE "Sale" 
ALTER COLUMN "saleType" DROP NOT NULL,
ALTER COLUMN "saleType" DROP DEFAULT;

-- 4. تحديث البيانات الموجودة
-- تحديد الفواتير التي تم إصدار إيصالات لها كـ APPROVED
UPDATE "Sale" 
SET 
  "status" = 'APPROVED',
  "approvedAt" = "receiptIssuedAt",
  "approvedBy" = "receiptIssuedBy",
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "receiptIssued" = true;

-- تحديث باقي الفواتير كـ DRAFT
UPDATE "Sale" 
SET 
  "status" = 'DRAFT',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "receiptIssued" = false OR "receiptIssued" IS NULL;

-- 5. حذف الحقول القديمة
ALTER TABLE "Sale" 
DROP COLUMN "receiptIssued",
DROP COLUMN "receiptIssuedAt", 
DROP COLUMN "receiptIssuedBy";

-- 6. إضافة constraint لـ updatedAt
ALTER TABLE "Sale" 
ALTER COLUMN "updatedAt" SET NOT NULL;

-- 7. تحديث الفهارس
DROP INDEX IF EXISTS "Sale_receiptIssued_idx";
DROP INDEX IF EXISTS "Sale_saleType_idx";
CREATE INDEX "Sale_status_idx" ON "Sale"("status");
CREATE INDEX "Sale_saleType_idx" ON "Sale"("saleType");

-- 8. إضافة تعليقات
COMMENT ON COLUMN "Sale"."status" IS 'حالة الفاتورة: مسودة، معتمدة، ملغية';
COMMENT ON COLUMN "Sale"."notes" IS 'ملاحظات';
COMMENT ON COLUMN "Sale"."approvedAt" IS 'تاريخ اعتماد الفاتورة من المحاسب';
COMMENT ON COLUMN "Sale"."approvedBy" IS 'المحاسب الذي اعتمد الفاتورة';
COMMENT ON COLUMN "Sale"."saleType" IS 'نقدي أو آجل (يحدده المحاسب)';
COMMENT ON COLUMN "Sale"."paymentMethod" IS 'طريقة الدفع (يحددها المحاسب)';

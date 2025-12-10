-- ============================================
-- Database Performance Indexes
-- تحسين أداء قاعدة البيانات بإضافة Indexes
-- ============================================

-- ============================================
-- Products Table Indexes
-- ============================================

-- Index على SKU للبحث السريع
CREATE INDEX IF NOT EXISTS idx_products_sku ON "Product"(sku);

-- Index على Name للبحث بالاسم
CREATE INDEX IF NOT EXISTS idx_products_name ON "Product"(name);

-- Index على Company للفلترة بالشركة
CREATE INDEX IF NOT EXISTS idx_products_company ON "Product"("createdByCompanyId");

-- Index على Unit للفلترة بالوحدة
CREATE INDEX IF NOT EXISTS idx_products_unit ON "Product"(unit);

-- Composite Index للبحث المتقدم
CREATE INDEX IF NOT EXISTS idx_products_company_unit ON "Product"("createdByCompanyId", unit);

-- ============================================
-- Sales Table Indexes
-- ============================================

-- Index على Company للفلترة بالشركة
CREATE INDEX IF NOT EXISTS idx_sales_company ON "Sale"("companyId");

-- Index على Customer للفلترة بالعميل
CREATE INDEX IF NOT EXISTS idx_sales_customer ON "Sale"("customerId");

-- Index على Date للفلترة بالتاريخ
CREATE INDEX IF NOT EXISTS idx_sales_date ON "Sale"("createdAt");

-- Index على Invoice Number للبحث برقم الفاتورة
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON "Sale"("invoiceNumber");

-- Index على Sale Type للفلترة بنوع البيع
CREATE INDEX IF NOT EXISTS idx_sales_type ON "Sale"("saleType");

-- Index على Receipt Issued للفلترة بحالة الإيصال
CREATE INDEX IF NOT EXISTS idx_sales_receipt ON "Sale"("receiptIssued");

-- Composite Index للاستعلامات المعقدة
CREATE INDEX IF NOT EXISTS idx_sales_company_date ON "Sale"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_sales_company_type ON "Sale"("companyId", "saleType");

-- ============================================
-- Stock Table Indexes
-- ============================================

-- Composite Index على Company و Product
CREATE INDEX IF NOT EXISTS idx_stock_company_product ON "Stock"("companyId", "productId");

-- Index على Boxes للفلترة بالمخزون
CREATE INDEX IF NOT EXISTS idx_stock_boxes ON "Stock"(boxes);

-- ============================================
-- Customers Table Indexes
-- ============================================

-- Index على Name للبحث بالاسم
CREATE INDEX IF NOT EXISTS idx_customers_name ON "Customer"(name);

-- Index على Phone للبحث بالهاتف
CREATE INDEX IF NOT EXISTS idx_customers_phone ON "Customer"(phone);

-- ============================================
-- Purchases Table Indexes
-- ============================================

-- Index على Company للفلترة بالشركة
CREATE INDEX IF NOT EXISTS idx_purchases_company ON "Purchase"("companyId");

-- Index على Supplier للفلترة بالمورد
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON "Purchase"("supplierId");

-- Index على Date للفلترة بالتاريخ
CREATE INDEX IF NOT EXISTS idx_purchases_date ON "Purchase"("createdAt");

-- Index على Invoice Number للبحث برقم الفاتورة
CREATE INDEX IF NOT EXISTS idx_purchases_invoice ON "Purchase"("invoiceNumber");

-- Composite Index
CREATE INDEX IF NOT EXISTS idx_purchases_company_date ON "Purchase"("companyId", "createdAt");

-- ============================================
-- Users Table Indexes
-- ============================================

-- Index على Username للبحث
CREATE INDEX IF NOT EXISTS idx_users_username ON "Users"(username);

-- Index على Email للبحث
CREATE INDEX IF NOT EXISTS idx_users_email ON "Users"(email);

-- Index على Company للفلترة
CREATE INDEX IF NOT EXISTS idx_users_company ON "Users"("companyId");

-- Index على isSystemUser للفلترة
CREATE INDEX IF NOT EXISTS idx_users_system ON "Users"("isSystemUser");

-- ============================================
-- Dispatch Orders Table Indexes
-- ============================================

-- Index على Sale للربط بالفاتورة
CREATE INDEX IF NOT EXISTS idx_dispatch_sale ON "DispatchOrder"("saleId");

-- Index على Company للفلترة
CREATE INDEX IF NOT EXISTS idx_dispatch_company ON "DispatchOrder"("companyId");

-- Index على Status للفلترة بالحالة
CREATE INDEX IF NOT EXISTS idx_dispatch_status ON "DispatchOrder"(status);

-- Index على Date للفلترة بالتاريخ
CREATE INDEX IF NOT EXISTS idx_dispatch_date ON "DispatchOrder"("createdAt");

-- Composite Index
CREATE INDEX IF NOT EXISTS idx_dispatch_company_status ON "DispatchOrder"("companyId", status);

-- ============================================
-- Sale Payments Table Indexes
-- ============================================

-- Index على Sale للربط بالفاتورة
CREATE INDEX IF NOT EXISTS idx_payments_sale ON "SalePayment"("saleId");

-- Index على Company للفلترة
CREATE INDEX IF NOT EXISTS idx_payments_company ON "SalePayment"("companyId");

-- Index على Date للفلترة بالتاريخ
CREATE INDEX IF NOT EXISTS idx_payments_date ON "SalePayment"("paymentDate");

-- ============================================
-- Provisional Sales Table Indexes
-- ============================================

-- Index على Company للفلترة
CREATE INDEX IF NOT EXISTS idx_provisional_company ON "ProvisionalSale"("companyId");

-- Index على Customer للفلترة
CREATE INDEX IF NOT EXISTS idx_provisional_customer ON "ProvisionalSale"("customerId");

-- Index على Date للفلترة بالتاريخ
CREATE INDEX IF NOT EXISTS idx_provisional_date ON "ProvisionalSale"("createdAt");

-- Index على Invoice Number
CREATE INDEX IF NOT EXISTS idx_provisional_invoice ON "ProvisionalSale"("invoiceNumber");

-- ============================================
-- Notifications Table Indexes
-- ============================================

-- Index على User للفلترة بالمستخدم
CREATE INDEX IF NOT EXISTS idx_notifications_user ON "Notification"("userId");

-- Index على isRead للفلترة بالحالة
CREATE INDEX IF NOT EXISTS idx_notifications_read ON "Notification"("isRead");

-- Index على Date للترتيب
CREATE INDEX IF NOT EXISTS idx_notifications_date ON "Notification"("createdAt");

-- Composite Index
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON "Notification"("userId", "isRead");

-- ============================================
-- ملاحظات مهمة
-- ============================================

-- 1. تشغيل هذا الملف:
--    psql -U your_username -d your_database -f DATABASE_INDEXES.sql

-- 2. التحقق من الـ Indexes:
--    SELECT * FROM pg_indexes WHERE tablename = 'Product';

-- 3. حذف Index (إذا لزم الأمر):
--    DROP INDEX IF EXISTS idx_products_sku;

-- 4. الفوائد المتوقعة:
--    - تسريع الاستعلامات بنسبة 10-100x
--    - تحسين البحث والفلترة
--    - تقليل الحمل على قاعدة البيانات

-- 5. التأثير على الأداء:
--    - SELECT: أسرع بكثير ✅
--    - INSERT: أبطأ قليلاً (مقبول)
--    - UPDATE: أبطأ قليلاً (مقبول)
--    - DELETE: أبطأ قليلاً (مقبول)

-- 6. الصيانة:
--    - الـ Indexes تُحدّث تلقائياً
--    - لا حاجة لصيانة يدوية
--    - PostgreSQL يدير الـ Indexes بكفاءة

-- ============================================
-- End of File
-- ============================================

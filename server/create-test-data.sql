-- إنشاء بيانات اختبار لحسابات الموردين

-- إدراج مورد للاختبار
INSERT OR IGNORE INTO Supplier (id, name, phone, email, address, note, createdAt, updatedAt) 
VALUES (999, 'مورد الاختبار', '123456789', 'test@supplier.com', 'عنوان الاختبار', 'مورد للاختبار', datetime('now'), datetime('now'));

-- إدراج شركة للاختبار
INSERT OR IGNORE INTO Company (id, name, address, phone, email, createdAt, updatedAt) 
VALUES (999, 'شركة الاختبار', 'عنوان الشركة', '987654321', 'test@company.com', datetime('now'), datetime('now'));

-- إدراج منتج للاختبار
INSERT OR IGNORE INTO Product (id, name, description, unit, createdAt, updatedAt) 
VALUES (999, 'منتج الاختبار', 'وصف المنتج', 'قطعة', datetime('now'), datetime('now'));

-- إدراج فئة مصروف للاختبار
INSERT OR IGNORE INTO PurchaseExpenseCategory (id, name, description, createdAt, updatedAt) 
VALUES (999, 'مصروف الاختبار', 'فئة مصروف للاختبار', datetime('now'), datetime('now'));

-- إدراج مشترى للاختبار
INSERT OR IGNORE INTO Purchase (id, companyId, supplierId, purchaseType, invoiceNumber, total, paidAmount, remainingAmount, status, isApproved, approvedAt, notes, createdAt, updatedAt) 
VALUES (999, 999, 999, 'CREDIT', 'TEST-999', 1000.0, 0.0, 1000.0, 'APPROVED', 1, datetime('now'), 'مشترى اختبار', datetime('now'), datetime('now'));

-- إدراج عنصر مشترى
INSERT OR IGNORE INTO PurchaseItem (id, purchaseId, productId, quantity, unitPrice, totalPrice, createdAt, updatedAt) 
VALUES (999, 999, 999, 10, 100.0, 1000.0, datetime('now'), datetime('now'));

-- إدراج مصروف
INSERT OR IGNORE INTO PurchaseExpense (id, purchaseId, categoryId, supplierId, amount, notes, createdAt, updatedAt) 
VALUES (999, 999, 999, 999, 200.0, 'مصروف اختبار', datetime('now'), datetime('now'));

-- إدراج إيصال دفع للفاتورة الرئيسية
INSERT OR IGNORE INTO SupplierPaymentReceipt (id, supplierId, purchaseId, amount, type, description, status, createdAt, updatedAt) 
VALUES (999, 999, 999, 1000.0, 'MAIN_PURCHASE', 'فاتورة مشتريات #999', 'PENDING', datetime('now'), datetime('now'));

-- إدراج إيصال دفع للمصروف
INSERT OR IGNORE INTO SupplierPaymentReceipt (id, supplierId, purchaseId, amount, type, description, categoryName, status, createdAt, updatedAt) 
VALUES (998, 999, 999, 200.0, 'EXPENSE', 'مصروف اختبار - فاتورة #999', 'مصروف الاختبار', 'PENDING', datetime('now'), datetime('now'));

-- إدراج قيود حساب المورد
INSERT OR IGNORE INTO SupplierAccount (id, supplierId, transactionType, amount, balance, referenceType, referenceId, description, transactionDate, createdAt, updatedAt) 
VALUES (999, 999, 'CREDIT', 1000.0, 1000.0, 'PURCHASE', 999, 'فاتورة مشتريات #999', datetime('now'), datetime('now'), datetime('now'));

INSERT OR IGNORE INTO SupplierAccount (id, supplierId, transactionType, amount, balance, referenceType, referenceId, description, transactionDate, createdAt, updatedAt) 
VALUES (998, 999, 'CREDIT', 200.0, 1200.0, 'PURCHASE', 998, 'مصروف اختبار - فاتورة #999', datetime('now'), datetime('now'), datetime('now'));

-- عرض النتائج
SELECT 'الموردين:' as table_name, COUNT(*) as count FROM Supplier WHERE id = 999
UNION ALL
SELECT 'المشتريات:', COUNT(*) FROM Purchase WHERE id = 999
UNION ALL
SELECT 'إيصالات الدفع:', COUNT(*) FROM SupplierPaymentReceipt WHERE supplierId = 999
UNION ALL
SELECT 'قيود الحساب:', COUNT(*) FROM SupplierAccount WHERE supplierId = 999;

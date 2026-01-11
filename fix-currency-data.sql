-- Script لإصلاح بيانات العملة للفاتورة #12
-- تشغيل هذا Script في قاعدة البيانات

-- 1. أولاً، دعنا نرى تفاصيل الفاتورة
SELECT 
    id, 
    invoiceNumber, 
    total, 
    currency, 
    exchangeRate, 
    totalForeign,
    supplierId
FROM Purchase 
WHERE id = 12;

-- 2. تحديث القيد المحاسبي في SupplierAccount
-- افترض أن الفاتورة بـ 76868 EUR وسعر الصرف 13.00
UPDATE SupplierAccount
SET 
    currency = 'EUR',
    exchangeRate = 13.00,
    amountForeign = 76868.00,
    amount = 999284.00  -- 76868 * 13
WHERE 
    referenceType = 'PURCHASE'
    AND referenceId = 12;

-- 3. تحقق من التحديث
SELECT 
    id,
    supplierId,
    transactionType,
    amount,
    amountForeign,
    currency,
    exchangeRate,
    referenceType,
    referenceId,
    description
FROM SupplierAccount
WHERE referenceId = 12 AND referenceType = 'PURCHASE';

-- 4. تحديث جميع إيصالات الدفع المرتبطة بهذه الفاتورة (إذا وجدت)
UPDATE SupplierPaymentReceipt
SET 
    currency = 'EUR',
    exchangeRate = 13.00,
    amountForeign = amount / 13.00  -- حساب المبلغ بالعملة الأجنبية
WHERE 
    purchaseId = 12
    AND type IN ('EXPENSE', 'MAIN_PURCHASE');

-- 5. تحقق من إيصالات الدفع
SELECT 
    id,
    supplierId,
    purchaseId,
    amount,
    amountForeign,
    currency,
    exchangeRate,
    type,
    status
FROM SupplierPaymentReceipt
WHERE purchaseId = 12;



-- إصلاح مشكلة auto-increment sequence للجدول Company
-- هذا الملف يحل مشكلة "Unique constraint failed on the fields: (id)"

-- 1. التحقق من أعلى ID موجود في الجدول
SELECT MAX(id) FROM "Company";

-- 2. إعادة تعيين sequence ليبدأ من الرقم التالي
-- استبدل X بالرقم الذي ظهر من الاستعلام السابق + 1
-- مثال: إذا كان أعلى ID هو 3، استخدم 4
SELECT setval('"Company_id_seq"', (SELECT MAX(id) FROM "Company") + 1, false);

-- 3. التحقق من أن الـ sequence تم إعادة تعيينه بشكل صحيح
SELECT currval('"Company_id_seq"');

-- 4. اختبار إنشاء شركة جديدة (اختياري)
-- INSERT INTO "Company" (name, code, "isParent") VALUES ('شركة اختبار', 'TEST001', true);

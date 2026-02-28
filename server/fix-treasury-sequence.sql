-- إصلاح auto-increment sequence للخزائن
-- قم بتشغيل هذا الأمر في قاعدة البيانات

-- للحصول على أعلى ID موجود
SELECT MAX(id) FROM Treasury;

-- إعادة تعيين الـ sequence (استبدل 100 بالرقم الذي حصلت عليه من الأمر السابق + 1)
-- مثال: إذا كان MAX(id) = 5، استخدم 6
ALTER SEQUENCE "Treasury_id_seq" RESTART WITH 6;

-- أو استخدم هذا الأمر لإعادة التعيين تلقائياً
SELECT setval('"Treasury_id_seq"', (SELECT MAX(id) FROM "Treasury") + 1, false);

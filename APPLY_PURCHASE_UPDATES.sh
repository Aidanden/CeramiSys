#!/bin/bash

# Script to apply database changes for Purchase table
# تطبيق تغييرات قاعدة البيانات لجدول المشتريات

echo "🔧 تطبيق تغييرات قاعدة البيانات..."
echo ""

cd server

echo "📋 الخطوة 1: تطبيق Schema Updates..."
npx prisma db push

echo ""
echo "📦 الخطوة 2: توليد Prisma Client..."
npx prisma generate

echo ""
echo "✅ تم تطبيق التغييرات بنجاح!"
echo ""
echo "📝 ملخص التغييرات:"
echo "  - ✅ إضافة حقل status لجدول Purchase"
echo "  - ✅ إضافة حقل affectsInventory لجدول Purchase"
echo "  - ✅ إنشاء enum PurchaseStatus"
echo ""
echo "🚀 يمكنك الآن تشغيل الخادم!"



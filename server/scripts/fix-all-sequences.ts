/**
 * Script لإصلاح جميع الـ sequences في قاعدة البيانات
 * يجب تشغيله مرة واحدة لإصلاح المشكلة
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllSequences() {
  try {
    console.log('🔧 بدء إصلاح جميع الـ sequences...\n');

    // قائمة الجداول التي تحتاج إصلاح
    const tables = [
      { name: 'Customer', model: 'customer' },
      { name: 'Company', model: 'company' },
      { name: 'Product', model: 'product' },
      { name: 'Users', model: 'users' },
      { name: 'Sale', model: 'sale' },
      { name: 'Stock', model: 'stock' },
    ];

    for (const table of tables) {
      try {
        console.log(`📋 معالجة جدول: ${table.name}`);

        // الحصول على أعلى ID موجود
        const result: any = await (prisma as any)[table.model].findFirst({
          orderBy: { id: 'desc' }
        });

        const maxId = result?.id || 0;
        console.log(`   📊 أعلى ID: ${maxId}`);

        if (maxId > 0) {
          // إصلاح الـ sequence
          await prisma.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${table.name}"', 'id'), ${maxId}, true);`
          );
          console.log(`   ✅ تم إصلاح sequence ${table.name}`);
        } else {
          console.log(`   ⚠️  الجدول فارغ، تخطي...`);
        }

        console.log('');
      } catch (error: any) {
        console.error(`   ❌ خطأ في ${table.name}:`, error.message);
      }
    }

    console.log('✨ تم الانتهاء من إصلاح جميع الـ sequences!');

  } catch (error) {
    console.error('❌ خطأ عام:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل الـ script
fixAllSequences()
  .then(() => {
    console.log('\n🎉 تم الانتهاء بنجاح!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 فشل التنفيذ:', error);
    process.exit(1);
  });

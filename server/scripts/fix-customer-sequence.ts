/**
 * Script لإصلاح الـ sequence الخاص بجدول Customer
 * يجب تشغيله مرة واحدة لإصلاح المشكلة
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCustomerSequence() {
  try {
    console.log('🔧 بدء إصلاح sequence جدول Customer...');

    // الحصول على أعلى ID موجود
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { id: 'desc' }
    });

    const maxId = lastCustomer?.id || 0;
    console.log(`📊 أعلى ID موجود: ${maxId}`);

    // إصلاح الـ sequence
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Customer"', 'id'), ${maxId}, true);`
    );

    console.log('✅ تم إصلاح الـ sequence بنجاح!');
    console.log(`🎯 الـ sequence الآن عند: ${maxId}`);
    console.log('📝 العميل التالي سيحصل على ID: ' + (maxId + 1));

  } catch (error) {
    console.error('❌ خطأ في إصلاح الـ sequence:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل الـ script
fixCustomerSequence()
  .then(() => {
    console.log('\n✨ تم الانتهاء بنجاح!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 فشل التنفيذ:', error);
    process.exit(1);
  });

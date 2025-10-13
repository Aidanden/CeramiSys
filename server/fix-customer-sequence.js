/**
 * سكريبت لإصلاح مشكلة autoincrement في جدول Customer
 * يقوم بإعادة تعيين sequence الخاص بالـ ID
 */

const { PrismaClient } = require('@prisma/client');
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

    // إعادة تعيين sequence في SQLite
    // في SQLite، نحتاج لتحديث جدول sqlite_sequence
    await prisma.$executeRawUnsafe(`
      DELETE FROM sqlite_sequence WHERE name = 'Customer';
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO sqlite_sequence (name, seq) VALUES ('Customer', ${maxId});
    `);

    console.log(`✅ تم إعادة تعيين sequence إلى ${maxId}`);
    console.log('✅ تم إصلاح المشكلة بنجاح!');

    // اختبار إنشاء عميل جديد
    console.log('\n🧪 اختبار إنشاء عميل جديد...');
    const testCustomer = await prisma.customer.create({
      data: {
        name: 'عميل تجريبي',
        phone: '0912345678',
        note: 'تم إنشاؤه للاختبار'
      }
    });

    console.log(`✅ تم إنشاء عميل تجريبي بنجاح! ID: ${testCustomer.id}`);

    // حذف العميل التجريبي
    await prisma.customer.delete({
      where: { id: testCustomer.id }
    });
    console.log('🗑️  تم حذف العميل التجريبي');

  } catch (error) {
    console.error('❌ خطأ في إصلاح sequence:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
fixCustomerSequence()
  .then(() => {
    console.log('\n✨ اكتمل السكريبت بنجاح!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل السكريبت:', error);
    process.exit(1);
  });

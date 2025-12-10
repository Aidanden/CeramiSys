/**
 * إصلاح مشكلة auto-increment sequence لجدول Company
 * يحل مشكلة "Unique constraint failed on the fields: (id)"
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCompanySequence() {
  try {
    console.log('🔧 Fixing Company sequence...');
    
    // الحصول على أعلى ID في جدول Company
    const maxCompany = await prisma.company.findFirst({
      orderBy: {
        id: 'desc'
      }
    });

    if (maxCompany) {
      const nextId = maxCompany.id + 1;
      
      console.log(`📊 Current max ID: ${maxCompany.id}`);
      console.log(`🔄 Setting sequence to: ${nextId}`);
      
      // إعادة تعيين sequence إلى القيمة الصحيحة
      await prisma.$executeRaw`ALTER SEQUENCE "Company_id_seq" RESTART WITH ${nextId}`;
      
      console.log(`✅ Company sequence successfully reset to ${nextId}`);
      
      // التحقق من الإعداد الجديد
      const result = await prisma.$queryRaw`SELECT last_value FROM "Company_id_seq"`;
      console.log(`🔍 Verification - Current sequence value:`, result);
      
    } else {
      console.log('❌ No companies found in database');
      // إذا لم توجد شركات، ابدأ من 1
      await prisma.$executeRaw`ALTER SEQUENCE "Company_id_seq" RESTART WITH 1`;
      console.log('✅ Company sequence reset to 1 (no existing companies)');
    }
  } catch (error) {
    console.error('❌ Error fixing company sequence:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل الإصلاح
if (require.main === module) {
  fixCompanySequence()
    .then(() => {
      console.log('✅ انتهى الإصلاح بنجاح');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ فشل الإصلاح:', error);
      process.exit(1);
    });
}

module.exports = { fixCompanySequence };

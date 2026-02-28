const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTreasurySequence() {
    try {
        console.log('🔍 جاري فحص جدول Treasury...');
        
        // الحصول على أعلى ID
        const result = await prisma.$queryRaw`SELECT MAX(id) as max_id FROM "Treasury"`;
        console.log('نتيجة الاستعلام:', result);
        
        const maxId = result[0]?.max_id || 0;
        console.log('📊 أعلى ID موجود:', maxId);
        
        // الحصول على قيمة الـ sequence الحالية
        const seqResult = await prisma.$queryRaw`SELECT last_value FROM "Treasury_id_seq"`;
        console.log('📈 قيمة الـ sequence الحالية:', seqResult[0]?.last_value);
        
        // إعادة تعيين الـ sequence
        const newSeqValue = Number(maxId) + 1;
        console.log(`🔧 إعادة تعيين الـ sequence إلى: ${newSeqValue}`);
        
        await prisma.$executeRaw`SELECT setval('"Treasury_id_seq"', ${newSeqValue}, false)`;
        
        // التحقق من النتيجة
        const verifyResult = await prisma.$queryRaw`SELECT last_value FROM "Treasury_id_seq"`;
        console.log('✅ قيمة الـ sequence بعد الإصلاح:', verifyResult[0]?.last_value);
        
        console.log('✅ تم إصلاح sequence بنجاح!');
        console.log(`الـ ID التالي سيكون: ${newSeqValue}`);
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        console.error('تفاصيل الخطأ:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixTreasurySequence();

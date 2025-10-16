/**
 * Script لإعادة تعيين حالة إيصالات القبض
 * يستخدم لإنشاء بيانات اختبار
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetReceiptStatus() {
  try {
    console.log('🔄 بدء إعادة تعيين حالة إيصالات القبض...');

    // الحصول على جميع الفواتير النقدية التي تم إصدار إيصالات لها
    const issuedSales = await prisma.sale.findMany({
      where: {
        saleType: 'CASH',
        receiptIssued: true,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)) // اليوم فقط
        }
      },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 تم العثور على ${issuedSales.length} فاتورة نقدية مصدرة اليوم`);

    if (issuedSales.length === 0) {
      console.log('⚠️  لا توجد فواتير لإعادة تعيينها');
      return;
    }

    // إعادة تعيين نصف الفواتير إلى "معلقة"
    const salesToReset = issuedSales.slice(0, Math.ceil(issuedSales.length / 2));
    
    console.log(`\n🔄 سيتم إعادة تعيين ${salesToReset.length} فاتورة إلى "معلقة"...`);
    console.log('📋 الفواتير:');
    salesToReset.forEach((sale, index) => {
      console.log(`${index + 1}. فاتورة #${sale.invoiceNumber || sale.id} - ${sale.total} د.ل`);
    });

    const result = await prisma.sale.updateMany({
      where: {
        id: {
          in: salesToReset.map(s => s.id)
        }
      },
      data: {
        receiptIssued: false,
        receiptIssuedAt: null,
        receiptIssuedBy: null
      }
    });

    console.log(`\n✅ تم إعادة تعيين ${result.count} فاتورة بنجاح!`);
    console.log(`📊 الآن لديك:`);
    console.log(`   - ${result.count} فاتورة معلقة (بدون إيصال)`);
    console.log(`   - ${issuedSales.length - result.count} فاتورة مصدرة (بإيصال)`);
    console.log(`\n💡 يمكنك الآن اختبار صفحة المحاسب`);

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
resetReceiptStatus();

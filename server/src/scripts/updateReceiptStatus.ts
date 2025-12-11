/**
 * Script لتحديث حالة إيصالات القبض للفواتير النقدية
 * يستخدم للاختبار فقط
 */

import prisma from '../models/prismaClient';

async function updateReceiptStatus() {
  try {
    console.log('🔄 بدء تحديث حالة إيصالات القبض...');

    // الحصول على جميع الفواتير النقدية
    const cashSales = await prisma.sale.findMany({
      where: {
        saleType: 'CASH',
        receiptIssued: false
      },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        createdAt: true
      }
    });

    console.log(`📊 تم العثور على ${cashSales.length} فاتورة نقدية بدون إيصال قبض`);

    if (cashSales.length === 0) {
      console.log('✅ جميع الفواتير النقدية لديها إيصالات قبض');
      return;
    }

    // عرض الفواتير
    console.log('\n📋 الفواتير:');
    cashSales.forEach((sale, index) => {
      console.log(`${index + 1}. فاتورة #${sale.invoiceNumber || sale.id} - ${sale.total} د.ل - ${new Date(sale.createdAt).toLocaleDateString('ar-LY')}`);
    });

    // تحديث نصف الفواتير فقط للاختبار (أول 9 فواتير)
    const salesToUpdate = cashSales.slice(0, Math.ceil(cashSales.length / 2));

    console.log(`\n🔄 سيتم تحديث ${salesToUpdate.length} فاتورة إلى "تم إصدار إيصال قبض"...`);

    const result = await prisma.sale.updateMany({
      where: {
        id: {
          in: salesToUpdate.map(s => s.id)
        }
      },
      data: {
        receiptIssued: true,
        receiptIssuedAt: new Date(),
        receiptIssuedBy: 'Admin (Script)'
      }
    });

    console.log(`\n✅ تم تحديث ${result.count} فاتورة بنجاح!`);
    console.log(`📊 الآن لديك:`);
    console.log(`   - ${result.count} فاتورة مصدرة`);
    console.log(`   - ${cashSales.length - result.count} فاتورة معلقة`);

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
updateReceiptStatus();

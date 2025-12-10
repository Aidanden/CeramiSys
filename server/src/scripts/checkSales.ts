/**
 * Script للتحقق من الفواتير الموجودة
 */

import prisma from '../models/prismaClient';

async function checkSales() {
  try {
    console.log('🔍 فحص الفواتير...\n');

    // جميع الفواتير النقدية
    const allCashSales = await prisma.sale.findMany({
      where: {
        saleType: 'CASH'
      },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        receiptIssued: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    console.log(`📊 إجمالي الفواتير النقدية (آخر 20): ${allCashSales.length}\n`);

    if (allCashSales.length === 0) {
      console.log('⚠️  لا توجد فواتير نقدية في قاعدة البيانات');
      console.log('💡 قم بإنشاء بعض الفواتير النقدية من صفحة المبيعات');
      return;
    }

    console.log('📋 الفواتير:');
    console.log('═'.repeat(80));
    allCashSales.forEach((sale, index) => {
      const status = sale.receiptIssued ? '✅ مصدرة' : '⏳ معلقة';
      const date = new Date(sale.createdAt).toLocaleDateString('ar-LY');
      const time = new Date(sale.createdAt).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
      console.log(`${index + 1}. فاتورة #${sale.invoiceNumber || sale.id} | ${sale.total.toString().padStart(8)} د.ل | ${status} | ${date} ${time}`);
    });
    console.log('═'.repeat(80));

    const issuedCount = allCashSales.filter(s => s.receiptIssued).length;
    const pendingCount = allCashSales.filter(s => !s.receiptIssued).length;

    console.log(`\n📊 الإحصائيات:`);
    console.log(`   - ${issuedCount} فاتورة مصدرة (${((issuedCount / allCashSales.length) * 100).toFixed(0)}%)`);
    console.log(`   - ${pendingCount} فاتورة معلقة (${((pendingCount / allCashSales.length) * 100).toFixed(0)}%)`);

    // فواتير اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = allCashSales.filter(s => new Date(s.createdAt) >= today);
    console.log(`\n📅 فواتير اليوم: ${todaySales.length}`);

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
checkSales();

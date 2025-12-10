/**
 * Seed Provisional Sales Data
 * إدراج بيانات تجريبية للفواتير المبدئية
 */

import * as fs from 'fs';
import * as path from 'path';
import prisma from '../models/prismaClient';

async function seedProvisionalSales() {
  try {
    console.log('🌱 بدء إدراج بيانات الفواتير المبدئية التجريبية...');

    // قراءة البيانات من الملف
    const dataPath = path.join(__dirname, '../seedData/provisionalSales.json');
    const provisionalSalesData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // حذف البيانات الموجودة (اختياري)
    await prisma.provisionalSaleLine.deleteMany({});
    await prisma.provisionalSale.deleteMany({});
    console.log('🗑️ تم حذف البيانات الموجودة');

    // إدراج الفواتير المبدئية
    for (const saleData of provisionalSalesData) {
      const { lines, ...saleInfo } = saleData;

      // إنشاء الفاتورة المبدئية
      const provisionalSale = await prisma.provisionalSale.create({
        data: {
          ...saleInfo,
          createdAt: new Date(saleInfo.createdAt),
          updatedAt: new Date(saleInfo.updatedAt),
        }
      });

      console.log(`✅ تم إنشاء فاتورة مبدئية: ${provisionalSale.invoiceNumber}`);

      // إدراج بنود الفاتورة
      for (const lineData of lines) {
        await prisma.provisionalSaleLine.create({
          data: {
            provisionalSaleId: provisionalSale.id,
            productId: lineData.productId,
            qty: lineData.qty,
            unitPrice: lineData.unitPrice,
            subTotal: lineData.total, // استخدام total كـ subTotal
          }
        });
      }

      console.log(`📝 تم إدراج ${lines.length} بند للفاتورة ${provisionalSale.invoiceNumber}`);
    }

    console.log('🎉 تم إدراج جميع البيانات التجريبية بنجاح!');

    // عرض إحصائيات
    const totalSales = await prisma.provisionalSale.count();
    const totalLines = await prisma.provisionalSaleLine.count();

    console.log(`📊 الإحصائيات:`);
    console.log(`   - إجمالي الفواتير المبدئية: ${totalSales}`);
    console.log(`   - إجمالي البنود: ${totalLines}`);

  } catch (error) {
    console.error('❌ خطأ في إدراج البيانات:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
if (require.main === module) {
  seedProvisionalSales()
    .then(() => {
      console.log('✨ تم الانتهاء من إدراج البيانات');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 فشل في إدراج البيانات:', error);
      process.exit(1);
    });
}

export { seedProvisionalSales };

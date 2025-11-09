import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function convertPricesToPerUnit() {
  console.log('🔄 بدء تحويل الأسعار من سعر الصندوق إلى سعر المتر...');

  try {
    // جلب جميع الأسعار مع بيانات الصنف
    const prices = await prisma.companyProductPrice.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unitsPerBox: true,
            unit: true
          }
        }
      }
    });

    console.log(`📊 تم العثور على ${prices.length} سعر للتحويل`);

    let convertedCount = 0;
    let skippedCount = 0;

    for (const price of prices) {
      const { product } = price;
      
      // التحقق من وجود unitsPerBox
      if (!product.unitsPerBox || Number(product.unitsPerBox) <= 0) {
        console.log(`⚠️  تم تخطي الصنف "${product.name}" - لا يوجد unitsPerBox صالح`);
        skippedCount++;
        continue;
      }

      // حساب السعر الجديد للمتر
      const currentBoxPrice = Number(price.sellPrice);
      const unitsPerBox = Number(product.unitsPerBox);
      const newPricePerUnit = currentBoxPrice / unitsPerBox;

      // تحديث السعر
      await prisma.companyProductPrice.update({
        where: { id: price.id },
        data: { sellPrice: newPricePerUnit }
      });

      console.log(`✅ تم تحويل "${product.name}": ${currentBoxPrice} د.ل/صندوق → ${newPricePerUnit.toFixed(2)} د.ل/متر (${unitsPerBox} متر/صندوق)`);
      convertedCount++;
    }

    console.log('\n📈 ملخص التحويل:');
    console.log(`✅ تم تحويل: ${convertedCount} سعر`);
    console.log(`⚠️  تم تخطي: ${skippedCount} سعر`);
    console.log(`📊 الإجمالي: ${prices.length} سعر`);
    console.log('\n🎉 تم الانتهاء من تحويل الأسعار بنجاح!');

  } catch (error) {
    console.error('❌ خطأ في تحويل الأسعار:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
convertPricesToPerUnit()
  .then(() => {
    console.log('✅ تم تشغيل السكريبت بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل في تشغيل السكريبت:', error);
    process.exit(1);
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDividedPrices() {
  console.log('🔄 بدء إصلاح الأسعار التي تم تقسيمها خطأً...');

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

    console.log(`📊 تم العثور على ${prices.length} سعر للفحص`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const price of prices) {
      const { product } = price;
      
      // التحقق من وجود unitsPerBox (الأصناف بوحدة صندوق فقط)
      if (!product.unitsPerBox || Number(product.unitsPerBox) <= 0) {
        console.log(`⚠️  تم تخطي الصنف "${product.name}" - ليس بوحدة صندوق`);
        skippedCount++;
        continue;
      }

      // إصلاح السعر: ضرب السعر الحالي في unitsPerBox لإرجاعه للقيمة الصحيحة
      const currentWrongPrice = Number(price.sellPrice);
      const unitsPerBox = Number(product.unitsPerBox);
      const correctPricePerMeter = currentWrongPrice * unitsPerBox;

      // تحديث السعر
      await prisma.companyProductPrice.update({
        where: { id: price.id },
        data: { sellPrice: correctPricePerMeter }
      });

      console.log(`✅ تم إصلاح "${product.name}": ${currentWrongPrice.toFixed(2)} د.ل/م² → ${correctPricePerMeter.toFixed(2)} د.ل/م² (ضرب في ${unitsPerBox})`);
      fixedCount++;
    }

    console.log('\n📈 ملخص الإصلاح:');
    console.log(`✅ تم إصلاح: ${fixedCount} سعر`);
    console.log(`⚠️  تم تخطي: ${skippedCount} سعر`);
    console.log(`📊 الإجمالي: ${prices.length} سعر`);

    console.log('\n🎉 تم الانتهاء من إصلاح الأسعار بنجاح!');
    console.log('✅ الآن جميع الأسعار صحيحة للمتر المربع');

  } catch (error) {
    console.error('❌ خطأ في إصلاح الأسعار:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
fixDividedPrices()
  .then(() => {
    console.log('✅ تم تشغيل السكريبت بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل في تشغيل السكريبت:', error);
    process.exit(1);
  });

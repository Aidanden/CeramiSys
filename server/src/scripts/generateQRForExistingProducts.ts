/**
 * Script لتوليد QR Code لجميع الأصناف الموجودة
 * يتم تشغيله مرة واحدة لتحديث الأصناف القديمة
 */

import QRCode from 'qrcode';
import prisma from '../models/prismaClient';

async function generateQRForExistingProducts() {
  try {
    console.log('🚀 بدء توليد QR Code للأصناف الموجودة...\n');

    // جلب جميع الأصناف التي ليس لها QR Code
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { qrCode: null },
          { qrCode: '' }
        ]
      },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        unitsPerBox: true
      }
    });

    if (products.length === 0) {
      console.log('✅ جميع الأصناف لديها QR Code بالفعل!');
      return;
    }

    console.log(`📦 تم العثور على ${products.length} صنف بدون QR Code\n`);

    let successCount = 0;
    let failCount = 0;

    // توليد QR Code لكل صنف
    for (const product of products) {
      try {
        // بيانات الصنف في QR Code
        const productData = JSON.stringify({
          id: product.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          unitsPerBox: product.unitsPerBox ? Number(product.unitsPerBox) : undefined
        });

        // توليد QR Code كـ Data URL
        const qrCodeDataUrl = await QRCode.toDataURL(productData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        // تحديث الصنف بـ QR Code
        await prisma.product.update({
          where: { id: product.id },
          data: { qrCode: qrCodeDataUrl }
        });

        successCount++;
        console.log(`✅ [${successCount}/${products.length}] تم توليد QR Code للصنف: ${product.name} (${product.sku})`);
      } catch (error) {
        failCount++;
        console.error(`❌ فشل توليد QR Code للصنف: ${product.name} (${product.sku})`, error);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ملخص العملية:');
    console.log(`   ✅ نجح: ${successCount} صنف`);
    console.log(`   ❌ فشل: ${failCount} صنف`);
    console.log(`   📦 الإجمالي: ${products.length} صنف`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (successCount === products.length) {
      console.log('🎉 تم توليد QR Code لجميع الأصناف بنجاح!');
    } else {
      console.log('⚠️  بعض الأصناف فشلت، يرجى مراجعة الأخطاء أعلاه');
    }

  } catch (error) {
    console.error('❌ خطأ في تشغيل السكريبت:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
generateQRForExistingProducts()
  .then(() => {
    console.log('\n✅ انتهى السكريبت بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل السكريبت:', error);
    process.exit(1);
  });

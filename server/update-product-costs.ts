import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface CostData {
  nsanf: string;
  pcost: number;
}

async function updateProductCosts() {
  try {
    console.log('🚀 بدء تحديث تكلفة الأصناف للشركة رقم 2...\n');

    // قراءة ملف emCost
    const currentDir = process.cwd();
    const filePath = join(currentDir, '..', 'docs', '_data_old_app', 'emCost');
    const fileContent = readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    // تحليل البيانات
    const costData: CostData[] = [];
    for (let i = 1; i < lines.length; i++) { // تخطي السطر الأول (العناوين)
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split('\t');
      if (parts.length >= 2) {
        const nsanf = parts[0].trim();
        const pcost = parseFloat(parts[1].trim());
        
        if (nsanf && !isNaN(pcost)) {
          costData.push({ nsanf, pcost });
        }
      }
    }

    console.log(`📊 تم قراءة ${costData.length} صنف من الملف\n`);

    let updatedCount = 0;
    let notFoundCount = 0;
    const notFoundProducts: string[] = [];

    // تحديث التكلفة لكل صنف
    for (const item of costData) {
      // البحث عن الصنف في قاعدة البيانات للشركة رقم 2
      const product = await prisma.product.findFirst({
        where: {
          sku: item.nsanf,
          createdByCompanyId: 2
        }
      });

      if (product) {
        // تحديث التكلفة
        await prisma.product.update({
          where: { id: product.id },
          data: { cost: item.pcost }
        });
        updatedCount++;
        console.log(`✅ تم تحديث الصنف ${item.nsanf} - التكلفة الجديدة: ${item.pcost}`);
      } else {
        notFoundCount++;
        notFoundProducts.push(item.nsanf);
        console.log(`❌ الصنف ${item.nsanf} غير موجود في قاعدة البيانات`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 ملخص التحديث:');
    console.log('='.repeat(60));
    console.log(`✅ عدد الأصناف المحدثة: ${updatedCount}`);
    console.log(`❌ عدد الأصناف غير الموجودة: ${notFoundCount}`);
    
    if (notFoundProducts.length > 0) {
      console.log('\n📋 قائمة الأصناف غير الموجودة:');
      console.log(notFoundProducts.join(', '));
    }
    
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ حدث خطأ أثناء تحديث التكلفة:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكربت
updateProductCosts()
  .then(() => {
    console.log('\n✅ تم إكمال عملية التحديث بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشلت عملية التحديث:', error);
    process.exit(1);
  });

/**
 * Script لتحديث تكلفة الأصناف من ملف نصي
 * صيغة الملف: كود_الصنف<tab>التكلفة  (سطر لكل صنف)
 *
 * الاستخدام:
 *   ts-node scripts/update-cost-from-file.ts <مسار_الملف> [companyId]
 *
 * أمثلة:
 *   ts-node scripts/update-cost-from-file.ts ../docs/_data_old_app/lastCostTG
 *   ts-node scripts/update-cost-from-file.ts ../docs/_data_old_app/lastCostTG 1
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function updateCostFromFile(filePath: string, companyId?: number) {
  console.log('🚀 بدء تحديث تكاليف الأصناف...');
  console.log(`📂 الملف: ${filePath}`);
  if (companyId) {
    console.log(`🏢 الشركة: ${companyId}`);
  } else {
    console.log('🏢 الشركة: جميع الشركات (تحديث كل صنف يطابق الكود)');
  }
  console.log('─'.repeat(60));

  // قراءة الملف
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`❌ الملف غير موجود: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const lines = content.split('\n').filter((line: string) => line.trim() !== '');

  // تجاهل السطر الأول إذا كان header
  const dataLines = lines[0]?.toLowerCase().includes('code') ? lines.slice(1) : lines;

  console.log(`📊 عدد الأسطر في الملف: ${dataLines.length}`);
  console.log('─'.repeat(60));

  let updated = 0;
  let notFound = 0;
  let skipped = 0;
  let errors = 0;

  const notFoundSkus: string[] = [];

  for (const line of dataLines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) {
      skipped++;
      continue;
    }

    const sku = (parts[0] ?? '').trim();
    const costStr = (parts[1] ?? '').trim();
    const newCost = parseFloat(costStr);

    if (isNaN(newCost)) {
      console.warn(`⚠️  تجاهل سطر غير صالح: "${line.trim()}"`);
      skipped++;
      continue;
    }

    try {
      // البحث عن الأصناف المطابقة للكود
      const whereClause: any = { sku };
      if (companyId) {
        whereClause.createdByCompanyId = companyId;
      }

      const products = await prisma.product.findMany({
        where: whereClause,
        select: { id: true, name: true, sku: true, cost: true, createdByCompanyId: true },
      });

      if (products.length === 0) {
        notFoundSkus.push(sku);
        notFound++;
        continue;
      }

      // تحديث جميع الأصناف المطابقة
      for (const product of products) {
        const oldCost = product.cost ? Number(product.cost) : null;

        await prisma.product.update({
          where: { id: product.id },
          data: { cost: newCost },
        });

        console.log(
          `✅ [${sku}] ${product.name} | شركة: ${product.createdByCompanyId} | ${oldCost ?? 'غير محدد'} → ${newCost}`
        );
        updated++;
      }
    } catch (error: any) {
      console.error(`❌ خطأ في تحديث الكود [${sku}]:`, error.message);
      errors++;
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📈 ملخص النتائج:');
  console.log(`  ✅ تم التحديث:    ${updated} صنف`);
  console.log(`  ❌ غير موجود:     ${notFound} كود`);
  console.log(`  ⏭️  تم التجاهل:   ${skipped} سطر`);
  console.log(`  💥 أخطاء:         ${errors}`);

  if (notFoundSkus.length > 0) {
    console.log('\n📋 الأكواد غير الموجودة في قاعدة البيانات:');
    notFoundSkus.forEach((sku) => console.log(`   - ${sku}`));
  }

  console.log('═'.repeat(60));
}

// قراءة المعاملات من سطر الأوامر
const args = process.argv.slice(2);
if (args.length === 0 || !args[0]) {
  console.error('❌ يجب تحديد مسار الملف');
  console.error('الاستخدام: ts-node scripts/update-cost-from-file.ts <مسار_الملف> [companyId]');
  process.exit(1);
}

const filePath = args[0] as string;
const companyId = args[1] ? parseInt(args[1]) : undefined;

if (args[1] && isNaN(companyId!)) {
  console.error('❌ companyId يجب أن يكون رقماً صحيحاً');
  process.exit(1);
}

updateCostFromFile(filePath, companyId)
  .then(() => {
    console.log('\n✨ تم الانتهاء بنجاح!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 فشل التنفيذ:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

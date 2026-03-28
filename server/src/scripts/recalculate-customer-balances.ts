import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * سكريبت لإعادة حساب جميع أرصدة العملاء بالترتيب الصحيح
 */

async function recalculateCustomerBalances() {
  console.log('🔧 بدء إعادة حساب أرصدة العملاء...\n');

  try {
    // جلب جميع العملاء الذين لديهم قيود
    const customersWithEntries = await prisma.customerAccount.groupBy({
      by: ['customerId'],
      _count: { id: true }
    });

    console.log(`📊 عدد العملاء: ${customersWithEntries.length}\n`);

    let processedCount = 0;
    let errorCount = 0;

    for (const { customerId } of customersWithEntries) {
      try {
        // جلب معلومات العميل
        const customer = await prisma.customer.findUnique({
          where: { id: customerId }
        });

        if (!customer) continue;

        console.log(`\n📝 معالجة العميل: ${customer.name} (ID: ${customerId})`);

        // جلب جميع القيود مرتبة حسب التاريخ (من الأقدم للأحدث)
        const entries = await prisma.customerAccount.findMany({
          where: { customerId },
          orderBy: [
            { transactionDate: 'asc' },
            { id: 'asc' }
          ]
        });

        console.log(`   عدد القيود: ${entries.length}`);

        // إعادة حساب الأرصدة
        let runningBalance = 0;
        const updates: Array<{ id: number; balance: number }> = [];

        for (const entry of entries) {
          // حساب الرصيد الجديد
          if (entry.transactionType === 'DEBIT') {
            runningBalance += Number(entry.amount);
          } else {
            runningBalance -= Number(entry.amount);
          }

          // حفظ التحديث
          updates.push({
            id: entry.id,
            balance: runningBalance
          });
        }

        // تطبيق التحديثات في transaction
        await prisma.$transaction(
          updates.map(update =>
            prisma.customerAccount.update({
              where: { id: update.id },
              data: { balance: update.balance }
            })
          )
        );

        console.log(`   ✅ تم تحديث ${updates.length} قيد - الرصيد النهائي: ${runningBalance.toFixed(2)}`);
        processedCount++;

      } catch (error) {
        console.error(`   ❌ خطأ في معالجة العميل ${customerId}:`, error);
        errorCount++;
      }
    }

    // ملخص النتائج
    console.log('\n' + '='.repeat(60));
    console.log('📊 ملخص إعادة الحساب:');
    console.log('='.repeat(60));
    console.log(`✅ تم معالجة: ${processedCount} عميل`);
    console.log(`❌ فشل: ${errorCount} عميل`);
    console.log('='.repeat(60));

    if (processedCount > 0) {
      console.log('\n✨ تم إعادة حساب الأرصدة بنجاح!');
      console.log('💡 الآن يجب أن تكون جميع الأرصدة صحيحة في كشف الحساب');
    }

  } catch (error) {
    console.error('❌ خطأ عام في السكريبت:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
recalculateCustomerBalances()
  .then(() => {
    console.log('\n✅ اكتمل السكريبت بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل السكريبت:', error);
    process.exit(1);
  });

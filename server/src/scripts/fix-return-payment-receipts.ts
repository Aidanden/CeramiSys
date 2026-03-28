import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * سكريبت لإصلاح قيود إيصالات دفع المردودات في حسابات العملاء
 * 
 * المشكلة: إيصالات المردودات المدفوعة كانت تُسجل كـ DEBIT بدلاً من CREDIT
 * الحل: حذف القيود الخاطئة وإعادة إنشائها بشكل صحيح
 */

async function fixReturnPaymentReceipts() {
  console.log('🔧 بدء إصلاح قيود إيصالات دفع المردودات...\n');

  try {
    // 1. جلب جميع إيصالات المردودات المدفوعة المرتبطة بعملاء
    const paidReturnReceipts = await prisma.supplierPaymentReceipt.findMany({
      where: {
        type: 'RETURN',
        status: 'PAID',
        customerId: { not: null }
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`📊 تم العثور على ${paidReturnReceipts.length} إيصال مردود مدفوع\n`);

    if (paidReturnReceipts.length === 0) {
      console.log('✅ لا توجد إيصالات تحتاج إصلاح');
      return;
    }

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. معالجة كل إيصال
    for (const receipt of paidReturnReceipts) {
      try {
        console.log(`\n📝 معالجة إيصال #${receipt.id} - العميل: ${receipt.customer?.name || 'غير محدد'}`);
        console.log(`   المبلغ: ${receipt.amount} LYD - التاريخ: ${receipt.paidAt?.toLocaleDateString('ar-EG') || 'غير محدد'}`);

        // 3. البحث عن القيود الخاطئة في حساب العميل
        const wrongEntries = await prisma.customerAccount.findMany({
          where: {
            customerId: receipt.customerId!,
            referenceType: 'PAYMENT',
            referenceId: receipt.id,
            transactionType: 'DEBIT' // القيود الخاطئة
          }
        });

        if (wrongEntries.length === 0) {
          console.log(`   ⏭️  لا توجد قيود خاطئة - تم تخطي الإيصال`);
          skippedCount++;
          continue;
        }

        console.log(`   🔍 تم العثور على ${wrongEntries.length} قيد خاطئ`);

        // 4. حذف القيود الخاطئة وإعادة إنشائها بشكل صحيح
        await prisma.$transaction(async (tx) => {
          // حذف القيود الخاطئة
          const deletedCount = await tx.customerAccount.deleteMany({
            where: {
              customerId: receipt.customerId!,
              referenceType: 'PAYMENT',
              referenceId: receipt.id,
              transactionType: 'DEBIT'
            }
          });

          console.log(`   🗑️  تم حذف ${deletedCount.count} قيد خاطئ`);

          // جلب آخر رصيد للعميل
          const lastEntry = await tx.customerAccount.findFirst({
            where: { customerId: receipt.customerId! },
            orderBy: { createdAt: 'desc' }
          });

          const previousBalance = lastEntry ? Number(lastEntry.balance) : 0;
          const newBalance = previousBalance - Number(receipt.amount); // CREDIT ينقص الرصيد

          // إنشاء القيد الصحيح
          await tx.customerAccount.create({
            data: {
              customerId: receipt.customerId!,
              transactionType: 'CREDIT', // ✅ الصحيح
              amount: receipt.amount,
              balance: newBalance,
              referenceType: 'RETURN', // ✅ أوضح من PAYMENT
              referenceId: receipt.id,
              description: `صرف مردود مبيعات - إيصال رقم ${receipt.id}`,
              transactionDate: receipt.paidAt || receipt.createdAt
            }
          });

          console.log(`   ✅ تم إنشاء القيد الصحيح (CREDIT) - الرصيد الجديد: ${newBalance}`);
        });

        fixedCount++;

      } catch (error) {
        console.error(`   ❌ خطأ في معالجة الإيصال #${receipt.id}:`, error);
        errorCount++;
      }
    }

    // 5. ملخص النتائج
    console.log('\n' + '='.repeat(60));
    console.log('📊 ملخص الإصلاح:');
    console.log('='.repeat(60));
    console.log(`✅ تم إصلاح: ${fixedCount} إيصال`);
    console.log(`⏭️  تم تخطي: ${skippedCount} إيصال (لا يحتاج إصلاح)`);
    console.log(`❌ فشل: ${errorCount} إيصال`);
    console.log('='.repeat(60));

    if (fixedCount > 0) {
      console.log('\n✨ تم إصلاح قيود إيصالات المردودات بنجاح!');
      console.log('💡 الآن يجب أن تظهر الإيصالات في كشف حسابات العملاء');
    }

  } catch (error) {
    console.error('❌ خطأ عام في السكريبت:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
fixReturnPaymentReceipts()
  .then(() => {
    console.log('\n✅ اكتمل السكريبت بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل السكريبت:', error);
    process.exit(1);
  });

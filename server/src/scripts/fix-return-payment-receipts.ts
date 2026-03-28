import prisma from '../models/prismaClient';

/**
 * سكريبت لإصلاح القيود الخاطئة في CustomerAccount للإيصالات المدفوعة
 * المشكلة: إيصالات دفع المردودات المدفوعة سابقاً سُجلت بـ DEBIT بدلاً من CREDIT
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

    console.log(`📊 تم العثور على ${paidReturnReceipts.length} إيصال مردود مدفوع مرتبط بعملاء\n`);

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
        console.log(`\n🔍 معالجة إيصال #${receipt.id} - العميل: ${receipt.customer?.name || 'غير محدد'}`);
        console.log(`   المبلغ: ${receipt.amount} LYD - التاريخ: ${receipt.paidAt?.toLocaleDateString('ar-LY') || 'غير محدد'}`);

        // 3. البحث عن القيود الخاطئة في CustomerAccount
        const wrongEntries = await prisma.customerAccount.findMany({
          where: {
            customerId: receipt.customerId!,
            referenceType: 'PAYMENT',
            referenceId: receipt.id,
            transactionType: 'DEBIT' // القيود الخاطئة
          }
        });

        if (wrongEntries.length === 0) {
          // التحقق من وجود قيد صحيح
          const correctEntry = await prisma.customerAccount.findFirst({
            where: {
              customerId: receipt.customerId!,
              OR: [
                { referenceType: 'RETURN', referenceId: receipt.id },
                { referenceType: 'PAYMENT', referenceId: receipt.id, transactionType: 'CREDIT' }
              ]
            }
          });

          if (correctEntry) {
            console.log(`   ⏭️  القيد موجود بشكل صحيح - تخطي`);
            skippedCount++;
            continue;
          } else {
            console.log(`   ⚠️  لا يوجد قيد في CustomerAccount - سيتم إنشاؤه`);
          }
        } else {
          console.log(`   ❌ تم العثور على ${wrongEntries.length} قيد خاطئ - سيتم حذفه`);
          
          // 4. حذف القيود الخاطئة
          await prisma.customerAccount.deleteMany({
            where: {
              id: { in: wrongEntries.map(e => e.id) }
            }
          });
          console.log(`   🗑️  تم حذف القيود الخاطئة`);
        }

        // 5. إنشاء القيد الصحيح
        // جلب آخر رصيد للعميل
        const lastEntry = await prisma.customerAccount.findFirst({
          where: { customerId: receipt.customerId! },
          orderBy: { createdAt: 'desc' }
        });

        const previousBalance = lastEntry ? Number(lastEntry.balance) : 0;
        const newBalance = previousBalance - Number(receipt.amount); // CREDIT ينقص الرصيد

        await prisma.customerAccount.create({
          data: {
            customerId: receipt.customerId!,
            transactionType: 'CREDIT',
            amount: Number(receipt.amount),
            balance: newBalance,
            referenceType: 'RETURN',
            referenceId: receipt.id,
            description: `صرف مردود مبيعات - إيصال رقم ${receipt.id} (تصحيح)`,
            transactionDate: receipt.paidAt || receipt.createdAt
          }
        });

        console.log(`   ✅ تم إنشاء القيد الصحيح - الرصيد الجديد: ${newBalance.toFixed(2)} LYD`);
        fixedCount++;

      } catch (error: any) {
        console.error(`   ❌ خطأ في معالجة إيصال #${receipt.id}:`, error.message);
        errorCount++;
      }
    }

    // 6. ملخص النتائج
    console.log('\n' + '='.repeat(60));
    console.log('📋 ملخص العملية:');
    console.log(`   ✅ تم إصلاح: ${fixedCount} إيصال`);
    console.log(`   ⏭️  تم تخطي: ${skippedCount} إيصال (موجود بشكل صحيح)`);
    console.log(`   ❌ فشل: ${errorCount} إيصال`);
    console.log('='.repeat(60));

    if (fixedCount > 0) {
      console.log('\n✨ تم إصلاح البيانات بنجاح!');
      console.log('💡 يمكنك الآن التحقق من كشف حساب العملاء في /customer-accounts');
    }

  } catch (error: any) {
    console.error('\n❌ خطأ عام في السكريبت:', error.message);
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

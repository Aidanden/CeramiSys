import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * سكريبت لإضافة قيود دفع المردودات بالمنطق الصحيح
 * 
 * المنطق:
 * 1. عند إنشاء المردود: CREDIT (العميل له حق)
 * 2. عند دفع المردود: DEBIT (إلغاء الحق بعد الدفع)
 * النتيجة: الرصيد يعود للصفر
 */

async function fixPaidReturnsCorrectly() {
  console.log('🔧 بدء إضافة قيود دفع المردودات بالمنطق الصحيح...\n');

  try {
    // 1. جلب جميع إيصالات المردودات المدفوعة
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
      },
      orderBy: { paidAt: 'desc' }
    });

    console.log(`📊 تم العثور على ${paidReturnReceipts.length} إيصال مردود مدفوع\n`);

    if (paidReturnReceipts.length === 0) {
      console.log('✅ لا توجد إيصالات تحتاج معالجة');
      return;
    }

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. معالجة كل إيصال
    for (const receipt of paidReturnReceipts) {
      try {
        console.log(`\n📝 معالجة إيصال #${receipt.id} - العميل: ${receipt.customer?.name || 'غير محدد'}`);
        console.log(`   المبلغ: ${receipt.amount} LYD - التاريخ: ${receipt.paidAt?.toLocaleDateString('ar-EG') || 'غير محدد'}`);

        // 3. التحقق من وجود قيد الدفع
        const existingPaymentEntry = await prisma.customerAccount.findFirst({
          where: {
            customerId: receipt.customerId!,
            referenceType: 'PAYMENT',
            referenceId: receipt.id
          }
        });

        if (existingPaymentEntry) {
          console.log(`   ⏭️  قيد الدفع موجود بالفعل - تم تخطي الإيصال`);
          skippedCount++;
          continue;
        }

        console.log(`   🔍 لا يوجد قيد دفع - سيتم إضافته`);

        // 4. إضافة قيد الدفع (DEBIT لإلغاء الـ CREDIT)
        await prisma.$transaction(async (tx) => {
          // جلب آخر رصيد للعميل
          const lastEntry = await tx.customerAccount.findFirst({
            where: { customerId: receipt.customerId! },
            orderBy: { createdAt: 'desc' }
          });

          const previousBalance = lastEntry ? Number(lastEntry.balance) : 0;
          
          // DEBIT يزيد الرصيد (يلغي الـ CREDIT الذي كان للعميل)
          const newBalance = previousBalance + Number(receipt.amount);

          // إنشاء القيد
          await tx.customerAccount.create({
            data: {
              customerId: receipt.customerId!,
              transactionType: 'DEBIT',
              amount: receipt.amount,
              balance: newBalance,
              referenceType: 'PAYMENT',
              referenceId: receipt.id,
              description: `دفع مردود مبيعات - إيصال رقم ${receipt.id}`,
              transactionDate: receipt.paidAt || receipt.createdAt
            }
          });

          console.log(`   ✅ تم إضافة قيد الدفع (DEBIT) - الرصيد الجديد: ${newBalance}`);
        });

        addedCount++;

      } catch (error) {
        console.error(`   ❌ خطأ في معالجة الإيصال #${receipt.id}:`, error);
        errorCount++;
      }
    }

    // 5. ملخص النتائج
    console.log('\n' + '='.repeat(60));
    console.log('📊 ملخص الإضافة:');
    console.log('='.repeat(60));
    console.log(`✅ تم إضافة: ${addedCount} قيد دفع`);
    console.log(`⏭️  تم تخطي: ${skippedCount} إيصال (القيد موجود)`);
    console.log(`❌ فشل: ${errorCount} إيصال`);
    console.log('='.repeat(60));

    if (addedCount > 0) {
      console.log('\n✨ تم إضافة قيود الدفع بنجاح!');
      console.log('💡 الآن يجب أن يكون الرصيد صحيحاً بعد دفع المردودات');
    }

  } catch (error) {
    console.error('❌ خطأ عام في السكريبت:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
fixPaidReturnsCorrectly()
  .then(() => {
    console.log('\n✅ اكتمل السكريبت بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل السكريبت:', error);
    process.exit(1);
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * سكريبت لإضافة القيود المفقودة لإيصالات دفع المردودات في حسابات العملاء
 * 
 * المشكلة: إيصالات المردودات المدفوعة لم يتم تسجيل قيود دفعها في CustomerAccount
 * الحل: إضافة القيود المفقودة بنوع CREDIT
 */

async function addMissingReturnPaymentEntries() {
  console.log('🔧 بدء إضافة القيود المفقودة لإيصالات دفع المردودات...\n');

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

        // 3. التحقق من وجود قيد لهذا الإيصال
        const existingEntry = await prisma.customerAccount.findFirst({
          where: {
            customerId: receipt.customerId!,
            referenceId: receipt.id,
            OR: [
              { referenceType: 'PAYMENT' },
              { referenceType: 'RETURN' }
            ]
          }
        });

        if (existingEntry) {
          console.log(`   ⏭️  القيد موجود بالفعل - تم تخطي الإيصال`);
          skippedCount++;
          continue;
        }

        console.log(`   🔍 لا يوجد قيد - سيتم إضافته`);

        // 4. إضافة القيد المفقود
        await prisma.$transaction(async (tx) => {
          // جلب آخر رصيد للعميل
          const lastEntry = await tx.customerAccount.findFirst({
            where: { customerId: receipt.customerId! },
            orderBy: { createdAt: 'desc' }
          });

          const previousBalance = lastEntry ? Number(lastEntry.balance) : 0;
          
          // CREDIT ينقص الرصيد (الشركة دفعت للعميل)
          const newBalance = previousBalance - Number(receipt.amount);

          // إنشاء القيد
          await tx.customerAccount.create({
            data: {
              customerId: receipt.customerId!,
              transactionType: 'CREDIT',
              amount: receipt.amount,
              balance: newBalance,
              referenceType: 'RETURN',
              referenceId: receipt.id,
              description: `صرف مردود مبيعات - إيصال رقم ${receipt.id}`,
              transactionDate: receipt.paidAt || receipt.createdAt
            }
          });

          console.log(`   ✅ تم إضافة القيد (CREDIT) - الرصيد الجديد: ${newBalance}`);
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
    console.log(`✅ تم إضافة: ${addedCount} قيد`);
    console.log(`⏭️  تم تخطي: ${skippedCount} إيصال (القيد موجود)`);
    console.log(`❌ فشل: ${errorCount} إيصال`);
    console.log('='.repeat(60));

    if (addedCount > 0) {
      console.log('\n✨ تم إضافة القيود المفقودة بنجاح!');
      console.log('💡 الآن يجب أن تظهر إيصالات المردودات المدفوعة في كشف حسابات العملاء');
    }

  } catch (error) {
    console.error('❌ خطأ عام في السكريبت:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
addMissingReturnPaymentEntries()
  .then(() => {
    console.log('\n✅ اكتمل السكريبت بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل السكريبت:', error);
    process.exit(1);
  });

import prisma from '../models/prismaClient';

/**
 * سكريبت لإصلاح القيود في CustomerAccount لإيصالات دفع المردودات
 * المنطق الصحيح:
 * - عند إنشاء المردود: CREDIT (يخصم من دين العميل)
 * - عند دفع المردود: DEBIT (الشركة تدفع للعميل = دين للعميل على الشركة)
 */

async function fixReturnPaymentReceiptsCorrect() {
  console.log('🔧 بدء إصلاح قيود إيصالات دفع المردودات (المنطق الصحيح)...\n');

  try {
    // 1. حذف جميع القيود الخاطئة التي أنشأها السكريبت السابق
    console.log('🗑️  حذف القيود الخاطئة (CREDIT) من السكريبت السابق...');
    
    const deletedWrongEntries = await prisma.customerAccount.deleteMany({
      where: {
        referenceType: 'RETURN',
        transactionType: 'CREDIT',
        description: {
          contains: '(تصحيح)'
        }
      }
    });
    
    console.log(`   ✅ تم حذف ${deletedWrongEntries.count} قيد خاطئ\n`);

    // 2. جلب جميع إيصالات المردودات المدفوعة المرتبطة بعملاء
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
      orderBy: {
        paidAt: 'asc' // من الأقدم للأحدث للحفاظ على تسلسل الأرصدة
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

    // 3. معالجة كل إيصال
    for (const receipt of paidReturnReceipts) {
      try {
        console.log(`\n🔍 معالجة إيصال #${receipt.id} - العميل: ${receipt.customer?.name || 'غير محدد'}`);
        console.log(`   المبلغ: ${receipt.amount} LYD - التاريخ: ${receipt.paidAt?.toLocaleDateString('ar-LY') || 'غير محدد'}`);

        // 4. التحقق من وجود قيد صحيح
        const existingCorrectEntry = await prisma.customerAccount.findFirst({
          where: {
            customerId: receipt.customerId!,
            referenceType: 'PAYMENT',
            referenceId: receipt.id,
            transactionType: 'DEBIT'
          }
        });

        if (existingCorrectEntry) {
          console.log(`   ⏭️  القيد موجود بشكل صحيح - تخطي`);
          skippedCount++;
          continue;
        }

        // 5. حذف أي قيود خاطئة قديمة لهذا الإيصال
        await prisma.customerAccount.deleteMany({
          where: {
            customerId: receipt.customerId!,
            referenceId: receipt.id,
            OR: [
              { referenceType: 'RETURN' },
              { referenceType: 'PAYMENT', transactionType: 'CREDIT' }
            ]
          }
        });

        // 6. إنشاء القيد الصحيح
        // جلب آخر رصيد للعميل
        const lastEntry = await prisma.customerAccount.findFirst({
          where: { customerId: receipt.customerId! },
          orderBy: { createdAt: 'desc' }
        });

        const previousBalance = lastEntry ? Number(lastEntry.balance) : 0;
        const newBalance = previousBalance + Number(receipt.amount); // DEBIT يزيد الرصيد (دين للعميل على الشركة)

        await prisma.customerAccount.create({
          data: {
            customerId: receipt.customerId!,
            transactionType: 'DEBIT',
            amount: Number(receipt.amount),
            balance: newBalance,
            referenceType: 'PAYMENT',
            referenceId: receipt.id,
            description: `صرف مردود مبيعات - إيصال رقم ${receipt.id}`,
            transactionDate: receipt.paidAt || receipt.createdAt
          }
        });

        console.log(`   ✅ تم إنشاء القيد الصحيح (DEBIT) - الرصيد الجديد: ${newBalance.toFixed(2)} LYD`);
        fixedCount++;

      } catch (error: any) {
        console.error(`   ❌ خطأ في معالجة إيصال #${receipt.id}:`, error.message);
        errorCount++;
      }
    }

    // 7. ملخص النتائج
    console.log('\n' + '='.repeat(60));
    console.log('📋 ملخص العملية:');
    console.log(`   ✅ تم إصلاح: ${fixedCount} إيصال`);
    console.log(`   ⏭️  تم تخطي: ${skippedCount} إيصال (موجود بشكل صحيح)`);
    console.log(`   ❌ فشل: ${errorCount} إيصال`);
    console.log('='.repeat(60));

    if (fixedCount > 0) {
      console.log('\n✨ تم إصلاح البيانات بنجاح!');
      console.log('💡 المنطق الصحيح: دفع المردود = DEBIT (دين للعميل على الشركة)');
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
fixReturnPaymentReceiptsCorrect()
  .then(() => {
    console.log('\n✅ اكتمل السكريبت بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل السكريبت:', error);
    process.exit(1);
  });

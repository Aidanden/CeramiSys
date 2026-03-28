import prisma from '../models/prismaClient';

/**
 * سكريبت للتحقق من بيانات عميل معين
 */

async function checkCustomerData() {
  console.log('🔍 فحص بيانات العميل "شركة الحضيري/فوزي"...\n');

  try {
    // 1. البحث عن العميل
    const customer = await prisma.customer.findFirst({
      where: {
        name: {
          contains: 'الحضيري'
        }
      }
    });

    if (!customer) {
      console.log('❌ لم يتم العثور على العميل');
      return;
    }

    console.log(`✅ تم العثور على العميل: ${customer.name} (ID: ${customer.id})\n`);

    // 2. جلب جميع قيود حساب العميل
    const accountEntries = await prisma.customerAccount.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📊 عدد القيود في حساب العميل: ${accountEntries.length}\n`);

    // 3. جلب إيصالات المردودات المرتبطة بالعميل
    const returnReceipts = await prisma.supplierPaymentReceipt.findMany({
      where: {
        customerId: customer.id,
        type: 'RETURN'
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📋 إيصالات المردودات للعميل: ${returnReceipts.length}\n`);

    // 4. عرض تفاصيل إيصالات المردودات
    if (returnReceipts.length > 0) {
      console.log('='.repeat(80));
      console.log('إيصالات المردودات:');
      console.log('='.repeat(80));
      
      for (const receipt of returnReceipts) {
        console.log(`\nإيصال #${receipt.id}:`);
        console.log(`  المبلغ: ${receipt.amount} LYD`);
        console.log(`  الحالة: ${receipt.status}`);
        console.log(`  تاريخ الإنشاء: ${receipt.createdAt.toLocaleString('ar-LY')}`);
        console.log(`  تاريخ الدفع: ${receipt.paidAt?.toLocaleString('ar-LY') || 'لم يُدفع'}`);
        console.log(`  الوصف: ${receipt.description || receipt.notes || '-'}`);

        // البحث عن القيد المرتبط بهذا الإيصال
        const relatedEntry = accountEntries.find(e => e.referenceId === receipt.id);
        if (relatedEntry) {
          console.log(`  ✅ قيد محاسبي موجود:`);
          console.log(`     - النوع: ${relatedEntry.transactionType}`);
          console.log(`     - المرجع: ${relatedEntry.referenceType}`);
          console.log(`     - المبلغ: ${relatedEntry.amount} LYD`);
          console.log(`     - الرصيد بعده: ${relatedEntry.balance} LYD`);
        } else {
          console.log(`  ❌ لا يوجد قيد محاسبي مرتبط`);
        }
      }
    }

    // 5. عرض ملخص القيود
    console.log('\n' + '='.repeat(80));
    console.log('ملخص القيود المحاسبية:');
    console.log('='.repeat(80));

    const debitEntries = accountEntries.filter(e => e.transactionType === 'DEBIT');
    const creditEntries = accountEntries.filter(e => e.transactionType === 'CREDIT');
    const paymentDebitEntries = debitEntries.filter(e => e.referenceType === 'PAYMENT');
    const paymentCreditEntries = creditEntries.filter(e => e.referenceType === 'PAYMENT');

    const totalDebit = debitEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalCredit = creditEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalPaymentDebit = paymentDebitEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalPaymentCredit = paymentCreditEntries.reduce((sum, e) => sum + Number(e.amount), 0);

    console.log(`\nإجمالي DEBIT: ${totalDebit.toFixed(2)} LYD (${debitEntries.length} قيد)`);
    console.log(`  - منها PAYMENT: ${totalPaymentDebit.toFixed(2)} LYD (${paymentDebitEntries.length} قيد)`);
    console.log(`\nإجمالي CREDIT: ${totalCredit.toFixed(2)} LYD (${creditEntries.length} قيد)`);
    console.log(`  - منها PAYMENT: ${totalPaymentCredit.toFixed(2)} LYD (${paymentCreditEntries.length} قيد)`);

    const lastEntry = accountEntries[accountEntries.length - 1];
    console.log(`\nآخر رصيد مسجل: ${lastEntry?.balance || 0} LYD`);

    // 6. حساب ما يجب أن يكون عليه totalOtherCredits
    const pendingReturns = returnReceipts.filter(r => r.status === 'PENDING');
    const pendingReturnsAmount = pendingReturns.reduce((sum, r) => sum + Number(r.amount), 0);

    console.log('\n' + '='.repeat(80));
    console.log('التحليل:');
    console.log('='.repeat(80));
    console.log(`\nالمردودات المعلقة: ${pendingReturnsAmount.toFixed(2)} LYD (${pendingReturns.length} إيصال)`);
    console.log(`المردودات المدفوعة (DEBIT-PAYMENT): ${totalPaymentDebit.toFixed(2)} LYD`);
    console.log(`\n✅ totalOtherCredits يجب أن يكون: ${pendingReturnsAmount.toFixed(2)} LYD`);

  } catch (error: any) {
    console.error('\n❌ خطأ:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomerData()
  .then(() => {
    console.log('\n✅ اكتمل الفحص');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل الفحص:', error);
    process.exit(1);
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * سكريبت للتحقق من بيانات العميل "أنيس بدر"
 */

async function checkCustomerData() {
  console.log('🔍 فحص جميع إيصالات المردودات المدفوعة...\n');

  try {
    // 1. جلب جميع إيصالات المردودات المدفوعة
    const allReturnReceipts = await prisma.supplierPaymentReceipt.findMany({
      where: {
        type: 'RETURN',
        status: 'PAID',
        customerId: { not: null }
      },
      include: {
        customer: true
      },
      orderBy: { paidAt: 'desc' }
    });

    console.log(`📦 إجمالي إيصالات المردودات المدفوعة: ${allReturnReceipts.length}\n`);

    if (allReturnReceipts.length === 0) {
      console.log('❌ لا توجد إيصالات مردودات مدفوعة');
      return;
    }

    // عرض جميع الإيصالات
    console.log('📋 قائمة الإيصالات:');
    allReturnReceipts.forEach(receipt => {
      console.log(`   - إيصال #${receipt.id}: ${receipt.customer?.name} - ${receipt.amount} LYD - ${receipt.paidAt?.toLocaleDateString('ar-EG')}`);
    });

    // 2. فحص أول عميل لديه إيصالات
    const firstReceipt = allReturnReceipts[0];
    if (!firstReceipt || !firstReceipt.customer) {
      console.log('❌ لم يتم العثور على بيانات العميل');
      return;
    }

    const customer = firstReceipt.customer;
    console.log(`\n✅ فحص تفصيلي للعميل: ${customer.name} (ID: ${customer.id})\n`);

    // 2. جلب إيصالات المردودات المدفوعة
    const returnReceipts = await prisma.supplierPaymentReceipt.findMany({
      where: {
        customerId: customer.id,
        type: 'RETURN',
        status: 'PAID'
      },
      orderBy: { paidAt: 'desc' }
    });

    console.log(`📦 إيصالات المردودات المدفوعة: ${returnReceipts.length}`);
    returnReceipts.forEach(receipt => {
      console.log(`   - إيصال #${receipt.id}: ${receipt.amount} LYD - ${receipt.paidAt?.toLocaleDateString('ar-EG')}`);
    });

    // 3. جلب قيود حساب العميل
    const customerAccountEntries = await prisma.customerAccount.findMany({
      where: {
        customerId: customer.id
      },
      orderBy: { transactionDate: 'desc' }
    });

    console.log(`\n📊 قيود حساب العميل: ${customerAccountEntries.length}`);
    customerAccountEntries.forEach(entry => {
      console.log(`   - ${entry.transactionType} | ${entry.referenceType} | Ref#${entry.referenceId} | ${entry.amount} LYD | ${entry.transactionDate.toLocaleDateString('ar-EG')}`);
      console.log(`     الوصف: ${entry.description || 'بدون وصف'}`);
    });

    // 4. التحقق من القيود المرتبطة بإيصالات المردودات
    console.log('\n🔍 التحقق من القيود المرتبطة بإيصالات المردودات:');
    
    for (const receipt of returnReceipts) {
      const relatedEntries = customerAccountEntries.filter(
        entry => entry.referenceId === receipt.id
      );

      console.log(`\n   إيصال #${receipt.id} (${receipt.amount} LYD):`);
      if (relatedEntries.length === 0) {
        console.log(`   ❌ لا توجد قيود في CustomerAccount لهذا الإيصال!`);
      } else {
        relatedEntries.forEach(entry => {
          console.log(`   ✅ قيد موجود: ${entry.transactionType} | ${entry.referenceType} | ${entry.amount} LYD`);
        });
      }
    }

    // 5. جلب المردودات نفسها
    const saleReturns = await prisma.saleReturn.findMany({
      where: {
        customerId: customer.id
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📋 مردودات المبيعات: ${saleReturns.length}`);
    saleReturns.forEach(ret => {
      console.log(`   - مردود #${ret.id}: ${ret.total} LYD - ${ret.status} - ${ret.createdAt.toLocaleDateString('ar-EG')}`);
    });

  } catch (error) {
    console.error('❌ خطأ:', error);
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
    console.error('\n❌ فشل:', error);
    process.exit(1);
  });

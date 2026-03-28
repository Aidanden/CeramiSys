import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * تحليل دقيق لتدفق المردودات والدفعات
 */

async function analyzeReturnFlow() {
  console.log('🔍 تحليل تدفق المردودات والدفعات...\n');

  try {
    // فحص العميل أنيس بدر
    const customer = await prisma.customer.findFirst({
      where: { name: { contains: 'انيس بدر' } }
    });

    if (!customer) {
      console.log('❌ لم يتم العثور على العميل');
      return;
    }

    console.log(`✅ العميل: ${customer.name} (ID: ${customer.id})\n`);

    // 1. جلب المردودات
    const returns = await prisma.saleReturn.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 المردودات (${returns.length}):`);
    for (const ret of returns) {
      console.log(`   مردود #${ret.id}: ${ret.total} LYD - ${ret.status}`);
      console.log(`   تاريخ الإنشاء: ${ret.createdAt.toLocaleDateString('ar-EG')}`);
      console.log(`   المدفوع: ${ret.paidAmount} / المتبقي: ${ret.remainingAmount}\n`);
    }

    // 2. جلب إيصالات الدفع
    const receipts = await prisma.supplierPaymentReceipt.findMany({
      where: {
        customerId: customer.id,
        type: 'RETURN'
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📦 إيصالات دفع المردودات (${receipts.length}):`);
    for (const receipt of receipts) {
      console.log(`   إيصال #${receipt.id}: ${receipt.amount} LYD - ${receipt.status}`);
      console.log(`   مردود مرتبط: #${receipt.saleReturnId || 'غير محدد'}`);
      console.log(`   تاريخ الإنشاء: ${receipt.createdAt.toLocaleDateString('ar-EG')}`);
      console.log(`   تاريخ الدفع: ${receipt.paidAt?.toLocaleDateString('ar-EG') || 'لم يُدفع'}\n`);
    }

    // 3. جلب قيود حساب العميل
    const entries = await prisma.customerAccount.findMany({
      where: { customerId: customer.id },
      orderBy: { transactionDate: 'desc' }
    });

    console.log(`📊 قيود حساب العميل (${entries.length}):`);
    let runningBalance = 0;
    
    // ترتيب عكسي لحساب الرصيد التراكمي
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    for (const entry of sortedEntries) {
      const change = entry.transactionType === 'DEBIT' 
        ? Number(entry.amount) 
        : -Number(entry.amount);
      runningBalance += change;

      console.log(`   ${entry.transactionDate.toLocaleDateString('ar-EG')} | ${entry.transactionType} | ${entry.referenceType} | Ref#${entry.referenceId}`);
      console.log(`   المبلغ: ${entry.amount} | الرصيد المحسوب: ${runningBalance.toFixed(2)} | الرصيد المسجل: ${entry.balance}`);
      console.log(`   الوصف: ${entry.description || 'بدون وصف'}\n`);
    }

    console.log(`\n💰 الرصيد النهائي المحسوب: ${runningBalance.toFixed(2)} LYD`);
    console.log(`💰 الرصيد المسجل في آخر قيد: ${entries[0]?.balance || 0} LYD`);

    // 4. تحليل المنطق
    console.log('\n' + '='.repeat(60));
    console.log('📝 التحليل:');
    console.log('='.repeat(60));

    for (const ret of returns) {
      console.log(`\nمردود #${ret.id} (${ret.total} LYD):`);
      
      // البحث عن قيد المردود
      const returnEntry = entries.find(e => 
        e.referenceType === 'RETURN' && e.referenceId === ret.id
      );
      
      if (returnEntry) {
        console.log(`  ✅ قيد المردود موجود: CREDIT ${returnEntry.amount} LYD`);
      } else {
        console.log(`  ❌ قيد المردود مفقود!`);
      }

      // البحث عن إيصال الدفع
      const receipt = receipts.find(r => r.saleReturnId === ret.id);
      
      if (receipt) {
        console.log(`  ✅ إيصال دفع موجود: #${receipt.id} - ${receipt.status}`);
        
        // البحث عن قيد الدفع
        const paymentEntry = entries.find(e => 
          e.referenceId === receipt.id && 
          (e.referenceType === 'PAYMENT' || e.referenceType === 'RETURN')
        );
        
        if (paymentEntry) {
          console.log(`  ⚠️  قيد دفع موجود: ${paymentEntry.transactionType} ${paymentEntry.amount} LYD`);
          console.log(`      هذا يسبب تكرار! المردود سُجل مرتين`);
        } else {
          console.log(`  ✅ لا يوجد قيد دفع (صحيح)`);
        }
      } else {
        console.log(`  ❌ لا يوجد إيصال دفع`);
      }
    }

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeReturnFlow()
  .then(() => {
    console.log('\n✅ اكتمل التحليل');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل:', error);
    process.exit(1);
  });

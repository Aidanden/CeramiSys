// اختبار المورد الرئيسي للفاتورة
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMainSupplier() {
  console.log('🎯 اختبار المورد الرئيسي للفاتورة');
  console.log('=' .repeat(60));

  try {
    // 1. البحث عن مشتريات معتمدة
    console.log('\n📋 البحث عن مشتريات معتمدة...');
    
    const approvedPurchases = await prisma.purchase.findMany({
      where: {
        status: 'APPROVED',
        supplierId: { not: null }
      },
      include: {
        supplier: true,
        expenses: {
          include: {
            supplier: true
          }
        }
      },
      orderBy: { approvedAt: 'desc' },
      take: 5
    });

    console.log(`✅ وجد ${approvedPurchases.length} مشتريات معتمدة`);

    if (approvedPurchases.length === 0) {
      console.log('⚠️  لا توجد مشتريات معتمدة للاختبار');
      console.log('💡 قم بإنشاء مشترى واعتماده أولاً');
      return;
    }

    // 2. اختبار كل مشترى
    for (const purchase of approvedPurchases) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 فاتورة مشتريات #${purchase.id}`);
      console.log(`   المورد الرئيسي: ${purchase.supplier.name} (ID: ${purchase.supplier.id})`);
      console.log(`   المبلغ الإجمالي: ${purchase.total} دينار`);
      console.log(`   عدد المصروفات: ${purchase.expenses.length}`);

      // 3. فحص إيصالات الدفع
      const receipts = await prisma.supplierPaymentReceipt.findMany({
        where: { purchaseId: purchase.id },
        include: { supplier: true }
      });

      console.log(`\n💳 إيصالات الدفع: ${receipts.length}`);
      
      const mainReceipt = receipts.find(r => r.type === 'MAIN_PURCHASE');
      const expenseReceipts = receipts.filter(r => r.type === 'EXPENSE');

      if (mainReceipt) {
        console.log(`   ✅ إيصال الفاتورة الرئيسية: ${mainReceipt.amount} دينار للمورد ${mainReceipt.supplier.name}`);
      } else {
        console.log(`   ❌ لا يوجد إيصال للفاتورة الرئيسية!`);
      }

      console.log(`   📋 إيصالات المصروفات: ${expenseReceipts.length}`);
      expenseReceipts.forEach(r => {
        console.log(`      - ${r.amount} دينار للمورد ${r.supplier.name} (${r.categoryName || 'غير محدد'})`);
      });

      // 4. فحص قيود حساب المورد الرئيسي
      console.log(`\n📊 قيود حساب المورد الرئيسي (${purchase.supplier.name}):`);
      
      const mainSupplierEntries = await prisma.supplierAccount.findMany({
        where: { 
          supplierId: purchase.supplier.id,
          OR: [
            { referenceType: 'PURCHASE' },
            { referenceType: 'PAYMENT' }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      console.log(`   عدد القيود: ${mainSupplierEntries.length}`);

      if (mainSupplierEntries.length === 0) {
        console.log(`   ❌ لا توجد قيود في حساب المورد الرئيسي!`);
        console.log(`   🔧 هذه هي المشكلة - يجب إنشاء قيد CREDIT عند اعتماد الفاتورة`);
      } else {
        const totalCredit = mainSupplierEntries
          .filter(e => e.transactionType === 'CREDIT')
          .reduce((sum, e) => sum + Number(e.amount), 0);
        
        const totalDebit = mainSupplierEntries
          .filter(e => e.transactionType === 'DEBIT')
          .reduce((sum, e) => sum + Number(e.amount), 0);
        
        const currentBalance = mainSupplierEntries.length > 0 ? Number(mainSupplierEntries[0].balance) : 0;

        console.log(`   💰 إجمالي المستحق (CREDIT): ${totalCredit} دينار`);
        console.log(`   💸 إجمالي المدفوع (DEBIT): ${totalDebit} دينار`);
        console.log(`   💵 الرصيد الحالي: ${currentBalance} دينار`);

        // التحقق من وجود قيد للفاتورة
        const purchaseEntry = mainSupplierEntries.find(e => 
          e.referenceType === 'PURCHASE' && 
          e.referenceId === (mainReceipt?.id || 0)
        );

        if (purchaseEntry) {
          console.log(`   ✅ يوجد قيد للفاتورة: ${purchaseEntry.amount} دينار`);
        } else {
          console.log(`   ❌ لا يوجد قيد للفاتورة في حساب المورد!`);
        }

        console.log(`\n   📝 آخر 3 قيود:`);
        mainSupplierEntries.slice(0, 3).forEach((entry, index) => {
          console.log(`      ${index + 1}. ${entry.transactionType}: ${entry.amount} دينار - ${entry.description}`);
        });
      }

      // 5. فحص قيود موردي المصروفات
      if (purchase.expenses.length > 0) {
        console.log(`\n📊 قيود موردي المصروفات:`);
        
        const expenseSupplierIds = [...new Set(purchase.expenses.map(e => e.supplierId).filter(Boolean))];
        
        for (const supplierId of expenseSupplierIds) {
          const supplier = purchase.expenses.find(e => e.supplierId === supplierId)?.supplier;
          if (!supplier) continue;

          const entries = await prisma.supplierAccount.findMany({
            where: { supplierId },
            orderBy: { createdAt: 'desc' },
            take: 5
          });

          const totalCredit = entries
            .filter(e => e.transactionType === 'CREDIT')
            .reduce((sum, e) => sum + Number(e.amount), 0);

          console.log(`   ${supplier.name}: ${entries.length} قيود، إجمالي ${totalCredit} دينار`);
        }
      }
    }

    // 6. ملخص عام
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 ملخص عام لحسابات الموردين:');
    
    const allSuppliers = await prisma.supplier.findMany({
      include: {
        accountEntries: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    console.log(`\n🏢 إجمالي الموردين: ${allSuppliers.length}`);
    
    const suppliersWithBalance = allSuppliers.filter(s => {
      const lastEntry = s.accountEntries[0];
      return lastEntry && Number(lastEntry.balance) !== 0;
    });

    console.log(`💰 موردين لهم رصيد: ${suppliersWithBalance.length}`);

    if (suppliersWithBalance.length > 0) {
      console.log(`\n📋 الموردين الذين لهم رصيد:`);
      suppliersWithBalance.slice(0, 5).forEach((supplier, index) => {
        const balance = Number(supplier.accountEntries[0].balance);
        console.log(`   ${index + 1}. ${supplier.name}: ${balance} دينار`);
      });
    }

    // 7. التحقق من المشكلة
    console.log(`\n${'='.repeat(60)}`);
    console.log('🔍 التحقق من المشكلة:');
    
    let issuesFound = false;

    for (const purchase of approvedPurchases) {
      const mainReceipt = await prisma.supplierPaymentReceipt.findFirst({
        where: {
          purchaseId: purchase.id,
          type: 'MAIN_PURCHASE'
        }
      });

      if (mainReceipt) {
        const accountEntry = await prisma.supplierAccount.findFirst({
          where: {
            supplierId: mainReceipt.supplierId,
            referenceType: 'PURCHASE',
            referenceId: mainReceipt.id
          }
        });

        if (!accountEntry) {
          console.log(`❌ فاتورة #${purchase.id}: إيصال موجود لكن لا يوجد قيد في حساب المورد!`);
          issuesFound = true;
        }
      }
    }

    if (!issuesFound) {
      console.log('✅ جميع الفواتير مربوطة بحسابات الموردين بشكل صحيح');
    } else {
      console.log('\n🔧 يجب تشغيل الخادم مرة أخرى لتطبيق الإصلاحات');
    }

  } catch (error) {
    console.error('\n❌ خطأ في الاختبار:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔚 انتهى الاختبار');
  }
}

testMainSupplier();

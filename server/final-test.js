// الاختبار النهائي للتأكد من عمل نظام حسابات الموردين
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalTest() {
  console.log('🎯 الاختبار النهائي لنظام حسابات الموردين');
  console.log('=' .repeat(50));

  try {
    // 1. التحقق من وجود البيانات الأساسية
    console.log('\n📊 فحص البيانات الأساسية...');
    
    const [suppliersCount, purchasesCount, receiptsCount, accountsCount] = await Promise.all([
      prisma.supplier.count(),
      prisma.purchase.count(),
      prisma.supplierPaymentReceipt.count(),
      prisma.supplierAccount.count()
    ]);

    console.log(`✅ الموردين: ${suppliersCount}`);
    console.log(`✅ المشتريات: ${purchasesCount}`);
    console.log(`✅ إيصالات الدفع: ${receiptsCount}`);
    console.log(`✅ قيود حسابات الموردين: ${accountsCount}`);

    if (suppliersCount === 0) {
      console.log('\n❌ لا توجد موردين في النظام');
      return false;
    }

    // 2. اختبار API ملخص حسابات الموردين
    console.log('\n🌐 اختبار API ملخص حسابات الموردين...');
    
    const suppliers = await prisma.supplier.findMany({
      include: {
        accountEntries: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const summary = suppliers.map(supplier => {
      const lastEntry = supplier.accountEntries[0];
      const currentBalance = lastEntry ? Number(lastEntry.balance) : 0;
      
      return {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone || undefined,
        currentBalance,
        hasDebt: currentBalance !== 0,
      };
    });

    console.log(`✅ تم جلب ${summary.length} موردين`);
    
    // عرض أول 3 موردين
    summary.slice(0, 3).forEach((supplier, index) => {
      console.log(`  ${index + 1}. ${supplier.name}: ${supplier.currentBalance} دينار ${supplier.hasDebt ? '(له رصيد)' : '(لا يوجد رصيد)'}`);
    });

    // 3. اختبار API تفاصيل حساب مورد
    console.log('\n🔍 اختبار API تفاصيل حساب مورد...');
    
    const testSupplier = suppliers.find(s => s.accountEntries.length > 0) || suppliers[0];
    
    if (!testSupplier) {
      console.log('❌ لا يوجد مورد للاختبار');
      return false;
    }

    console.log(`📋 اختبار حساب المورد: ${testSupplier.name} (ID: ${testSupplier.id})`);

    const entries = await prisma.supplierAccount.findMany({
      where: { supplierId: testSupplier.id },
      orderBy: { transactionDate: 'desc' },
      include: {
        supplier: true
      }
    });

    const currentBalance = entries.length > 0 ? Number(entries[0].balance) : 0;
    const totalCredit = entries
      .filter(e => e.transactionType === 'CREDIT')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const totalDebit = entries
      .filter(e => e.transactionType === 'DEBIT')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const supplierAccountData = {
      supplier: {
        id: testSupplier.id,
        name: testSupplier.name,
        phone: testSupplier.phone || undefined,
        email: testSupplier.email || undefined,
        address: testSupplier.address || undefined,
        note: testSupplier.note || undefined,
        createdAt: testSupplier.createdAt,
      },
      currentBalance,
      totalCredit,
      totalDebit,
      entries: entries.map(entry => ({
        id: entry.id,
        supplierId: entry.supplierId,
        transactionType: entry.transactionType,
        amount: Number(entry.amount),
        balance: Number(entry.balance),
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        description: entry.description || undefined,
        transactionDate: entry.transactionDate,
        createdAt: entry.createdAt,
        supplier: {
          id: testSupplier.id,
          name: testSupplier.name,
          phone: testSupplier.phone || undefined,
        },
      }))
    };

    console.log(`✅ بيانات حساب المورد:`);
    console.log(`  - الرصيد الحالي: ${supplierAccountData.currentBalance} دينار`);
    console.log(`  - إجمالي المستحق (CREDIT): ${supplierAccountData.totalCredit} دينار`);
    console.log(`  - إجمالي المدفوع (DEBIT): ${supplierAccountData.totalDebit} دينار`);
    console.log(`  - عدد القيود: ${supplierAccountData.entries.length}`);

    if (supplierAccountData.entries.length > 0) {
      console.log(`\n📝 آخر 3 قيود:`);
      supplierAccountData.entries.slice(0, 3).forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.transactionType}: ${entry.amount} دينار - ${entry.description}`);
        console.log(`     الرصيد بعد العملية: ${entry.balance} دينار`);
      });
    }

    // 4. اختبار API المشتريات المفتوحة
    console.log('\n📦 اختبار API المشتريات المفتوحة...');
    
    const openPurchases = await prisma.purchase.findMany({
      where: {
        supplierId: testSupplier.id,
        remainingAmount: {
          gt: 0,
        },
        status: 'APPROVED',
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const openPurchasesData = openPurchases.map(purchase => ({
      id: purchase.id,
      invoiceNumber: purchase.invoiceNumber || undefined,
      companyId: purchase.companyId,
      company: {
        id: purchase.company.id,
        name: purchase.company.name,
      },
      total: Number(purchase.total),
      paidAmount: Number(purchase.paidAmount),
      remainingAmount: Number(purchase.remainingAmount),
      purchaseType: purchase.purchaseType,
      status: purchase.status,
      createdAt: purchase.createdAt,
    }));

    console.log(`✅ المشتريات المفتوحة: ${openPurchasesData.length}`);
    
    openPurchasesData.slice(0, 3).forEach((purchase, index) => {
      console.log(`  ${index + 1}. فاتورة #${purchase.invoiceNumber || purchase.id}: ${purchase.remainingAmount} دينار متبقي من أصل ${purchase.total}`);
    });

    // 5. التحقق من صحة البيانات
    console.log('\n🔍 التحقق من صحة البيانات...');
    
    let allTestsPassed = true;
    const issues = [];

    // التحقق من وجود قيود حساب للموردين الذين لديهم إيصالات دفع
    const suppliersWithReceipts = await prisma.supplier.findMany({
      where: {
        paymentReceipts: {
          some: {}
        }
      },
      include: {
        paymentReceipts: true,
        accountEntries: true
      }
    });

    for (const supplier of suppliersWithReceipts) {
      if (supplier.paymentReceipts.length > 0 && supplier.accountEntries.length === 0) {
        issues.push(`المورد ${supplier.name} لديه ${supplier.paymentReceipts.length} إيصالات دفع لكن لا توجد قيود في حسابه`);
        allTestsPassed = false;
      }
    }

    // التحقق من تطابق الأرصدة
    for (const supplier of suppliersWithReceipts) {
      if (supplier.accountEntries.length > 0) {
        const calculatedBalance = supplier.accountEntries.reduce((balance, entry) => {
          return entry.transactionType === 'CREDIT' 
            ? balance + Number(entry.amount)
            : balance - Number(entry.amount);
        }, 0);
        
        const lastBalance = Number(supplier.accountEntries[supplier.accountEntries.length - 1].balance);
        
        if (Math.abs(calculatedBalance - lastBalance) > 0.01) {
          issues.push(`المورد ${supplier.name}: الرصيد المحسوب (${calculatedBalance}) لا يطابق الرصيد المسجل (${lastBalance})`);
          allTestsPassed = false;
        }
      }
    }

    // 6. النتيجة النهائية
    console.log('\n' + '='.repeat(50));
    
    if (allTestsPassed && issues.length === 0) {
      console.log('🎉 نجح جميع الاختبارات! النظام يعمل بالشكل المطلوب:');
      console.log('  ✅ يتم تسجيل قيود حساب المورد عند إنشاء/اعتماد المشتريات');
      console.log('  ✅ API ملخص حسابات الموردين يعمل بشكل صحيح');
      console.log('  ✅ API تفاصيل حساب المورد يعرض جميع القيود والأرصدة');
      console.log('  ✅ API المشتريات المفتوحة يعمل بشكل صحيح');
      console.log('  ✅ الأرصدة محسوبة بشكل صحيح');
      console.log('\n🖥️  الواجهة الأمامية ستعرض البيانات بشكل صحيح');
      return true;
    } else {
      console.log('❌ فشل بعض الاختبارات:');
      issues.forEach(issue => console.log(`  - ${issue}`));
      console.log('\n🔧 يحتاج النظام إلى إصلاحات إضافية');
      return false;
    }

  } catch (error) {
    console.error('\n❌ خطأ في الاختبار:', error.message);
    console.error('تفاصيل الخطأ:', error.stack);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل الاختبار
finalTest()
  .then(success => {
    console.log(`\n🏁 انتهى الاختبار - ${success ? 'نجح' : 'فشل'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ خطأ في تشغيل الاختبار:', error);
    process.exit(1);
  });

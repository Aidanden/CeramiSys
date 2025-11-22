// إصلاح البيانات القديمة - إنشاء قيود حساب المورد للفواتير المعتمدة
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixExistingData() {
  console.log('🔧 إصلاح البيانات القديمة - ربط الفواتير بحسابات الموردين');
  console.log('=' .repeat(70));

  try {
    // 1. جلب جميع إيصالات الدفع التي ليس لها قيود في حسابات الموردين
    console.log('\n📋 البحث عن إيصالات الدفع غير المربوطة...');
    
    const allReceipts = await prisma.supplierPaymentReceipt.findMany({
      where: {
        supplierId: { not: null }
      },
      include: {
        supplier: true,
        purchase: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`✅ وجد ${allReceipts.length} إيصال دفع`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. معالجة كل إيصال
    for (const receipt of allReceipts) {
      try {
        // التحقق من وجود قيد في حساب المورد
        const existingEntry = await prisma.supplierAccount.findFirst({
          where: {
            supplierId: receipt.supplierId,
            referenceType: receipt.type === 'RETURN' ? 'RETURN' : 'PURCHASE',
            referenceId: receipt.id
          }
        });

        if (existingEntry) {
          skippedCount++;
          continue; // القيد موجود بالفعل
        }

        // إنشاء قيد جديد
        console.log(`\n🔨 إصلاح إيصال #${receipt.id} (${receipt.type}) - المورد: ${receipt.supplier.name}`);

        // جلب آخر رصيد للمورد
        const lastEntry = await prisma.supplierAccount.findFirst({
          where: { supplierId: receipt.supplierId },
          orderBy: { createdAt: 'desc' }
        });

        const previousBalance = lastEntry ? Number(lastEntry.balance) : 0;
        const newBalance = previousBalance + Number(receipt.amount);

        // إنشاء القيد
        await prisma.supplierAccount.create({
          data: {
            supplierId: receipt.supplierId,
            transactionType: 'CREDIT',
            amount: receipt.amount,
            balance: newBalance,
            referenceType: receipt.type === 'RETURN' ? 'RETURN' : 'PURCHASE',
            referenceId: receipt.id,
            description: receipt.description || 
              (receipt.type === 'RETURN' 
                ? `مرتجع للمورد رقم ${receipt.id}`
                : receipt.type === 'EXPENSE'
                ? `مصروف على المورد رقم ${receipt.id}`
                : `فاتورة مشتريات للمورد رقم ${receipt.id}`),
            transactionDate: receipt.createdAt
          }
        });

        console.log(`   ✅ تم إنشاء قيد CREDIT: ${receipt.amount} دينار - الرصيد الجديد: ${newBalance}`);
        fixedCount++;

      } catch (error) {
        console.error(`   ❌ خطأ في معالجة إيصال #${receipt.id}:`, error.message);
        errorCount++;
      }
    }

    // 3. إعادة حساب الأرصدة لجميع الموردين
    console.log(`\n${'='.repeat(70)}`);
    console.log('🔄 إعادة حساب الأرصدة...');

    const suppliers = await prisma.supplier.findMany();

    for (const supplier of suppliers) {
      try {
        const entries = await prisma.supplierAccount.findMany({
          where: { supplierId: supplier.id },
          orderBy: { createdAt: 'asc' }
        });

        if (entries.length === 0) continue;

        let runningBalance = 0;
        
        for (const entry of entries) {
          if (entry.transactionType === 'CREDIT') {
            runningBalance += Number(entry.amount);
          } else {
            runningBalance -= Number(entry.amount);
          }

          // تحديث الرصيد إذا كان مختلفاً
          if (Math.abs(Number(entry.balance) - runningBalance) > 0.01) {
            await prisma.supplierAccount.update({
              where: { id: entry.id },
              data: { balance: runningBalance }
            });
          }
        }

        console.log(`   ✅ ${supplier.name}: ${entries.length} قيود، الرصيد النهائي: ${runningBalance}`);

      } catch (error) {
        console.error(`   ❌ خطأ في معالجة المورد ${supplier.name}:`, error.message);
      }
    }

    // 4. النتيجة النهائية
    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 ملخص الإصلاح:');
    console.log(`   ✅ تم إصلاح: ${fixedCount} إيصال`);
    console.log(`   ⏭️  تم تخطي: ${skippedCount} إيصال (موجود بالفعل)`);
    console.log(`   ❌ أخطاء: ${errorCount} إيصال`);

    // 5. التحقق النهائي
    console.log(`\n🔍 التحقق النهائي...`);

    const suppliersWithBalance = await prisma.supplier.findMany({
      include: {
        accountEntries: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const activeSuppliers = suppliersWithBalance.filter(s => {
      const lastEntry = s.accountEntries[0];
      return lastEntry && Number(lastEntry.balance) !== 0;
    });

    console.log(`   🏢 إجمالي الموردين: ${suppliersWithBalance.length}`);
    console.log(`   💰 موردين لهم رصيد: ${activeSuppliers.length}`);

    if (activeSuppliers.length > 0) {
      console.log(`\n   📋 أمثلة على الموردين الذين لهم رصيد:`);
      activeSuppliers.slice(0, 5).forEach((supplier, index) => {
        const balance = Number(supplier.accountEntries[0].balance);
        console.log(`      ${index + 1}. ${supplier.name}: ${balance} دينار`);
      });
    }

    console.log(`\n✅ تم إصلاح البيانات بنجاح!`);
    console.log(`💡 الآن يمكنك فتح شاشة حسابات الموردين ورؤية الأرصدة الصحيحة`);

  } catch (error) {
    console.error('\n❌ خطأ في الإصلاح:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔚 انتهى الإصلاح');
  }
}

// تشغيل الإصلاح
fixExistingData();

// اختبار سريع للتأكد من عمل النظام
console.log('🚀 بدء الاختبار السريع...');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickTest() {
  try {
    // اختبار الاتصال
    await prisma.$connect();
    console.log('✅ تم الاتصال بقاعدة البيانات');
    
    // عد البيانات
    const counts = await Promise.all([
      prisma.supplier.count(),
      prisma.supplierAccount.count(),
      prisma.supplierPaymentReceipt.count(),
      prisma.purchase.count()
    ]);
    
    console.log(`📊 الإحصائيات:`);
    console.log(`  - الموردين: ${counts[0]}`);
    console.log(`  - قيود حسابات الموردين: ${counts[1]}`);
    console.log(`  - إيصالات الدفع: ${counts[2]}`);
    console.log(`  - المشتريات: ${counts[3]}`);
    
    if (counts[0] > 0) {
      // جلب مورد واحد وحسابه
      const supplier = await prisma.supplier.findFirst();
      console.log(`\n🏢 اختبار المورد: ${supplier.name}`);
      
      const accountEntries = await prisma.supplierAccount.findMany({
        where: { supplierId: supplier.id },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      
      console.log(`📋 قيود الحساب: ${accountEntries.length}`);
      
      if (accountEntries.length > 0) {
        const totalCredit = accountEntries
          .filter(e => e.transactionType === 'CREDIT')
          .reduce((sum, e) => sum + Number(e.amount), 0);
          
        const totalDebit = accountEntries
          .filter(e => e.transactionType === 'DEBIT')
          .reduce((sum, e) => sum + Number(e.amount), 0);
          
        const currentBalance = Number(accountEntries[0].balance);
        
        console.log(`💰 ملخص الحساب:`);
        console.log(`  - إجمالي المستحق: ${totalCredit}`);
        console.log(`  - إجمالي المدفوع: ${totalDebit}`);
        console.log(`  - الرصيد الحالي: ${currentBalance}`);
        
        console.log(`\n📝 آخر 3 قيود:`);
        accountEntries.slice(0, 3).forEach((entry, index) => {
          console.log(`  ${index + 1}. ${entry.transactionType}: ${entry.amount} - ${entry.description}`);
        });
      }
      
      // اختبار API
      console.log(`\n🌐 محاكاة استدعاء API...`);
      
      const apiResponse = {
        supplier: {
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          note: supplier.note,
          createdAt: supplier.createdAt,
        },
        currentBalance: accountEntries.length > 0 ? Number(accountEntries[0].balance) : 0,
        totalDebit: accountEntries
          .filter(e => e.transactionType === 'DEBIT')
          .reduce((sum, e) => sum + Number(e.amount), 0),
        totalCredit: accountEntries
          .filter(e => e.transactionType === 'CREDIT')
          .reduce((sum, e) => sum + Number(e.amount), 0),
        entries: accountEntries.map(entry => ({
          id: entry.id,
          supplierId: entry.supplierId,
          transactionType: entry.transactionType,
          amount: Number(entry.amount),
          balance: Number(entry.balance),
          referenceType: entry.referenceType,
          referenceId: entry.referenceId,
          description: entry.description,
          transactionDate: entry.transactionDate,
          createdAt: entry.createdAt,
          supplier: {
            id: supplier.id,
            name: supplier.name,
            phone: supplier.phone,
          },
        }))
      };
      
      console.log('✅ استجابة API:');
      console.log(`  - الرصيد: ${apiResponse.currentBalance}`);
      console.log(`  - المستحق: ${apiResponse.totalCredit}`);
      console.log(`  - المدفوع: ${apiResponse.totalDebit}`);
      console.log(`  - القيود: ${apiResponse.entries.length}`);
      
      if (apiResponse.entries.length > 0 && (apiResponse.totalCredit > 0 || apiResponse.totalDebit > 0)) {
        console.log('\n🎉 النظام يعمل بشكل صحيح!');
        console.log('  ✅ توجد قيود في حساب المورد');
        console.log('  ✅ البيانات جاهزة للعرض في الواجهة الأمامية');
      } else {
        console.log('\n⚠️  لا توجد قيود في حساب المورد');
        console.log('  - قد تحتاج إلى إنشاء مشتريات واعتمادها');
      }
    }
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔚 انتهى الاختبار');
  }
}

quickTest().catch(console.error);

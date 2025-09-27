const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testStats() {
  console.log('🧪 Testing database stats...');
  
  try {
    // تحقق من الشركات
    const totalCompanies = await prisma.company.count();
    console.log('📈 Total companies:', totalCompanies);
    
    if (totalCompanies > 0) {
      const companies = await prisma.company.findMany({
        take: 5,
        select: { id: true, name: true, code: true, isParent: true }
      });
      console.log('📋 Companies:', companies);
      
      const parentCount = await prisma.company.count({ where: { isParent: true } });
      const branchCount = await prisma.company.count({ where: { isParent: false } });
      console.log('🏢 Parent companies:', parentCount);
      console.log('🏪 Branch companies:', branchCount);
    } else {
      console.log('❌ No companies found in database');
      
      // إنشاء شركة تجريبية
      console.log('🔧 Creating test company...');
      const testCompany = await prisma.company.create({
        data: {
          name: 'شركة تجريبية',
          code: 'TEST001',
          isParent: true,
        }
      });
      console.log('✅ Test company created:', testCompany);
    }
    
    // تحقق من المستخدمين
    const totalUsers = await prisma.users.count();
    console.log('👥 Total users:', totalUsers);
    
    if (totalUsers > 0) {
      const activeUsers = await prisma.users.count({ where: { IsActive: true } });
      const inactiveUsers = await prisma.users.count({ where: { IsActive: false } });
      console.log('✅ Active users:', activeUsers);
      console.log('❌ Inactive users:', inactiveUsers);
    }
    
    // تحقق من المنتجات
    const totalProducts = await prisma.product.count();
    console.log('📦 Total products:', totalProducts);
    
    // تحقق من المبيعات
    const totalSales = await prisma.sale.count();
    console.log('💰 Total sales:', totalSales);
    
  } catch (error) {
    console.error('❌ Error testing stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testStats();

import prisma from "../models/prismaClient";

async function simpleCheck() {
  try {
    console.log("🔍 التحقق من البيانات الجديدة...\n");
    
    // عدد المنتجات
    const productCount = await prisma.product.count();
    console.log(`📦 إجمالي المنتجات: ${productCount}`);
    
    // عدد الأسعار
    const priceCount = await prisma.companyProductPrice.count();
    console.log(`💰 إجمالي الأسعار: ${priceCount}`);
    
    // عدد المخزون
    const stockCount = await prisma.stock.count();
    console.log(`📊 إجمالي المخزون: ${stockCount}`);
    
    // عدد الموردين
    const supplierCount = await prisma.supplier.count();
    console.log(`🏪 إجمالي الموردين: ${supplierCount}`);
    
    // آخر 5 منتجات مضافة
    const latestProducts = await prisma.product.findMany({
      take: 5,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        name: true,
        sku: true,
        createdByCompanyId: true
      }
    });
    
    console.log(`\n🆕 آخر 5 منتجات مضافة:`);
    latestProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (${product.sku}) - ID: ${product.id} - شركة: ${product.createdByCompanyId}`);
    });
    
    // المورد
    const supplier = await prisma.supplier.findFirst();
    if (supplier) {
      console.log(`\n🏪 المورد: ${supplier.name}`);
      console.log(`   الهاتف: ${supplier.phone}`);
      console.log(`   العنوان: ${supplier.address}`);
    }
    
    console.log(`\n✅ تم التحقق بنجاح!`);
    
  } catch (error) {
    console.error("❌ خطأ في التحقق:", error);
  } finally {
    await prisma.$disconnect();
  }
}

simpleCheck();

import prisma from "../models/prismaClient";

async function checkNewProducts() {
  try {
    console.log("🔍 التحقق من المنتجات والأسعار الجديدة...\n");
    
    // جلب جميع المنتجات مع الأسعار والمخزون
    const products = await prisma.product.findMany({
      include: {
        prices: {
          include: {
            company: true
          }
        },
        stocks: {
          include: {
            company: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });
    
    console.log(`✅ تم العثور على ${products.length} منتج:\n`);
    
    // عرض المنتجات الجديدة (من ID 6 وما فوق)
    const newProducts = products.filter(p => p.id >= 50); // المنتجات الجديدة
    
    console.log(`🆕 المنتجات الجديدة (${newProducts.length} منتج):\n`);
    
    newProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (${product.sku})`);
      console.log(`   الوحدة: ${product.unit}`);
      console.log(`   الوحدات في الصندوق: ${product.unitsPerBox || 'غير محدد'}`);
      console.log(`   الشركة المنشئة: ${product.createdByCompanyId}`);
      
      // عرض الأسعار
      if (product.prices && product.prices.length > 0) {
        product.prices.forEach((price: any) => {
          console.log(`   💰 السعر (${price.company.name}): ${price.sellPrice} د.ل`);
        });
      } else {
        console.log(`   ⚠️ لا توجد أسعار محددة`);
      }
      
      // عرض المخزون
      if (product.stocks && product.stocks.length > 0) {
        product.stocks.forEach((stock: any) => {
          console.log(`   📦 المخزون (${stock.company.name}): ${stock.boxes} صندوق`);
        });
      } else {
        console.log(`   ⚠️ لا يوجد مخزون`);
      }
      
      console.log("   " + "─".repeat(60));
    });
    
    // إحصائيات عامة
    const totalProducts = products.length;
    const productsWithPrices = products.filter((p: any) => p.prices && p.prices.length > 0).length;
    const productsWithStock = products.filter((p: any) => p.stocks && p.stocks.length > 0).length;
    const company1Products = products.filter(p => p.createdByCompanyId === 1).length;
    const company2Products = products.filter(p => p.createdByCompanyId === 2).length;
    
    console.log(`\n📊 إحصائيات عامة:`);
    console.log(`   إجمالي المنتجات: ${totalProducts}`);
    console.log(`   المنتجات مع أسعار: ${productsWithPrices}`);
    console.log(`   المنتجات مع مخزون: ${productsWithStock}`);
    console.log(`   منتجات الشركة الأم (ID=1): ${company1Products}`);
    console.log(`   منتجات الشركة الفرعية (ID=2): ${company2Products}`);
    
  } catch (error) {
    console.error("❌ خطأ في التحقق من المنتجات:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNewProducts();

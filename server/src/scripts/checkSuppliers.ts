import prisma from "../models/prismaClient";

async function checkSuppliers() {
  try {
    console.log("🔍 التحقق من الموردين في قاعدة البيانات...\n");
    
    const suppliers = await prisma.supplier.findMany({
      orderBy: { id: 'asc' }
    });
    
    if (suppliers.length === 0) {
      console.log("❌ لا توجد موردين في قاعدة البيانات");
      return;
    }
    
    console.log(`✅ تم العثور على ${suppliers.length} مورد:\n`);
    
    suppliers.forEach((supplier, index) => {
      console.log(`${index + 1}. المورد ID: ${supplier.id}`);
      console.log(`   الاسم: ${supplier.name}`);
      console.log(`   الهاتف: ${supplier.phone || 'غير محدد'}`);
      console.log(`   البريد الإلكتروني: ${supplier.email || 'غير محدد'}`);
      console.log(`   العنوان: ${supplier.address || 'غير محدد'}`);
      console.log(`   ملاحظة: ${supplier.note || 'لا توجد ملاحظات'}`);
      console.log(`   تاريخ الإنشاء: ${supplier.createdAt.toLocaleString('ar-EG')}`);
      console.log("   " + "─".repeat(50));
    });
    
    // التحقق من الشركة الأم
    const parentCompany = await prisma.company.findFirst({
      where: { id: 1 }
    });
    
    if (parentCompany) {
      console.log(`\n🏢 الشركة الأم: ${parentCompany.name}`);
      console.log(`   ID: ${parentCompany.id}`);
      console.log(`   الكود: ${parentCompany.code}`);
      console.log(`   هل هي شركة أم: ${parentCompany.isParent ? 'نعم' : 'لا'}`);
    }
    
  } catch (error) {
    console.error("❌ خطأ في التحقق من الموردين:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuppliers();

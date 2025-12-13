const fs = require('fs');
const path = require('path');

// قراءة ملف التوثيق واستخراج أكواد الشركة 2
function extractCompany2SKUs() {
  const mdPath = path.join(__dirname, 'company2_sku_references.md');
  const mdContent = fs.readFileSync(mdPath, 'utf-8');
  
  const skus = [];
  const lines = mdContent.split('\n');
  
  for (const line of lines) {
    // البحث عن الأسطر التي تحتوي على جدول البيانات
    // الصيغة: | # | كود الصنف (شركة 2) | اسم الصنف (شركة 2) | الكود المرجعي | اسم الصنف المرجعي (شركة 1) |
    const match = line.match(/^\|\s*\d+\s*\|\s*(\d+)\s*\|/);
    if (match) {
      skus.push(match[1]);
    }
  }
  
  return skus;
}

// حذف الأصناف من ملف Product.json
function deleteProducts() {
  console.log('🚀 بدء عملية حذف أصناف الشركة 2...\n');
  
  // استخراج أكواد الشركة 2 من ملف التوثيق
  const skusToDelete = extractCompany2SKUs();
  console.log(`📋 تم العثور على ${skusToDelete.length} كود صنف للحذف من ملف التوثيق\n`);
  
  if (skusToDelete.length === 0) {
    console.log('❌ لم يتم العثور على أي أكواد للحذف!');
    return;
  }
  
  // قراءة ملف Product.json
  const productPath = path.join(__dirname, 'seedData', 'Product.json');
  const products = JSON.parse(fs.readFileSync(productPath, 'utf-8'));
  
  console.log(`📦 إجمالي الأصناف قبل الحذف: ${products.length}`);
  
  // فلترة الأصناف - الاحتفاظ بالأصناف التي ليست في قائمة الحذف
  const skuSet = new Set(skusToDelete);
  const remainingProducts = products.filter(product => {
    const shouldDelete = product.createdByCompanyId === 2 && skuSet.has(product.sku);
    if (shouldDelete) {
      console.log(`🗑️  حذف: ${product.sku} - ${product.name}`);
    }
    return !shouldDelete;
  });
  
  const deletedCount = products.length - remainingProducts.length;
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 ملخص العملية:`);
  console.log(`   📦 الأصناف قبل الحذف: ${products.length}`);
  console.log(`   🗑️  الأصناف المحذوفة: ${deletedCount}`);
  console.log(`   ✅ الأصناف المتبقية: ${remainingProducts.length}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  // حفظ الملف المحدث
  fs.writeFileSync(productPath, JSON.stringify(remainingProducts, null, 2), 'utf-8');
  
  console.log('✅ تم حفظ التغييرات في ملف Product.json بنجاح!');
  
  // كتابة النتائج في ملف log
  const logContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ملخص العملية:
   📦 الأصناف قبل الحذف: ${products.length}
   🗑️  الأصناف المحذوفة: ${deletedCount}
   ✅ الأصناف المتبقية: ${remainingProducts.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ تم حفظ التغييرات في ملف Product.json بنجاح!
`;
  fs.writeFileSync(path.join(__dirname, 'delete_log.txt'), logContent, 'utf-8');
}

// تشغيل السكريبت
try {
  deleteProducts();
} catch (error) {
  console.error('Error:', error.message);
  fs.writeFileSync(path.join(__dirname, 'delete_log.txt'), 'Error: ' + error.message + '\n' + error.stack, 'utf-8');
}

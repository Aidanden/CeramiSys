const fs = require('fs');
const path = require('path');

console.log('بدء التحويل...');

// قراءة ملف _em_product
const emProductPath = path.join(__dirname, '_em_product');
const productJsonPath = path.join(__dirname, 'seedData', 'Product.json');
const pricingJsonPath = path.join(__dirname, 'seedData', 'Pricing.json');

// قراءة الملف
const emProductContent = fs.readFileSync(emProductPath, 'utf-8');
const lines = emProductContent.split('\n');

// قراءة Product.json الحالي
const currentProducts = JSON.parse(fs.readFileSync(productJsonPath, 'utf-8'));

// فلترة أصناف الشركة 1 فقط (الاحتفاظ بها)
const company1Products = currentProducts.filter(p => p.createdByCompanyId === 1);

console.log(`عدد أصناف الشركة 1: ${company1Products.length}`);

// تحويل بيانات الشركة 2 من _em_product
const company2Products = [];
const company2Pricing = [];

// تخطي السطر الأول (العناوين)
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // تقسيم السطر بالتاب
  const parts = line.split('\t');
  
  if (parts.length < 6) {
    console.log(`تخطي سطر غير مكتمل ${i + 1}: ${line.substring(0, 50)}...`);
    continue;
  }
  
  // استخراج البيانات
  // الهيكل: كود	نوع 	عبوة	سعر البيع	التكلفة	الاسم
  let sku = parts[0].trim();
  
  // إذا كان الكود فارغاً، نتخطى
  if (!sku) {
    console.log(`تخطي سطر بدون كود ${i + 1}`);
    continue;
  }
  
  let unit = parts[1].trim() || 'صندوق';
  // تنظيف الوحدة
  if (!unit || unit === '0' || unit === '') {
    unit = 'صندوق';
  }
  
  const unitsPerBox = parseFloat(parts[2]) || 1;
  const sellPrice = parseFloat(parts[3]) || 0;
  const cost = parseFloat(parts[4]) || 0;
  const name = parts[5].trim();
  
  // إذا كان الاسم فارغاً، نتخطى
  if (!name) {
    console.log(`تخطي سطر بدون اسم ${i + 1}: ${sku}`);
    continue;
  }
  
  // إنشاء كائن المنتج
  const product = {
    sku: sku,
    name: name,
    unit: unit,
    unitsPerBox: unitsPerBox,
    createdByCompanyId: 2,
    cost: cost
  };
  
  company2Products.push(product);
  
  // إنشاء كائن التسعير
  if (sellPrice > 0) {
    const pricing = {
      productSku: sku,
      companyId: 2,
      sellPrice: sellPrice,
      cost: cost
    };
    company2Pricing.push(pricing);
  }
}

console.log(`عدد أصناف الشركة 2 المحولة: ${company2Products.length}`);
console.log(`عدد أسعار الشركة 2: ${company2Pricing.length}`);

// دمج الأصناف
const allProducts = [...company1Products, ...company2Products];

console.log(`إجمالي الأصناف: ${allProducts.length}`);

// كتابة ملف Product.json الجديد
fs.writeFileSync(productJsonPath, JSON.stringify(allProducts, null, 2), 'utf-8');
console.log(`تم كتابة ${productJsonPath}`);

// قراءة Pricing.json الحالي وإضافة أسعار الشركة 2
let currentPricing = [];
try {
  currentPricing = JSON.parse(fs.readFileSync(pricingJsonPath, 'utf-8'));
} catch (e) {
  console.log('ملف Pricing.json غير موجود، سيتم إنشاؤه');
}

// فلترة أسعار الشركة 1 فقط (الاحتفاظ بها)
const company1Pricing = currentPricing.filter(p => p.companyId === 1);

// دمج الأسعار
const allPricing = [...company1Pricing, ...company2Pricing];

console.log(`إجمالي الأسعار: ${allPricing.length}`);

// كتابة ملف Pricing.json الجديد
fs.writeFileSync(pricingJsonPath, JSON.stringify(allPricing, null, 2), 'utf-8');
console.log(`تم كتابة ${pricingJsonPath}`);

console.log('\n✅ تم التحويل بنجاح!');

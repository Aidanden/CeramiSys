const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'seedData/Product.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('Total products:', data.length);

// Count by company
const company1 = data.filter(p => p.createdByCompanyId === 1);
const company2 = data.filter(p => p.createdByCompanyId === 2);

console.log('Company 1 products:', company1.length);
console.log('Company 2 products:', company2.length);

// Company 1 SKUs map
const company1Skus = {};
company1.forEach(p => { company1Skus[p.sku] = p.name; });

// Find company 2 products with parentheses containing numbers that match company 1 SKUs
const results = [];
company2.forEach(p => {
  const matches = p.name.match(/\((\d+)\)/g);
  if (matches) {
    matches.forEach(m => {
      const refSku = m.replace(/[()]/g, '');
      if (company1Skus[refSku]) {
        results.push({
          sku: p.sku,
          name: p.name,
          refSku: refSku,
          refName: company1Skus[refSku]
        });
      }
    });
  }
});

console.log('\nMatching products (Company 2 with Company 1 SKU references):', results.length);
console.log('\nResults:');
results.forEach((r, i) => {
  console.log(`${i+1}. SKU: ${r.sku} | Name: ${r.name} | Ref SKU: ${r.refSku} | Ref Name: ${r.refName}`);
});

// Generate markdown file
let markdown = `# أصناف الشركة 2 التي تحتوي على أكواد أصناف الشركة 1

تم إنشاء هذا الملف تلقائياً لتوثيق أصناف الشركة 2 التي تحتوي في اسمها على رقم كود (SKU) موجود في صنف من الشركة 1.

---

## إحصائيات:

| البند | العدد |
|-------|-------|
| إجمالي أصناف الشركة 1 | ${company1.length} |
| إجمالي أصناف الشركة 2 | ${company2.length} |
| أصناف الشركة 2 المطابقة | ${results.length} |

---

## قائمة الأصناف المطابقة:

`;

if (results.length > 0) {
  markdown += `| # | كود الصنف (شركة 2) | اسم الصنف (شركة 2) | الكود المرجعي | اسم الصنف المرجعي (شركة 1) |
|---|---------------------|---------------------|---------------|------------------------------|
`;
  results.forEach((r, i) => {
    markdown += `| ${i+1} | ${r.sku} | ${r.name} | ${r.refSku} | ${r.refName} |\n`;
  });
} else {
  markdown += `**لا توجد أصناف في الشركة 2 تحتوي على أكواد أصناف من الشركة 1 بين أقواس.**

### ملاحظة:
أصناف الشركة 2 لا تتبع نفس نمط التسمية المستخدم في الشركة 1 (الذي يحتوي على أرقام مرجعية بين أقواس).
`;
}

markdown += `
---

## تاريخ الإنشاء:
تم إنشاء هذا الملف في: ${new Date().toISOString().split('T')[0]}
`;

const outputPath = path.join(__dirname, 'company2_sku_references.md');
fs.writeFileSync(outputPath, markdown, 'utf8');
console.log('\nMarkdown file saved to:', outputPath);

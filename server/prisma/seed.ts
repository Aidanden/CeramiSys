/// <reference types="node" />
import prisma from "../src/models/prismaClient";// استيراد الاتصال بـ Prisma
import QRCode from 'qrcode';
const fs = require("fs");
const path = require("path");

// Map لحفظ الأصناف المُنشأة للاستخدام في Stock و CompanyProductPrice
const createdProductsMap = new Map<number, number>(); // oldId -> newId

// Map لحفظ التكلفة من ملف product_seed_
const productCostMap = new Map<string, number>(); // sku -> cost

// قراءة التكلفة من ملف product_seed_
function loadProductCosts() {
  const seedFilePath = path.resolve("prisma", "product_seed_");
  if (!fs.existsSync(seedFilePath)) {
    console.log("⚠️ ملف product_seed_ غير موجود، سيتم تخطي التكلفة");
    return;
  }

  const content = fs.readFileSync(seedFilePath, "utf-8");
  const lines = content.split("\n");

  // تخطي السطر الأول (العناوين)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // تقسيم السطر بالتاب
    const parts = line.split("\t");
    if (parts.length >= 5) {
      const sku = parts[0].trim();
      const costStr = parts[4].trim();
      const cost = parseFloat(costStr);

      if (sku && !isNaN(cost) && cost > 0) {
        productCostMap.set(sku, cost);
      }
    }
  }

  console.log(`✅ تم تحميل ${productCostMap.size} تكلفة من ملف product_seed_`);
}


async function deleteAllData() {
  // Delete in reverse order to handle foreign key constraints
  const deletionOrder = [
    "notification",                  // Notification model
    "treasuryTransaction",           // TreasuryTransaction model
    "treasury",                      // Treasury model
    "returnOrder",                   // ReturnOrder model
    "dispatchOrder",                 // DispatchOrder model
    "purchaseFromParentReceipt",     // PurchaseFromParentReceipt model
    "receipt",                       // Receipt model
    "purchaseFromParentLine",        // PurchaseFromParentLine model
    "purchaseFromParent",            // PurchaseFromParent model
    "purchaseExpense",               // PurchaseExpense model (مصروفات المشتريات)
    "expenseCategorySupplier",       // ExpenseCategorySupplier model (ربط الموردين بفئات المصروفات)
    "purchaseExpenseCategory",       // PurchaseExpenseCategory model (فئات مصروفات المشتريات)
    "paymentReceiptInstallment",     // PaymentReceiptInstallment model (أقساط إيصالات الدفع)
    "supplierPaymentReceipt",        // SupplierPaymentReceipt model (إيصالات دفع الموردين)
    "supplierAccount",               // SupplierAccount model (حسابات الموردين) - يجب حذفه قبل Supplier
    "purchasePayment",               // PurchasePayment model
    "purchaseLine",                  // PurchaseLine model
    "purchase",                      // Purchase model
    "supplier",                      // Supplier model
    "saleReturnLine",                // SaleReturnLine model
    "saleReturn",                    // SaleReturn model
    "salePayment",                   // SalePayment model
    "customerAccount",               // CustomerAccount model (حسابات العملاء) - يجب حذفه قبل Customer
    "provisionalSaleLine",           // ProvisionalSaleLine model
    "provisionalSale",               // ProvisionalSale model
    "saleLine",                      // SaleLine model
    "sale",                          // Sale model
    "customer",                      // Customer model
    "userSessions",                  // UserSessions model
    "companyProductPrice",           // CompanyProductPrice model
    "stock",                         // Stock model
    "damageReportLine",              // DamageReportLine model (أسطر محاضر الإتلاف)
    "damageReport",                  // DamageReport model (محاضر الإتلاف)
    "externalStoreInvoiceLine",      // ExternalStoreInvoiceLine model (أسطر فواتير المخازن الخارجية)
    "externalStoreInvoice",          // ExternalStoreInvoice model (فواتير المخازن الخارجية)
    "product",                       // Product model
    "users",                         // Users model
    "userRoles",                     // UserRoles model
    "company"                        // Company model
  ];

  for (const modelName of deletionOrder) {
    const model: any = prisma[modelName as keyof typeof prisma];
    if (model) {
      await model.deleteMany({});
      console.log(`✅ Cleared data from ${modelName}`);
    } else {
      console.error(
        `❌ Model ${modelName} not found. Please ensure the model name is correctly specified.`
      );
    }
  }
}

async function main() {
  // تحميل التكلفة من ملف product_seed_
  loadProductCosts();

  const dataDirectory = path.resolve("prisma", "seedData");

  const orderedFileNames = [
    "Company.json",
    "UserRoles.json",
    "Users.json",
    "Product.json",
    "Stock.json",
    "CompanyProductPrice.json",
    "Customer.json",
    "Supplier.json",
    "PurchaseExpenseCategory.json",
    "ExpenseCategorySupplier.json",
    "Treasury.json"
  ];

  await deleteAllData();

  for (const fileName of orderedFileNames) {
    const filePath = path.join(dataDirectory, fileName);
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const baseModelName = path.basename(fileName, path.extname(fileName));

    // تحويل أسماء النماذج إلى أسماء Prisma الصحيحة
    let modelName: string;
    switch (baseModelName) {
      case 'Company':
        modelName = 'company';
        break;
      case 'UserRoles':
        modelName = 'userRoles';
        break;
      case 'Users':
        modelName = 'users';
        break;
      case 'Product':
        modelName = 'product';
        break;
      case 'Stock':
        modelName = 'stock';
        break;
      case 'CompanyProductPrice':
        modelName = 'companyProductPrice';
        break;
      case 'Customer':
        modelName = 'customer';
        break;
      case 'Supplier':
        modelName = 'supplier';
        break;
      case 'PurchaseExpenseCategory':
        modelName = 'purchaseExpenseCategory';
        break;
      case 'ExpenseCategorySupplier':
        modelName = 'expenseCategorySupplier';
        break;
      default:
        modelName = baseModelName.toLowerCase();
    }

    const model: any = prisma[modelName as keyof typeof prisma];

    if (!model) {
      console.error(`No Prisma model matches the file name: ${fileName} (looking for: ${modelName})`);
      continue;
    }

    // معالجة خاصة للأصناف - توليد QR Code
    if (modelName === 'product') {
      let productCount = 0;
      let oldId = 1; // عداد للـ IDs القديمة (1, 2, 3, ...)

      for (const data of jsonData) {
        try {
          // الحصول على التكلفة - أولاً من الـ JSON ثم من ملف product_seed_
          const costFromJson = data.cost;
          const costFromFile = productCostMap.get(data.sku);
          const cost = costFromJson !== undefined ? costFromJson : costFromFile;

          // إزالة cost من data لأننا سنضيفها بشكل منفصل
          const { cost: _, ...dataWithoutCost } = data;

          let createdProduct;

          // 1. إذا كان الـ QR موجوداً مسبقاً في الـ seed، نستخدمه وننشئ الصنف مباشرة
          if (data.qrCode) {
            createdProduct = await model.create({
              data: {
                ...dataWithoutCost,
                cost: cost || null,
              },
            });
          } else {
            // 2. إذا لم يكن موجوداً، نقوم بتوليد واحد أولي ثم تحديثه بالـ ID (المنطق القديم)
            const qrData = {
              id: null,
              sku: data.sku,
              name: data.name,
              unit: data.unit,
              unitsPerBox: data.unitsPerBox
            };

            const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
              errorCorrectionLevel: 'M',
              type: 'image/png',
              width: 300,
              margin: 1
            });

            createdProduct = await model.create({
              data: {
                ...dataWithoutCost,
                cost: cost || null,
                qrCode: qrCodeDataUrl
              },
            });

            // تحديث QR Code ليشمل الـ ID الحقيقي
            const updatedQrData = {
              id: createdProduct.id,
              sku: createdProduct.sku,
              name: createdProduct.name,
              unit: createdProduct.unit,
              unitsPerBox: createdProduct.unitsPerBox
            };

            const finalQrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(updatedQrData), {
              errorCorrectionLevel: 'M',
              type: 'image/png',
              width: 300,
              margin: 1
            });

            await prisma.product.update({
              where: { id: createdProduct.id },
              data: { qrCode: finalQrCodeDataUrl }
            });

            // تحديث الكائن المحلي لعرض البيانات الصحيحة في اللوج
            createdProduct.qrCode = finalQrCodeDataUrl;
          }

          // حفظ mapping بين الـ ID القديم والجديد (مهم للجداول الأخرى)
          createdProductsMap.set(oldId, createdProduct.id);
          oldId++;

          productCount++;
          const costInfo = cost ? ` - التكلفة: ${cost}` : '';
          console.log(`  ✅ [${productCount}/${jsonData.length}] تم إنشاء الصنف: ${createdProduct.name} (${createdProduct.sku}) - ID: ${createdProduct.id}${costInfo}`);
        } catch (error) {
          console.error(`  ❌ فشل في إنشاء الصنف: ${data.name}`, error);
        }
      }
      console.log(`\n🎉 تم إنشاء ${productCount} صنف مع QR Code بنجاح!\n`);
    } else if (modelName === 'stock') {
      // معالجة خاصة للمخزون - استخدام الـ IDs الجديدة
      let stockCount = 0;
      for (const data of jsonData) {
        try {
          // الحصول على الـ ID الجديد من الـ mapping
          const newProductId = createdProductsMap.get(data.productId);

          if (!newProductId) {
            console.error(`  ⚠️ تخطي Stock: productId ${data.productId} غير موجود في الأصناف المُنشأة`);
            continue;
          }

          await model.create({
            data: {
              ...data,
              productId: newProductId // استخدام الـ ID الجديد
            },
          });

          stockCount++;
          console.log(`  ✅ [${stockCount}/${jsonData.length}] تم إنشاء Stock: Company ${data.companyId}, Product ${newProductId}, Boxes: ${data.boxes}`);
        } catch (error) {
          console.error(`  ❌ فشل في إنشاء Stock:`, error);
        }
      }
      console.log(`✅ Seeded ${modelName} with ${stockCount} records from ${fileName}`);
    } else if (modelName === 'companyProductPrice') {
      // معالجة خاصة لأسعار الشركات - استخدام الـ IDs الجديدة
      let priceCount = 0;
      for (const data of jsonData) {
        try {
          // الحصول على الـ ID الجديد من الـ mapping
          const newProductId = createdProductsMap.get(data.productId);

          if (!newProductId) {
            console.error(`  ⚠️ تخطي CompanyProductPrice: productId ${data.productId} غير موجود في الأصناف المُنشأة`);
            continue;
          }

          await model.create({
            data: {
              ...data,
              productId: newProductId // استخدام الـ ID الجديد للصنف
            },
          });

          priceCount++;
          console.log(`  ✅ [${priceCount}/${jsonData.length}] تم إنشاء السعر: الشركة ${data.companyId}, الصنف ${newProductId}, السعر: ${data.sellPrice}`);
        } catch (error) {
          console.error(`  ❌ فشل في إنشاء السعر:`, error);
        }
      }
      console.log(`\n🎉 تم إنشاء ${priceCount} سعر بنجاح!\n`);
    } else if (modelName === 'expenseCategorySupplier') {
      // معالجة خاصة لربط الفئات بالموردين اعتمادًا على الأسماء
      for (const data of jsonData) {
        const { categoryName, supplierName } = data;

        if (!categoryName || !supplierName) {
          console.warn(`⚠️ تخطي ربط فئة/مورد لعدم وجود الأسماء الكاملة:`, data);
          continue;
        }

        const category = await prisma.purchaseExpenseCategory.findFirst({
          where: { name: categoryName }
        });

        if (!category) {
          console.warn(`⚠️ لم يتم العثور على فئة المصروف بالاسم ${categoryName}، سيتم التخطي.`);
          continue;
        }

        const supplier = await prisma.supplier.findFirst({
          where: { name: supplierName }
        });

        if (!supplier) {
          console.warn(`⚠️ لم يتم العثور على المورد بالاسم ${supplierName}، سيتم التخطي.`);
          continue;
        }

        await model.create({
          data: {
            categoryId: category.id,
            supplierId: supplier.id
          }
        });
        console.log(`  ✅ تم ربط الفئة "${categoryName}" مع المورد "${supplierName}"`);
      }
      console.log(`✅ Seeded ${modelName} based on names mapping from ${fileName}`);
    } else {
      // معالجة عادية للجداول الأخرى
      for (const data of jsonData) {
        await model.create({
          data,
        });
      }
      console.log(`✅ Seeded ${modelName} with data from ${fileName}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/// <reference types="node" />
import prisma from "../src/models/prismaClient";// استيراد الاتصال بـ Prisma
import QRCode from 'qrcode';
const fs = require("fs");
const path = require("path");


async function deleteAllData() {
  // Delete in reverse order to handle foreign key constraints
  const deletionOrder = [
    "notification",                  // Notification model
    "dispatchOrder",                 // DispatchOrder model
    "purchaseFromParentReceipt",     // PurchaseFromParentReceipt model
    "receipt",                       // Receipt model
    "purchaseFromParentLine",        // PurchaseFromParentLine model
    "purchaseFromParent",            // PurchaseFromParent model
    "purchasePayment",               // PurchasePayment model
    "purchaseLine",                  // PurchaseLine model
    "purchase",                      // Purchase model
    "supplier",                      // Supplier model
    "saleReturnLine",                // SaleReturnLine model
    "saleReturn",                    // SaleReturn model
    "salePayment",                   // SalePayment model
    "provisionalSaleLine",           // ProvisionalSaleLine model
    "provisionalSale",               // ProvisionalSale model
    "saleLine",                      // SaleLine model
    "sale",                          // Sale model
    "customer",                      // Customer model
    "userSessions",                  // UserSessions model
    "companyProductPrice",           // CompanyProductPrice model
    "stock",                         // Stock model
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
  const dataDirectory = path.resolve("prisma", "seedData");

  const orderedFileNames = [
    "Company.json",
    "UserRoles.json", 
    "Users.json",
    "Product.json",
    "Stock.json",
    "CompanyProductPrice.json",
    "Customer.json"
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
      for (const data of jsonData) {
        try {
          // توليد QR Code للصنف
          const qrData = {
            id: null, // سيتم تحديثه بعد الإنشاء
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

          // إنشاء الصنف مع QR Code
          const createdProduct = await model.create({
            data: {
              ...data,
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

          // تحديث الصنف بـ QR Code النهائي
          await prisma.product.update({
            where: { id: createdProduct.id },
            data: { qrCode: finalQrCodeDataUrl }
          });

          productCount++;
          console.log(`  ✅ [${productCount}/${jsonData.length}] تم إنشاء الصنف مع QR Code: ${createdProduct.name} (${createdProduct.sku})`);
        } catch (error) {
          console.error(`  ❌ فشل في إنشاء الصنف: ${data.name}`, error);
        }
      }
      console.log(`\n🎉 تم إنشاء ${productCount} صنف مع QR Code بنجاح!\n`);
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

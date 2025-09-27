/// <reference types="node" />
import prisma from "../src/models/prismaClient";// استيراد الاتصال بـ Prisma
const fs = require("fs");
const path = require("path");


async function deleteAllData() {
  // Delete in reverse order to handle foreign key constraints
  const deletionOrder = [
    "userSessions",  // UserSessions model
    "users",         // Users model
    "userRoles",     // UserRoles model
    "company"        // Company model
  ];

  for (const modelName of deletionOrder) {
    const model: any = prisma[modelName as keyof typeof prisma];
    if (model) {
      await model.deleteMany({});
      console.log(`Cleared data from ${modelName}`);
    } else {
      console.error(
        `Model ${modelName} not found. Please ensure the model name is correctly specified.`
      );
    }
  }
}

async function main() {
  const dataDirectory = path.resolve("prisma", "seedData");

  const orderedFileNames = [
    "Company.json",
    "UserRoles.json", 
    "Users.json"
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
      default:
        modelName = baseModelName.toLowerCase();
    }

    const model: any = prisma[modelName as keyof typeof prisma];

    if (!model) {
      console.error(`No Prisma model matches the file name: ${fileName} (looking for: ${modelName})`);
      continue;
    }

    for (const data of jsonData) {
      await model.create({
        data,
      });
    }

    console.log(`Seeded ${modelName} with data from ${fileName}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

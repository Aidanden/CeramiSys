const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addCustomers() {
  try {
    const customers = [
      {
        name: "أحمد محمد علي",
        phone: "0912345678",
        note: "عميل دائم - خصم 5%"
      },
      {
        name: "فاطمة أحمد السالم",
        phone: "0923456789",
        note: "عميل جديد"
      },
      {
        name: "محمد عبدالله الهادي",
        phone: "0934567890",
        note: "عميل مقاول - دفع شهري"
      },
      {
        name: "عائشة سالم المبروك",
        phone: "0945678901",
        note: null
      },
      {
        name: "عبدالرحمن محمد القذافي",
        phone: "0956789012",
        note: "عميل VIP - خصم 10%"
      }
    ];

    for (const customer of customers) {
      await prisma.customer.create({
        data: customer
      });
      console.log(`تم إضافة العميل: ${customer.name}`);
    }

    console.log('تم إضافة جميع العملاء بنجاح!');
  } catch (error) {
    console.error('خطأ في إضافة العملاء:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCustomers();

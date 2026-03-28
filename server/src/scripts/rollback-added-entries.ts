import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * سكريبت لحذف القيود الخاطئة التي أضافها السكريبت السابق
 */

async function rollbackAddedEntries() {
  console.log('🔄 بدء حذف القيود الخاطئة...\n');

  try {
    // حذف القيود التي أضافها السكريبت (referenceType = RETURN و referenceId في إيصالات المردودات)
    const paidReturnReceipts = await prisma.supplierPaymentReceipt.findMany({
      where: {
        type: 'RETURN',
        status: 'PAID',
        customerId: { not: null }
      },
      select: { id: true }
    });

    const receiptIds = paidReturnReceipts.map(r => r.id);

    const result = await prisma.customerAccount.deleteMany({
      where: {
        referenceType: 'RETURN',
        referenceId: { in: receiptIds },
        description: {
          contains: 'صرف مردود مبيعات - إيصال رقم'
        }
      }
    });

    console.log(`✅ تم حذف ${result.count} قيد خاطئ\n`);

  } catch (error) {
    console.error('❌ خطأ:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

rollbackAddedEntries()
  .then(() => {
    console.log('✅ اكتمل الحذف بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل:', error);
    process.exit(1);
  });

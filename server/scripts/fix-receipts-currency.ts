import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixExistingReceipts() {
    console.log('🔄 البدء في إصلاح إيصالات الدفع القديمة...');

    // 1. إصلاح الإيصالات الرئيسية (MAIN_PURCHASE)
    const mainReceipts = await prisma.supplierPaymentReceipt.findMany({
        where: {
            type: 'MAIN_PURCHASE',
            OR: [
                { amountForeign: null },
                { currency: 'LYD' }
            ],
            purchaseId: { not: null }
        },
        include: {
            purchase: true
        }
    });

    console.log(`📌 وجد ${mainReceipts.length} إيصال رئيسي بحاجة لفحص.`);

    let mainFixed = 0;
    for (const receipt of mainReceipts) {
        if (receipt.purchase && receipt.purchase.currency !== 'LYD') {
            await prisma.supplierPaymentReceipt.update({
                where: { id: receipt.id },
                data: {
                    currency: receipt.purchase.currency,
                    exchangeRate: receipt.purchase.exchangeRate,
                    amountForeign: receipt.purchase.totalForeign
                }
            });
            mainFixed++;
        }
    }
    console.log(`✅ تم إصلاح ${mainFixed} إيصال رئيسي.`);

    // 2. إصلاح إيصالات المصروفات (EXPENSE) 
    const expenseReceipts = await prisma.supplierPaymentReceipt.findMany({
        where: {
            type: 'EXPENSE',
            OR: [
                { amountForeign: null },
                { currency: 'LYD' }
            ],
            purchaseId: { not: null }
        }
    });

    console.log(`📌 وجد ${expenseReceipts.length} إيصال مصروف بحاجة لفحص.`);

    let expenseFixed = 0;
    for (const receipt of expenseReceipts) {
        // البحث عن المصروف المرتبط
        const expense = await prisma.purchaseExpense.findFirst({
            where: {
                purchaseId: receipt.purchaseId!,
                supplierId: receipt.supplierId,
                // نطابق السعر أيضاً بدقة لتجنب الخلط بين مصروفات مختلفة لنفس المورد في نفس الفاتورة
                amount: receipt.amount
            }
        });

        if (expense && expense.currency && expense.currency !== 'LYD') {
            await prisma.supplierPaymentReceipt.update({
                where: { id: receipt.id },
                data: {
                    currency: expense.currency,
                    exchangeRate: expense.exchangeRate || 1,
                    amountForeign: expense.amountForeign
                }
            });
            expenseFixed++;
        }
    }
    console.log(`✅ تم إصلاح ${expenseFixed} إيصال مصروف.`);

    console.log('🏁 تم الانتهاء من العملية بنجاح.');
}

fixExistingReceipts()
    .catch(e => {
        console.error('❌ خطأ في السكريبت:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

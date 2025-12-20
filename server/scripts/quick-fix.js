const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log('Start fixing...');

    // Fix MAIN_PURCHASE
    const mains = await prisma.supplierPaymentReceipt.findMany({
        where: { type: 'MAIN_PURCHASE', currency: 'LYD' },
        include: { purchase: true }
    });

    console.log(`Found ${mains.length} main receipts`);
    for (const r of mains) {
        if (r.purchase && r.purchase.currency !== 'LYD') {
            await prisma.supplierPaymentReceipt.update({
                where: { id: r.id },
                data: {
                    currency: r.purchase.currency,
                    exchangeRate: r.purchase.exchangeRate,
                    amountForeign: r.purchase.totalForeign
                }
            });
            process.stdout.write('.');
        }
    }
    console.log('\nMain receipts fixed.');

    // Fix EXPENSE
    const expenses = await prisma.supplierPaymentReceipt.findMany({
        where: { type: 'EXPENSE', currency: 'LYD' }
    });

    console.log(`Found ${expenses.length} expense receipts`);
    for (const r of expenses) {
        const exp = await prisma.purchaseExpense.findFirst({
            where: {
                purchaseId: r.purchaseId,
                supplierId: r.supplierId,
                amount: r.amount
            }
        });

        if (exp && exp.currency !== 'LYD') {
            await prisma.supplierPaymentReceipt.update({
                where: { id: r.id },
                data: {
                    currency: exp.currency,
                    exchangeRate: exp.exchangeRate,
                    amountForeign: exp.amountForeign
                }
            });
            process.stdout.write('+');
        }
    }
    console.log('\nExpense receipts fixed.');
}

fix().catch(console.error).finally(() => prisma.$disconnect());

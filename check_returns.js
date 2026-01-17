const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const approvedReturns = await prisma.saleReturn.findMany({
        where: { status: 'APPROVED' },
        include: { customer: true }
    });

    console.log(`Found ${approvedReturns.length} approved returns.`);

    for (const ret of approvedReturns) {
        const accountEntry = await prisma.customerAccount.findFirst({
            where: {
                customerId: ret.customerId,
                referenceType: 'RETURN',
                referenceId: ret.id
            }
        });

        if (!accountEntry) {
            console.log(`Return #${ret.id} for Customer ${ret.customer.name} (Amount: ${ret.total}) - HAS NO ACCOUNT ENTRY!`);
        } else {
            console.log(`Return #${ret.id} - Account Entry Found (Amount: ${accountEntry.amount})`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

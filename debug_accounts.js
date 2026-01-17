const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const accounts = await prisma.customerAccount.findMany({
        where: {
            transactionType: 'CREDIT',
            referenceType: 'RETURN'
        },
        include: {
            customer: true
        }
    });

    console.log('Customer Account Entries (CREDIT - RETURN):');
    console.log(JSON.stringify(accounts, null, 2));

    const allTypes = await prisma.customerAccount.groupBy({
        by: ['transactionType', 'referenceType'],
        _count: true,
        _sum: {
            amount: true
        }
    });

    console.log('Summary of all transactions:');
    console.log(JSON.stringify(allTypes, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding exchange rates...');

    await prisma.globalSettings.upsert({
        where: { key: 'USD_EXCHANGE_RATE' },
        update: {},
        create: { key: 'USD_EXCHANGE_RATE', value: '4.80' },
    });

    await prisma.globalSettings.upsert({
        where: { key: 'EUR_EXCHANGE_RATE' },
        update: {},
        create: { key: 'EUR_EXCHANGE_RATE', value: '5.20' },
    });

    console.log('Seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

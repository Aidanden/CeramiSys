
import { PrismaClient } from './generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting DB fix...');
    try {
        // Add totalDiscountPercentage if not exists
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "totalDiscountPercentage" DECIMAL(5,2) DEFAULT 0;
    `);
        console.log('Added totalDiscountPercentage column');

        // Add totalDiscountAmount if not exists
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "totalDiscountAmount" DECIMAL(18,4) DEFAULT 0;
    `);
        console.log('Added totalDiscountAmount column');

    } catch (err) {
        console.error('Error fixing DB:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();

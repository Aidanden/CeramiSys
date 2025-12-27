
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const products = await prisma.product.findMany({
            include: {
                group: true
            },
            take: 1
        });
        console.log('Success:', products);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

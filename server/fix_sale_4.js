
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Update SaleLine 44 to be from parent
    const updated = await prisma.saleLine.update({
        where: { id: 44 },
        data: { isFromParentCompany: true }
    });
    console.log("Updated Line 44:", updated);
}

main().finally(() => prisma.$disconnect());


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking Sale #4 lines fully...");
    const sale = await prisma.sale.findUnique({
        where: { id: 4 },
        include: {
            lines: {
                include: {
                    product: true
                }
            }
        }
    });

    if (!sale) {
        console.log("Sale #4 not found");
        return;
    }

    console.log(`Sale ID: ${sale.id}, Company: ${sale.companyId}`);
    for (const line of sale.lines) {
        console.log(`- Line ID: ${line.id}`);
        console.log(`  Product: ${line.productId} - ${line.product.name}`);
        console.log(`  CreateBy: ${line.product.createdByCompanyId}`);
        console.log(`  isFromParentCompany: ${line.isFromParentCompany}`);
        console.log(`  Qty: ${line.qty}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

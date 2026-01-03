
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const sale = await prisma.sale.findUnique({
        where: { id: 4 },
        include: {
            lines: {
                include: { product: true }
            }
        }
    });

    const missingStockLine = sale.lines.find(l => l.product.name.includes("60")); // Guessing 60x120
    if (missingStockLine) {
        console.log("Found Target Line:");
        console.log(JSON.stringify(missingStockLine, null, 2));

        const parentId = 1;
        // Check stock in Parent
        const stockParent = await prisma.stock.findUnique({
            where: { companyId_productId: { companyId: parentId, productId: missingStockLine.productId } }
        });
        console.log("Stock in Parent (1):", stockParent);

        // Check stock in Branch
        const stockBranch = await prisma.stock.findUnique({
            where: { companyId_productId: { companyId: sale.companyId, productId: missingStockLine.productId } }
        });
        console.log(`Stock in Branch (${sale.companyId}):`, stockBranch);
    } else {
        console.log("Target line not found via search '60'. Listing all names:");
        sale.lines.forEach(l => console.log(l.product.name));
    }
}

main().finally(() => prisma.$disconnect());

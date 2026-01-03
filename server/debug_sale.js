
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking Sale #4...");
    const sale = await prisma.sale.findUnique({
        where: { id: 4 },
        include: {
            company: true,
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

    console.log("Sale Company ID:", sale.companyId);
    console.log("Sale Company Name:", sale.company.name);
    console.log("Sale Company Parent ID:", sale.company.parentId);

    console.log("\nSale Lines:");
    for (const line of sale.lines) {
        console.log(`- Product ID: ${line.productId}, Name: ${line.product.name}`);
        console.log(`  Qty: ${line.qty}`);
        console.log(`  isFromParentCompany: ${line.isFromParentCompany}`);

        // Check stock in Sale Company
        const stockInSaleCompany = await prisma.stock.findUnique({
            where: {
                companyId_productId: {
                    companyId: sale.companyId,
                    productId: line.productId
                }
            }
        });

        // Check stock in Parent Company (if applicable)
        let stockInParentCompany = null;
        if (sale.company.parentId) {
            stockInParentCompany = await prisma.stock.findUnique({
                where: {
                    companyId_productId: {
                        companyId: sale.company.parentId,
                        productId: line.productId
                    }
                }
            });
        } else {
            // Try checking Company 1 explicitly if parentId is missing but user implies it's a child interaction
            stockInParentCompany = await prisma.stock.findUnique({
                where: {
                    companyId_productId: {
                        companyId: 1,
                        productId: line.productId
                    }
                }
            });
        }

        console.log(`  Stock in Sale Company (${sale.companyId}):`, stockInSaleCompany?.boxes || 0);
        console.log(`  Stock in Parent/Comp1 (${sale.company.parentId || 1}):`, stockInParentCompany?.boxes || 0);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

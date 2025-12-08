import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProductData() {
    try {
        const productId = 249;

        console.log('=== Checking Product Data ===');

        // Get product
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                prices: {
                    include: {
                        company: true
                    }
                },
                stocks: {
                    include: {
                        company: true
                    }
                }
            }
        });

        if (!product) {
            console.log('❌ Product not found!');
            return;
        }

        console.log('\n✅ Product:', product.name);
        console.log('SKU:', product.sku);

        console.log('\n📊 Prices:');
        if (product.prices.length === 0) {
            console.log('  ❌ No prices found!');
        } else {
            product.prices.forEach(price => {
                console.log(`  - ${price.company.name} (${price.company.code}): ${price.sellPrice} د.ل`);
            });
        }

        console.log('\n📦 Stocks:');
        if (product.stocks.length === 0) {
            console.log('  ❌ No stocks found!');
        } else {
            product.stocks.forEach(stock => {
                console.log(`  - ${stock.company.name} (${stock.company.code}): ${stock.qty} units`);
            });
        }

        // Get TAQAZI company
        const taqaziCompany = await prisma.company.findFirst({
            where: { code: 'TAQAZI' }
        });

        if (!taqaziCompany) {
            console.log('\n❌ TAQAZI company not found!');
            console.log('Available companies:');
            const companies = await prisma.company.findMany();
            companies.forEach(c => console.log(`  - ${c.name} (${c.code})`));
        } else {
            console.log('\n✅ TAQAZI Company found:', taqaziCompany.name, `(ID: ${taqaziCompany.id})`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProductData();

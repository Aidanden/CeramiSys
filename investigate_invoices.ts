
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const invoiceNumbers = ['BR-2-1771252364243', 'BR-2-1771252034434'];

    for (const inv of invoiceNumbers) {
        console.log(`\n--- Checking Invoice: ${inv} ---`);
        const sale = await prisma.sale.findFirst({
            where: { invoiceNumber: inv },
            include: {
                lines: {
                    include: {
                        product: true
                    }
                },
                company: true,
                customer: true
            }
        });

        if (sale) {
            console.log('Sale ID:', sale.id);
            console.log('Total:', sale.total.toString());
            console.log('Status:', sale.status);
            console.log('Created At:', sale.createdAt);
            console.log('Lines Count:', sale.lines.length);
            if (sale.lines.length > 0) {
                sale.lines.forEach((line, index) => {
                    console.log(` Line ${index + 1}: Product ID ${line.productId}, Qty ${line.qty}, Subtotal ${line.subTotal}`);
                });
            } else {
                console.log('!!! NO LINES FOUND !!!');
            }
        } else {
            console.log('Invoice NOT FOUND in Sale table.');
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

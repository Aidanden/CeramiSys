const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const fs = require('fs');

function log(message) {
    fs.appendFileSync('output.txt', message + '\n');
}

async function checkSales() {
    try {
        if (fs.existsSync('output.txt')) fs.unlinkSync('output.txt');
        log('--- Checking Sales Data ---');

        // 1. Get total sales count
        const totalSales = await prisma.sale.count();
        log(`Total Sales in DB: ${totalSales}`);

        if (totalSales === 0) {
            log('No sales found in database.');
            return;
        }

        // 2. Get last 5 approved sales
        const lastSales = await prisma.sale.findMany({
            where: { status: 'APPROVED' },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                createdAt: true,
                total: true,
                approvedBy: true,
                status: true
            }
        });

        log('Last 5 Approved Sales:');
        log(JSON.stringify(lastSales, null, 2));

        // 3. Check Users
        const users = await prisma.users.findMany({
            select: { UserID: true, UserName: true, FullName: true }
        });
        log(`Total Users: ${users.length}`);
        log('Sample Users: ' + JSON.stringify(users.slice(0, 3), null, 2));

        // 4. Test Aggregation for current month
        const currentYear = 2026;
        const currentMonth = 1; // January
        const startDate = new Date(currentYear, currentMonth - 1, 1);
        const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        log(`Checking period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        for (const user of users) {
            const sales = await prisma.sale.aggregate({
                where: {
                    status: 'APPROVED',
                    approvedBy: user.UserName, // Using UserName as per fix
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                _sum: { total: true },
                _count: { id: true },
            });

            if (sales._count.id > 0) {
                log(`User [${user.UserName}] (ID: ${user.UserID}) has stats: Count=${sales._count.id}, Total=${sales._sum.total}`);
                // Check exact match for debugging
                const exactMatch = await prisma.sale.findFirst({
                    where: { approvedBy: user.UserName }
                });
                log(`Exact match found for ${user.UserName}? ${!!exactMatch}`);
            } else {
                // Check if approvedBy exists but maybe date mismatch?
                const anySale = await prisma.sale.findFirst({
                    where: { approvedBy: user.UserName }
                });
                if (anySale) {
                    log(`User [${user.UserName}] has sales but NOT in selected period. Last sale: ${anySale.createdAt}`);
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSales();

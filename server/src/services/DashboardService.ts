import prisma from '../models/prismaClient';

export class DashboardService {
  /**
   * إحصائيات مبيعات المستخدمين
   */
  async getUsersSalesStats(year?: number, month?: number) {
    try {
      const currentYear = year || new Date().getFullYear();
      const currentMonth = month || new Date().getMonth() + 1;

      // تحديد تاريخ البداية والنهاية
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

      // جلب جميع المستخدمين
      const users = await prisma.users.findMany({
        where: {
          IsActive: true,
        },
        select: {
          UserID: true,
          UserName: true,
          FullName: true,
          Company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          FullName: 'asc',
        },
      });

      // جلب مبيعات كل مستخدم في الفترة المحددة
      const usersSales = await Promise.all(
        users.map(async (user) => {
          const sales = await prisma.sale.aggregate({
            where: {
              status: 'APPROVED',
              approvedBy: user.UserID,
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            _sum: {
              total: true,
            },
            _count: {
              id: true,
            },
          });

          return {
            userId: user.UserID,
            userName: user.UserName,
            fullName: user.FullName,
            companyName: user.Company?.name || 'غير محدد',
            totalSales: Number(sales._sum?.total || 0),
            salesCount: sales._count?.id || 0,
          };
        })
      );

      // ترتيب المستخدمين حسب المبيعات (الأعلى أولاً)
      const sortedUsersSales = usersSales.sort((a, b) => b.totalSales - a.totalSales);

      // حساب الإجمالي
      const totalRevenue = usersSales.reduce((sum, user) => sum + user.totalSales, 0);
      const totalInvoices = usersSales.reduce((sum, user) => sum + user.salesCount, 0);

      return {
        success: true,
        data: {
          period: {
            year: currentYear,
            month: currentMonth,
          },
          summary: {
            totalRevenue,
            totalInvoices,
            activeUsers: usersSales.filter(u => u.salesCount > 0).length,
          },
          users: sortedUsersSales,
        },
      };
    } catch (error) {
      console.error('Error in getUsersSalesStats:', error);
      throw error;
    }
  }

  /**
   * بيانات الرسم البياني الشامل
   */
  async getComprehensiveChartData(year?: number) {
    try {
      const currentYear = year || new Date().getFullYear();
      
      // البيانات الشهرية للسنة
      const monthlyData = [];

      for (let month = 1; month <= 12; month++) {
        const startDate = new Date(currentYear, month - 1, 1);
        const endDate = new Date(currentYear, month, 0, 23, 59, 59);

        // المبيعات
        const sales = await prisma.sale.aggregate({
          where: {
            status: 'APPROVED',
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            total: true,
          },
        });

        // المشتريات
        const purchases = await prisma.purchase.aggregate({
          where: {
            isApproved: true,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            total: true,
          },
        });

        // المصروفات المعدومة
        const badDebts = await prisma.badDebtExpense.aggregate({
          where: {
            paymentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            amount: true,
          },
        });

        // التالف (Damage Reports) - حساب من الخطوط
        const damageLines = await prisma.damageReportLine.findMany({
          where: {
            damageReport: {
              status: 'APPROVED',
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
          include: {
            product: {
              select: {
                cost: true,
              },
            },
          },
        });

        const totalDamages = damageLines.reduce((sum, line) => {
          const cost = Number(line.product.cost || 0);
          const qty = Number(line.quantity);
          return sum + (cost * qty);
        }, 0);

        // المردودات
        const returns = await prisma.saleReturn.aggregate({
          where: {
            status: 'APPROVED',
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            total: true,
          },
        });

        monthlyData.push({
          month,
          monthName: new Date(currentYear, month - 1).toLocaleDateString('ar', { month: 'long' }),
          sales: Number(sales._sum?.total || 0),
          purchases: Number(purchases._sum?.total || 0),
          badDebts: Number(badDebts._sum?.amount || 0),
          damages: totalDamages,
          returns: Number(returns._sum?.total || 0),
        });
      }

      // حساب الإجماليات السنوية
      const yearTotals = monthlyData.reduce(
        (acc, month) => ({
          sales: acc.sales + month.sales,
          purchases: acc.purchases + month.purchases,
          badDebts: acc.badDebts + month.badDebts,
          damages: acc.damages + month.damages,
          returns: acc.returns + month.returns,
        }),
        { sales: 0, purchases: 0, badDebts: 0, damages: 0, returns: 0 }
      );

      return {
        success: true,
        data: {
          year: currentYear,
          monthlyData,
          yearTotals,
        },
      };
    } catch (error) {
      console.error('Error in getComprehensiveChartData:', error);
      throw error;
    }
  }
}

export default new DashboardService();


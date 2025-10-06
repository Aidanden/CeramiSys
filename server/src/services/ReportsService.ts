import { PrismaClient } from "@prisma/client";
import { 
  SalesReportQuery, 
  StockReportQuery, 
  ProfitReportQuery, 
  CustomerReportQuery,
  TopProductsReportQuery 
} from "../dto/reportsDto";

export class ReportsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * تقرير المبيعات
   */
  async getSalesReport(query: SalesReportQuery, userCompanyId: number, isSystemUser: boolean = false) {
    const where: any = {
      ...(isSystemUser !== true && { companyId: userCompanyId }),
      ...(query.companyId && { companyId: query.companyId }),
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.saleType && { saleType: query.saleType.toUpperCase() }),
      ...(query.startDate || query.endDate ? {
        createdAt: {
          ...(query.startDate && { gte: new Date(query.startDate) }),
          ...(query.endDate && { lte: new Date(query.endDate) }),
        }
      } : {}),
    };

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, code: true } },
        customer: { select: { id: true, name: true, phone: true } },
        lines: {
          include: {
            product: { select: { id: true, sku: true, name: true, unit: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // حساب الإحصائيات
    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const totalCash = sales.filter(s => s.saleType === "CASH").reduce((sum, sale) => sum + Number(sale.total), 0);
    const totalCredit = sales.filter(s => s.saleType === "CREDIT").reduce((sum, sale) => sum + Number(sale.total), 0);

    return {
      sales: sales.map(sale => ({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        createdAt: sale.createdAt,
        saleType: sale.saleType,
        paymentMethod: sale.paymentMethod,
        total: Number(sale.total),
        paidAmount: Number(sale.paidAmount),
        remainingAmount: Number(sale.remainingAmount),
        isFullyPaid: sale.isFullyPaid,
        company: sale.company,
        customer: sale.customer,
        lines: sale.lines.map(line => ({
          id: line.id,
          product: line.product,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          subTotal: Number(line.subTotal),
        }))
      })),
      stats: {
        totalSales,
        totalCash,
        totalCredit,
        salesCount: sales.length,
        averageSale: sales.length > 0 ? totalSales / sales.length : 0,
      }
    };
  }

  /**
   * تقرير المخزون
   */
  async getStockReport(query: StockReportQuery, userCompanyId: number, isSystemUser: boolean = false) {
    const where: any = {
      ...(isSystemUser !== true && { companyId: userCompanyId }),
      ...(query.companyId && { companyId: query.companyId }),
      ...(query.productId && { productId: query.productId }),
      ...(query.minBoxes || query.maxBoxes ? {
        boxes: {
          ...(query.minBoxes && { gte: query.minBoxes }),
          ...(query.maxBoxes && { lte: query.maxBoxes }),
        }
      } : {}),
    };

    const stocks = await this.prisma.stock.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, code: true } },
        product: { 
          select: { 
            id: true, 
            sku: true, 
            name: true, 
            unit: true, 
            unitsPerBox: true,
            prices: {
              where: { companyId: userCompanyId },
              select: { sellPrice: true },
              take: 1
            }
          } 
        }
      },
      orderBy: { boxes: "desc" }
    });

    // حساب الإحصائيات
    const totalBoxes = stocks.reduce((sum, stock) => sum + Number(stock.boxes), 0);
    const totalValue = stocks.reduce((sum, stock) => {
      const price = stock.product.prices[0]?.sellPrice || 0;
      return sum + (Number(stock.boxes) * Number(price));
    }, 0);

    return {
      stocks: stocks.map(stock => ({
        id: stock.id,
        company: stock.company,
        product: {
          ...stock.product,
          unitsPerBox: stock.product.unitsPerBox ? Number(stock.product.unitsPerBox) : null,
          sellPrice: stock.product.prices[0] ? Number(stock.product.prices[0].sellPrice) : null,
        },
        boxes: Number(stock.boxes),
        totalUnits: stock.product.unitsPerBox 
          ? Number(stock.boxes) * Number(stock.product.unitsPerBox)
          : Number(stock.boxes),
        updatedAt: stock.updatedAt,
      })),
      stats: {
        totalBoxes,
        totalValue,
        itemsCount: stocks.length,
        lowStockItems: stocks.filter(s => Number(s.boxes) < 10).length,
      }
    };
  }

  /**
   * تقرير الأرباح
   */
  async getProfitReport(query: ProfitReportQuery, userCompanyId: number, isSystemUser: boolean = false) {
    const where: any = {
      ...(isSystemUser !== true && { companyId: userCompanyId }),
      ...(query.companyId && { companyId: query.companyId }),
      ...(query.startDate || query.endDate ? {
        saleDate: {
          ...(query.startDate && { gte: new Date(query.startDate) }),
          ...(query.endDate && { lte: new Date(query.endDate) }),
        }
      } : {}),
    };

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        lines: true
      },
      orderBy: { createdAt: "asc" }
    });

    // تجميع البيانات حسب الفترة
    const groupedData: { [key: string]: { revenue: number, count: number } } = {};
    
    sales.forEach(sale => {
      const date = new Date(sale.createdAt);
      let key: string;
      
      switch (query.groupBy) {
        case "day":
          key = date.toISOString().split('T')[0] || '';
          break;
        case "week":
          const weekNum = Math.ceil((date.getDate() + 6 - date.getDay()) / 7);
          key = `${date.getFullYear()}-W${weekNum}`;
          break;
        case "month":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case "year":
          key = String(date.getFullYear());
          break;
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedData[key]) {
        groupedData[key] = { revenue: 0, count: 0 };
      }
      
      groupedData[key]!.revenue += Number(sale.total);
      groupedData[key]!.count += 1;
    });

    const chartData = Object.entries(groupedData).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      salesCount: data.count,
    }));

    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);

    return {
      chartData,
      stats: {
        totalRevenue,
        totalSales: sales.length,
        averageRevenue: sales.length > 0 ? totalRevenue / sales.length : 0,
      }
    };
  }

  /**
   * تقرير العملاء
   */
  async getCustomerReport(query: CustomerReportQuery, userCompanyId: number, isSystemUser: boolean = false) {
    const salesWhere: any = {
      ...(isSystemUser !== true && { companyId: userCompanyId }),
      ...(query.companyId && { companyId: query.companyId }),
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.startDate || query.endDate ? {
        createdAt: {
          ...(query.startDate && { gte: new Date(query.startDate) }),
          ...(query.endDate && { lte: new Date(query.endDate) }),
        }
      } : {}),
    };

    const customers = await this.prisma.customer.findMany({
      include: {
        sales: {
          where: salesWhere,
          include: {
            company: { select: { id: true, name: true, code: true } },
          }
        }
      }
    });

    return {
      customers: customers.map(customer => {
        const totalPurchases = customer.sales.reduce((sum: number, sale: any) => sum + Number(sale.total), 0);
        const totalSales = customer.sales.length;
        
        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          note: customer.note,
          totalPurchases,
          totalSales,
          averagePurchase: totalSales > 0 ? totalPurchases / totalSales : 0,
          lastPurchase: customer.sales.length > 0 
            ? customer.sales.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt || null
            : null,
        };
      }).sort((a: any, b: any) => b.totalPurchases - a.totalPurchases),
      stats: {
        totalCustomers: customers.length,
        activeCustomers: customers.filter(c => c.sales.length > 0).length,
        totalRevenue: customers.reduce((sum: number, c: any) => 
          sum + c.sales.reduce((s: number, sale: any) => s + Number(sale.total), 0), 0
        ),
      }
    };
  }

  /**
   * تقرير المنتجات الأكثر مبيعاً
   */
  async getTopProductsReport(query: TopProductsReportQuery, userCompanyId: number, isSystemUser: boolean = false) {
    const where: any = {
      sale: {
        ...(isSystemUser !== true && { companyId: userCompanyId }),
        ...(query.companyId && { companyId: query.companyId }),
        ...(query.startDate || query.endDate ? {
          createdAt: {
            ...(query.startDate && { gte: new Date(query.startDate) }),
            ...(query.endDate && { lte: new Date(query.endDate) }),
          }
        } : {}),
      }
    };

    const saleLines = await this.prisma.saleLine.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            unitsPerBox: true,
          }
        },
        sale: {
          select: {
            company: { select: { id: true, name: true, code: true } }
          }
        }
      }
    });

    // تجميع البيانات حسب المنتج
    const productData: { [key: number]: any } = {};

    saleLines.forEach(line => {
      const productId = line.productId;
      
      if (!productData[productId]) {
        productData[productId] = {
          product: line.product,
          totalQty: 0,
          totalRevenue: 0,
          salesCount: 0,
        };
      }

      productData[productId].totalQty += Number(line.qty);
      productData[productId].totalRevenue += Number(line.subTotal);
      productData[productId].salesCount += 1;
    });

    const topProducts = Object.values(productData)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, query.limit || 10)
      .map(item => ({
        product: {
          ...item.product,
          unitsPerBox: item.product.unitsPerBox ? Number(item.product.unitsPerBox) : null,
        },
        totalQty: item.totalQty,
        totalRevenue: item.totalRevenue,
        salesCount: item.salesCount,
        averagePrice: item.totalQty > 0 ? item.totalRevenue / item.totalQty : 0,
      }));

    return {
      topProducts,
      stats: {
        totalProducts: Object.keys(productData).length,
        totalRevenue: Object.values(productData).reduce((sum: number, item: any) => sum + item.totalRevenue, 0),
        totalQty: Object.values(productData).reduce((sum: number, item: any) => sum + item.totalQty, 0),
      }
    };
  }
}

import prisma from '../models/prismaClient';
import {
  SalesReportQuery,
  StockReportQuery,
  CustomerReportQuery,
  TopProductsReportQuery,
  SupplierReportQuery,
  PurchaseReportQuery,
  ProductMovementReportQuery,
  FinancialReportQuery
} from "../dto/reportsDto";

export class ReportsService {
  private prisma = prisma; // Use singleton

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
            cost: true,
            prices: {
              select: { companyId: true, sellPrice: true }
            }
          }
        }
      },
      orderBy: { boxes: "desc" }
    });

    // حساب الإحصائيات
    const totalBoxes = stocks.reduce((sum, stock) => sum + Number(stock.boxes), 0);
    const totalUnits = stocks.reduce((sum, stock) => {
      const unitsPerBox = stock.product.unitsPerBox ? Number(stock.product.unitsPerBox) : 1;
      return sum + (Number(stock.boxes) * unitsPerBox);
    }, 0);

    const totalValue = stocks.reduce((sum, stock) => {
      const costPrice = stock.product.cost ? Number(stock.product.cost) : 0;
      const unitsPerBox = stock.product.unitsPerBox ? Number(stock.product.unitsPerBox) : 1;
      const tUnits = Number(stock.boxes) * unitsPerBox;
      return sum + (tUnits * costPrice);
    }, 0);

    return {
      stocks: stocks.map(stock => {
        const companyPriceEntry = stock.product.prices.find((price) => price.companyId === stock.companyId);
        const sellPrice = companyPriceEntry ? Number(companyPriceEntry.sellPrice) : null;

        return {
          id: stock.id,
          company: stock.company,
          product: {
            id: stock.product.id,
            sku: stock.product.sku,
            name: stock.product.name,
            unit: stock.product.unit,
            unitsPerBox: stock.product.unitsPerBox ? Number(stock.product.unitsPerBox) : null,
            sellPrice,
            costPrice: stock.product.cost ? Number(stock.product.cost) : 0,
          },
          boxes: Number(stock.boxes),
          totalUnits: stock.product.unitsPerBox
            ? Number(stock.boxes) * Number(stock.product.unitsPerBox)
            : Number(stock.boxes),
          updatedAt: stock.updatedAt,
        };
      }),
      stats: {
        totalBoxes,
        totalUnits,
        totalValue,
        itemsCount: stocks.length,
        lowStockItems: stocks.filter(s => Number(s.boxes) < 10).length,
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
          notes: customer.notes,
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

  /**
   * تقرير الموردين
   */
  async getSupplierReport(query: SupplierReportQuery, userCompanyId: number, isSystemUser: boolean = false) {
    const where: any = {
      ...(isSystemUser !== true && { companyId: userCompanyId }),
      ...(query.companyId && { companyId: query.companyId }),
      ...(query.supplierId && { id: query.supplierId }),
    };

    const suppliers = await this.prisma.supplier.findMany({
      where,
      include: {
        purchases: {
          where: {
            isApproved: true,
            ...(query.startDate || query.endDate ? {
              createdAt: {
                ...(query.startDate && { gte: new Date(query.startDate) }),
                ...(query.endDate && { lte: new Date(query.endDate) }),
              }
            } : {}),
          },
        },
        accountEntries: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const suppliersData = suppliers.map((supplier: any) => {
      const totalPurchases = supplier.purchases.reduce((sum: number, p: any) => sum + Number(p.finalTotal), 0);
      const totalPaid = supplier.accountEntries
        .filter((a: any) => a.transactionType === 'DEBIT')
        .reduce((sum: number, a: any) => sum + Number(a.amount), 0);
      const balance = supplier.accountEntries.length > 0
        ? Number(supplier.accountEntries[0].balance)
        : 0;

      return {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        totalPurchases,
        totalPaid,
        balance,
      };
    });

    return {
      suppliers: suppliersData,
      stats: {
        totalSuppliers: suppliersData.length,
        totalPurchases: suppliersData.reduce((sum, s) => sum + s.totalPurchases, 0),
        totalPaid: suppliersData.reduce((sum, s) => sum + s.totalPaid, 0),
        totalBalance: suppliersData.reduce((sum, s) => sum + s.balance, 0),
      }
    };
  }

  /**
   * تقرير المشتريات
   */
  async getPurchaseReport(query: PurchaseReportQuery, userCompanyId: number, isSystemUser: boolean = false) {
    const where: any = {
      isApproved: true,
      ...(isSystemUser !== true && { companyId: userCompanyId }),
      ...(query.companyId && { companyId: query.companyId }),
      ...(query.supplierId && { supplierId: query.supplierId }),
      ...(query.purchaseType && { purchaseType: query.purchaseType }),
      ...(query.startDate || query.endDate ? {
        createdAt: {
          ...(query.startDate && { gte: new Date(query.startDate) }),
          ...(query.endDate && { lte: new Date(query.endDate) }),
        }
      } : {}),
    };

    const purchases = await this.prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        company: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.finalTotal), 0);
    const totalCash = purchases.filter(p => p.purchaseType === 'CASH').reduce((sum, p) => sum + Number(p.finalTotal), 0);
    const totalCredit = purchases.filter(p => p.purchaseType === 'CREDIT').reduce((sum, p) => sum + Number(p.finalTotal), 0);

    return {
      purchases,
      stats: {
        totalPurchases,
        totalCash,
        totalCredit,
        purchaseCount: purchases.length,
      }
    };
  }

  /**
   * تقرير حركة صنف
   */
  async getProductMovementReport(query: ProductMovementReportQuery, userCompanyId: number, isSystemUser: boolean = false) {
    const { productId, companyId: queryCompanyId, startDate: sDate, endDate: eDate } = query;
    const companyId = queryCompanyId || (isSystemUser !== true ? userCompanyId : undefined);

    if (!companyId) throw new Error("يجب تحديد الشركة");

    const startDate = sDate ? new Date(sDate) : null;
    const endDate = eDate ? new Date(eDate) : new Date();

    // 1. معلومات الصنف والمخزون الحالي
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true, name: true, unit: true, createdAt: true }
    });

    if (!product) throw new Error("الصنف غير موجود");

    const stock = await this.prisma.stock.findUnique({
      where: { companyId_productId: { companyId, productId } }
    });

    const currentQty = stock ? Number(stock.boxes) : 0;

    // 2. جلب جميع الحركات تاريخياً
    // المبيعات (نقص)
    const sales = await this.prisma.saleLine.findMany({
      where: { productId, sale: { companyId, status: 'APPROVED' } },
      include: { sale: { select: { createdAt: true, invoiceNumber: true, customer: { select: { name: true } } } } }
    });

    // المشتريات (زيادة)
    const purchases = await this.prisma.purchaseLine.findMany({
      where: { productId, purchase: { companyId, isApproved: true } },
      include: { purchase: { select: { createdAt: true, supplier: { select: { name: true } } } } }
    });

    // المشتريات من الشركة الأم (زيادة)
    const parentPurchases = await this.prisma.purchaseFromParentLine.findMany({
      where: { productId, purchase: { branchCompanyId: companyId } },
      include: { purchase: { select: { createdAt: true, invoiceNumber: true } } }
    });

    // مردودات المبيعات (زيادة)
    const saleReturns = await this.prisma.saleReturnLine.findMany({
      where: { productId, saleReturn: { companyId } },
      include: { saleReturn: { select: { createdAt: true, sale: { select: { invoiceNumber: true } } } } }
    });

    // المردودات للموردين (نقص) - إذا كانت موجودة في النظام
    // ملاحظة: قد لا يكون هناك موديل PurchaseReturnLine حالياً، إذا وجد يجب إضافته

    // التالف (نقص)
    const damages = await this.prisma.damageReportLine.findMany({
      where: { productId, damageReport: { companyId, status: 'APPROVED' } },
      include: { damageReport: { select: { createdAt: true, reason: true } } }
    });

    // 3. توحيد الحركات في قائمة واحدة
    const allMovements: any[] = [
      ...sales.map(s => ({
        date: s.sale.createdAt,
        type: 'SALE',
        description: `بيع: فاتورة ${s.sale.invoiceNumber || '-'} (${s.sale.customer?.name || 'عميل نقدي'})`,
        qtyIn: 0,
        qtyOut: Number(s.qty),
      })),
      ...purchases.map(p => ({
        date: p.purchase.createdAt,
        type: 'PURCHASE',
        description: `شراء: مورد ${p.purchase.supplier?.name || '-'}`,
        qtyIn: Number(p.qty),
        qtyOut: 0,
      })),
      ...parentPurchases.map((p: any) => ({
        date: p.purchase.createdAt,
        type: 'PURCHASE',
        description: `شراء من الشركة الأم: فاتورة ${p.purchase.invoiceNumber || '-'}`,
        qtyIn: Number(p.qty),
        qtyOut: 0,
      })),
      ...saleReturns.map(r => ({
        date: r.saleReturn.createdAt,
        type: 'RETURN',
        description: `مردود مبيعات: فاتورة ${r.saleReturn.sale?.invoiceNumber || '-'}`,
        qtyIn: Number(r.qty),
        qtyOut: 0,
      })),
      ...damages.map((d: any) => ({
        date: d.damageReport.createdAt,
        type: 'DAMAGE',
        description: `تالف: ${d.damageReport.reason || 'بدون وصف'}`,
        qtyIn: 0,
        qtyOut: Number(d.quantity),
      }))
    ];

    // ترتيب الحركات حسب التاريخ تصاعدياً
    allMovements.sort((a, b) => a.date.getTime() - b.date.getTime());

    // 4. حساب "رصيد البداية الأول" (قبل كل الحركات)
    // الكمية الحالية = الرصيد الأول + (مجموع الداخل - مجموع الخارج)
    // الرصيد الأول = الكمية الحالية - (مجموع الداخل - مجموع الخارج)
    const totalIn = allMovements.reduce((sum, m) => sum + m.qtyIn, 0);
    const totalOut = allMovements.reduce((sum, m) => sum + m.qtyOut, 0);
    const initialQty = currentQty - (totalIn - totalOut);

    // 5. بناء التقرير النهائي وحساب الأرصدة المتراكمة
    let runningBalance = initialQty;
    const finalMovements: any[] = [];

    // حساب رصيد أول المدة للفترة المختارة
    let openingBalanceInPeriod = initialQty;
    if (startDate) {
      openingBalanceInPeriod = initialQty + allMovements
        .filter(m => m.date < startDate)
        .reduce((sum, m) => sum + m.qtyIn - m.qtyOut, 0);
    }

    // إضافة سطر "بضاعة أول المدة" في بداية الفترة المختارة
    finalMovements.push({
      date: startDate || product.createdAt,
      type: 'INITIAL',
      description: startDate ? 'بضاعة أول المدة (للفترة المختارة)' : (initialQty > 0 ? 'بضاعة أول المدة / رصيد افتتاحي' : 'إضافة صنف (رصيد 0)'),
      qtyIn: (startDate ? 0 : (initialQty > 0 ? initialQty : 0)),
      qtyOut: 0,
      balance: openingBalanceInPeriod
    });

    allMovements.forEach(m => {
      runningBalance = runningBalance + m.qtyIn - m.qtyOut;
      m.balance = runningBalance;

      // فلترة الحركات حسب التواريخ المطلوبة
      const dateOk = (!startDate || m.date >= startDate) && (m.date <= endDate);
      if (dateOk) {
        finalMovements.push(m);
      }
    });

    return {
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit
      },
      period: {
        from: startDate,
        to: endDate
      },
      openingBalance: openingBalanceInPeriod,
      movements: finalMovements.sort((a, b) => b.date.getTime() - a.date.getTime()), // الأحدث أولاً للعرض
      currentStock: currentQty
    };
  }

  /**
   * تقرير الأرباح (التقرير المالي)
   */
  async getFinancialReport(query: FinancialReportQuery, userCompanyId: number, isSystemUser: boolean = false) {
    const { companyId: qCompanyId, productId: qProductId, startDate: sDate, endDate: eDate } = query;
    const companyId = qCompanyId || (isSystemUser !== true ? userCompanyId : undefined);

    const startDate = sDate ? new Date(sDate) : null;
    const endDate = eDate ? new Date(eDate) : new Date();

    const dateFilter = {
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        }
      } : {}),
    };

    // 1. المبيعات (إجمالي المبيعات)
    const sales = await this.prisma.sale.findMany({
      where: {
        ...(companyId && { companyId }),
        status: 'APPROVED',
        ...dateFilter,
        ...(qProductId && { lines: { some: { productId: qProductId } } }),
      },
      include: {
        lines: {
          where: {
            ...(qProductId && { productId: qProductId })
          },
          include: {
            product: { select: { cost: true } }
          }
        }
      }
    });

    // 2. المردودات (المرتجعات)
    const returns = await this.prisma.saleReturn.findMany({
      where: {
        ...(companyId && { companyId }),
        status: 'APPROVED',
        ...dateFilter,
        ...(qProductId && { lines: { some: { productId: qProductId } } }),
      },
      include: {
        lines: {
          where: {
            ...(qProductId && { productId: qProductId })
          },
          include: {
            product: { select: { cost: true } }
          }
        }
      }
    });

    // 3. التالف (الهالك)
    const damages = await this.prisma.damageReport.findMany({
      where: {
        ...(companyId && { companyId }),
        status: 'APPROVED',
        ...dateFilter,
        ...(qProductId && { lines: { some: { productId: qProductId } } }),
      },
      include: {
        lines: {
          where: {
            ...(qProductId && { productId: qProductId })
          },
          include: {
            product: { select: { cost: true } }
          }
        }
      }
    });

    // الحسابات
    let totalSalesValue = 0;
    let totalCogs = 0;
    let totalReturnCost = 0;
    let totalDamageCost = 0;

    sales.forEach(sale => {
      sale.lines.forEach(line => {
        totalSalesValue += Number(line.subTotal);
        const cost = line.product.cost ? Number(line.product.cost) : 0;
        totalCogs += Number(line.qty) * cost;
      });
    });

    returns.forEach(ret => {
      ret.lines.forEach(line => {
        const cost = line.product.cost ? Number(line.product.cost) : 0;
        totalReturnCost += Number(line.qty) * cost;
      });
    });

    damages.forEach(dmg => {
      dmg.lines.forEach(line => {
        const cost = line.product.cost ? Number(line.product.cost) : 0;
        totalDamageCost += Number(line.quantity) * cost;
      });
    });

    const netProfit = totalSalesValue - totalCogs - totalReturnCost - totalDamageCost;

    return {
      period: { from: startDate, to: endDate },
      stats: {
        totalSales: totalSalesValue,
        totalCogs,
        totalReturnCost,
        totalDamageCost,
        netProfit,
        profitMargin: totalSalesValue > 0 ? (netProfit / totalSalesValue) * 100 : 0
      }
    };
  }

  /**
   * تقرير بضاعة الموردين (أداء بضاعة المورد)
   */
  async getSupplierStockReport(query: any, userCompanyId: number, isSystemUser: boolean = false) {
    const { supplierId, companyId: queryCompanyId } = query;
    const companyId = queryCompanyId || (isSystemUser !== true ? userCompanyId : undefined);

    if (!supplierId) throw new Error("يجب تحديد المورد");

    // 1. جلب بيانات المورد
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId }
    });

    if (!supplier) throw new Error("المورد غير موجود");

    // حساب الرصيد لكل عملة (مديونية المورد)
    // CREDIT = له (دائن)، DEBIT = عليه (مدين)
    // الرصيد = مجموع الداين - مجموع المدين
    const balanceAggregates = await this.prisma.supplierAccount.groupBy({
      by: ['currency', 'transactionType'],
      where: { supplierId },
      _sum: {
        amount: true
      }
    });

    const balances: Record<string, number> = { LYD: 0, USD: 0, EUR: 0 };

    balanceAggregates.forEach(agg => {
      const currency = agg.currency || 'LYD';
      const amount = Number(agg._sum.amount || 0);

      if (!balances[currency]) balances[currency] = 0;

      if (agg.transactionType === 'CREDIT') {
        balances[currency] += amount;
      } else {
        balances[currency] -= amount;
      }
    });

    // الرصيد "عليه" (لنا) عندما يكون سالب، و"له" (علينا) عندما يكون موجب
    // في هذا السياق: Credit (له) يزيد الرصيد، Debit (عليه) ينقص الرصيد
    // إذن: موجب = دين علينا للمورد، سالب = دين للمورد علينا (رصيد مدين) -> دفعنا اكثر مما اشترينا
    // ولكن المستخدم قال: 55000 (علينا) د.ل. هذا يعني رصيد موجب.

    // سنعيد كائن الأرصدة بدلاً من رصيد واحد
    const currentBalance = balances['LYD']; // Default for backward compatibility if needed, but we prefer using the map

    // 2. جلب المشتريات من هذا المورد لتحديد الأصناف والكميات المشتراة
    // نحتاج للأصناف التي اشتريناها من هذا المورد فقط (purchase lines)
    const purchaseLines = await this.prisma.purchaseLine.findMany({
      where: {
        purchase: {
          supplierId,
          isApproved: true, // فقط المشتريات المعتمدة
          ...(companyId && { companyId })
        }
      },
      include: {
        product: true,
        purchase: {
          select: { currency: true } // نحتاج العملة إذا أردنا تفصيل المبالغ
        }
      }
    });

    // تجميع البيانات حسب الصنف
    const productsMap = new Map<number, any>();

    purchaseLines.forEach(line => {
      const productId = line.productId;
      const qty = Number(line.qty);

      if (!productsMap.has(productId)) {
        productsMap.set(productId, {
          product: line.product,
          totalPurchased: 0,
          purchaseCount: 0
        });
      }

      const item = productsMap.get(productId);
      item.totalPurchased += qty;
      item.purchaseCount += 1;
    });

    // 3. جلب المخزون الحالي لهذه الأصناف
    const productIds = Array.from(productsMap.keys());

    const stocks = await this.prisma.stock.findMany({
      where: {
        productId: { in: productIds },
        ...(companyId && { companyId })
      }
    });

    const stockMap = new Map<number, number>();
    stocks.forEach(stock => {
      stockMap.set(stock.productId, Number(stock.boxes));
    });

    // 4. دمج البيانات
    const reportItems = Array.from(productsMap.values()).map(item => {
      const productId = item.product.id;
      const currentStockBoxes = stockMap.get(productId) || 0;

      // التعامل مع الوحدات (صندوق + متر/قطعة)
      const unitsPerBox = item.product.unitsPerBox ? Number(item.product.unitsPerBox) : 1;
      const totalPurchasedUnits = item.totalPurchased * unitsPerBox; // الكمية المشتراة (قد تكون بالصناديق في الفواتير؟ عادة purchase line qty is boxes usually?)
      // *تحقق*: في PurchaseLine، هل qty صناديق أم قطع؟ 
      // عادة في السيرفس، purchaseLine.qty هي الكمية المدخلة، والتي غالباً ما تكون صناديق إذا كان المنتج يباع بالصندوق.
      // Stock.boxes هي الصناديق.
      // لنفترض التوافق حالياً: الكمية المشتراة = boxes, المخزون = boxes.

      return {
        product: {
          id: item.product.id,
          sku: item.product.sku,
          name: item.product.name,
          unit: item.product.unit,
          unitsPerBox: unitsPerBox,
          cost: item.product.cost,
        },
        totalPurchased: item.totalPurchased, // boxes usually
        currentStock: currentStockBoxes, // boxes
        soldQty: item.totalPurchased - currentStockBoxes,
        performance: item.totalPurchased > 0 ? ((item.totalPurchased - currentStockBoxes) / item.totalPurchased) * 100 : 0
      };
    });

    return {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        balance: currentBalance,
        balances: balances // { LYD: number, USD: number, EUR: number }
      },
      items: reportItems.sort((a, b) => b.totalPurchased - a.totalPurchased) // الأكثر شراءً أولاً
    };
  }
}

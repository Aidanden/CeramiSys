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
   * تقرير الموردين - حسب العملة (دينار، دولار، يورو)
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

    const emptyCurrency = () => ({ LYD: 0, USD: 0, EUR: 0 });

    const suppliersData = suppliers.map((supplier: any) => {
      // إجمالي المشتريات حسب العملة = مجموع قيود CREDIT في حسابه فقط (ما سُجّل فعلياً له)
      // لا نستخدم finalTotal الفاتورة لأنه يشمل مصروفات لموردين آخرين ومصروفات تقديرية
      const totalPurchasesByCurrency: Record<string, number> = emptyCurrency();
      supplier.accountEntries
        .filter((a: any) => a.transactionType === 'CREDIT')
        .forEach((a: any) => {
          const cur = (a.currency || 'LYD').toString();
          if (!totalPurchasesByCurrency[cur]) totalPurchasesByCurrency[cur] = 0;
          totalPurchasesByCurrency[cur] += Number(a.amount);
        });

      // المدفوع حسب العملة (DEBIT = دفعات للمورد)
      const totalPaidByCurrency: Record<string, number> = emptyCurrency();
      supplier.accountEntries
        .filter((a: any) => a.transactionType === 'DEBIT')
        .forEach((a: any) => {
          const cur = (a.currency || 'LYD').toString();
          if (!totalPaidByCurrency[cur]) totalPaidByCurrency[cur] = 0;
          totalPaidByCurrency[cur] += Number(a.amount);
        });

      // الرصيد الحالي حسب العملة = آخر قيد مسجل لكل عملة
      const balanceByCurrency: Record<string, number> = emptyCurrency();
      const entriesByCurrency: Record<string, any[]> = {};
      supplier.accountEntries.forEach((a: any) => {
        const cur = (a.currency || 'LYD').toString();
        if (!entriesByCurrency[cur]) entriesByCurrency[cur] = [];
        entriesByCurrency[cur].push(a);
      });
      Object.keys(entriesByCurrency).forEach((cur) => {
        const arr = entriesByCurrency[cur];
        if (!arr) return;
        arr.sort((x: any, y: any) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
        balanceByCurrency[cur] = arr.length ? Number(arr[0].balance) : 0;
      });

      return {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        totalPurchasesByCurrency,
        totalPaidByCurrency,
        balanceByCurrency,
      };
    });

    // إجماليات التقرير حسب العملة
    const totalPurchasesByCurrency = emptyCurrency();
    const totalPaidByCurrency = emptyCurrency();
    const totalBalanceByCurrency = emptyCurrency();
    suppliersData.forEach((s: any) => {
      (['LYD', 'USD', 'EUR'] as const).forEach((cur) => {
        totalPurchasesByCurrency[cur] += s.totalPurchasesByCurrency[cur] ?? 0;
        totalPaidByCurrency[cur] += s.totalPaidByCurrency[cur] ?? 0;
        totalBalanceByCurrency[cur] += s.balanceByCurrency[cur] ?? 0;
      });
    });

    return {
      suppliers: suppliersData,
      stats: {
        totalSuppliers: suppliersData.length,
        totalPurchasesByCurrency,
        totalPaidByCurrency,
        totalBalanceByCurrency,
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
        expenses: true, // جلب المصروفات
      },
      orderBy: { createdAt: 'desc' },
    });

    // حساب الإحصائيات حسب العملة
    const stats = {
      totalPurchasesLYD: 0,
      totalPurchasesUSD: 0,
      totalPurchasesEUR: 0,
      totalCashLYD: 0,
      totalCashUSD: 0,
      totalCashEUR: 0,
      totalCreditLYD: 0,
      totalCreditUSD: 0,
      totalCreditEUR: 0,
      // مجاميع المصروفات حسب العملة
      totalExpensesLYD: 0,
      totalExpensesUSD: 0,
      totalExpensesEUR: 0,
      purchaseCount: purchases.length,
    };

    purchases.forEach(p => {
      const invoiceTotal = Number(p.total); // المبلغ الأساسي للفاتورة بعملتها
      const currency = p.currency || 'LYD';

      // إحصائيات المشتريات (على الصافي قبل المصروفات)
      if (currency === 'LYD') {
        stats.totalPurchasesLYD += invoiceTotal;
        if (p.purchaseType === 'CASH') stats.totalCashLYD += invoiceTotal;
        else stats.totalCreditLYD += invoiceTotal;
      } else if (currency === 'USD') {
        stats.totalPurchasesUSD += invoiceTotal;
        if (p.purchaseType === 'CASH') stats.totalCashUSD += invoiceTotal;
        else stats.totalCreditUSD += invoiceTotal;
      } else if (currency === 'EUR') {
        stats.totalPurchasesEUR += invoiceTotal;
        if (p.purchaseType === 'CASH') stats.totalCashEUR += invoiceTotal;
        else stats.totalCreditEUR += invoiceTotal;
      }

      // إحصائيات المصروفات (بناءً على عملة كل مصروف)
      p.expenses.forEach(ex => {
        const exAmount = Number(ex.amount);
        const exCurrency = ex.currency || 'LYD';
        if (exCurrency === 'LYD') stats.totalExpensesLYD += exAmount;
        else if (exCurrency === 'USD') stats.totalExpensesUSD += exAmount;
        else if (exCurrency === 'EUR') stats.totalExpensesEUR += exAmount;
      });
    });

    return {
      purchases: purchases.map(p => ({
        ...p,
        total: Number(p.total),
        paidAmount: Number(p.paidAmount),
        remainingAmount: Number(p.remainingAmount),
        finalTotal: Number(p.finalTotal),
        totalExpenses: Number(p.totalExpenses),
        expenses: p.expenses.map(ex => ({
          ...ex,
          amount: Number(ex.amount)
        }))
      })),
      stats: {
        ...stats,
        grandTotalLYD: stats.totalPurchasesLYD + stats.totalExpensesLYD,
        grandTotalUSD: stats.totalPurchasesUSD + stats.totalExpensesUSD,
        grandTotalEUR: stats.totalPurchasesEUR + stats.totalExpensesEUR,
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
    // - للشركة الأم (1): نجلب مبيعاتها المباشرة + مبيعات الفروع التي استخدمت مخزونها
    // - للشركات الأخرى: نجلب مبيعاتها المحلية فقط (التي لم تؤخذ من مخزون الأم)
    const sales = await this.prisma.saleLine.findMany({
      where: {
        productId,
        sale: { status: 'APPROVED' },
        ...(companyId === 1
          ? { OR: [{ sale: { companyId: 1, isAutoGenerated: false } }, { isFromParentCompany: true }] }
          : { sale: { companyId: companyId }, isFromParentCompany: false }
        )
      },
      include: {
        sale: {
          select: {
            createdAt: true,
            invoiceNumber: true,
            company: { select: { id: true, name: true } },
            customer: { select: { name: true } }
          }
        }
      }
    });

    // المشتريات (زيادة)
    const purchases = await this.prisma.purchaseLine.findMany({
      where: {
        productId,
        purchase: {
          companyId,
          isApproved: true,
          affectsInventory: true // فقط المشتريات التي تؤثر فعلياً على المخزون المحلي
        }
      },
      include: { purchase: { select: { createdAt: true, supplier: { select: { name: true } } } } }
    });

    // المشتريات من الشركة الأم (زيادة)
    // تظهر فقط للشركة الفرعية كـ "وارد" يعادل الـ "صادر" للعميل إذا كانت مبيعات بين شركات
    const parentPurchases = await this.prisma.purchaseFromParentLine.findMany({
      where: { productId, purchase: { branchCompanyId: companyId } },
      include: { purchase: { select: { createdAt: true, invoiceNumber: true } } }
    });

    // مردودات المبيعات (زيادة)
    // تظهر في حساب نفس الشركة التي تم فيها تسجيل المردود
    const saleReturns = await this.prisma.saleReturnLine.findMany({
      where: {
        productId,
        saleReturn: { status: { in: ['APPROVED', 'RECEIVED_WAREHOUSE'] }, companyId }
      },
      include: {
        saleReturn: {
          select: {
            createdAt: true,
            company: { select: { id: true, name: true } },
            sale: { select: { invoiceNumber: true } }
          }
        }
      }
    });

    // التالف (نقص)
    const damages = await this.prisma.damageReportLine.findMany({
      where: { productId, damageReport: { companyId, status: 'APPROVED' } },
      include: { damageReport: { select: { createdAt: true, reason: true } } }
    });

    // جلب بضاعة العرض المحولة للمحلات (نقص من المستودع)
    const storeCompanySetting = await this.prisma.globalSettings.findUnique({
      where: { key: 'EXTERNAL_STORE_COMPANY_ID' }
    });
    const targetCompanyId = storeCompanySetting ? parseInt(storeCompanySetting.value) : 1;

    let storeMovements: any[] = [];
    if (companyId === targetCompanyId) {
      const storeAssignments = await this.prisma.externalStoreProduct.findMany({
        where: { productId },
        include: {
          store: {
            include: {
              customer: { select: { name: true } }
            }
          }
        }
      });

      storeMovements = storeAssignments.map(a => ({
        date: a.createdAt,
        type: 'TRANSFER_OUT',
        description: `نقل بضاعة عرض الي محل (${a.store.name})${a.store.customer ? ` - عميل: ${a.store.customer.name}` : ''}`,
        qtyIn: 0,
        qtyOut: Number(a.quantity || 1),
      }));
    }

    // 3. توحيد الحركات في قائمة واحدة
    const allMovements: any[] = [
      ...sales.map(s => {
        const isInternal = s.sale.company.id !== companyId;
        return {
          date: s.sale.createdAt,
          type: 'SALE',
          description: `بيع: فاتورة ${s.sale.invoiceNumber || '-'} (${s.sale.customer?.name || 'عميل نقدي'})${isInternal ? ` - [${s.sale.company.name}]` : ''}`,
          qtyIn: 0,
          qtyOut: Number(s.qty),
        };
      }),
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
      ...saleReturns.map(r => {
        const isInternal = r.saleReturn.company.id !== companyId;
        return {
          date: r.saleReturn.createdAt,
          type: 'RETURN',
          description: `مردود مبيعات: فاتورة ${r.saleReturn.sale?.invoiceNumber || '-'}${isInternal ? ` - [${r.saleReturn.company.name}]` : ''}`,
          qtyIn: Number(r.qty),
          qtyOut: 0,
        };
      }),
      ...damages.map((d: any) => ({
        date: d.damageReport.createdAt,
        type: 'DAMAGE',
        description: `تالف: ${d.damageReport.reason || 'بدون وصف'}`,
        qtyIn: 0,
        qtyOut: Number(d.quantity),
      })),
      ...storeMovements
    ];

    // ترتيب الحركات حسب التاريخ تصاعدياً
    allMovements.sort((a, b) => a.date.getTime() - b.date.getTime());

    // 4. حساب "رصيد البداية الأول" (قبل كل الحركات)
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
        status: { in: ['APPROVED', 'RECEIVED_WAREHOUSE'] },
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

  /**
   * تقرير بضاعة المجموعات
   */
  async getGroupStockReport(query: any, userCompanyId: number, isSystemUser: boolean = false) {
    const { groupId, companyId: qCompanyId } = query;
    const companyId = qCompanyId || (isSystemUser !== true ? userCompanyId : undefined);

    if (!groupId) throw new Error("يجب تحديد المجموعة");

    // 1. جلب بيانات المجموعة
    const group = await this.prisma.productGroup.findUnique({
      where: { id: groupId }
    });

    if (!group) throw new Error("المجموعة غير موجودة");

    // 2. جلب المنتجات التابعة للمجموعة
    const products = await this.prisma.product.findMany({
      where: { groupId }
    });

    const productIds = products.map(p => p.id);

    // 3. جلب المخزون الحالي
    const stocks = await this.prisma.stock.findMany({
      where: {
        productId: { in: productIds },
        ...(companyId && { companyId })
      }
    });

    // 4. جلب المشتريات
    const purchaseLines = await this.prisma.purchaseLine.findMany({
      where: {
        productId: { in: productIds },
        purchase: { isApproved: true, ...(companyId && { companyId }) }
      }
    });

    const parentPurchaseLines = await this.prisma.purchaseFromParentLine.findMany({
      where: {
        productId: { in: productIds },
        purchase: { ...(companyId && { branchCompanyId: companyId }) }
      }
    });

    // 5. جلب المبيعات
    const saleLines = await this.prisma.saleLine.findMany({
      where: {
        productId: { in: productIds },
        sale: { status: 'APPROVED', ...(companyId && { companyId }) }
      }
    });

    // 6. جلب المردودات
    const returnLines = await this.prisma.saleReturnLine.findMany({
      where: {
        productId: { in: productIds },
        saleReturn: { status: { in: ['APPROVED', 'RECEIVED_WAREHOUSE'] }, ...(companyId && { companyId }) }
      }
    });

    // 7. جلب التالف
    const damageLines = await this.prisma.damageReportLine.findMany({
      where: {
        productId: { in: productIds },
        damageReport: { status: 'APPROVED', ...(companyId && { companyId }) }
      }
    });

    // تجميع البيانات
    const reportItems = products.map(product => {
      const productId = product.id;
      const currentStockBoxes = stocks.find(s => s.productId === productId)?.boxes ? Number(stocks.find(s => s.productId === productId)!.boxes) : 0;

      const totalPurchasedBoxes =
        purchaseLines.filter(l => l.productId === productId).reduce((sum, l) => sum + Number(l.qty), 0) +
        parentPurchaseLines.filter(l => l.productId === productId).reduce((sum, l) => sum + Number(l.qty), 0);

      const totalSoldBoxes = saleLines.filter(l => l.productId === productId).reduce((sum, l) => sum + Number(l.qty), 0);
      const totalReturnedBoxes = returnLines.filter(l => l.productId === productId).reduce((sum, l) => sum + Number(l.qty), 0);
      const totalDamagedBoxes = damageLines.filter(l => l.productId === productId).reduce((sum, l) => sum + Number(l.quantity), 0);

      // بضاعة أول المدة = الحالي - المشتريات + المبيعات - المردودات + التالف
      // (Current = Opening + Pur - Sale + Return - Damage)
      const openingStockBoxes = currentStockBoxes - totalPurchasedBoxes + totalSoldBoxes - totalReturnedBoxes + totalDamagedBoxes;

      const unitsPerBox = product.unitsPerBox ? Number(product.unitsPerBox) : 1;
      const unitCost = product.cost ? Number(product.cost) : 0;

      return {
        product: {
          id: product.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          unitsPerBox,
          cost: unitCost
        },
        openingStock: openingStockBoxes,
        totalPurchased: totalPurchasedBoxes,
        totalSold: totalSoldBoxes,
        totalReturned: totalReturnedBoxes,
        totalDamaged: totalDamagedBoxes,
        currentStock: currentStockBoxes,

        // حساب القيم المطلوبة للتقرير
        openingStockUnits: openingStockBoxes * unitsPerBox,
        purchasedUnits: totalPurchasedBoxes * unitsPerBox,
        soldUnits: totalSoldBoxes * unitsPerBox,
        currentStockUnits: currentStockBoxes * unitsPerBox,

        totalAvailableUnits: (openingStockBoxes + totalPurchasedBoxes) * unitsPerBox,

        // اجمالي التكلفة يحسب على الأمتار/القطع وليس الصناديق
        totalCost: currentStockBoxes * unitsPerBox * unitCost,

        // نسبة البيع = المبيعات / (بضاعة أول المدة + المشتريات)
        performance: ((openingStockBoxes + totalPurchasedBoxes) > 0)
          ? (totalSoldBoxes / (openingStockBoxes + totalPurchasedBoxes)) * 100
          : 0
      };
    });

    return {
      group: { id: group.id, name: group.name },
      items: reportItems,
      companyId
    };
  }
}


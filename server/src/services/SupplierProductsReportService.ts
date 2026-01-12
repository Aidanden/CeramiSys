import { PrismaClient, PurchaseStatus, PaymentReceiptStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface SupplierProductStats {
  productId: number;
  productName: string;
  productSku: string;
  unit: string;
  unitsPerBox: number | null;
  totalQuantityPurchased: number;
  currentStockQuantity: number;
}

interface SupplierDebt {
  currency: string;
  totalDebt: number;
}

export class SupplierProductsReportService {
  /**
   * الحصول على قائمة الموردين الذين لديهم فواتير بضاعة فقط (ليس مصروفات)
   */
  async getSuppliersWithPurchases(userCompanyId: number, isSystemUser: boolean = false) {
    console.log('🔍 Service: Getting suppliers with purchases', { userCompanyId, isSystemUser });
    
    // أولاً: التحقق من وجود فواتير معتمدة بشكل عام
    const totalApprovedPurchases = await prisma.purchase.count({
      where: {
        status: PurchaseStatus.APPROVED
      }
    });
    console.log(`📊 Total approved purchases in system: ${totalApprovedPurchases}`);
    
    // بناء شرط الفلترة
    const purchaseWhere: any = {
      status: PurchaseStatus.APPROVED,
      supplierId: {
        not: null
      }
    };

    // إذا لم يكن مستخدم نظام، تصفية حسب الشركة
    if (!isSystemUser) {
      purchaseWhere.companyId = userCompanyId;
    }

    console.log('🔍 Purchase where clause:', JSON.stringify(purchaseWhere, null, 2));

    // الحصول على الموردين الذين لديهم فواتير معتمدة
    const purchases = await prisma.purchase.findMany({
      where: purchaseWhere,
      select: {
        supplierId: true,
        id: true,
        invoiceNumber: true
      }
    });

    console.log(`📦 Found ${purchases.length} approved purchases with suppliers`);

    // الحصول على IDs الموردين الفريدة (إزالة null و undefined والتكرارات)
    const supplierIds = [...new Set(
      purchases
        .map(p => p.supplierId)
        .filter((id): id is number => id !== null && id !== undefined)
    )];

    console.log(`👥 Unique supplier IDs:`, supplierIds);

    if (supplierIds.length === 0) {
      console.log('⚠️ No suppliers found with approved purchases');
      return [];
    }

    // جلب تفاصيل الموردين
    const suppliers = await prisma.supplier.findMany({
      where: {
        id: {
          in: supplierIds
        }
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    // حساب عدد الفواتير لكل مورد
    const suppliersWithCount = await Promise.all(
      suppliers.map(async (supplier) => {
        const count = await prisma.purchase.count({
          where: {
            supplierId: supplier.id,
            status: PurchaseStatus.APPROVED,
            ...(isSystemUser ? {} : { companyId: userCompanyId })
          }
        });
        console.log(`👤 Supplier "${supplier.name}" (ID: ${supplier.id}) has ${count} approved purchases`);
        return {
          ...supplier,
          _count: {
            purchases: count
          }
        };
      })
    );

    console.log(`✅ Returning ${suppliersWithCount.length} suppliers`);
    
    return suppliersWithCount;
  }

  /**
   * الحصول على إجمالي المديونية للمورد مع تقسيمها حسب العملات
   */
  async getSupplierDebt(supplierId: number, userCompanyId: number, isSystemUser: boolean = false) {
    const whereClause: any = {
      supplierId,
      status: PurchaseStatus.APPROVED
    };

    if (!isSystemUser) {
      whereClause.companyId = userCompanyId;
    }

    const purchases = await prisma.purchase.findMany({
      where: whereClause,
      select: {
        id: true,
        total: true,
        currency: true,
        expenses: {
          select: {
            amount: true,
            currency: true
          }
        }
      }
    });

    // حساب المديونية لكل عملة
    const debtByCurrency: { [currency: string]: number } = {};

    purchases.forEach(purchase => {
      const currency = purchase.currency;
      const total = Number(purchase.total);
      
      // إضافة إجمالي الأصناف
      debtByCurrency[currency] = (debtByCurrency[currency] || 0) + total;
      
      // إضافة المصروفات بنفس عملة الفاتورة
      purchase.expenses.forEach(expense => {
        if (expense.currency === currency) {
          debtByCurrency[currency] = (debtByCurrency[currency] || 0) + Number(expense.amount);
        }
      });
    });

    // الحصول على المدفوعات للمورد
    const payments = await prisma.supplierPaymentReceipt.findMany({
      where: {
        supplierId,
        status: PaymentReceiptStatus.PAID,
        ...(isSystemUser ? {} : { companyId: userCompanyId })
      },
      select: {
        amount: true,
        currency: true
      }
    });

    // طرح المدفوعات من المديونية
    payments.forEach(payment => {
      const currency = payment.currency;
      const amount = Number(payment.amount);
      
      if (debtByCurrency[currency]) {
        debtByCurrency[currency] -= amount;
      }
    });

    // تحويل إلى array
    const debts: SupplierDebt[] = Object.entries(debtByCurrency)
      .map(([currency, totalDebt]) => ({
        currency,
        totalDebt: Number(totalDebt.toFixed(2))
      }))
      .filter(d => d.totalDebt !== 0);

    return debts;
  }

  /**
   * الحصول على تفاصيل البضاعة المشتراة من مورد معين
   */
  async getSupplierProductsReport(supplierId: number, userCompanyId: number, isSystemUser: boolean = false) {
    const whereClause: any = {
      supplierId,
      status: PurchaseStatus.APPROVED
    };

    if (!isSystemUser) {
      whereClause.companyId = userCompanyId;
    }

    const purchases = await prisma.purchase.findMany({
      where: whereClause,
      include: {
        lines: {
          include: {
            product: true
          }
        }
      }
    });

    console.log(`📦 Found ${purchases.length} purchases for supplier ${supplierId}`);

    // تجميع البيانات حسب المنتج
    const productStats: Map<number, SupplierProductStats> = new Map();

    purchases.forEach((purchase: any) => {
      if (!purchase.lines || purchase.lines.length === 0) {
        console.log(`⚠️ Purchase ${purchase.id} has no lines`);
        return;
      }
      
      purchase.lines.forEach((line: any) => {
        if (!line.product) return;

        const productId = line.product.id;
        
        if (productStats.has(productId)) {
          const stats = productStats.get(productId)!;
          stats.totalQuantityPurchased += line.qty;
        } else {
          productStats.set(productId, {
            productId: line.product.id,
            productName: line.product.name,
            productSku: line.product.sku || '',
            unit: line.product.unit || 'وحدة',
            unitsPerBox: line.product.unitsPerBox,
            totalQuantityPurchased: line.qty,
            currentStockQuantity: line.product.stock || 0
          });
        }
      });
    });

    return Array.from(productStats.values()).sort((a, b) => 
      a.productName.localeCompare(b.productName, 'ar')
    );
  }

  /**
   * الحصول على التقرير الكامل لمورد معين
   */
  async getFullSupplierReport(supplierId: number, userCompanyId: number, isSystemUser: boolean = false) {
    const [supplier, debts, products] = await Promise.all([
      prisma.supplier.findUnique({
        where: { id: supplierId },
        select: {
          id: true,
          name: true,
          phone: true,
          address: true
        }
      }),
      this.getSupplierDebt(supplierId, userCompanyId, isSystemUser),
      this.getSupplierProductsReport(supplierId, userCompanyId, isSystemUser)
    ]);

    return {
      supplier,
      debts,
      products
    };
  }
}


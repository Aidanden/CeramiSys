/**
 * Inter-Company Sale Service
 * خدمة المبيعات بين الشركات
 */

import { Prisma } from '@prisma/client';
import prisma from '../models/prismaClient';
import { CreateInterCompanySaleDto, GetInterCompanySalesQueryDto } from '../dto/interCompanySaleDto';

export class InterCompanySaleService {
  private prisma = prisma; // Use singleton

  /**
   * إنشاء فاتورة مبيعات بين الشركات
   * تقوم بإنشاء:
   * 1. فاتورة بيع للعميل النهائي (من الشركة التابعة)
   * 2. فاتورة شراء من الشركة الأم (PurchaseFromParent)
   */
  async createInterCompanySale(
    data: CreateInterCompanySaleDto,
    branchCompanyId: number,
    parentCompanyId: number
  ) {
    try {
      // التحقق من أن الشركة التابعة موجودة ولها شركة أم
      const branchCompany = await this.prisma.company.findUnique({
        where: { id: branchCompanyId },
        include: { parent: true }
      });

      if (!branchCompany) {
        throw new Error('الشركة التابعة غير موجودة');
      }

      if (!branchCompany.parentId || branchCompany.parentId !== parentCompanyId) {
        throw new Error('الشركة الأم غير صحيحة');
      }

      // حساب الإجماليات
      const branchTotal = data.lines.reduce((sum, line) => sum + line.subTotal, 0);
      const parentTotal = data.lines.reduce((sum, line) => sum + (line.qty * line.parentUnitPrice), 0);

      // إنشاء رقم فاتورة فريد
      const timestamp = Date.now();
      const branchInvoiceNumber = `BR-${branchCompanyId}-${timestamp}`;
      const parentInvoiceNumber = `PR-${parentCompanyId}-${timestamp}`;

      // استخدام Transaction لضمان إنشاء الفاتورتين معاً
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. إنشاء فاتورة البيع للعميل النهائي (من الشركة التابعة)
        const branchSale = await tx.sale.create({
          data: {
            companyId: branchCompanyId,
            customerId: data.customerId,
            invoiceNumber: branchInvoiceNumber,
            saleType: data.saleType,
            paymentMethod: data.saleType === 'CASH' ? data.paymentMethod : undefined,
            total: branchTotal,
            paidAmount: data.saleType === 'CASH' ? branchTotal : 0,
            remainingAmount: data.saleType === 'CASH' ? 0 : branchTotal,
            isFullyPaid: data.saleType === 'CASH',
            lines: {
              create: data.lines.map(line => ({
                productId: line.productId,
                qty: line.qty,
                unitPrice: line.branchUnitPrice,
                subTotal: line.subTotal
              }))
            }
          },
          include: {
            lines: {
              include: {
                product: true
              }
            },
            customer: true,
            company: true
          }
        });

        // 2. إنشاء فاتورة الشراء من الشركة الأم (آجلة دائماً)
        const parentPurchase = await tx.purchaseFromParent.create({
          data: {
            branchCompanyId: branchCompanyId,
            parentCompanyId: parentCompanyId,
            invoiceNumber: parentInvoiceNumber,
            total: parentTotal,
            isSettled: false, // آجلة
            lines: {
              create: data.lines.map(line => ({
                productId: line.productId,
                qty: line.qty,
                unitPrice: line.parentUnitPrice,
                subTotal: line.qty * line.parentUnitPrice
              }))
            }
          },
          include: {
            lines: {
              include: {
                product: true
              }
            },
            branchCompany: true,
            parentCompany: true
          }
        });

        // 3. تحديث المخزون (خصم من مخزون الشركة الأم)
        for (const line of data.lines) {
          // البحث عن المخزون في الشركة الأم
          const stock = await tx.stock.findFirst({
            where: {
              productId: line.productId,
              companyId: parentCompanyId
            }
          });

          if (!stock) {
            throw new Error(`المخزون غير موجود للصنف ${line.productId} في الشركة الأم`);
          }

          if (Number(stock.boxes) < line.qty) {
            throw new Error(`المخزون غير كافٍ للصنف ${line.productId}. المتوفر: ${stock.boxes}`);
          }

          // خصم من مخزون الشركة الأم
          await tx.stock.update({
            where: { id: stock.id },
            data: {
              boxes: new Prisma.Decimal(Number(stock.boxes) - line.qty)
            }
          });
        }

        return {
          branchSale,
          parentPurchase,
          profitMargin: branchTotal - parentTotal
        };
      });

      return {
        success: true,
        message: 'تم إنشاء فاتورة المبيعات بين الشركات بنجاح',
        data: result
      };
    } catch (error: any) {
      throw new Error(`خطأ في إنشاء فاتورة المبيعات بين الشركات: ${error.message}`);
    }
  }

  /**
   * الحصول على جميع المبيعات بين الشركات
   */
  async getInterCompanySales(query: GetInterCompanySalesQueryDto, branchCompanyId: number) {
    try {
      const { page, limit, search, customerId, saleType, startDate, endDate } = query;
      const skip = (page - 1) * limit;

      // بناء شروط البحث
      const where: any = {
        companyId: branchCompanyId
      };

      // البحث في رقم الفاتورة أو اسم العميل
      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } }
        ];
      }

      // فلترة حسب العميل
      if (customerId) {
        where.customerId = customerId;
      }

      // فلترة حسب نوع البيع
      if (saleType) {
        where.saleType = saleType;
      }

      // فلترة حسب التاريخ
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      // جلب البيانات
      const [sales, total] = await Promise.all([
        this.prisma.sale.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: { id: true, name: true, phone: true }
            },
            company: {
              select: { id: true, name: true, code: true }
            },
            lines: {
              include: {
                product: {
                  select: { id: true, sku: true, name: true, unit: true, unitsPerBox: true }
                }
              }
            },
            payments: true
          }
        }),
        this.prisma.sale.count({ where })
      ]);

      return {
        success: true,
        message: 'تم جلب المبيعات بين الشركات بنجاح',
        data: {
          sales,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error: any) {
      throw new Error(`خطأ في جلب المبيعات بين الشركات: ${error.message}`);
    }
  }

  /**
   * الحصول على فاتورة مبيعات بين الشركات بالتفصيل
   */
  async getInterCompanySaleById(id: number, branchCompanyId: number) {
    try {
      const sale = await this.prisma.sale.findFirst({
        where: {
          id,
          companyId: branchCompanyId
        },
        include: {
          customer: true,
          company: true,
          lines: {
            include: {
              product: true
            }
          },
          payments: true
        }
      });

      if (!sale) {
        throw new Error('الفاتورة غير موجودة أو ليس لديك صلاحية للوصول إليها');
      }

      // البحث عن فاتورة الشراء المرتبطة من الشركة الأم
      const parentPurchase = await this.prisma.purchaseFromParent.findFirst({
        where: {
          branchCompanyId: branchCompanyId,
          invoiceNumber: {
            contains: sale.invoiceNumber?.split('-')[2] || '' // استخدام timestamp
          }
        },
        include: {
          parentCompany: true,
          lines: {
            include: {
              product: true
            }
          },
          receipts: {
            include: {
              receipt: true
            }
          }
        }
      });

      return {
        success: true,
        message: 'تم جلب تفاصيل الفاتورة بنجاح',
        data: {
          sale,
          parentPurchase,
          profitMargin: Number(sale.total) - Number(parentPurchase?.total || 0)
        }
      };
    } catch (error: any) {
      throw new Error(`خطأ في جلب تفاصيل الفاتورة: ${error.message}`);
    }
  }

  /**
   * الحصول على إحصائيات المبيعات بين الشركات
   */
  async getInterCompanySalesStats(branchCompanyId: number) {
    try {
      const [totalSales, totalRevenue, totalCost, cashSales, creditSales] = await Promise.all([
        // إجمالي عدد المبيعات
        this.prisma.sale.count({
          where: { companyId: branchCompanyId }
        }),
        // إجمالي الإيرادات (من المبيعات للعملاء)
        this.prisma.sale.aggregate({
          where: { companyId: branchCompanyId },
          _sum: { total: true }
        }),
        // إجمالي التكلفة (من الشراء من الشركة الأم)
        this.prisma.purchaseFromParent.aggregate({
          where: { branchCompanyId: branchCompanyId },
          _sum: { total: true }
        }),
        // المبيعات النقدية
        this.prisma.sale.count({
          where: {
            companyId: branchCompanyId,
            saleType: 'CASH'
          }
        }),
        // المبيعات الآجلة
        this.prisma.sale.count({
          where: {
            companyId: branchCompanyId,
            saleType: 'CREDIT'
          }
        })
      ]);

      const revenue = Number(totalRevenue._sum.total || 0);
      const cost = Number(totalCost._sum.total || 0);
      const profit = revenue - cost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        success: true,
        message: 'تم جلب الإحصائيات بنجاح',
        data: {
          totalSales,
          totalRevenue: revenue,
          totalCost: cost,
          totalProfit: profit,
          profitMargin: profitMargin.toFixed(2),
          cashSales,
          creditSales
        }
      };
    } catch (error: any) {
      throw new Error(`خطأ في جلب الإحصائيات: ${error.message}`);
    }
  }
}

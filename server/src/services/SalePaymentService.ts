/**
 * Sale Payment Service
 * خدمة دفعات المبيعات الآجلة
 */

import { PrismaClient } from '@prisma/client';
import { CreateSalePaymentDto, UpdateSalePaymentDto, GetSalePaymentsQueryDto, GetCreditSalesQueryDto } from '../dto/salePaymentDto';

export class SalePaymentService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * الحصول على جميع المبيعات الآجلة
   */
  async getCreditSales(query: GetCreditSalesQueryDto, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      const { page, limit, search, customerId, isFullyPaid, startDate, endDate } = query;
      const skip = (page - 1) * limit;

      // بناء شروط البحث
      const where: any = {
        saleType: 'CREDIT', // فقط المبيعات الآجلة
      };

      // للمستخدمين العاديين: إظهار المبيعات التي شركتهم بائع أو مشتري (عميل)
      if (isSystemUser !== true) {
        // البحث عن عميل وهمي يمثل شركة المستخدم
        const branchAsCustomer = await this.prisma.customer.findFirst({
          where: {
            phone: `BRANCH-${userCompanyId}`
          }
        });

        // إظهار المبيعات التي:
        // 1. شركة المستخدم هي البائع (companyId)
        // 2. أو شركة المستخدم هي العميل (customerId) - للمبيعات من الشركة الأم
        const companyConditions = [
          { companyId: userCompanyId },
          ...(branchAsCustomer ? [{ customerId: branchAsCustomer.id }] : [])
        ];

        // إذا كان هناك بحث، ندمج الشروط
        if (search) {
          where.AND = [
            { OR: companyConditions },
            {
              OR: [
                { invoiceNumber: { contains: search, mode: 'insensitive' } },
                { customer: { name: { contains: search, mode: 'insensitive' } } }
              ]
            }
          ];
        } else {
          where.OR = companyConditions;
        }
      } else if (search) {
        // للـ System Users: بحث عادي بدون قيود الشركة
        where.OR = [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } }
        ];
      }

      // فلترة حسب العميل
      if (customerId) {
        where.customerId = customerId;
      }

      // فلترة حسب حالة السداد
      if (isFullyPaid !== undefined) {
        where.isFullyPaid = isFullyPaid;
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
            payments: {
              orderBy: { paymentDate: 'desc' }
            },
            lines: {
              include: {
                product: {
                  select: { id: true, sku: true, name: true, unit: true, unitsPerBox: true }
                }
              }
            }
          }
        }),
        this.prisma.sale.count({ where })
      ]);

      return {
        success: true,
        message: 'تم جلب المبيعات الآجلة بنجاح',
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
      throw new Error(`خطأ في جلب المبيعات الآجلة: ${error.message}`);
    }
  }

  /**
   * الحصول على فاتورة آجلة واحدة مع تفاصيل الدفعات
   */
  async getCreditSaleById(id: number, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      const sale = await this.prisma.sale.findFirst({
        where: {
          id,
          saleType: 'CREDIT',
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
        include: {
          customer: true,
          company: {
            select: { id: true, name: true, code: true }
          },
          payments: {
            orderBy: { paymentDate: 'desc' }
          },
          lines: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, unit: true, unitsPerBox: true }
              }
            }
          }
        }
      });

      if (!sale) {
        throw new Error('الفاتورة غير موجودة أو ليس لديك صلاحية للوصول إليها');
      }

      return {
        success: true,
        message: 'تم جلب الفاتورة بنجاح',
        data: { sale }
      };
    } catch (error: any) {
      throw new Error(`خطأ في جلب الفاتورة: ${error.message}`);
    }
  }

  /**
   * إنشاء دفعة جديدة (إيصال قبض)
   */
  async createPayment(data: CreateSalePaymentDto, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      // التحقق من وجود الفاتورة
      const sale = await this.prisma.sale.findFirst({
        where: {
          id: data.saleId,
          saleType: 'CREDIT',
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
        include: {
          payments: true
        }
      });

      if (!sale) {
        throw new Error('الفاتورة غير موجودة أو ليس لديك صلاحية للوصول إليها');
      }

      // التحقق من أن الفاتورة لم يتم سدادها بالكامل
      if (sale.isFullyPaid) {
        throw new Error('الفاتورة تم سدادها بالكامل بالفعل');
      }

      // التحقق من أن المبلغ لا يتجاوز المبلغ المتبقي
      const remainingAmount = Number(sale.remainingAmount);
      if (data.amount > remainingAmount) {
        throw new Error(`المبلغ المدفوع (${data.amount}) يتجاوز المبلغ المتبقي (${remainingAmount})`);
      }

      // توليد رقم إيصال القبض
      const receiptNumber = await this.generateReceiptNumber(userCompanyId);

      // إنشاء الدفعة
      const payment = await this.prisma.salePayment.create({
        data: {
          saleId: data.saleId,
          companyId: userCompanyId,
          receiptNumber,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          notes: data.notes
        }
      });

      // تحديث المبالغ في الفاتورة
      const newPaidAmount = Number(sale.paidAmount) + data.amount;
      const newRemainingAmount = Number(sale.total) - newPaidAmount;
      const isFullyPaid = newRemainingAmount <= 0;

      await this.prisma.sale.update({
        where: { id: data.saleId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          isFullyPaid
        }
      });

      // جلب الدفعة مع العلاقات
      const paymentWithRelations = await this.prisma.salePayment.findUnique({
        where: { id: payment.id },
        include: {
          sale: {
            include: {
              customer: true
            }
          },
          company: {
            select: { id: true, name: true, code: true }
          }
        }
      });

      return {
        success: true,
        message: 'تم إنشاء إيصال القبض بنجاح',
        data: { payment: paymentWithRelations }
      };
    } catch (error: any) {
      throw new Error(`خطأ في إنشاء الدفعة: ${error.message}`);
    }
  }

  /**
   * الحصول على جميع دفعات فاتورة معينة
   */
  async getSalePayments(query: GetSalePaymentsQueryDto, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      const { page, limit, saleId, startDate, endDate } = query;
      const skip = (page - 1) * limit;

      const where: any = {
        ...(isSystemUser !== true && { companyId: userCompanyId })
      };

      if (saleId) {
        where.saleId = saleId;
      }

      if (startDate || endDate) {
        where.paymentDate = {};
        if (startDate) where.paymentDate.gte = new Date(startDate);
        if (endDate) where.paymentDate.lte = new Date(endDate);
      }

      const [payments, total] = await Promise.all([
        this.prisma.salePayment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { paymentDate: 'desc' },
          include: {
            sale: {
              include: {
                customer: true
              }
            },
            company: {
              select: { id: true, name: true, code: true }
            }
          }
        }),
        this.prisma.salePayment.count({ where })
      ]);

      return {
        success: true,
        message: 'تم جلب الدفعات بنجاح',
        data: {
          payments,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error: any) {
      throw new Error(`خطأ في جلب الدفعات: ${error.message}`);
    }
  }

  /**
   * حذف دفعة
   */
  async deletePayment(id: number, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      // التحقق من وجود الدفعة
      const payment = await this.prisma.salePayment.findFirst({
        where: {
          id,
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
        include: {
          sale: true
        }
      });

      if (!payment) {
        throw new Error('الدفعة غير موجودة أو ليس لديك صلاحية للوصول إليها');
      }

      // حذف الدفعة
      await this.prisma.salePayment.delete({
        where: { id }
      });

      // تحديث المبالغ في الفاتورة
      const newPaidAmount = Number(payment.sale.paidAmount) - Number(payment.amount);
      const newRemainingAmount = Number(payment.sale.total) - newPaidAmount;

      await this.prisma.sale.update({
        where: { id: payment.saleId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          isFullyPaid: false
        }
      });

      return {
        success: true,
        message: 'تم حذف الدفعة بنجاح'
      };
    } catch (error: any) {
      throw new Error(`خطأ في حذف الدفعة: ${error.message}`);
    }
  }

  /**
   * توليد رقم إيصال قبض تلقائياً
   */
  private async generateReceiptNumber(companyId: number): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    // جلب آخر إيصال لهذه الشركة في هذا الشهر
    const lastPayment = await this.prisma.salePayment.findFirst({
      where: {
        companyId,
        receiptNumber: {
          startsWith: `REC-${year}${month}-`
        }
      },
      orderBy: {
        receiptNumber: 'desc'
      }
    });

    let sequence = 1;
    if (lastPayment && lastPayment.receiptNumber) {
      const parts = lastPayment.receiptNumber.split('-');
      if (parts.length === 3 && parts[2]) {
        sequence = parseInt(parts[2], 10) + 1;
      }
    }

    return `REC-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * إحصائيات المبيعات الآجلة
   */
  async getCreditSalesStats(userCompanyId: number, isSystemUser: boolean = false) {
    try {
      const where: any = {
        saleType: 'CREDIT',
      };

      // للمستخدمين العاديين: إظهار إحصائيات المبيعات التي شركتهم بائع أو مشتري
      if (isSystemUser !== true) {
        const branchAsCustomer = await this.prisma.customer.findFirst({
          where: {
            phone: `BRANCH-${userCompanyId}`
          }
        });

        where.OR = [
          { companyId: userCompanyId },
          ...(branchAsCustomer ? [{ customerId: branchAsCustomer.id }] : [])
        ];
      }

      const [
        totalCreditSales,
        fullyPaidSales,
        partiallyPaidSales,
        unpaidSales,
        totalAmount,
        totalPaid,
        totalRemaining
      ] = await Promise.all([
        this.prisma.sale.count({ where }),
        this.prisma.sale.count({ where: { ...where, isFullyPaid: true } }),
        this.prisma.sale.count({ 
          where: { 
            ...where, 
            isFullyPaid: false,
            paidAmount: { gt: 0 }
          } 
        }),
        this.prisma.sale.count({ 
          where: { 
            ...where, 
            paidAmount: 0
          } 
        }),
        this.prisma.sale.aggregate({
          where,
          _sum: { total: true }
        }),
        this.prisma.sale.aggregate({
          where,
          _sum: { paidAmount: true }
        }),
        this.prisma.sale.aggregate({
          where,
          _sum: { remainingAmount: true }
        })
      ]);

      return {
        success: true,
        message: 'تم جلب الإحصائيات بنجاح',
        data: {
          totalCreditSales,
          fullyPaidSales,
          partiallyPaidSales,
          unpaidSales,
          totalAmount: Number(totalAmount._sum.total || 0),
          totalPaid: Number(totalPaid._sum.paidAmount || 0),
          totalRemaining: Number(totalRemaining._sum.remainingAmount || 0)
        }
      };
    } catch (error: any) {
      throw new Error(`خطأ في جلب الإحصائيات: ${error.message}`);
    }
  }
}

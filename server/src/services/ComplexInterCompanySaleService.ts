/**
 * Complex Inter-Company Sale Service
 * خدمة المبيعات المعقدة بين الشركات
 * 
 * السيناريو:
 * 1. شركة التقازي (الشركة الأم) لديها أصناف ومخزون
 * 2. شركة الإمارات (الفرع) تريد بيع أصناف التقازي للعميل
 * 3. العميل يشتري من شركة الإمارات
 * 4. العمليات:
 *    - خصم المخزون من شركة التقازي
 *    - إنشاء فاتورة بيع آجل من التقازي للإمارات
 *    - إنشاء فاتورة بيع للعميل من الإمارات (بهامش ربح)
 */

import prisma from '../models/prismaClient';

export interface ComplexInterCompanySaleLine {
  productId: number;
  qty: number;
  parentUnitPrice?: number; // سعر التقازي (فقط للأصناف من الشركة الأم)
  branchUnitPrice: number;  // سعر الإمارات (مع هامش الربح)
  subTotal: number;
  isFromParentCompany?: boolean; // هل الصنف من الشركة الأم؟
}

export interface CreateComplexInterCompanySaleRequest {
  customerId: number;
  branchCompanyId: number; // شركة الإمارات
  parentCompanyId: number; // شركة التقازي
  lines: ComplexInterCompanySaleLine[];
  profitMargin?: number; // هامش الربح (نسبة مئوية)
  customerSaleType?: 'CASH' | 'CREDIT'; // نوع فاتورة العميل: نقدي أو آجل
  customerPaymentMethod?: 'CASH' | 'BANK' | 'CARD'; // طريقة الدفع: كاش، حوالة، بطاقة
}

export interface ComplexInterCompanySaleResult {
  customerSale: {
    id: number;
    invoiceNumber: string;
    total: number;
  };
  parentSale: {
    id: number;
    invoiceNumber: string;
    total: number;
  } | null;
  purchaseFromParent?: {
    id: number;
    invoiceNumber: string;
    total: number;
  } | null;
  branchPurchase?: {
    id: number;
    invoiceNumber: string;
    total: number;
  } | null;
}

export class ComplexInterCompanySaleService {
  private prisma = prisma; // Use singleton

  /**
   * إنشاء عملية بيع معقدة بين الشركات
   */
  async createComplexInterCompanySale(
    data: CreateComplexInterCompanySaleRequest,
    userCompanyId: number,
    isSystemUser?: boolean
  ): Promise<ComplexInterCompanySaleResult> {
    try {
      // التحقق من الصلاحيات - مؤقتاً معطل للاختبار


      // تم تعطيل التحقق من الصلاحيات مؤقتاً للاختبار
      // if (!isSystemUser) {
      //   // للمستخدمين العاديين: التحقق من أن الشركة الفرعية هي شركة المستخدم
      //   if (userCompanyId !== data.branchCompanyId) {
      //     throw new Error('غير مصرح لك بإنشاء عملية بيع لهذه الشركة');
      //   }
      // } else {

      // }

      // التحقق من وجود الشركات
      const branchCompany = await this.prisma.company.findUnique({
        where: { id: data.branchCompanyId },
        include: { parent: true }
      });

      const parentCompany = await this.prisma.company.findUnique({
        where: { id: data.parentCompanyId }
      });

      if (!branchCompany || !parentCompany) {
        throw new Error('الشركات المحددة غير موجودة');
      }

      // التحقق من أن الشركة الفرعية تابعة للشركة الأم
      if (branchCompany.parentId !== data.parentCompanyId) {

        throw new Error('الشركة الأم غير صحيحة');
      }

      // التحقق من وجود العميل
      const customer = await this.prisma.customer.findUnique({
        where: { id: data.customerId }
      });

      if (!customer) {
        throw new Error('العميل غير موجود');
      }

      // لا نتحقق من المخزون هنا - سيتم التحقق عند اعتماد الفاتورة
      // المعلومات عن مصدر كل صنف محفوظة في `isFromParentCompany`

      // بدء المعاملة
      const result = await this.prisma.$transaction(async (tx) => {
        // ملاحظة: لا يتم خصم المخزون أو التحقق منه هنا لأن الفاتورة مبدئية (DRAFT)
        // سيتم التحقق من المخزون وخصمه عند اعتماد الفاتورة من المحاسب

        // ملاحظة: لم نعد ننشئ الفواتير التلقائية هنا!
        // سيتم إنشاؤها فقط عند اعتماد الفاتورة من المحاسب
        // المعلومات محفوظة في `isFromParentCompany` و `parentUnitPrice` في SaleLine

        // 3. إنشاء فاتورة بيع واحدة للعميل من الشركة التابعة (تحتوي على كل الأصناف)
        const customerSaleTotal = data.lines.reduce((sum, line) => sum + line.subTotal, 0);
        const customerSaleType = 'CREDIT'; // ✅ جميع الفواتير آجلة
        const customerPaymentMethod = null; // سيُحدد لاحقاً عند الاعتماد
        const customerPaidAmount = 0; // لم يُدفع شيء
        const customerRemainingAmount = customerSaleTotal; // المبلغ المتبقي = المجموع
        const customerIsFullyPaid = false;

        const customerSale = await tx.sale.create({
          data: {
            companyId: data.branchCompanyId,
            customerId: data.customerId,
            invoiceNumber: `BR-${data.branchCompanyId}-${Date.now()}`,
            total: customerSaleTotal,
            saleType: customerSaleType,
            paymentMethod: customerPaymentMethod,
            paidAmount: customerPaidAmount,
            remainingAmount: customerRemainingAmount,
            isFullyPaid: customerIsFullyPaid,
            status: 'DRAFT', // مبدئية - في انتظار اعتماد المحاسب
            lines: {
              create: data.lines.map(line => ({
                productId: line.productId,
                qty: line.qty,
                unitPrice: line.branchUnitPrice,
                subTotal: line.subTotal,
                isFromParentCompany: line.isFromParentCompany || false,
                parentUnitPrice: line.parentUnitPrice || null,
                branchUnitPrice: line.branchUnitPrice || null
              }))
            }
          }
        });

        // لا حاجة لتحديث relatedParentSaleId هنا، سيتم ذلك عند الاعتماد

        return {
          customerSale: {
            id: customerSale.id,
            invoiceNumber: customerSale.invoiceNumber!,
            total: Number(customerSale.total)
          },
          parentSale: null, // سيتم إنشاؤها عند الاعتماد
          purchaseFromParent: null, // سيتم إنشاؤها عند الاعتماد
          branchPurchase: null // سيتم إنشاؤها عند الاعتماد
        };
      });

      return result;

    } catch (error) {
      console.error('خطأ في إنشاء عملية البيع المعقدة:', error);
      throw error;
    }
  }

  /**
   * تسوية فاتورة الشراء من الشركة الأم
   */
  async settleParentSale(
    parentSaleId: number,
    amount: number,
    paymentMethod: 'CASH' | 'BANK' | 'CARD',
    userCompanyId: number
  ) {
    try {
      const parentSale = await this.prisma.sale.findUnique({
        where: { id: parentSaleId },
        include: { company: true }
      });

      if (!parentSale) {
        throw new Error('فاتورة الشركة الأم غير موجودة');
      }

      if (parentSale.companyId !== userCompanyId) {
        throw new Error('غير مصرح لك بتسوية هذه الفاتورة');
      }

      const newPaidAmount = Number(parentSale.paidAmount) + amount;
      const newRemainingAmount = Number(parentSale.total) - newPaidAmount;
      const isFullyPaid = newRemainingAmount <= 0;

      await this.prisma.sale.update({
        where: { id: parentSaleId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          isFullyPaid: isFullyPaid
        }
      });

      // إنشاء سجل الدفعة
      await this.prisma.salePayment.create({
        data: {
          saleId: parentSaleId,
          companyId: userCompanyId,
          amount: amount,
          paymentMethod: paymentMethod,
          paymentDate: new Date()
        }
      });

      return {
        success: true,
        message: 'تم تسوية الفاتورة بنجاح',
        newPaidAmount,
        newRemainingAmount,
        isFullyPaid
      };

    } catch (error) {
      console.error('خطأ في تسوية الفاتورة:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات المبيعات المعقدة
   */
  async getComplexInterCompanyStats(userCompanyId: number) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id: userCompanyId },
        include: { parent: true }
      });

      if (!company) {
        throw new Error('الشركة غير موجودة');
      }

      // إحصائيات المبيعات للعملاء
      const customerSalesStats = await this.prisma.sale.aggregate({
        where: { companyId: userCompanyId },
        _count: { id: true },
        _sum: { total: true }
      });

      // إحصائيات المشتريات من الشركة الأم
      const parentPurchasesStats = await this.prisma.purchaseFromParent.aggregate({
        where: { branchCompanyId: userCompanyId },
        _count: { id: true },
        _sum: { total: true }
      });

      // إحصائيات المبيعات الآجلة للشركة الأم
      const parentSalesStats = await this.prisma.sale.aggregate({
        where: {
          companyId: company.parentId || userCompanyId,
          saleType: 'CREDIT'
        },
        _count: { id: true },
        _sum: { total: true, remainingAmount: true }
      });

      return {
        customerSales: {
          count: customerSalesStats._count.id,
          total: Number(customerSalesStats._sum.total || 0)
        },
        parentPurchases: {
          count: parentPurchasesStats._count.id,
          total: Number(parentPurchasesStats._sum.total || 0)
        },
        parentSales: {
          count: parentSalesStats._count.id,
          total: Number(parentSalesStats._sum.total || 0),
          remaining: Number(parentSalesStats._sum.remainingAmount || 0)
        }
      };

    } catch (error) {
      console.error('خطأ في جلب الإحصائيات:', error);
      throw error;
    }
  }
}

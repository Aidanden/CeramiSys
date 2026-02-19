/**
 * Complex Inter-Company Sale Controller
 * تحكم في المبيعات المعقدة بين الشركات
 */

import { Request, Response } from 'express';
import { ComplexInterCompanySaleService } from '../services/ComplexInterCompanySaleService';

export class ComplexInterCompanySaleController {
  private complexInterCompanySaleService: ComplexInterCompanySaleService;

  constructor() {
    this.complexInterCompanySaleService = new ComplexInterCompanySaleService();
  }

  /**
   * إنشاء عملية بيع معقدة بين الشركات
   */
  async createComplexInterCompanySale(req: Request, res: Response): Promise<void> {
    try {
      // إلغاء جميع القيود - السماح للجميع بإنشاء عمليات بيع معقدة
      const userCompanyId = (req as any).user?.companyId || 0;
      const isSystemUser = true; // دائماً true لإلغاء القيود

      const {
        customerId,
        branchCompanyId,
        parentCompanyId,
        lines,
        profitMargin,
        totalDiscountPercentage,
        totalDiscountAmount,
        createdAt
      } = req.body;

      // التحقق من صحة البيانات
      if (!customerId || !branchCompanyId || !parentCompanyId || !lines || !Array.isArray(lines)) {
        res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
        });
        return;
      }

      // للـ System User: يمكنه إنشاء عمليات لجميع الشركات
      // للمستخدم العادي: يمكنه إنشاء عمليات لشركته فقط
      const finalBranchCompanyId = branchCompanyId;

      const result = await this.complexInterCompanySaleService.createComplexInterCompanySale({
        customerId,
        branchCompanyId: finalBranchCompanyId,
        parentCompanyId,
        lines,
        profitMargin,
        totalDiscountPercentage,
        totalDiscountAmount,
        createdAt
      }, userCompanyId, true);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء عملية البيع المعقدة بنجاح',
        data: result
      });

    } catch (error: any) {
      console.error('خطأ في إنشاء عملية البيع المعقدة:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في الخادم الداخلي',
      });
    }
  }

  /**
   * تسوية فاتورة الشراء من الشركة الأم
   */
  async settleParentSale(req: Request, res: Response): Promise<void> {
    try {
      // إلغاء القيود
      const userCompanyId = (req as any).user?.companyId || 0;

      const { parentSaleId } = req.params;
      const { amount, paymentMethod } = req.body;

      if (!parentSaleId || !amount || !paymentMethod) {
        res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
        });
        return;
      }

      const result = await this.complexInterCompanySaleService.settleParentSale(
        parseInt(parentSaleId),
        parseFloat(amount),
        paymentMethod,
        userCompanyId
      );

      res.status(200).json({
        success: true,
        message: 'تم تسوية الفاتورة بنجاح',
        data: result
      });

    } catch (error: any) {
      console.error('خطأ في تسوية الفاتورة:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في الخادم الداخلي',
      });
    }
  }

  /**
   * الحصول على إحصائيات المبيعات المعقدة
   */
  async getComplexInterCompanyStats(req: Request, res: Response): Promise<void> {
    try {
      // إلغاء القيود
      const userCompanyId = (req as any).user?.companyId || 0;

      const stats = await this.complexInterCompanySaleService.getComplexInterCompanyStats(userCompanyId);

      res.status(200).json({
        success: true,
        message: 'تم جلب الإحصائيات بنجاح',
        data: stats
      });

    } catch (error: any) {
      console.error('خطأ في جلب الإحصائيات:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في الخادم الداخلي',
      });
    }
  }
}

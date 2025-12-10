import { Request, Response } from 'express';
import { DamageReportService } from '../services/DamageReportService';
import { CreateDamageReportDto, GetDamageReportsQueryDto } from '../dto/damageReportDto';

export class DamageReportController {
  private damageReportService: DamageReportService;

  constructor() {
    this.damageReportService = new DamageReportService();
  }

  /**
   * إنشاء محضر إتلاف جديد
   */
  createDamageReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: CreateDamageReportDto = req.body;
      const userCompanyId = (req as any).user?.companyId;
      const userId = (req as any).user?.userId;
      const isSystemUser = (req as any).user?.isSystemUser || false;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح',
        });
        return;
      }

      // إذا كان System User، يمكنه تحديد الشركة من الـ request body
      // وإلا يستخدم شركته
      const companyId = isSystemUser && data.companyId 
        ? data.companyId 
        : userCompanyId;

      if (!companyId) {
        res.status(400).json({
          success: false,
          message: 'يجب تحديد الشركة',
        });
        return;
      }

      const result = await this.damageReportService.createDamageReport(data, companyId, userId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('Error in createDamageReport:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'فشل في إنشاء محضر الإتلاف'
      });
    }
  };

  /**
   * الحصول على قائمة محاضر الإتلاف
   */
  getDamageReports = async (req: Request, res: Response): Promise<void> => {
    try {
      const query: GetDamageReportsQueryDto = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        search: req.query.search as string,
        status: req.query.status as any,
        companyId: req.query.companyId ? parseInt(req.query.companyId as string) : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        productName: req.query.productName as string,
        productCode: req.query.productCode as string,
        reason: req.query.reason as string,
      };

      const companyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser || false;

      if (!companyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح',
        });
        return;
      }

      const result = await this.damageReportService.getDamageReports(query, companyId, isSystemUser);

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error in getDamageReports:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'فشل في جلب محاضر الإتلاف'
      });
    }
  };

  /**
   * الحصول على محضر إتلاف واحد
   */
  getDamageReportById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id!);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'معرف المحضر غير صحيح'
        });
        return;
      }

      const result = await this.damageReportService.getDamageReportById(id);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error: any) {
      console.error('Error in getDamageReportById:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'فشل في جلب محضر الإتلاف'
      });
    }
  };

  /**
   * الحصول على إحصائيات محاضر الإتلاف
   */
  getDamageReportStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser || false;

      if (!companyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح',
        });
        return;
      }

      const result = await this.damageReportService.getDamageReportStats(companyId, isSystemUser);

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error in getDamageReportStats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'فشل في جلب الإحصائيات'
      });
    }
  };

  /**
   * حذف محضر إتلاف
   */
  deleteDamageReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id!);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'معرف المحضر غير صحيح'
        });
        return;
      }

      const result = await this.damageReportService.deleteDamageReport(id);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('Error in deleteDamageReport:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'فشل في حذف محضر الإتلاف'
      });
    }
  };
}

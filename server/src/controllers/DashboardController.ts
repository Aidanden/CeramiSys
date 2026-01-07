import { Request, Response } from 'express';
import DashboardService from '../services/DashboardService';

export class DashboardController {
  /**
   * الحصول على إحصائيات مبيعات المستخدمين
   * GET /api/dashboard/users-sales?year=2024&month=12
   */
  async getUsersSalesStats(req: Request, res: Response) {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;

      const stats = await DashboardService.getUsersSalesStats(year, month);
      res.status(200).json(stats);
    } catch (error: any) {
      console.error('Error in getUsersSalesStats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في جلب إحصائيات مبيعات المستخدمين',
      });
    }
  }

  /**
   * الحصول على بيانات الرسم البياني الشامل
   * GET /api/dashboard/comprehensive-chart?year=2024
   */
  async getComprehensiveChartData(req: Request, res: Response) {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const data = await DashboardService.getComprehensiveChartData(year);
      res.status(200).json(data);
    } catch (error: any) {
      console.error('Error in getComprehensiveChartData:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في جلب بيانات الرسم البياني',
      });
    }
  }
}

export default new DashboardController();


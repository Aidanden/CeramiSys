/**
 * Activity Controller
 * تحكم في الأنشطة الأخيرة
 */

import { Request, Response } from 'express';
import { ActivityService } from '../services/ActivityService';

export class ActivityController {
  private activityService: ActivityService;

  constructor() {
    this.activityService = new ActivityService();
  }

  /**
   * الحصول على الأنشطة الأخيرة
   */
  async getRecentActivities(req: Request, res: Response): Promise<void> {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول',
        });
        return;
      }

      const activities = await this.activityService.getRecentActivities(
        userCompanyId, 
        isSystemUser, 
        limit
      );

      res.status(200).json({
        success: true,
        message: 'تم جلب الأنشطة الأخيرة بنجاح',
        data: activities
      });
    } catch (error: any) {
      console.error('خطأ في جلب الأنشطة الأخيرة:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في الخادم الداخلي',
      });
    }
  }
}


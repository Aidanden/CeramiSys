import { Request, Response } from 'express';
import SaleReturnService from '../services/SaleReturnService';
import { ReturnStatus } from '@prisma/client';

export class SaleReturnController {
  /**
   * التحقق من صلاحية الفاتورة للمرتجع
   */
  async validateSale(req: Request, res: Response) {
    try {
      const { saleId } = req.params;
      const result = await SaleReturnService.validateSaleForReturn(Number(saleId));
      
      res.json({
        success: result.valid,
        message: result.message
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء التحقق من الفاتورة'
      });
    }
  }

  /**
   * إنشاء مرتجع جديد
   */
  async createReturn(req: Request, res: Response) {
    try {
      const data = req.body;
      const saleReturn = await SaleReturnService.createReturn(data);
      
      res.status(201).json({
        success: true,
        message: 'تم إنشاء المرتجع بنجاح',
        data: saleReturn
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء إنشاء المرتجع'
      });
    }
  }

  /**
   * الحصول على جميع المرتجعات
   */
  async getReturns(req: Request, res: Response) {
    try {
      const { companyId, customerId, status, page, limit } = req.query;
      
      const filters = {
        companyId: companyId ? Number(companyId) : undefined,
        customerId: customerId ? Number(customerId) : undefined,
        status: status as ReturnStatus | undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10
      };

      const result = await SaleReturnService.getReturns(filters);
      
      res.json({
        success: true,
        data: result.returns,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء جلب المرتجعات'
      });
    }
  }

  /**
   * الحصول على مرتجع واحد
   */
  async getReturnById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const saleReturn = await SaleReturnService.getReturnById(Number(id));
      
      res.json({
        success: true,
        data: saleReturn
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'المرتجع غير موجود'
      });
    }
  }

  /**
   * تحديث حالة المرتجع
   */
  async updateReturnStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      const saleReturn = await SaleReturnService.updateReturnStatus({
        returnId: Number(id),
        status,
        notes
      });
      
      res.json({
        success: true,
        message: 'تم تحديث حالة المرتجع بنجاح',
        data: saleReturn
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء تحديث حالة المرتجع'
      });
    }
  }

  /**
   * معالجة المرتجع
   */
  async processReturn(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const saleReturn = await SaleReturnService.processReturn(Number(id));
      
      res.json({
        success: true,
        message: 'تمت معالجة المرتجع بنجاح',
        data: saleReturn
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء معالجة المرتجع'
      });
    }
  }

  /**
   * حذف مرتجع
   */
  async deleteReturn(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await SaleReturnService.deleteReturn(Number(id));
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء حذف المرتجع'
      });
    }
  }

  /**
   * إحصائيات المرتجعات
   */
  async getReturnStats(req: Request, res: Response) {
    try {
      const { companyId } = req.query;
      const stats = await SaleReturnService.getReturnStats(
        companyId ? Number(companyId) : undefined
      );
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء جلب الإحصائيات'
      });
    }
  }
}

export default new SaleReturnController();

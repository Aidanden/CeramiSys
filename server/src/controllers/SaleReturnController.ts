/**
 * Sale Return Controller
 * تحكم المردودات
 */

import { Request, Response } from 'express';
import { SaleReturnService } from '../services/SaleReturnService';
import {
  CreateSaleReturnDtoSchema,
  GetSaleReturnsQueryDtoSchema,
  CreateReturnPaymentDtoSchema,
  GetReturnPaymentsQueryDtoSchema
} from '../dto/saleReturnDto';
import { ZodError } from 'zod';

const service = new SaleReturnService();

export class SaleReturnController {
  /**
   * إنشاء مردود مبيعات جديد
   */
  async createSaleReturn(req: Request, res: Response) {
    try {
      const validatedData = CreateSaleReturnDtoSchema.parse(req.body);
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }

      const saleReturn = await service.createSaleReturn(validatedData, companyId);
      
      return res.status(201).json({
        success: true,
        message: 'تم إنشاء المردود بنجاح',
        data: saleReturn
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
          errors: error.issues
        });
      }
      
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'خطأ في الخادم'
      });
    }
  }

  /**
   * الحصول على جميع المردودات
   */
  async getSaleReturns(req: Request, res: Response) {
    try {
      const validatedQuery = GetSaleReturnsQueryDtoSchema.parse(req.query);
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }

      const result = await service.getSaleReturns(validatedQuery, companyId);
      
      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'معاملات البحث غير صحيحة',
          errors: error.issues
        });
      }

      return res.status(500).json({
        success: false,
        message: 'خطأ في الخادم'
      });
    }
  }

  /**
   * الحصول على مردود واحد
   */
  async getSaleReturnById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id!);
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'معرف المردود غير صحيح'
        });
      }

      const saleReturn = await service.getSaleReturnById(id, companyId);
      
      return res.status(200).json({
        success: true,
        data: saleReturn
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'خطأ في الخادم'
      });
    }
  }

  /**
   * اعتماد مردود
   */
  async approveSaleReturn(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id!);
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'معرف المردود غير صحيح'
        });
      }

      const saleReturn = await service.approveSaleReturn(id, companyId);
      
      return res.status(200).json({
        success: true,
        message: 'تم اعتماد المردود بنجاح',
        data: saleReturn
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'خطأ في الخادم'
      });
    }
  }

  /**
   * رفض مردود
   */
  async rejectSaleReturn(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id!);
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'معرف المردود غير صحيح'
        });
      }

      const saleReturn = await service.rejectSaleReturn(id, companyId);
      
      return res.status(200).json({
        success: true,
        message: 'تم رفض المردود',
        data: saleReturn
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'خطأ في الخادم'
      });
    }
  }

  /**
   * حذف مردود
   */
  async deleteSaleReturn(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id!);
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'معرف المردود غير صحيح'
        });
      }

      const result = await service.deleteSaleReturn(id, companyId);
      
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'خطأ في الخادم'
      });
    }
  }

  // ==================== Return Payments ====================

  /**
   * إضافة دفعة لمردود
   */
  async createReturnPayment(req: Request, res: Response) {
    try {
      const validatedData = CreateReturnPaymentDtoSchema.parse(req.body);
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }

      const payment = await service.createReturnPayment(validatedData, companyId);
      
      return res.status(201).json({
        success: true,
        message: 'تم إضافة الدفعة بنجاح',
        data: payment
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
          errors: error.issues
        });
      }
      
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'خطأ في الخادم'
      });
    }
  }

  /**
   * الحصول على دفعات المردودات
   */
  async getReturnPayments(req: Request, res: Response) {
    try {
      const validatedQuery = GetReturnPaymentsQueryDtoSchema.parse(req.query);
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }

      const result = await service.getReturnPayments(validatedQuery, companyId);
      
      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'معاملات البحث غير صحيحة',
          errors: error.issues
        });
      }

      return res.status(500).json({
        success: false,
        message: 'خطأ في الخادم'
      });
    }
  }

  /**
   * حذف دفعة مردود
   */
  async deleteReturnPayment(req: Request, res: Response) {
    try {
      const paymentId = parseInt(req.params.paymentId!);
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }

      if (isNaN(paymentId)) {
        return res.status(400).json({
          success: false,
          message: 'معرف الدفعة غير صحيح'
        });
      }

      const result = await service.deleteReturnPayment(paymentId, companyId);
      
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'خطأ في الخادم'
      });
    }
  }
}


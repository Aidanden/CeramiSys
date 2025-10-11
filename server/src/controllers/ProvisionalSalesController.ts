/**
 * Provisional Sales Controller
 * متحكم الفواتير المبدئية
 */

import { Request, Response } from 'express';
import { ProvisionalSalesService } from '../services/ProvisionalSalesService';
import { 
  CreateProvisionalSaleDtoSchema,
  UpdateProvisionalSaleDtoSchema,
  GetProvisionalSalesQueryDtoSchema,
  ConvertToSaleDtoSchema
} from '../dto/provisionalSalesDto';

export class ProvisionalSalesController {
  private provisionalSalesService: ProvisionalSalesService;

  constructor() {
    this.provisionalSalesService = new ProvisionalSalesService();
  }

  // ============== إنشاء فاتورة مبدئية جديدة ==============

  async createProvisionalSale(req: Request, res: Response): Promise<void> {
    try {
      // التحقق من صحة البيانات
      const validationResult = CreateProvisionalSaleDtoSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
          errors: validationResult.error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }

      // تطبيق عزل الشركات للمستخدمين العاديين
      const createData = { ...validationResult.data };
      
      // إذا لم يكن مستخدم نظام، فرض companyId الخاص به
      if (!req.user?.isSystemUser && req.user?.companyId) {
        createData.companyId = req.user.companyId;
      }

      const provisionalSale = await this.provisionalSalesService.createProvisionalSale(createData);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الفاتورة المبدئية بنجاح',
        data: provisionalSale
      });
    } catch (error: any) {
      console.error('خطأ في إنشاء الفاتورة المبدئية:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في إنشاء الفاتورة المبدئية'
      });
    }
  }

  // ============== تحديث فاتورة مبدئية ==============

  async updateProvisionalSale(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة المبدئية مطلوب'
        });
        return;
      }

      const id = parseInt(idParam);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة المبدئية غير صحيح'
        });
        return;
      }

      // التحقق من صحة البيانات
      const validationResult = UpdateProvisionalSaleDtoSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
          errors: validationResult.error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }

      const provisionalSale = await this.provisionalSalesService.updateProvisionalSale(
        id, 
        validationResult.data,
        req.user?.companyId,
        req.user?.isSystemUser
      );

      res.json({
        success: true,
        message: 'تم تحديث الفاتورة المبدئية بنجاح',
        data: provisionalSale
      });
    } catch (error: any) {
      console.error('خطأ في تحديث الفاتورة المبدئية:', error);
      
      if (error.message === 'الفاتورة المبدئية غير موجودة') {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في تحديث الفاتورة المبدئية'
      });
    }
  }

  // ============== الحصول على قائمة الفواتير المبدئية ==============

  async getProvisionalSales(req: Request, res: Response): Promise<void> {
    try {
      console.log('📋 Provisional Sales Query Params:', req.query);
      
      // التحقق من صحة معاملات الاستعلام
      const validationResult = GetProvisionalSalesQueryDtoSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        console.error('❌ Validation Error:', validationResult.error.issues);
        res.status(400).json({
          success: false,
          message: 'معاملات الاستعلام غير صحيحة',
          errors: validationResult.error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }

      // تطبيق عزل الشركات للمستخدمين العاديين
      const queryData = { ...validationResult.data };
      
      // إذا لم يكن مستخدم نظام، فرض companyId الخاص به
      if (!req.user?.isSystemUser && req.user?.companyId) {
        queryData.companyId = req.user.companyId;
      }

      const result = await this.provisionalSalesService.getProvisionalSales(queryData);

      res.json({
        success: true,
        message: 'تم الحصول على الفواتير المبدئية بنجاح',
        data: result.provisionalSales,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('خطأ في الحصول على الفواتير المبدئية:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في الحصول على الفواتير المبدئية'
      });
    }
  }

  // ============== الحصول على فاتورة مبدئية واحدة ==============

  async getProvisionalSaleById(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة المبدئية مطلوب'
        });
        return;
      }

      const id = parseInt(idParam);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة المبدئية غير صحيح'
        });
        return;
      }

      const provisionalSale = await this.provisionalSalesService.getProvisionalSaleById(id);

      res.json({
        success: true,
        message: 'تم الحصول على الفاتورة المبدئية بنجاح',
        data: provisionalSale
      });
    } catch (error: any) {
      console.error('خطأ في الحصول على الفاتورة المبدئية:', error);
      
      if (error.message === 'الفاتورة المبدئية غير موجودة') {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في الحصول على الفاتورة المبدئية'
      });
    }
  }

  // ============== حذف فاتورة مبدئية ==============

  async deleteProvisionalSale(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة المبدئية مطلوب'
        });
        return;
      }

      const id = parseInt(idParam);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة المبدئية غير صحيح'
        });
        return;
      }

      await this.provisionalSalesService.deleteProvisionalSale(
        id,
        req.user?.companyId,
        req.user?.isSystemUser
      );

      res.json({
        success: true,
        message: 'تم حذف الفاتورة المبدئية بنجاح'
      });
    } catch (error: any) {
      console.error('خطأ في حذف الفاتورة المبدئية:', error);
      
      if (error.message === 'الفاتورة المبدئية غير موجودة') {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في حذف الفاتورة المبدئية'
      });
    }
  }

  // ============== ترحيل فاتورة مبدئية إلى فاتورة عادية ==============

  async convertToSale(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة المبدئية مطلوب'
        });
        return;
      }

      const id = parseInt(idParam);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة المبدئية غير صحيح'
        });
        return;
      }

      // التحقق من صحة البيانات
      const validationResult = ConvertToSaleDtoSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
          errors: validationResult.error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }

      const provisionalSale = await this.provisionalSalesService.convertToSale(id, validationResult.data);

      res.json({
        success: true,
        message: 'تم ترحيل الفاتورة المبدئية إلى فاتورة مبيعات بنجاح',
        data: provisionalSale
      });
    } catch (error: any) {
      console.error('خطأ في ترحيل الفاتورة المبدئية:', error);
      
      if (error.message.includes('غير موجودة') || error.message.includes('تم ترحيلها مسبقاً') || error.message.includes('يجب اعتماد')) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في ترحيل الفاتورة المبدئية'
      });
    }
  }

  // ============== تغيير حالة الفاتورة المبدئية ==============

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة المبدئية مطلوب'
        });
        return;
      }

      const id = parseInt(idParam);
      const { status } = req.body;
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة المبدئية غير صحيح'
        });
        return;
      }

      if (!status || !['DRAFT', 'PENDING', 'APPROVED', 'CANCELLED'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'حالة الفاتورة غير صحيحة'
        });
        return;
      }

      const provisionalSale = await this.provisionalSalesService.updateProvisionalSale(id, { status });

      res.json({
        success: true,
        message: 'تم تحديث حالة الفاتورة المبدئية بنجاح',
        data: provisionalSale
      });
    } catch (error: any) {
      console.error('خطأ في تحديث حالة الفاتورة المبدئية:', error);
      
      if (error.message === 'الفاتورة المبدئية غير موجودة') {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في تحديث حالة الفاتورة المبدئية'
      });
    }
  }
}

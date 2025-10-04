import { Request, Response } from 'express';
import { PurchaseService } from '../services/PurchaseService';
import { 
  CreatePurchaseDto, 
  UpdatePurchaseDto, 
  CreatePurchasePaymentDto,
  CreateSupplierDto,
  UpdateSupplierDto,
  GetPurchasesQueryDto,
  GetSuppliersQueryDto
} from '../dto/purchaseDto';

export class PurchaseController {
  // Purchase management
  static async createPurchase(req: Request, res: Response) {
    try {
      const validatedData = CreatePurchaseDto.parse(req.body);
      const purchase = await PurchaseService.createPurchase(validatedData);
      
      res.status(201).json({
        success: true,
        message: 'تم إنشاء فاتورة المشتريات بنجاح',
        data: purchase,
      });
    } catch (error: any) {
      console.error('Error creating purchase:', error);
      
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
          errors: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في إنشاء فاتورة المشتريات',
      });
    }
  }

  static async getPurchases(req: Request, res: Response) {
    try {
      const validatedQuery = GetPurchasesQueryDto.parse(req.query);
      const result = await PurchaseService.getPurchases(validatedQuery);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error getting purchases:', error);
      
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          message: 'معاملات البحث غير صحيحة',
          errors: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        message: 'حدث خطأ في جلب فواتير المشتريات',
      });
    }
  }

  static async getPurchaseById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة مطلوب',
        });
        return;
      }
      const purchaseId = parseInt(id);

      if (isNaN(purchaseId)) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة غير صحيح',
        });
      }

      const purchase = await PurchaseService.getPurchaseById(purchaseId);

      if (!purchase) {
      res.status(404).json({
        success: false,
        message: 'فاتورة المشتريات غير موجودة',
      });
      return;
      }

      res.json({
        success: true,
        data: purchase,
      });
    } catch (error: any) {
      console.error('Error getting purchase by ID:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ في جلب فاتورة المشتريات',
      });
    }
  }

  static async updatePurchase(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة مطلوب',
        });
        return;
      }
      const purchaseId = parseInt(id);

      if (isNaN(purchaseId)) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة غير صحيح',
        });
      }

      const validatedData = UpdatePurchaseDto.parse(req.body);
      const purchase = await PurchaseService.updatePurchase(purchaseId, validatedData);
      
      res.json({
        success: true,
        message: 'تم تحديث فاتورة المشتريات بنجاح',
        data: purchase,
      });
    } catch (error: any) {
      console.error('Error updating purchase:', error);
      
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
          errors: error.errors,
        });
        return;
      }

      if (error.message === 'Purchase not found') {
      res.status(404).json({
        success: false,
        message: 'فاتورة المشتريات غير موجودة',
      });
      return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في تحديث فاتورة المشتريات',
      });
    }
  }

  static async deletePurchase(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة مطلوب',
        });
        return;
      }
      const purchaseId = parseInt(id);

      if (isNaN(purchaseId)) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة غير صحيح',
        });
      }

      await PurchaseService.deletePurchase(purchaseId);
      
      res.json({
        success: true,
        message: 'تم حذف فاتورة المشتريات بنجاح',
      });
    } catch (error: any) {
      console.error('Error deleting purchase:', error);
      
      if (error.message === 'Purchase not found') {
      res.status(404).json({
        success: false,
        message: 'فاتورة المشتريات غير موجودة',
      });
      return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في حذف فاتورة المشتريات',
      });
    }
  }

  // Purchase payments
  static async addPayment(req: Request, res: Response) {
    try {
      const validatedData = CreatePurchasePaymentDto.parse(req.body);
      const result = await PurchaseService.addPayment(validatedData);
      
      res.status(201).json({
        success: true,
        message: 'تم إضافة الدفعة بنجاح',
        data: result,
      });
    } catch (error: any) {
      console.error('Error adding payment:', error);
      
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
          errors: error.errors,
        });
        return;
      }

      if (error.message === 'Purchase not found') {
      res.status(404).json({
        success: false,
        message: 'فاتورة المشتريات غير موجودة',
      });
      return;
      }

      if (error.message === 'Unauthorized') {
        res.status(403).json({
          success: false,
          message: 'غير مصرح لك بالوصول إلى هذه الفاتورة',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في إضافة الدفعة',
      });
    }
  }

  // Purchase statistics
  static async getPurchaseStats(req: Request, res: Response) {
    try {
      const { companyId } = req.query;
      const companyIdNumber = companyId ? parseInt(companyId as string) : undefined;

      if (companyId && isNaN(companyIdNumber!)) {
        res.status(400).json({
          success: false,
          message: 'معرف الشركة غير صحيح',
        });
      }

      const stats = await PurchaseService.getPurchaseStats(companyIdNumber);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error getting purchase stats:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ في جلب إحصائيات المشتريات',
      });
    }
  }

  // Supplier management
  static async createSupplier(req: Request, res: Response) {
    try {
      const validatedData = CreateSupplierDto.parse(req.body);
      const supplier = await PurchaseService.createSupplier(validatedData);
      
      res.status(201).json({
        success: true,
        message: 'تم إنشاء المورد بنجاح',
        data: supplier,
      });
    } catch (error: any) {
      console.error('Error creating supplier:', error);
      
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
          errors: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في إنشاء المورد',
      });
    }
  }

  static async getSuppliers(req: Request, res: Response): Promise<void> {
    try {
      const validatedQuery = GetSuppliersQueryDto.parse(req.query);
      const result = await PurchaseService.getSuppliers(validatedQuery);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error getting suppliers:', error);
      
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          message: 'معاملات البحث غير صحيحة',
          errors: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'حدث خطأ في جلب الموردين',
      });
    }
  }

  static async getSupplierById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'معرف المورد مطلوب',
        });
        return;
      }
      const supplierId = parseInt(id);

      if (isNaN(supplierId)) {
        res.status(400).json({
          success: false,
          message: 'معرف المورد غير صحيح',
        });
      }

      const supplier = await PurchaseService.getSupplierById(supplierId);

      if (!supplier) {
        res.status(404).json({
          success: false,
          message: 'المورد غير موجود',
        });
      }

      res.json({
        success: true,
        data: supplier,
      });
    } catch (error: any) {
      console.error('Error getting supplier by ID:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ في جلب المورد',
      });
    }
  }

  static async updateSupplier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'معرف المورد مطلوب',
        });
        return;
      }
      const supplierId = parseInt(id);

      if (isNaN(supplierId)) {
        res.status(400).json({
          success: false,
          message: 'معرف المورد غير صحيح',
        });
      }

      const validatedData = UpdateSupplierDto.parse(req.body);
      const supplier = await PurchaseService.updateSupplier(supplierId, validatedData);
      
      res.json({
        success: true,
        message: 'تم تحديث المورد بنجاح',
        data: supplier,
      });
    } catch (error: any) {
      console.error('Error updating supplier:', error);
      
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
          errors: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في تحديث المورد',
      });
    }
  }

  static async deleteSupplier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'معرف المورد مطلوب',
        });
        return;
      }
      const supplierId = parseInt(id);

      if (isNaN(supplierId)) {
        res.status(400).json({
          success: false,
          message: 'معرف المورد غير صحيح',
        });
      }

      await PurchaseService.deleteSupplier(supplierId);
      
      res.json({
        success: true,
        message: 'تم حذف المورد بنجاح',
      });
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      
      if (error.message === 'Cannot delete supplier with existing purchases') {
        res.status(400).json({
          success: false,
          message: 'لا يمكن حذف مورد له مشتريات موجودة',
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ في حذف المورد',
      });
    }
  }
}

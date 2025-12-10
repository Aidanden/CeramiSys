import { Request, Response } from 'express';
import supplierAccountService from '../services/SupplierAccountService';

export class SupplierAccountController {
  // جلب ملخص جميع حسابات الموردين
  async getAllSuppliersAccountSummary(req: Request, res: Response) {
    try {
      const summary = await supplierAccountService.getAllSuppliersAccountSummary();
      return res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error('خطأ في جلب ملخص حسابات الموردين:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // جلب تفاصيل حساب مورد واحد
  async getSupplierAccount(req: Request, res: Response) {
    try {
      const supplierId = parseInt(req.params.supplierId || '0');
      if (!supplierId) {
        return res.status(400).json({
          success: false,
          error: 'معرف المورد مطلوب',
        });
      }

      const account = await supplierAccountService.getSupplierAccount(supplierId);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'المورد غير موجود',
        });
      }

      return res.json({
        success: true,
        data: account,
      });
    } catch (error: any) {
      console.error('خطأ في جلب حساب المورد:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // جلب المشتريات المفتوحة للمورد
  async getSupplierOpenPurchases(req: Request, res: Response) {
    try {
      const supplierId = parseInt(req.params.supplierId || '0');
      if (!supplierId) {
        return res.status(400).json({
          success: false,
          error: 'معرف المورد مطلوب',
        });
      }

      const purchases = await supplierAccountService.getSupplierOpenPurchases(supplierId);
      return res.json({
        success: true,
        data: purchases,
      });
    } catch (error: any) {
      console.error('خطأ في جلب المشتريات المفتوحة:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new SupplierAccountController();

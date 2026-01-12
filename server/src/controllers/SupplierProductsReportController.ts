import { Request, Response } from 'express';
import { SupplierProductsReportService } from '../services/SupplierProductsReportService';

export class SupplierProductsReportController {
  private service: SupplierProductsReportService;

  constructor() {
    this.service = new SupplierProductsReportService();
  }

  /**
   * GET /api/reports/supplier-products/suppliers
   * الحصول على قائمة الموردين الذين لديهم فواتير بضاعة
   */
  async getSuppliersWithPurchases(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userCompanyId = user?.companyId;
      const isSystemUser = user?.isSystemUser || false;

      console.log('📊 Fetching suppliers with purchases:', { userCompanyId, isSystemUser });

      if (!userCompanyId && !isSystemUser) {
        res.status(403).json({ error: 'غير مصرح لك بالوصول' });
        return;
      }

      const suppliers = await this.service.getSuppliersWithPurchases(userCompanyId, isSystemUser);
      
      console.log(`✅ Found ${suppliers.length} suppliers with purchases`);
      
      res.json(suppliers);
    } catch (error) {
      console.error('❌ Error fetching suppliers with purchases:', error);
      res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الموردين' });
    }
  }

  /**
   * GET /api/reports/supplier-products/:supplierId
   * الحصول على التقرير الكامل لمورد معين
   */
  async getSupplierReport(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userCompanyId = user?.companyId;
      const isSystemUser = user?.isSystemUser || false;

      if (!userCompanyId && !isSystemUser) {
        res.status(403).json({ error: 'غير مصرح لك بالوصول' });
        return;
      }

      const supplierId = parseInt(req.params.supplierId || '0');
      
      if (isNaN(supplierId) || supplierId === 0) {
        res.status(400).json({ error: 'معرف المورد غير صحيح' });
        return;
      }

      const report = await this.service.getFullSupplierReport(supplierId, userCompanyId, isSystemUser);
      
      if (!report.supplier) {
        res.status(404).json({ error: 'المورد غير موجود' });
        return;
      }

      res.json(report);
    } catch (error) {
      console.error('Error fetching supplier report:', error);
      res.status(500).json({ error: 'حدث خطأ أثناء جلب تقرير المورد' });
    }
  }

  /**
   * GET /api/reports/supplier-products/:supplierId/debt
   * الحصول على المديونية للمورد فقط
   */
  async getSupplierDebt(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userCompanyId = user?.companyId;
      const isSystemUser = user?.isSystemUser || false;

      if (!userCompanyId && !isSystemUser) {
        res.status(403).json({ error: 'غير مصرح لك بالوصول' });
        return;
      }

      const supplierId = parseInt(req.params.supplierId || '0');
      
      if (isNaN(supplierId) || supplierId === 0) {
        res.status(400).json({ error: 'معرف المورد غير صحيح' });
        return;
      }

      const debts = await this.service.getSupplierDebt(supplierId, userCompanyId, isSystemUser);
      
      res.json(debts);
    } catch (error) {
      console.error('Error fetching supplier debt:', error);
      res.status(500).json({ error: 'حدث خطأ أثناء جلب المديونية' });
    }
  }
}


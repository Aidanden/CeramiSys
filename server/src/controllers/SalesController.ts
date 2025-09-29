/**
 * Sales Controller
 * تحكم في عمليات المبيعات
 */

import { Request, Response } from 'express';
import { SalesService } from '../services/SalesService';
import { CreateSaleDto, UpdateSaleDto, GetSalesQueryDto, CreateCustomerDto, UpdateCustomerDto, GetCustomersQueryDto } from '../dto/salesDto';

export class SalesController {
  private salesService: SalesService;

  constructor() {
    this.salesService = new SalesService();
  }

  // ============== إدارة المبيعات ==============

  /**
   * إنشاء فاتورة مبيعات جديدة
   */
  async createSale(req: Request, res: Response): Promise<void> {
    try {
      const saleData: CreateSaleDto = req.body;

      // التحقق من البيانات المطلوبة
      if (!saleData.saleType || !saleData.paymentMethod || !saleData.lines || saleData.lines.length === 0) {
        res.status(400).json({
          success: false,
          message: 'نوع البيع وطريقة الدفع وبنود الفاتورة مطلوبة',
        });
        return;
      }

      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول',
        });
        return;
      }

      // Debug logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('SalesController - Create Sale Debug:', {
          userCompanyId,
          isSystemUser,
          saleData: {
            customerId: saleData.customerId,
            saleType: saleData.saleType,
            paymentMethod: saleData.paymentMethod,
            linesCount: saleData.lines.length
          }
        });
      }

      const sale = await this.salesService.createSale(saleData, userCompanyId, isSystemUser);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء فاتورة المبيعات بنجاح',
        data: sale,
      });
    } catch (error: any) {
      console.error('خطأ في إنشاء فاتورة المبيعات:', error);

      if (error.message.includes('غير موجود') || error.message.includes('غير كافي')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'خطأ في الخادم الداخلي',
        });
      }
    }
  }

  /**
   * الحصول على قائمة المبيعات
   */
  async getSales(req: Request, res: Response): Promise<void> {
    try {
      const query: GetSalesQueryDto = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        search: req.query.search as string,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
        saleType: req.query.saleType as any,
        paymentMethod: req.query.paymentMethod as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول',
        });
        return;
      }

      // Debug logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('SalesController - Get Sales Debug:', {
          userCompanyId,
          isSystemUser,
          query
        });
      }

      const result = await this.salesService.getSales(query, userCompanyId, isSystemUser);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('خطأ في جلب المبيعات:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في الخادم الداخلي',
      });
    }
  }

  /**
   * الحصول على فاتورة مبيعات واحدة
   */
  async getSaleById(req: Request, res: Response): Promise<void> {
    try {
      const saleId = parseInt(req.params.id!);

      if (isNaN(saleId)) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة غير صالح',
        });
        return;
      }

      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول',
        });
        return;
      }

      const sale = await this.salesService.getSaleById(saleId, userCompanyId, isSystemUser);

      res.status(200).json({
        success: true,
        message: 'تم جلب الفاتورة بنجاح',
        data: sale,
      });
    } catch (error: any) {
      console.error('خطأ في جلب الفاتورة:', error);

      if (error.message === 'الفاتورة غير موجودة أو ليس لديك صلاحية للوصول إليها') {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'خطأ في الخادم الداخلي',
        });
      }
    }
  }

  /**
   * تحديث فاتورة مبيعات
   */
  async updateSale(req: Request, res: Response): Promise<void> {
    try {
      const saleId = parseInt(req.params.id!);

      if (isNaN(saleId)) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة غير صالح',
        });
        return;
      }

      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول',
        });
        return;
      }

      const updateData: UpdateSaleDto = req.body;

      const sale = await this.salesService.updateSale(saleId, updateData, userCompanyId, isSystemUser);

      res.status(200).json({
        success: true,
        message: 'تم تحديث الفاتورة بنجاح',
        data: sale,
      });
    } catch (error: any) {
      console.error('خطأ في تحديث الفاتورة:', error);

      if (error.message.includes('غير موجود') || error.message.includes('ليس لديك صلاحية')) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else if (error.message.includes('غير كافي')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'خطأ في الخادم الداخلي',
        });
      }
    }
  }

  /**
   * حذف فاتورة مبيعات
   */
  async deleteSale(req: Request, res: Response): Promise<void> {
    try {
      const saleId = parseInt(req.params.id!);

      if (isNaN(saleId)) {
        res.status(400).json({
          success: false,
          message: 'معرف الفاتورة غير صالح',
        });
        return;
      }

      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول',
        });
        return;
      }

      await this.salesService.deleteSale(saleId, userCompanyId, isSystemUser);

      res.status(200).json({
        success: true,
        message: 'تم حذف الفاتورة بنجاح',
      });
    } catch (error: any) {
      console.error('خطأ في حذف الفاتورة:', error);

      if (error.message.includes('غير موجود') || error.message.includes('ليس لديك صلاحية')) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'خطأ في الخادم الداخلي',
        });
      }
    }
  }

  /**
   * الحصول على إحصائيات المبيعات
   */
  async getSalesStats(req: Request, res: Response): Promise<void> {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول',
        });
        return;
      }

      const stats = await this.salesService.getSalesStats(userCompanyId, isSystemUser);
      res.status(200).json(stats);
    } catch (error: any) {
      console.error('خطأ في جلب إحصائيات المبيعات:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في الخادم الداخلي',
      });
    }
  }

  // ============== إدارة العملاء ==============

  /**
   * إنشاء عميل جديد
   */
  async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customerData: CreateCustomerDto = req.body;

      // التحقق من البيانات المطلوبة
      if (!customerData.name) {
        res.status(400).json({
          success: false,
          message: 'اسم العميل مطلوب',
        });
        return;
      }

      const customer = await this.salesService.createCustomer(customerData);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء العميل بنجاح',
        data: customer,
      });
    } catch (error: any) {
      console.error('خطأ في إنشاء العميل:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في الخادم الداخلي',
      });
    }
  }

  /**
   * الحصول على قائمة العملاء
   */
  async getCustomers(req: Request, res: Response): Promise<void> {
    try {
      const query: GetCustomersQueryDto = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        search: req.query.search as string,
      };

      const result = await this.salesService.getCustomers(query);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('خطأ في جلب العملاء:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في الخادم الداخلي',
      });
    }
  }

  /**
   * الحصول على عميل واحد
   */
  async getCustomerById(req: Request, res: Response): Promise<void> {
    try {
      const customerId = parseInt(req.params.id!);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          message: 'معرف العميل غير صالح',
        });
        return;
      }

      const customer = await this.salesService.getCustomerById(customerId);

      res.status(200).json({
        success: true,
        message: 'تم جلب العميل بنجاح',
        data: customer,
      });
    } catch (error: any) {
      console.error('خطأ في جلب العميل:', error);

      if (error.message === 'العميل غير موجود') {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'خطأ في الخادم الداخلي',
        });
      }
    }
  }

  /**
   * تحديث عميل
   */
  async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customerId = parseInt(req.params.id!);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          message: 'معرف العميل غير صالح',
        });
        return;
      }

      const updateData: UpdateCustomerDto = req.body;

      const customer = await this.salesService.updateCustomer(customerId, updateData);

      res.status(200).json({
        success: true,
        message: 'تم تحديث العميل بنجاح',
        data: customer,
      });
    } catch (error: any) {
      console.error('خطأ في تحديث العميل:', error);

      if (error.message === 'العميل غير موجود') {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'خطأ في الخادم الداخلي',
        });
      }
    }
  }

  /**
   * حذف عميل
   */
  async deleteCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customerId = parseInt(req.params.id!);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          message: 'معرف العميل غير صالح',
        });
        return;
      }

      await this.salesService.deleteCustomer(customerId);

      res.status(200).json({
        success: true,
        message: 'تم حذف العميل بنجاح',
      });
    } catch (error: any) {
      console.error('خطأ في حذف العميل:', error);

      if (error.message === 'العميل غير موجود') {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else if (error.message.includes('فواتير مرتبطة')) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'خطأ في الخادم الداخلي',
        });
      }
    }
  }
}

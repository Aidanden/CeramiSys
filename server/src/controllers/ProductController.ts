/**
 * Product Controller - Simplified Version
 * تحكم في عمليات الأصناف - نسخة مبسطة
 */

import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * الحصول على جميع الأصناف
   */
  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const query = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        search: req.query.search as string,
        companyId: req.query.companyId ? parseInt(req.query.companyId as string) : undefined,
        unit: req.query.unit as string,
      };

      // Debug logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('ProductController Debug:', {
          path: req.path,
          user: (req as any).user ? 'exists' : 'null',
          userCompanyId: (req as any).user?.companyId || 'null',
          query: query
        });
      }

      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;
      
      if (!userCompanyId) {
        console.log('ProductController Error: userCompanyId is null or undefined');
        res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول',
        });
        return;
      }

      const result = await this.productService.getProducts(query, userCompanyId, isSystemUser);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('خطأ في جلب الأصناف:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في الخادم الداخلي',
      });
    }
  }

  /**
   * الحصول على صنف واحد بالمعرف
   */
  async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const productId = parseInt(req.params.id!);
      
      if (isNaN(productId)) {
        res.status(400).json({
          success: false,
          message: 'معرف الصنف غير صالح',
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

      const product = await this.productService.getProductById(productId, userCompanyId, isSystemUser);
      
      res.status(200).json({
        success: true,
        message: 'تم جلب الصنف بنجاح',
        data: product,
      });
    } catch (error: any) {
      console.error('خطأ في جلب الصنف:', error);
      
      if (error.message === 'الصنف غير موجود') {
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
   * إنشاء صنف جديد
   */
  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const { sku, name, unit, unitsPerBox, createdByCompanyId, sellPrice, initialBoxes } = req.body;

      // التحقق من البيانات المطلوبة
      if (!sku || !name || !createdByCompanyId) {
        res.status(400).json({
          success: false,
          message: 'رمز الصنف واسم الصنف ومعرف الشركة مطلوبة',
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

      // التأكد من أن المستخدم ينشئ الصنف لشركته (إلا إذا كان مستخدم نظام)
      if (!isSystemUser && createdByCompanyId !== userCompanyId) {
        res.status(403).json({
          success: false,
          message: 'لا يمكنك إنشاء أصناف لشركة أخرى',
        });
        return;
      }

      const productData = {
        sku,
        name,
        unit,
        unitsPerBox: unitsPerBox ? parseFloat(unitsPerBox) : undefined,
        createdByCompanyId,
        sellPrice: sellPrice ? parseFloat(sellPrice) : undefined,
        initialBoxes: initialBoxes ? parseFloat(initialBoxes) : undefined,
      };

      // Debug logging for initialBoxes
      if (process.env.NODE_ENV !== 'production') {
        console.log('ProductController - Create Product Debug:', {
          receivedInitialBoxes: initialBoxes,
          typeOfInitialBoxes: typeof initialBoxes,
          parsedInitialBoxes: initialBoxes ? parseFloat(initialBoxes) : undefined,
          finalProductData: productData
        });
      }

      const product = await this.productService.createProduct(productData);
      
      res.status(201).json({
        success: true,
        message: 'تم إنشاء الصنف بنجاح',
        data: product,
      });
    } catch (error: any) {
      console.error('خطأ في إنشاء الصنف:', error);
      
      if (error.message.includes('موجود مسبقاً')) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
      } else if (error.message === 'الشركة غير موجودة') {
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
   * تحديث صنف
   */
  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = parseInt(req.params.id!);
      
      if (isNaN(productId)) {
        res.status(400).json({
          success: false,
          message: 'معرف الصنف غير صالح',
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

      const updateData = {
        sku: req.body.sku,
        name: req.body.name,
        unit: req.body.unit,
        unitsPerBox: req.body.unitsPerBox ? parseFloat(req.body.unitsPerBox) : undefined,
        sellPrice: req.body.sellPrice ? parseFloat(req.body.sellPrice) : undefined,
      };

      const product = await this.productService.updateProduct(productId, updateData, userCompanyId, isSystemUser);
      
      res.status(200).json({
        success: true,
        message: 'تم تحديث الصنف بنجاح',
        data: product,
      });
    } catch (error: any) {
      console.error('خطأ في تحديث الصنف:', error);
      
      if (error.message === 'الصنف غير موجود') {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else if (error.message.includes('ليس لديك صلاحية')) {
        res.status(403).json({
          success: false,
          message: error.message,
        });
      } else if (error.message.includes('موجود مسبقاً')) {
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

  /**
   * حذف صنف
   */
  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = parseInt(req.params.id!);
      
      if (isNaN(productId)) {
        res.status(400).json({
          success: false,
          message: 'معرف الصنف غير صالح',
        });
        return;
      }

      const userCompanyId = (req as any).user?.companyId;
      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول',
        });
        return;
      }

      const isSystemUser = (req as any).user?.isSystemUser;
      await this.productService.deleteProduct(productId, userCompanyId, isSystemUser);
      
      res.status(200).json({
        success: true,
        message: 'تم حذف الصنف بنجاح',
      });
    } catch (error: any) {
      // معالجة الأخطاء بدون console.error
      if (error.message.includes('غير موجود') || error.message.includes('صلاحية')) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else if (error.message.includes('مستخدم في فواتير') || error.message.includes('معاملات مرتبطة')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'خطأ في حذف الصنف',
        });
      }
    }
  }

  /**
   * تحديث المخزون
   */
  async updateStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId, companyId, quantity } = req.body;

      if (!productId || !companyId || quantity === undefined) {
        res.status(400).json({
          success: false,
          message: 'معرف الصنف ومعرف الشركة والكمية مطلوبة',
        });
        return;
      }

      const userCompanyId = (req as any).user?.companyId;
      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول',
        });
        return;
      }

      if (companyId !== userCompanyId) {
        res.status(403).json({
          success: false,
          message: 'لا يمكنك تحديث مخزون شركة أخرى',
        });
        return;
      }

      const stockData = {
        productId: parseInt(productId),
        companyId: parseInt(companyId),
        quantity: parseFloat(quantity),
      };

      await this.productService.updateStock(stockData);
      
      res.status(200).json({
        success: true,
        message: 'تم تحديث المخزون بنجاح',
      });
    } catch (error: any) {
      // معالجة الأخطاء بدون console.error
      if (error.message.includes('غير موجود')) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else if (error.message.includes('مستخدم في فواتير')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: error.message || 'خطأ في تحديث المخزون',
        });
      }
    }
  }

  /**
   * تحديث السعر
   */
  async updatePrice(req: Request, res: Response): Promise<void> {
    try {
      const { productId, companyId, sellPrice } = req.body;

      if (!productId || !companyId || sellPrice === undefined) {
        res.status(400).json({
          success: false,
          message: 'معرف الصنف ومعرف الشركة والسعر مطلوبة',
        });
        return;
      }

      const userCompanyId = (req as any).user?.companyId;
      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول',
        });
        return;
      }

      if (companyId !== userCompanyId) {
        res.status(403).json({
          success: false,
          message: 'لا يمكنك تحديث أسعار شركة أخرى',
        });
        return;
      }

      const priceData = {
        productId: parseInt(productId),
        companyId: parseInt(companyId),
        sellPrice: parseFloat(sellPrice),
      };

      await this.productService.updatePrice(priceData);
      
      res.status(200).json({
        success: true,
        message: 'تم تحديث السعر بنجاح',
      });
    } catch (error: any) {
      console.error('خطأ في تحديث السعر:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في الخادم الداخلي',
      });
    }
  }

  /**
   * الحصول على إحصائيات الأصناف
   */
  async getProductStats(req: Request, res: Response): Promise<void> {
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

      const stats = await this.productService.getProductStats(userCompanyId, isSystemUser);
      res.status(200).json(stats);
    } catch (error: any) {
      console.error('خطأ في جلب إحصائيات الأصناف:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في الخادم الداخلي',
      });
    }
  }

  /**
   * الحصول على الأصناف الأكثر مبيعاً
   */
  async getTopSellingProducts(req: Request, res: Response): Promise<void> {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
      
      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول',
        });
        return;
      }

      const topProducts = await this.productService.getTopSellingProducts(
        userCompanyId, 
        isSystemUser, 
        limit, 
        companyId
      );
      res.status(200).json(topProducts);
    } catch (error: any) {
      console.error('خطأ في جلب الأصناف الأكثر مبيعاً:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في الخادم الداخلي',
      });
    }
  }

  /**
   * الحصول على أصناف الشركة الأم مع أسعارها
   * تم إلغاء جميع القيود - يمكن الوصول لأصناف أي شركة
   */
  async getParentCompanyProducts(req: Request, res: Response): Promise<void> {
    try {
      const parentCompanyId = req.query.parentCompanyId ? parseInt(req.query.parentCompanyId as string) : undefined;

      if (!parentCompanyId) {
        res.status(400).json({
          success: false,
          message: 'معرف الشركة الأم مطلوب',
        });
        return;
      }

      // إلغاء جميع القيود - السماح بالوصول لأي شركة
      const products = await this.productService.getParentCompanyProducts(0, parentCompanyId, true);
      res.status(200).json(products);
    } catch (error: any) {
      console.error('خطأ في جلب أصناف الشركة الأم:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في الخادم الداخلي',
      });
    }
  }

  /**
   * الحصول على الأصناف التي ستنتهي قريباً
   */
  async getLowStockProducts(req: Request, res: Response): Promise<void> {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
      
      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول',
        });
        return;
      }

      const lowStockProducts = await this.productService.getLowStockProducts(
        userCompanyId, 
        isSystemUser, 
        limit, 
        companyId
      );
      res.status(200).json(lowStockProducts);
    } catch (error: any) {
      console.error('خطأ في جلب الأصناف التي ستنتهي قريباً:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'خطأ في الخادم الداخلي',
      });
    }
  }
}

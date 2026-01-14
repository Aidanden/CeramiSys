import { Request, Response } from 'express';
import { ProductGroupService } from '../services/ProductGroupService';

const productGroupService = new ProductGroupService();

export class ProductGroupController {
  /**
   * GET /api/product-groups
   * الحصول على جميع مجموعات الأصناف
   */
  async getAllProductGroups(req: Request, res: Response): Promise<void> {
    try {
      const groups = await productGroupService.getAllProductGroups();
      res.status(200).json(groups);
      return;
    } catch (error: any) {
      console.error('Error fetching product groups:', error);
      res.status(500).json({ message: error.message || 'خطأ في جلب مجموعات الأصناف' });
      return;
    }
  }

  /**
   * GET /api/product-groups/:id
   * الحصول على مجموعة أصناف محددة
   */
  async getProductGroupById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id || '0', 10);
      if (!id) {
        res.status(400).json({ message: 'معرّف المجموعة غير صحيح' });
        return;
      }

      const group = await productGroupService.getProductGroupById(id);
      res.status(200).json(group);
      return;
    } catch (error: any) {
      console.error('Error fetching product group:', error);
      res.status(500).json({ message: error.message || 'خطأ في جلب مجموعة الأصناف' });
      return;
    }
  }

  /**
   * POST /api/product-groups
   * إنشاء مجموعة أصناف جديدة
   */
  async createProductGroup(req: Request, res: Response): Promise<void> {
    try {
      const { name, supplierId, supplierIds, currency, maxDiscountPercentage } = req.body;

      if (!name || name.trim() === '') {
        res.status(400).json({ message: 'اسم مجموعة الأصناف مطلوب' });
        return;
      }

      const group = await productGroupService.createProductGroup({
        name: name.trim(),
        supplierId: supplierId ? parseInt(supplierId, 10) : undefined,
        supplierIds: supplierIds && Array.isArray(supplierIds) 
          ? supplierIds.map((id: any) => parseInt(id, 10)) 
          : undefined,
        currency: currency || 'USD',
        maxDiscountPercentage: maxDiscountPercentage
          ? parseFloat(maxDiscountPercentage)
          : undefined,
      });

      res.status(201).json(group);
      return;
    } catch (error: any) {
      console.error('Error creating product group:', error);
      res.status(500).json({ message: error.message || 'خطأ في إنشاء مجموعة الأصناف' });
      return;
    }
  }

  /**
   * PUT /api/product-groups/:id
   * تحديث مجموعة أصناف
   */
  async updateProductGroup(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id || '0', 10);
      if (!id) {
        res.status(400).json({ message: 'معرّف المجموعة غير صحيح' });
        return;
      }

      const { name, supplierId, supplierIds, currency, maxDiscountPercentage } = req.body;

      const updateData: any = {};

      if (name !== undefined) {
        if (name.trim() === '') {
          res.status(400).json({ message: 'اسم مجموعة الأصناف لا يمكن أن يكون فارغاً' });
          return;
        }
        updateData.name = name.trim();
      }

      if (supplierId !== undefined) {
        updateData.supplierId = supplierId ? parseInt(supplierId, 10) : null;
      }

      if (supplierIds !== undefined) {
        updateData.supplierIds = supplierIds && Array.isArray(supplierIds)
          ? supplierIds.map((id: any) => parseInt(id, 10))
          : [];
      }

      if (currency !== undefined) {
        updateData.currency = currency;
      }

      if (maxDiscountPercentage !== undefined) {
        updateData.maxDiscountPercentage =
          maxDiscountPercentage !== null ? parseFloat(maxDiscountPercentage) : null;
      }

      const group = await productGroupService.updateProductGroup(id, updateData);
      res.status(200).json(group);
      return;
    } catch (error: any) {
      console.error('Error updating product group:', error);
      res.status(500).json({ message: error.message || 'خطأ في تحديث مجموعة الأصناف' });
      return;
    }
  }

  /**
   * DELETE /api/product-groups/:id
   * حذف مجموعة أصناف
   */
  async deleteProductGroup(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id || '0', 10);
      if (!id) {
        res.status(400).json({ message: 'معرّف المجموعة غير صحيح' });
        return;
      }

      await productGroupService.deleteProductGroup(id);
      res.status(200).json({ message: 'تم حذف مجموعة الأصناف بنجاح' });
      return;
    } catch (error: any) {
      console.error('Error deleting product group:', error);
      res.status(500).json({ message: error.message || 'خطأ في حذف مجموعة الأصناف' });
      return;
    }
  }

  /**
   * GET /api/product-groups/:id/products
   * الحصول على الأصناف التابعة لمجموعة
   */
  async getProductsByGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupId = parseInt(req.params.id || '0', 10);
      if (!groupId) {
        res.status(400).json({ message: 'معرّف المجموعة غير صحيح' });
        return;
      }

      const products = await productGroupService.getProductsByGroup(groupId);
      res.status(200).json(products);
      return;
    } catch (error: any) {
      console.error('Error fetching products by group:', error);
      res.status(500).json({ message: error.message || 'خطأ في جلب الأصناف' });
      return;
    }
  }

  /**
   * GET /api/product-groups/search?q=query
   * البحث في مجموعات الأصناف
   */
  async searchProductGroups(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      if (!query || query.trim() === '') {
        res.status(400).json({ message: 'نص البحث مطلوب' });
        return;
      }

      const groups = await productGroupService.searchProductGroups(query.trim());
      res.status(200).json(groups);
      return;
    } catch (error: any) {
      console.error('Error searching product groups:', error);
      res.status(500).json({ message: error.message || 'خطأ في البحث' });
      return;
    }
  }

  /**
   * GET /api/product-groups/:id/purchase-report
   * تقرير المشتريات لمجموعة أصناف
   */
  async getGroupPurchaseReport(req: Request, res: Response): Promise<void> {
    try {
      const groupId = parseInt(req.params.id || '0', 10);
      if (!groupId) {
        res.status(400).json({ message: 'معرّف المجموعة غير صحيح' });
        return;
      }

      const report = await productGroupService.getGroupPurchaseReport(groupId);
      res.status(200).json(report);
      return;
    } catch (error: any) {
      console.error('Error generating purchase report:', error);
      res.status(500).json({ message: error.message || 'خطأ في إنشاء التقرير' });
      return;
    }
  }
}

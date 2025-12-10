import { Request, Response } from 'express';
import purchaseExpenseService from '../services/purchaseExpense.service';
import { AuthRequest } from '../middleware/auth';
import { 
  ApprovePurchaseDto, 
  CreateExpenseCategoryDto, 
  UpdateExpenseCategoryDto,
  GetExpenseCategoriesQueryDto,
  GetProductCostHistoryQueryDto 
} from '../dto/purchaseExpenseDto';

export class PurchaseExpenseController {
  // ==================== فئات المصروفات ====================

  // الحصول على جميع فئات المصروفات
  async getAllExpenseCategories(req: Request, res: Response) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const categories = await purchaseExpenseService.getAllExpenseCategories(
        includeInactive
      );
      return res.json(categories);
    } catch (error: any) {
      console.error('خطأ في جلب فئات المصروفات:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // الحصول على فئة مصروفات بالـ ID
  async getExpenseCategoryById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id || '0');
      const category = await purchaseExpenseService.getExpenseCategoryById(id);
      
      if (!category) {
        return res.status(404).json({ error: 'فئة المصروفات غير موجودة' });
      }
      
      return res.json(category);
    } catch (error: any) {
      console.error('خطأ في جلب فئة المصروفات:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // إنشاء فئة مصروفات جديدة
  async createExpenseCategory(req: Request, res: Response) {
    try {
      const category = await purchaseExpenseService.createExpenseCategory(
        req.body
      );
      return res.status(201).json(category);
    } catch (error: any) {
      console.error('خطأ في إنشاء فئة المصروفات:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // تحديث فئة مصروفات
  async updateExpenseCategory(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id || '0');
      const category = await purchaseExpenseService.updateExpenseCategory(
        id,
        req.body
      );
      return res.json(category);
    } catch (error: any) {
      console.error('خطأ في تحديث فئة المصروفات:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // حذف فئة مصروفات
  async deleteExpenseCategory(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id || '0');
      await purchaseExpenseService.deleteExpenseCategory(id);
      return res.json({ message: 'تم حذف فئة المصروفات بنجاح' });
    } catch (error: any) {
      console.error('خطأ في حذف فئة المصروفات:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ==================== اعتماد الفاتورة ====================

  // اعتماد فاتورة مشتريات
  async approvePurchase(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: 'غير مصرح' });
      }

      // Validate request body
      const validatedData = ApprovePurchaseDto.parse(req.body);
      console.log('Validated approval data:', validatedData);

      const result = await purchaseExpenseService.approvePurchase(
        validatedData,
        req.user.userId
      );
      
      return res.json(result);
    } catch (error: any) {
      console.error('خطأ في اعتماد الفاتورة:', error);
      
      // Handle validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'بيانات غير صحيحة', 
          details: error.errors 
        });
      }
      
      return res.status(500).json({ error: error.message });
    }
  }

  // الحصول على مصروفات فاتورة
  async getPurchaseExpenses(req: Request, res: Response) {
    try {
      const purchaseId = parseInt(req.params.purchaseId || '0');
      const expenses = await purchaseExpenseService.getPurchaseExpenses(
        purchaseId
      );
      return res.json(expenses);
    } catch (error: any) {
      console.error('خطأ في جلب مصروفات الفاتورة:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // حذف مصروف
  async deletePurchaseExpense(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: 'غير مصرح' });
      }

      const expenseId = parseInt(req.params.expenseId || '0');
      const userId = parseInt(req.user.userId);
      
      const result = await purchaseExpenseService.deletePurchaseExpense(
        expenseId,
        userId
      );
      
      return res.json(result);
    } catch (error: any) {
      console.error('خطأ في حذف المصروف:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  // الحصول على تاريخ تكلفة منتج
  async getProductCostHistory(req: Request, res: Response) {
    try {
      const productId = parseInt(req.params.productId || '0');
      const companyId = req.query.companyId
        ? parseInt(req.query.companyId as string)
        : undefined;
      
      const history = await purchaseExpenseService.getProductCostHistory(
        productId,
        companyId
      );
      
      return res.json(history);
    } catch (error: any) {
      console.error('خطأ في جلب تاريخ تكلفة المنتج:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

export default new PurchaseExpenseController();

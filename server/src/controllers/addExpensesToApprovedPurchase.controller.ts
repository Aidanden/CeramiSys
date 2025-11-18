import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import addExpensesToApprovedPurchaseService from '../services/addExpensesToApprovedPurchase.service';
import { z } from 'zod';

// DTO للتحقق من صحة البيانات
const AddExpenseDto = z.object({
  categoryId: z.number().int().positive(),
  supplierId: z.number().int().positive(), // المورد إجباري
  amount: z.number().positive(),
  notes: z.string().optional().nullable(),
});

const AddExpensesToApprovedPurchaseDto = z.object({
  purchaseId: z.number().int().positive(),
  expenses: z.array(AddExpenseDto), // إزالة min(1) للسماح بقائمة فارغة
});

export class AddExpensesToApprovedPurchaseController {
  async addExpensesToApprovedPurchase(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: 'غير مصرح' });
      }

      // التحقق من صحة البيانات
      const validatedData = AddExpensesToApprovedPurchaseDto.parse(req.body);
      console.log('Validated data:', validatedData);

      const result = await addExpensesToApprovedPurchaseService.addExpensesToApprovedPurchase(
        validatedData,
        req.user.userId
      );
      
      return res.json(result);
    } catch (error: any) {
      console.error('خطأ في إضافة المصروفات للفاتورة المعتمدة:', error);
      
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
}

export default new AddExpensesToApprovedPurchaseController();

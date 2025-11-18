import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import paymentInstallmentService from '../services/paymentInstallment.service';
import { z } from 'zod';

// DTO للتحقق من صحة البيانات
const CreateInstallmentDto = z.object({
  paymentReceiptId: z.number().int().positive(),
  amount: z.number().positive(),
  notes: z.string().optional(),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
});

export class PaymentInstallmentController {
  // إضافة دفعة جزئية
  async addInstallment(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: 'غير مصرح' });
      }

      const validatedData = CreateInstallmentDto.parse(req.body);
      console.log('إضافة دفعة جزئية:', validatedData);

      const installment = await paymentInstallmentService.addInstallment(validatedData);
      
      return res.json({
        success: true,
        installment,
        message: 'تم إضافة الدفعة بنجاح'
      });
    } catch (error: any) {
      console.error('خطأ في إضافة الدفعة الجزئية:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'بيانات غير صحيحة', 
          details: error.errors 
        });
      }
      
      return res.status(500).json({ error: error.message });
    }
  }

  // الحصول على دفعات إيصال معين
  async getInstallmentsByReceiptId(req: AuthRequest, res: Response) {
    try {
      const paymentReceiptIdParam = req.params.paymentReceiptId;
      
      if (!paymentReceiptIdParam) {
        return res.status(400).json({ error: 'معرف إيصال الدفع مطلوب' });
      }
      
      const paymentReceiptId = parseInt(paymentReceiptIdParam);
      
      if (isNaN(paymentReceiptId)) {
        return res.status(400).json({ error: 'معرف إيصال الدفع غير صحيح' });
      }

      const installments = await paymentInstallmentService.getInstallmentsByReceiptId(paymentReceiptId);
      
      return res.json({
        success: true,
        installments
      });
    } catch (error: any) {
      console.error('خطأ في جلب الدفعات:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // حذف دفعة جزئية
  async deleteInstallment(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: 'غير مصرح' });
      }

      const idParam = req.params.id;
      
      if (!idParam) {
        return res.status(400).json({ error: 'معرف الدفعة مطلوب' });
      }
      
      const id = parseInt(idParam);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'معرف الدفعة غير صحيح' });
      }

      await paymentInstallmentService.deleteInstallment(id);
      
      return res.json({
        success: true,
        message: 'تم حذف الدفعة بنجاح'
      });
    } catch (error: any) {
      console.error('خطأ في حذف الدفعة:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

export default new PaymentInstallmentController();

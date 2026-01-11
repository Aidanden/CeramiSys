import { Request, Response } from 'express';
import paymentReceiptService from '../services/paymentReceipt.service';
import { AuthRequest } from '../middleware/auth';

export class PaymentReceiptController {
  // الحصول على جميع إيصالات الدفع
  async getAllPaymentReceipts(req: Request, res: Response) {
    try {
      const result = await paymentReceiptService.getAllPaymentReceipts(req.query);
      return res.json(result);
    } catch (error: any) {
      console.error('خطأ في جلب إيصالات الدفع:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // الحصول على إيصال دفع واحد
  async getPaymentReceiptById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id || '0');
      if (!id) {
        return res.status(400).json({ error: 'معرف الإيصال مطلوب' });
      }

      const receipt = await paymentReceiptService.getPaymentReceiptById(id);

      if (!receipt) {
        return res.status(404).json({ error: 'إيصال الدفع غير موجود' });
      }

      return res.json(receipt);
    } catch (error: any) {
      console.error('خطأ في جلب إيصال الدفع:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // إنشاء إيصال دفع جديد
  async createPaymentReceipt(req: AuthRequest, res: Response) {
    try {
      const receipt = await paymentReceiptService.createPaymentReceipt(req.body);
      return res.status(201).json(receipt);
    } catch (error: any) {
      console.error('خطأ في إنشاء إيصال الدفع:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // تحديث إيصال دفع
  async updatePaymentReceipt(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id || '0');
      if (!id) {
        return res.status(400).json({ error: 'معرف الإيصال مطلوب' });
      }
      const receipt = await paymentReceiptService.updatePaymentReceipt(id, req.body);
      return res.json(receipt);
    } catch (error: any) {
      console.error('خطأ في تحديث إيصال الدفع:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // حذف إيصال دفع
  async deletePaymentReceipt(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id || '0');
      if (!id) {
        return res.status(400).json({ error: 'معرف الإيصال مطلوب' });
      }
      await paymentReceiptService.deletePaymentReceipt(id);
      return res.json({ message: 'تم حذف إيصال الدفع بنجاح' });
    } catch (error: any) {
      console.error('خطأ في حذف إيصال الدفع:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // تسديد إيصال دفع
  async payReceipt(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id || '0');
      if (!id) {
        return res.status(400).json({ error: 'معرف الإيصال مطلوب' });
      }
      const { notes, treasuryId, exchangeRate } = req.body;
      const receipt = await paymentReceiptService.payReceipt(
        id, 
        notes, 
        treasuryId, 
        exchangeRate ? parseFloat(exchangeRate) : undefined
      );
      return res.json(receipt);
    } catch (error: any) {
      console.error('خطأ في تسديد إيصال الدفع:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // إلغاء إيصال دفع
  async cancelReceipt(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id || '0');
      if (!id) {
        return res.status(400).json({ error: 'معرف الإيصال مطلوب' });
      }
      const { reason } = req.body;
      const receipt = await paymentReceiptService.cancelReceipt(id, reason);
      return res.json(receipt);
    } catch (error: any) {
      console.error('خطأ في إلغاء إيصال الدفع:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // إحصائيات إيصالات الدفع
  async getPaymentReceiptsStats(req: Request, res: Response) {
    try {
      const stats = await paymentReceiptService.getPaymentReceiptsStats();
      return res.json(stats);
    } catch (error: any) {
      console.error('خطأ في جلب إحصائيات إيصالات الدفع:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

export default new PaymentReceiptController();

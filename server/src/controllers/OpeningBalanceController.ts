import { Request, Response } from 'express';
import OpeningBalanceService from '../services/OpeningBalanceService';

class OpeningBalanceController {
  /**
   * إضافة رصيد افتتاحي للعميل أو المورد
   * POST /api/opening-balances
   */
  async createOpeningBalance(req: Request, res: Response) {
    try {
      const {
        customerId,
        supplierId,
        amount,
        transactionType,
        transactionDate,
        description,
        previousSystemRef,
        companyId,
        currency
      } = req.body;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'يجب إدخال قيمة صحيحة وموجبة'
        });
      }

      if (!transactionType || !['DEBIT', 'CREDIT'].includes(transactionType)) {
        return res.status(400).json({
          success: false,
          message: 'نوع المعاملة (مدين/دائن) غير صحيح'
        });
      }

      const result = await OpeningBalanceService.createOpeningBalance({
        customerId: customerId ? Number(customerId) : undefined,
        supplierId: supplierId ? Number(supplierId) : undefined,
        amount: Number(amount),
        transactionType,
        transactionDate: transactionDate ? new Date(transactionDate) : undefined,
        description,
        previousSystemRef,
        companyId: companyId ? Number(companyId) : undefined,
        currency
      });

      return res.status(201).json({
        success: true,
        message: 'تم إضافة الرصيد الافتتاحي بنجاح',
        data: result
      });
    } catch (error: any) {
      console.error('Error in createOpeningBalance:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء إضافة الرصيد الافتتاحي'
      });
    }
  }

  /**
   * جلب الأرصدة الافتتاحية لعميل
   * GET /api/opening-balances/customer/:customerId
   */
  async getCustomerOpeningBalances(req: Request, res: Response) {
    try {
      const customerId = Number(req.params.customerId);
      const balances = await OpeningBalanceService.getCustomerOpeningBalances(customerId);
      return res.status(200).json({
        success: true,
        data: balances
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * جلب الأرصدة الافتتاحية لمورد
   * GET /api/opening-balances/supplier/:supplierId
   */
  async getSupplierOpeningBalances(req: Request, res: Response) {
    try {
      const supplierId = Number(req.params.supplierId);
      const balances = await OpeningBalanceService.getSupplierOpeningBalances(supplierId);
      return res.status(200).json({
        success: true,
        data: balances
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new OpeningBalanceController();

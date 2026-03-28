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
  /**
   * تسوية رصيد افتتاحي لمورد (دفع)
   * POST /api/opening-balances/settle-supplier
   */
  async settleSupplierOpeningBalance(req: Request, res: Response) {
    try {
      const {
        supplierId,
        amount,
        amountForeign,
        currency,
        exchangeRate,
        treasuryId,
        companyId,
        description,
        notes
      } = req.body;

      if (!supplierId || !amount || !treasuryId || !companyId) {
        return res.status(400).json({
          success: false,
          message: 'كافة الحقول المطلوبة (المورد، المبلغ، الخزينة، الشركة) يجب توفرها'
        });
      }

      const result = await OpeningBalanceService.settleSupplierOpeningBalance({
        supplierId: Number(supplierId),
        amount: Number(amount),
        amountForeign: amountForeign ? Number(amountForeign) : undefined,
        currency: currency || 'LYD',
        exchangeRate: Number(exchangeRate || 1),
        treasuryId: Number(treasuryId),
        companyId: Number(companyId),
        description,
        notes
      });

      return res.status(200).json({
        success: true,
        message: 'تمت عملية التسوية بنجاح',
        data: result
      });
    } catch (error: any) {
      console.error('Error in settleSupplierOpeningBalance:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء عملية التسوية'
      });
    }
  }

  /**
   * حذف رصيد افتتاحي (قبل التسوية فقط)
   * DELETE /api/opening-balances/:id
   */
  async deleteOpeningBalance(req: Request, res: Response) {
    try {
      const openingBalanceId = Number(req.params.id);

      if (!openingBalanceId) {
        return res.status(400).json({
          success: false,
          message: 'معرف الرصيد المرحل مطلوب'
        });
      }

      const result = await OpeningBalanceService.deleteOpeningBalance(openingBalanceId);

      return res.status(200).json({
        success: true,
        message: 'تم حذف الرصيد المرحل بنجاح',
        data: result
      });
    } catch (error: any) {
      console.error('Error in deleteOpeningBalance:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء حذف الرصيد المرحل'
      });
    }
  }

  /**
   * تسوية رصيد افتتاحي لعميل (قبض)
   * POST /api/opening-balances/settle-customer
   */
  async settleCustomerOpeningBalance(req: Request, res: Response) {
    try {
      const {
        customerId,
        amount,
        treasuryId,
        companyId,
        description,
        notes
      } = req.body;

      if (!customerId || !amount || !treasuryId || !companyId) {
        return res.status(400).json({
          success: false,
          message: 'كافة الحقول المطلوبة (العميل، المبلغ، الخزينة، الشركة) يجب توفرها'
        });
      }

      const result = await OpeningBalanceService.settleCustomerOpeningBalance({
        customerId: Number(customerId),
        amount: Number(amount),
        treasuryId: Number(treasuryId),
        companyId: Number(companyId),
        description,
        notes
      });

      return res.status(200).json({
        success: true,
        message: 'تمت عملية التسوية بنجاح',
        data: result
      });
    } catch (error: any) {
      console.error('Error in settleCustomerOpeningBalance:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء عملية التسوية'
      });
    }
  }
}

export default new OpeningBalanceController();

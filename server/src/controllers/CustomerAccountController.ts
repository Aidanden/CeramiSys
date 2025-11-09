import { Request, Response } from 'express';
import CustomerAccountService from '../services/CustomerAccountService';

class CustomerAccountController {
  /**
   * جلب حساب عميل معين
   * GET /api/customer-accounts/:customerId
   */
  async getCustomerAccount(req: Request, res: Response) {
    try {
      const customerId = Number(req.params.customerId);
      
      if (isNaN(customerId)) {
        return res.status(400).json({
          success: false,
          message: 'معرف العميل غير صحيح'
        });
      }

      const account = await CustomerAccountService.getCustomerAccount(customerId);

      return res.status(200).json({
        success: true,
        message: 'تم جلب حساب العميل بنجاح',
        data: account
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء جلب حساب العميل'
      });
    }
  }

  /**
   * جلب ملخص حسابات جميع العملاء
   * GET /api/customer-accounts/summary
   */
  async getAllCustomersAccountSummary(req: Request, res: Response) {
    try {
      const summary = await CustomerAccountService.getAllCustomersAccountSummary();

      return res.status(200).json({
        success: true,
        message: 'تم جلب ملخص حسابات العملاء بنجاح',
        data: summary
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء جلب ملخص حسابات العملاء'
      });
    }
  }

  /**
   * جلب الرصيد الحالي لعميل
   * GET /api/customer-accounts/:customerId/balance
   */
  async getCurrentBalance(req: Request, res: Response) {
    try {
      const customerId = Number(req.params.customerId);
      
      if (isNaN(customerId)) {
        return res.status(400).json({
          success: false,
          message: 'معرف العميل غير صحيح'
        });
      }

      const balance = await CustomerAccountService.getCurrentBalance(customerId);

      return res.status(200).json({
        success: true,
        message: 'تم جلب الرصيد بنجاح',
        data: { balance }
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء جلب الرصيد'
      });
    }
  }

  /**
   * جلب الفواتير المفتوحة لعميل معين
   * GET /api/customer-accounts/:customerId/open-invoices
   */
  async getCustomerOpenInvoices(req: Request, res: Response) {
    try {
      const customerId = Number(req.params.customerId);
      
      if (isNaN(customerId)) {
        return res.status(400).json({
          success: false,
          message: 'معرف العميل غير صحيح'
        });
      }

      const invoices = await CustomerAccountService.getCustomerOpenInvoices(customerId);

      return res.status(200).json({
        success: true,
        message: 'تم جلب الفواتير المفتوحة بنجاح',
        data: invoices
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء جلب الفواتير المفتوحة'
      });
    }
  }
}

export default new CustomerAccountController();



/**
 * Sale Payment Controller
 * متحكم دفعات المبيعات الآجلة
 */

import { Request, Response } from 'express';
import { SalePaymentService } from '../services/SalePaymentService';
import { 
  CreateSalePaymentDtoSchema, 
  GetSalePaymentsQueryDtoSchema,
  GetCreditSalesQueryDtoSchema,
  UpdatePaymentMethodDtoSchema
} from '../dto/salePaymentDto';

const salePaymentService = new SalePaymentService();

/**
 * الحصول على جميع المبيعات الآجلة
 */
export const getCreditSales = async (req: Request, res: Response): Promise<void> => {
  try {
    const userCompanyId = (req as any).user?.companyId;
    const isSystemUser = (req as any).user?.isSystemUser || false;

    if (!userCompanyId && !isSystemUser) {
      res.status(401).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مفقود'
      });
      return;
    }

    const query = GetCreditSalesQueryDtoSchema.parse(req.query);
    const result = await salePaymentService.getCreditSales(query, userCompanyId, isSystemUser);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * الحصول على فاتورة آجلة واحدة
 */
export const getCreditSaleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userCompanyId = (req as any).user?.companyId;
    const isSystemUser = (req as any).user?.isSystemUser || false;
    const { id } = req.params;

    const result = await salePaymentService.getCreditSaleById(Number(id), userCompanyId, isSystemUser);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * إنشاء دفعة جديدة
 */
export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userCompanyId = (req as any).user?.companyId;
    const isSystemUser = (req as any).user?.isSystemUser || false;

    if (!userCompanyId && !isSystemUser) {
      res.status(401).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مفقود'
      });
      return;
    }

    const data = CreateSalePaymentDtoSchema.parse(req.body);
    const result = await salePaymentService.createPayment(data, userCompanyId, isSystemUser);

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * الحصول على دفعات فاتورة
 */
export const getSalePayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userCompanyId = (req as any).user?.companyId;
    const isSystemUser = (req as any).user?.isSystemUser || false;

    const query = GetSalePaymentsQueryDtoSchema.parse(req.query);
    const result = await salePaymentService.getSalePayments(query, userCompanyId, isSystemUser);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * حذف دفعة
 */
export const deletePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userCompanyId = (req as any).user?.companyId;
    const isSystemUser = (req as any).user?.isSystemUser || false;
    const { id } = req.params;

    const result = await salePaymentService.deletePayment(Number(id), userCompanyId, isSystemUser);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * تغيير طريقة الدفع لدفعة موجودة
 */
export const updatePaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const userCompanyId = (req as any).user?.companyId;
    const isSystemUser = (req as any).user?.isSystemUser || false;
    const { id } = req.params;

    if (!userCompanyId && !isSystemUser) {
      res.status(401).json({ success: false, message: 'غير مصرح - معرف الشركة مفقود' });
      return;
    }

    const data = UpdatePaymentMethodDtoSchema.parse(req.body);
    const result = await salePaymentService.updatePaymentMethod(
      Number(id),
      data.paymentMethod,
      data.bankAccountId,
      data.notes,
      userCompanyId,
      isSystemUser
    );

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * إحصائيات المبيعات الآجلة
 */
export const getCreditSalesStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userCompanyId = (req as any).user?.companyId;
    const isSystemUser = (req as any).user?.isSystemUser || false;

    const result = await salePaymentService.getCreditSalesStats(userCompanyId, isSystemUser);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

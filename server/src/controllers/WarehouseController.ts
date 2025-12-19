/**
 * Warehouse Controller
 * متحكم أوامر صرف المخزن
 */

import { Request, Response } from 'express';
import { WarehouseService } from '../services/WarehouseService';
import { z } from 'zod';

const warehouseService = new WarehouseService();

// Validation schemas
const CreateDispatchOrderSchema = z.object({
  saleId: z.number(),
  notes: z.string().optional()
});

const UpdateDispatchOrderStatusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  notes: z.string().optional()
});

const GetDispatchOrdersQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

/**
 * الحصول على جميع أوامر الصرف
 */
export const getDispatchOrders = async (req: Request, res: Response): Promise<void> => {
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

    const query = GetDispatchOrdersQuerySchema.parse(req.query);
    const result = await warehouseService.getDispatchOrders(query, userCompanyId, isSystemUser);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in getDispatchOrders:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * الحصول على جميع طلبات الاستلام (المردودات)
 */
export const getReturnOrders = async (req: Request, res: Response): Promise<void> => {
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

    const query = GetDispatchOrdersQuerySchema.parse(req.query);
    const result = await warehouseService.getReturnOrders(query, userCompanyId, isSystemUser);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in getReturnOrders:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * الحصول على أمر صرف واحد
 */
export const getDispatchOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userCompanyId = (req as any).user?.companyId;
    const isSystemUser = (req as any).user?.isSystemUser || false;
    const { id } = req.params;

    if (!userCompanyId && !isSystemUser) {
      res.status(401).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مفقود'
      });
      return;
    }

    const result = await warehouseService.getDispatchOrderById(Number(id), userCompanyId, isSystemUser);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in getDispatchOrderById:', error);
    res.status(error.message === 'Dispatch order not found' ? 404 : 400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * إنشاء أمر صرف جديد
 */
export const createDispatchOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    // الصلاحيات على مستوى الشاشة - من يدخل شاشة المحاسب يمكنه إنشاء أمر صرف لأي فاتورة
    const data = CreateDispatchOrderSchema.parse(req.body);
    const result = await warehouseService.createDispatchOrder(data);

    res.status(201).json({
      success: true,
      data: result,
      message: 'تم إنشاء أمر الصرف بنجاح'
    });
  } catch (error: any) {
    console.error('Error in createDispatchOrder:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * تحديث حالة أمر الصرف
 */
export const updateDispatchOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const userCompanyId = (req as any).user?.companyId;
    const isSystemUser = (req as any).user?.isSystemUser || false;
    const { id } = req.params;

    if (!userCompanyId && !isSystemUser) {
      res.status(401).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مفقود'
      });
      return;
    }

    const data = UpdateDispatchOrderStatusSchema.parse(req.body);
    const result = await warehouseService.updateDispatchOrderStatus(
      Number(id),
      data,
      userId,
      userCompanyId,
      isSystemUser
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'تم تحديث حالة أمر الصرف بنجاح'
    });
  } catch (error: any) {
    console.error('Error in updateDispatchOrderStatus:', error);
    res.status(error.message === 'Dispatch order not found' ? 404 : 400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * تحديث حالة طلب الاستلام (المردود)
 */
export const updateReturnOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const userCompanyId = (req as any).user?.companyId;
    const isSystemUser = (req as any).user?.isSystemUser || false;
    const { id } = req.params;

    if (!userCompanyId && !isSystemUser) {
      res.status(401).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مفقود'
      });
      return;
    }

    const data = UpdateDispatchOrderStatusSchema.parse(req.body);
    const result = await warehouseService.updateReturnOrderStatus(
      Number(id),
      data,
      userId,
      userCompanyId,
      isSystemUser
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'تم تحديث حالة المردود بنجاح'
    });
  } catch (error: any) {
    console.error('Error in updateReturnOrderStatus:', error);
    res.status(error.message === 'Return order not found' ? 404 : 400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * حذف أمر صرف
 */
export const deleteDispatchOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userCompanyId = (req as any).user?.companyId;
    const isSystemUser = (req as any).user?.isSystemUser || false;
    const { id } = req.params;

    if (!userCompanyId && !isSystemUser) {
      res.status(401).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مفقود'
      });
      return;
    }

    const result = await warehouseService.deleteDispatchOrder(Number(id), userCompanyId, isSystemUser);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('Error in deleteDispatchOrder:', error);
    res.status(error.message === 'Dispatch order not found' ? 404 : 400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * الحصول على إحصائيات أوامر الصرف
 */
export const getDispatchOrderStats = async (req: Request, res: Response): Promise<void> => {
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

    const result = await warehouseService.getDispatchOrderStats(userCompanyId, isSystemUser);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in getDispatchOrderStats:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

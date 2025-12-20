/**
 * Product Cost Controller
 * التحكم في عمليات تكلفة الأصناف
 */

import { Request, Response } from 'express';
import ProductCostService from '../services/ProductCostService';

export class ProductCostController {
    /**
     * الحصول على معلومات تكلفة صنف معين
     */
    static async getProductCostInfo(req: Request, res: Response) {
        try {
            const idParam = req.params.id;
            if (!idParam) {
                return res.status(400).json({
                    success: false,
                    message: 'معرف الصنف مطلوب'
                });
            }
            const productId = parseInt(idParam);

            if (isNaN(productId)) {
                return res.status(400).json({
                    success: false,
                    message: 'معرف الصنف غير صالح'
                });
            }

            const costInfo = await ProductCostService.getProductCostInfo(productId);

            return res.json({
                success: true,
                message: 'تم جلب معلومات التكلفة بنجاح',
                data: costInfo
            });
        } catch (error: any) {
            console.error('خطأ في جلب معلومات تكلفة الصنف:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ في جلب معلومات التكلفة'
            });
        }
    }

    /**
     * تحديث تكلفة الصنف
     */
    static async updateProductCost(req: Request, res: Response) {
        try {
            const { productId, newCost, purchaseId, exchangeRateUsed, notes } = req.body;

            if (!productId || newCost === undefined || !purchaseId || !exchangeRateUsed) {
                return res.status(400).json({
                    success: false,
                    message: 'جميع الحقول مطلوبة: productId, newCost, purchaseId, exchangeRateUsed'
                });
            }

            if (newCost < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'التكلفة يجب أن تكون قيمة موجبة'
                });
            }

            const userId = (req as any).user?.UserID || 'SYSTEM';

            const result = await ProductCostService.updateProductCost({
                productId: parseInt(productId),
                newCost: parseFloat(newCost),
                purchaseId: parseInt(purchaseId),
                exchangeRateUsed: parseFloat(exchangeRateUsed),
                notes
            }, userId);

            return res.json(result);
        } catch (error: any) {
            console.error('خطأ في تحديث تكلفة الصنف:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ في تحديث التكلفة'
            });
        }
    }

    /**
     * الحصول على قائمة الأصناف مع معلومات التكلفة
     */
    static async getProductsWithCostInfo(req: Request, res: Response) {
        try {
            const {
                page = 1,
                limit = 20,
                search,
                companyId,
                hasCost
            } = req.query;

            const result = await ProductCostService.getProductsWithCostInfo({
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                search: search as string,
                companyId: companyId ? parseInt(companyId as string) : undefined,
                hasCost: hasCost === 'true' ? true : hasCost === 'false' ? false : undefined
            });

            return res.json({
                success: true,
                message: 'تم جلب قائمة الأصناف بنجاح',
                data: result
            });
        } catch (error: any) {
            console.error('خطأ في جلب قائمة الأصناف:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ في جلب قائمة الأصناف'
            });
        }
    }

    /**
     * حساب التكلفة مع سعر صرف مخصص
     */
    static async calculateCostWithCustomRate(req: Request, res: Response) {
        try {
            const idParam = req.params.id;
            if (!idParam) {
                return res.status(400).json({
                    success: false,
                    message: 'معرف الصنف مطلوب'
                });
            }
            const productId = parseInt(idParam);
            const { exchangeRate } = req.body;

            if (isNaN(productId)) {
                return res.status(400).json({
                    success: false,
                    message: 'معرف الصنف غير صالح'
                });
            }

            if (!exchangeRate || exchangeRate <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'سعر الصرف يجب أن يكون قيمة موجبة'
                });
            }

            const costInfo = await ProductCostService.calculateCostWithCustomRate(
                productId,
                parseFloat(exchangeRate)
            );

            return res.json({
                success: true,
                message: 'تم حساب التكلفة بنجاح',
                data: costInfo
            });
        } catch (error: any) {
            console.error('خطأ في حساب التكلفة:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ في حساب التكلفة'
            });
        }
    }
}

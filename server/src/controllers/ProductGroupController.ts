import { Request, Response } from 'express';
import { ProductGroupService } from '../services/ProductGroupService';

export class ProductGroupController {
    private productGroupService: ProductGroupService;

    constructor() {
        this.productGroupService = new ProductGroupService();
    }

    async getProductGroups(req: Request, res: Response): Promise<void> {
        try {
            const groups = await this.productGroupService.getProductGroups();
            res.status(200).json({
                success: true,
                data: groups
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'خطأ في جلب مجموعات المنتجات'
            });
        }
    }

    async getProductGroupById(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);
            const group = await this.productGroupService.getProductGroupById(id);
            if (!group) {
                res.status(404).json({
                    success: false,
                    message: 'المجموعة غير موجودة'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: group
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'خطأ في جلب المجموعة'
            });
        }
    }

    async createProductGroup(req: Request, res: Response): Promise<void> {
        try {
            const { name, maxDiscountPercentage } = req.body;
            if (!name) {
                res.status(400).json({
                    success: false,
                    message: 'الاسم مطلوب'
                });
                return;
            }

            const group = await this.productGroupService.createProductGroup({
                name: name.toString(),
                maxDiscountPercentage: parseFloat((maxDiscountPercentage || 0).toString())
            });

            res.status(201).json({
                success: true,
                message: 'تم إنشاء المجموعة بنجاح',
                data: group
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'خطأ في إنشاء المجموعة'
            });
        }
    }

    async updateProductGroup(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);
            const { name, maxDiscountPercentage } = req.body;

            const group = await this.productGroupService.updateProductGroup(id, {
                name: name ? name.toString() : undefined,
                maxDiscountPercentage: maxDiscountPercentage !== undefined ? parseFloat(maxDiscountPercentage.toString()) : undefined
            });

            res.status(200).json({
                success: true,
                message: 'تم تحديث المجموعة بنجاح',
                data: group
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'خطأ في تحديث المجموعة'
            });
        }
    }

    async deleteProductGroup(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);
            await this.productGroupService.deleteProductGroup(id);
            res.status(200).json({
                success: true,
                message: 'تم حذف المجموعة بنجاح'
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'خطأ في حذف المجموعة'
            });
        }
    }

    async assignProductsToGroup(req: Request, res: Response): Promise<void> {
        try {
            const groupId = parseInt(req.params.id as string);
            const { productIds } = req.body;

            if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'يجب تحديد الأصناف المراد إضافتها'
                });
                return;
            }

            const result = await this.productGroupService.assignProductsToGroup(
                groupId,
                productIds.map((id: any) => parseInt(id))
            );

            res.status(200).json({
                success: true,
                message: `تم إضافة ${result.updatedCount} صنف إلى مجموعة "${result.groupName}"`,
                data: result
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'خطأ في إضافة الأصناف للمجموعة'
            });
        }
    }

    async removeProductsFromGroup(req: Request, res: Response): Promise<void> {
        try {
            const { productIds } = req.body;

            if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'يجب تحديد الأصناف المراد إزالتها'
                });
                return;
            }

            const result = await this.productGroupService.removeProductsFromGroup(
                productIds.map((id: any) => parseInt(id))
            );

            res.status(200).json({
                success: true,
                message: `تم إزالة ${result.updatedCount} صنف من المجموعة`,
                data: result
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'خطأ في إزالة الأصناف من المجموعة'
            });
        }
    }

    async getProductsWithGroupStatus(req: Request, res: Response): Promise<void> {
        try {
            const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : undefined;
            const products = await this.productGroupService.getProductsWithGroupStatus(groupId);

            res.status(200).json({
                success: true,
                data: products
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'خطأ في جلب الأصناف'
            });
        }
    }
}

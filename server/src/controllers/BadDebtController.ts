/**
 * Bad Debt Controller
 * متحكم المصروفات المعدومة
 */

import { Request, Response } from 'express';
import BadDebtService from '../services/BadDebtService';

interface AuthRequest extends Request {
    user?: any;
}

class BadDebtController {
    // ============== إدارة البنود ==============

    /**
     * إنشاء بند مصروف معدوم جديد
     */
    async createCategory(req: AuthRequest, res: Response) {
        try {
            const { name, description, companyId } = req.body;

            if (!name) {
                res.status(400).json({
                    success: false,
                    message: 'اسم البند مطلوب'
                });
                return;
            }

            const category = await BadDebtService.createCategory({
                name,
                description,
                companyId: companyId ? parseInt(companyId) : undefined
            });

            res.status(201).json({
                success: true,
                message: 'تم إنشاء البند بنجاح',
                data: category
            });
        } catch (error: any) {
            console.error('خطأ في إنشاء البند:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء إنشاء البند'
            });
        }
    }

    /**
     * الحصول على قائمة البنود
     */
    async getCategories(req: AuthRequest, res: Response) {
        try {
            const { companyId, isActive, search } = req.query;

            const categories = await BadDebtService.getCategories(
                companyId ? parseInt(companyId as string) : undefined,
                isActive !== undefined ? isActive === 'true' : undefined,
                search as string
            );

            res.json({
                success: true,
                message: 'تم جلب البنود بنجاح',
                data: categories
            });
        } catch (error: any) {
            console.error('خطأ في جلب البنود:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء جلب البنود'
            });
        }
    }

    /**
     * الحصول على بند واحد
     */
    async getCategoryById(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'معرف البند مطلوب' });
                return;
            }
            const category = await BadDebtService.getCategoryById(parseInt(id));

            res.json({
                success: true,
                message: 'تم جلب البند بنجاح',
                data: category
            });
        } catch (error: any) {
            console.error('خطأ في جلب البند:', error);
            res.status(404).json({
                success: false,
                message: error.message || 'البند غير موجود'
            });
        }
    }

    /**
     * تحديث بند
     */
    async updateCategory(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'معرف البند مطلوب' });
                return;
            }
            const { name, description, isActive } = req.body;

            const category = await BadDebtService.updateCategory(parseInt(id), {
                name,
                description,
                isActive
            });

            res.json({
                success: true,
                message: 'تم تحديث البند بنجاح',
                data: category
            });
        } catch (error: any) {
            console.error('خطأ في تحديث البند:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء تحديث البند'
            });
        }
    }

    /**
     * حذف بند
     */
    async deleteCategory(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'معرف البند مطلوب' });
                return;
            }
            const result = await BadDebtService.deleteCategory(parseInt(id));

            res.json({
                success: true,
                ...result
            });
        } catch (error: any) {
            console.error('خطأ في حذف البند:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء حذف البند'
            });
        }
    }

    // ============== صرف المصروفات المعدومة ==============

    /**
     * صرف مصروف معدوم
     */
    async payBadDebt(req: AuthRequest, res: Response) {
        try {
            const { categoryId, amount, description, treasuryId, notes } = req.body;

            if (!categoryId || !amount || !treasuryId) {
                res.status(400).json({
                    success: false,
                    message: 'بند المصروف والمبلغ والخزينة مطلوبة'
                });
                return;
            }

            const expense = await BadDebtService.payBadDebt({
                categoryId: parseInt(categoryId),
                amount: parseFloat(amount),
                description,
                treasuryId: parseInt(treasuryId),
                notes,
                createdBy: req.user?.UserID
            });

            res.status(201).json({
                success: true,
                message: 'تم صرف المصروف بنجاح',
                data: expense
            });
        } catch (error: any) {
            console.error('خطأ في صرف المصروف:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء صرف المصروف'
            });
        }
    }

    /**
     * الحصول على قائمة المصروفات
     */
    async getExpenses(req: AuthRequest, res: Response) {
        try {
            const { categoryId, treasuryId, startDate, endDate, page, limit } = req.query;

            const result = await BadDebtService.getExpenses({
                categoryId: categoryId ? parseInt(categoryId as string) : undefined,
                treasuryId: treasuryId ? parseInt(treasuryId as string) : undefined,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                page: page ? parseInt(page as string) : 1,
                limit: limit ? parseInt(limit as string) : 20
            });

            res.json({
                success: true,
                message: 'تم جلب المصروفات بنجاح',
                data: result
            });
        } catch (error: any) {
            console.error('خطأ في جلب المصروفات:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء جلب المصروفات'
            });
        }
    }

    // ============== الإحصائيات ==============

    /**
     * إحصائيات المصروفات المعدومة
     */
    async getBadDebtStats(req: AuthRequest, res: Response) {
        try {
            const { companyId, year } = req.query;

            const stats = await BadDebtService.getBadDebtStats(
                companyId ? parseInt(companyId as string) : undefined,
                year ? parseInt(year as string) : undefined
            );

            res.json({
                success: true,
                message: 'تم جلب الإحصائيات بنجاح',
                data: stats
            });
        } catch (error: any) {
            console.error('خطأ في جلب الإحصائيات:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء جلب الإحصائيات'
            });
        }
    }

    /**
     * التقرير الشهري
     */
    async getMonthlyReport(req: AuthRequest, res: Response) {
        try {
            const { year, companyId } = req.query;

            if (!year) {
                res.status(400).json({
                    success: false,
                    message: 'السنة مطلوبة'
                });
                return;
            }

            const report = await BadDebtService.getMonthlyReport(
                parseInt(year as string),
                companyId ? parseInt(companyId as string) : undefined
            );

            res.json({
                success: true,
                message: 'تم جلب التقرير بنجاح',
                data: report
            });
        } catch (error: any) {
            console.error('خطأ في جلب التقرير:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء جلب التقرير'
            });
        }
    }
}

export default new BadDebtController();

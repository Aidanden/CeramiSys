/**
 * Payroll Controller
 * متحكم المرتبات
 */

import { Request, Response } from 'express';
import PayrollService from '../services/PayrollService';

interface AuthRequest extends Request {
    user?: any;
}

class PayrollController {
    // ============== إدارة الموظفين ==============

    /**
     * إنشاء موظف جديد
     */
    async createEmployee(req: AuthRequest, res: Response) {
        try {
            const { name, jobTitle, phone, email, baseSalary, companyId, hireDate, notes } = req.body;

            if (!name || !baseSalary || !companyId) {
                res.status(400).json({
                    success: false,
                    message: 'اسم الموظف والراتب الأساسي والشركة مطلوبة'
                });
                return;
            }

            const employee = await PayrollService.createEmployee({
                name,
                jobTitle,
                phone,
                email,
                baseSalary: parseFloat(baseSalary),
                companyId: parseInt(companyId),
                hireDate: hireDate ? new Date(hireDate) : undefined,
                notes
            });

            res.status(201).json({
                success: true,
                message: 'تم إنشاء الموظف بنجاح',
                data: employee
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء إنشاء الموظف'
            });
        }
    }

    /**
     * الحصول على قائمة الموظفين
     */
    async getEmployees(req: AuthRequest, res: Response) {
        try {
            const { companyId, isActive, search } = req.query;

            const employees = await PayrollService.getEmployees(
                companyId ? parseInt(companyId as string) : undefined,
                isActive !== undefined ? isActive === 'true' : undefined,
                search as string
            );

            res.json({
                success: true,
                message: 'تم جلب الموظفين بنجاح',
                data: employees
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء جلب الموظفين'
            });
        }
    }

    /**
     * الحصول على موظف واحد
     */
    async getEmployeeById(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'معرف الموظف مطلوب' });
                return;
            }
            const employee = await PayrollService.getEmployeeById(parseInt(id));

            res.json({
                success: true,
                message: 'تم جلب الموظف بنجاح',
                data: employee
            });
        } catch (error: any) {
            res.status(404).json({
                success: false,
                message: error.message || 'الموظف غير موجود'
            });
        }
    }

    /**
     * تحديث موظف
     */
    async updateEmployee(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'معرف الموظف مطلوب' });
                return;
            }
            const { name, jobTitle, phone, email, baseSalary, hireDate, notes, isActive } = req.body;

            const employee = await PayrollService.updateEmployee(parseInt(id), {
                name,
                jobTitle,
                phone,
                email,
                baseSalary: baseSalary ? parseFloat(baseSalary) : undefined,
                hireDate: hireDate ? new Date(hireDate) : undefined,
                notes,
                isActive
            });

            res.json({
                success: true,
                message: 'تم تحديث الموظف بنجاح',
                data: employee
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء تحديث الموظف'
            });
        }
    }

    /**
     * حذف موظف
     */
    async deleteEmployee(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'معرف الموظف مطلوب' });
                return;
            }
            const result = await PayrollService.deleteEmployee(parseInt(id));

            res.json({
                success: true,
                ...result
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء حذف الموظف'
            });
        }
    }

    // ============== صرف المرتبات ==============

    /**
     * صرف مرتب لموظف
     */
    async paySalary(req: AuthRequest, res: Response) {
        try {
            const { employeeId, month, year, amount, type, treasuryId, notes } = req.body;

            if (!employeeId || !month || !year || !amount || !treasuryId || !type) {
                res.status(400).json({
                    success: false,
                    message: 'جميع الحقول مطلوبة: معرف الموظف، الشهر، السنة، المبلغ، النوع، الخزينة'
                });
                return;
            }

            const payment = await PayrollService.paySalary({
                employeeId: parseInt(employeeId),
                month: parseInt(month),
                year: parseInt(year),
                amount: parseFloat(amount),
                type: type, // PARTIAL or FINAL
                treasuryId: parseInt(treasuryId),
                notes,
                createdBy: req.user?.UserID
            });

            res.status(201).json({
                success: true,
                message: 'تم صرف المرتب بنجاح',
                data: payment
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء صرف المرتب'
            });
        }
    }

    /**
     * صرف مرتبات لعدة موظفين
     */
    async payMultipleSalaries(req: AuthRequest, res: Response) {
        try {
            const { employeeIds, month, year, treasuryId } = req.body;

            if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'يجب تحديد موظف واحد على الأقل'
                });
                return;
            }

            if (!month || !year || !treasuryId) {
                res.status(400).json({
                    success: false,
                    message: 'الشهر والسنة والخزينة مطلوبة'
                });
                return;
            }

            const result = await PayrollService.payMultipleSalaries({
                employeeIds: employeeIds.map((id: any) => parseInt(id)),
                month: parseInt(month),
                year: parseInt(year),
                treasuryId: parseInt(treasuryId),
                createdBy: req.user?.UserID
            });

            res.status(201).json({
                success: true,
                message: `تم صرف ${result.totalPaid} مرتب${result.totalFailed > 0 ? ` وفشل ${result.totalFailed}` : ''}`,
                data: result
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء صرف المرتبات'
            });
        }
    }

    /**
     * الحصول على كشف حركة مرتب موظف
     */
    async getEmployeeSalaryStatement(req: AuthRequest, res: Response) {
        try {
            const { employeeId } = req.params;
            const { month, year } = req.query;

            if (!employeeId || !month || !year) {
                res.status(400).json({
                    success: false,
                    message: 'معرف الموظف والشهر والسنة مطلوبة'
                });
                return;
            }

            const statement = await PayrollService.getEmployeeSalaryStatement(
                parseInt(employeeId),
                parseInt(month as string),
                parseInt(year as string)
            );

            res.json({
                success: true,
                message: 'تم جلب كشف حركة المرتب بنجاح',
                data: statement
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء جلب كشف حركة المرتب'
            });
        }
    }

    /**
     * الحصول على سجل مرتبات شهر معين
     */
    async getSalaryPaymentsByMonth(req: AuthRequest, res: Response) {
        try {
            const { month, year, companyId } = req.query;

            if (!month || !year) {
                res.status(400).json({
                    success: false,
                    message: 'الشهر والسنة مطلوبان'
                });
                return;
            }

            const payments = await PayrollService.getSalaryPaymentsByMonth(
                parseInt(month as string),
                parseInt(year as string),
                companyId ? parseInt(companyId as string) : undefined
            );

            res.json({
                success: true,
                message: 'تم جلب سجل المرتبات بنجاح',
                data: payments
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء جلب سجل المرتبات'
            });
        }
    }

    // ============== المكافآت والزيادات ==============

    /**
     * الحصول على المكافآت حسب الفلاتر
     */
    async getBonuses(req: AuthRequest, res: Response) {
        try {
            const { month, year, type, employeeId, companyId } = req.query;

            const bonuses = await PayrollService.getBonuses({
                month: month ? parseInt(month as string) : undefined,
                year: year ? parseInt(year as string) : undefined,
                type: type as any,
                employeeId: employeeId ? parseInt(employeeId as string) : undefined,
                companyId: companyId ? parseInt(companyId as string) : undefined
            });

            res.json({
                success: true,
                data: bonuses
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء جلب المكافآت'
            });
        }
    }

    /**
     * صرف مكافأة أو زيادة
     */
    async payBonus(req: AuthRequest, res: Response) {
        try {
            const { employeeId, type, amount, reason, treasuryId, effectiveDate, notes } = req.body;

            if (!employeeId || !type || !amount || !treasuryId) {
                res.status(400).json({
                    success: false,
                    message: 'معرف الموظف والنوع والمبلغ والخزينة مطلوبة'
                });
                return;
            }

            const bonus = await PayrollService.payBonus({
                employeeId: parseInt(employeeId),
                type,
                amount: parseFloat(amount),
                reason,
                treasuryId: parseInt(treasuryId),
                effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
                notes,
                createdBy: req.user?.UserID
            });

            res.status(201).json({
                success: true,
                message: 'تم صرف المكافأة/الزيادة بنجاح',
                data: bonus
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء صرف المكافأة'
            });
        }
    }

    // ============== الإحصائيات ==============

    /**
     * إحصائيات المرتبات
     */
    async getPayrollStats(req: AuthRequest, res: Response) {
        try {
            const { companyId, year } = req.query;

            const stats = await PayrollService.getPayrollStats(
                companyId ? parseInt(companyId as string) : undefined,
                year ? parseInt(year as string) : undefined
            );

            res.json({
                success: true,
                message: 'تم جلب الإحصائيات بنجاح',
                data: stats
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء جلب الإحصائيات'
            });
        }
    }

    // ============== حساب الموظف ==============

    /**
     * جلب حساب موظف معين
     */
    async getEmployeeAccount(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'معرف الموظف مطلوب' });
                return;
            }

            const EmployeeAccountService = require('../services/EmployeeAccountService').default;
            const account = await EmployeeAccountService.getEmployeeAccount(parseInt(id));

            res.json({
                success: true,
                message: 'تم جلب حساب الموظف بنجاح',
                data: account
            });
        } catch (error: any) {
            res.status(404).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء جلب حساب الموظف'
            });
        }
    }
}

export default new PayrollController();

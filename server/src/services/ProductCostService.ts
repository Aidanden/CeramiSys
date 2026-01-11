/**
 * Product Cost Service
 * خدمة احتساب وتحديث تكلفة الأصناف
 */

import prisma from '../models/prismaClient';

export interface ProductCostInfo {
    productId: number;
    productName: string;
    productSku: string;
    unit: string | null;
    currentCost: number | null;

    // بيانات آخر فاتورة
    lastPurchase: {
        id: number;
        invoiceNumber: string | null;
        purchaseDate: Date;
        currency: string;

        // بيانات الصنف في الفاتورة
        qty: number;
        unitPrice: number;
        subTotal: number;

        // المصروفات
        totalExpenses: number;
        expenseShareAmount: number; // نصيب الصنف من المصروفات
        expenseSharePercentage: number; // نسبة الصنف من المصروفات

        // تفاصيل المصروفات الفردية
        expenseDetails: Array<{
            id: number;
            categoryName: string;
            supplierName: string | null;
            currency: string;
            amount: number; // المبلغ بالعملة الأصلية
        }>;

        // الإجماليات
        totalWithExpenses: number; // إجمالي الصنف + نصيبه من المصروفات (بالعملة الأصلية)

        // التكلفة المحسوبة
        calculatedCostPerUnit: number; // بالعملة الأصلية
    } | null;
}

export interface UpdateProductCostRequest {
    productId: number;
    newCost: number;
    purchaseId: number;
    notes?: string;
}

export interface ProductCostUpdateLog {
    id: number;
    productId: number;
    oldCost: number | null;
    newCost: number;
    purchaseId: number;
    invoiceNumber: string | null;
    updatedAt: Date;
    updatedBy: string;
    notes: string | null;
}

class ProductCostService {
    /**
     * الحصول على معلومات تكلفة صنف معين
     */
    async getProductCostInfo(productId: number): Promise<ProductCostInfo> {
        // جلب بيانات الصنف
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                cost: true,
            }
        });

        if (!product) {
            throw new Error('الصنف غير موجود');
        }

        // جلب آخر فاتورة مشتريات معتمدة تحتوي على هذا الصنف
        const lastPurchaseLine = await prisma.purchaseLine.findFirst({
            where: {
                productId: productId,
                purchase: {
                    isApproved: true
                }
            },
            orderBy: {
                purchase: {
                    createdAt: 'desc'
                }
            },
            include: {
                purchase: {
                    include: {
                        expenses: {
                            include: {
                                category: true,
                                supplier: true
                            }
                        },
                        lines: {
                            select: {
                                productId: true,
                                qty: true,
                                unitPrice: true,
                                subTotal: true,
                            }
                        }
                    }
                }
            }
        });

        if (!lastPurchaseLine) {
            return {
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                unit: product.unit,
                currentCost: product.cost ? Number(product.cost) : null,
                lastPurchase: null
            };
        }

        const purchase = lastPurchaseLine.purchase;

        // حساب إجمالي الفاتورة (مجموع subTotal لجميع الأصناف)
        const purchaseTotal = purchase.lines.reduce((sum, line) => sum + Number(line.subTotal), 0);

        // حساب إجمالي المصروفات بالدينار الليبي
        const totalExpenses = Number(purchase.totalExpenses || 0);

        // حساب نصيب الصنف من المصروفات بناءً على نسبة قيمته من إجمالي الفاتورة
        const lineSubTotal = Number(lastPurchaseLine.subTotal);
        const expenseSharePercentage = purchaseTotal > 0 ? (lineSubTotal / purchaseTotal) * 100 : 0;
        const expenseShareAmount = (expenseSharePercentage / 100) * totalExpenses;

        // إجمالي الصنف + نصيبه من المصروفات (بالعملة الأصلية)
        const totalWithExpenses = lineSubTotal + expenseShareAmount;

        // حساب التكلفة لكل وحدة (بالعملة الأصلية)
        const qty = Number(lastPurchaseLine.qty);
        const calculatedCostPerUnit = qty > 0 ? totalWithExpenses / qty : 0;

        return {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            unit: product.unit,
            currentCost: product.cost ? Number(product.cost) : null,
            lastPurchase: {
                id: purchase.id,
                invoiceNumber: purchase.invoiceNumber,
                purchaseDate: purchase.createdAt,
                currency: purchase.currency,

                qty: qty,
                unitPrice: Number(lastPurchaseLine.unitPrice),
                subTotal: lineSubTotal,

                totalExpenses: totalExpenses,
                expenseShareAmount: Math.round(expenseShareAmount * 100) / 100,
                expenseSharePercentage: Math.round(expenseSharePercentage * 100) / 100,

                // تفاصيل المصروفات الفردية
                expenseDetails: purchase.expenses.map(exp => ({
                    id: exp.id,
                    categoryName: exp.category?.name || 'غير محدد',
                    supplierName: exp.supplier?.name || null,
                    currency: exp.currency,
                    amount: Number(exp.amount) // المبلغ بالعملة الأصلية
                })),

                totalWithExpenses: Math.round(totalWithExpenses * 100) / 100,

                calculatedCostPerUnit: Math.round(calculatedCostPerUnit * 10000) / 10000
            }
        };
    }

    /**
     * تحديث تكلفة الصنف
     */
    async updateProductCost(data: UpdateProductCostRequest, updatedBy: string): Promise<{ success: boolean; message: string; product: any }> {
        // جلب الصنف الحالي
        const product = await prisma.product.findUnique({
            where: { id: data.productId },
            select: {
                id: true,
                name: true,
                sku: true,
                cost: true,
            }
        });

        if (!product) {
            throw new Error('الصنف غير موجود');
        }

        // جلب بيانات الفاتورة
        const purchase = await prisma.purchase.findUnique({
            where: { id: data.purchaseId },
            select: {
                id: true,
                invoiceNumber: true,
            }
        });

        if (!purchase) {
            throw new Error('فاتورة المشتريات غير موجودة');
        }

        const oldCost = product.cost ? Number(product.cost) : null;

        // تحديث تكلفة الصنف
        const updatedProduct = await prisma.product.update({
            where: { id: data.productId },
            data: {
                cost: data.newCost
            },
            select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                cost: true,
                updatedAt: true,
            }
        });

        // تسجيل عملية التحديث في سجل خاص
        try {
            await prisma.productCostLog.create({
                data: {
                    productId: data.productId,
                    oldCost: oldCost,
                    newCost: data.newCost,
                    purchaseId: data.purchaseId,
                    updatedBy: updatedBy,
                    notes: data.notes
                }
            });
        } catch (error) {
            console.error('فشل في تسجيل تحديث التكلفة:', error);
            // لا نوقف العملية إذا فشل التسجيل، لكن نسجل الخطأ
        }
        return {
            success: true,
            message: `تم تحديث تكلفة الصنف "${product.name}" من ${oldCost ?? 'غير محددة'} إلى ${data.newCost} د.ل`,
            product: {
                ...updatedProduct,
                cost: Number(updatedProduct.cost),
                oldCost: oldCost,
                purchaseId: data.purchaseId,
                invoiceNumber: purchase.invoiceNumber,
            }
        };
    }

    /**
     * الحصول على قائمة الأصناف مع معلومات التكلفة
     */
    async getProductsWithCostInfo(query: {
        page?: number;
        limit?: number;
        search?: string;
        companyId?: number;
        hasCost?: boolean;
    }): Promise<{ products: any[]; pagination: any }> {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { sku: { contains: query.search, mode: 'insensitive' } }
            ];
        }

        if (query.companyId) {
            where.createdByCompanyId = query.companyId;
        }

        if (query.hasCost === true) {
            where.cost = { not: null };
        } else if (query.hasCost === false) {
            where.cost = null;
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    unit: true,
                    cost: true,
                    createdByCompanyId: true,
                    createdByCompany: {
                        select: { id: true, name: true, code: true }
                    },
                    updatedAt: true,
                    // جلب آخر سطر مشتريات لمعرفة إذا كان هناك فاتورة متاحة
                    purchaseLineItems: {
                        where: {
                            purchase: {
                                isApproved: true
                            }
                        },
                        orderBy: {
                            purchase: {
                                createdAt: 'desc'
                            }
                        },
                        take: 1,
                        select: {
                            purchase: {
                                select: {
                                    id: true,
                                    invoiceNumber: true,
                                    createdAt: true,
                                    currency: true,
                                }
                            }
                        }
                    }
                }
            }),
            prisma.product.count({ where })
        ]);

        // تحويل البيانات
        const formattedProducts = products.map(product => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            cost: product.cost ? Number(product.cost) : null,
            companyId: product.createdByCompanyId,
            company: product.createdByCompany,
            updatedAt: product.updatedAt,
            hasLastPurchase: product.purchaseLineItems.length > 0,
            lastPurchase: product.purchaseLineItems[0]?.purchase || null
        }));

        return {
            products: formattedProducts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

}

export default new ProductCostService();

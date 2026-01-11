import { Request, Response } from 'express';
import prisma from '../models/prismaClient';

// تعريف نوع المستخدم للـ Request
interface StoreAuthRequest extends Request {
    storeUser?: {
        id: string;
        storeId: number;
        username: string;
    };
}

export class ExternalStoreInvoiceController {
    /**
     * الحصول على قائمة الفواتير
     * للمحل: فقط فواتيره
     * للمسؤول: جميع الفواتير
     */
    async getInvoices(req: Request | StoreAuthRequest, res: Response) {
        try {
            const { page = 1, limit = 10, status, storeId } = req.query;
            const isStoreUser = 'storeUser' in req && req.storeUser;

            const skip = (Number(page) - 1) * Number(limit);

            console.log('DEBUG: getInvoices called', {
                isStoreUser,
                query: req.query,
                storeUser: (req as any).storeUser,
                user: (req as any).user
            });

            const where: any = {};

            // إذا كان مستخدم محل، نعرض فقط فواتير محله
            if (isStoreUser) {
                where.storeId = req.storeUser!.storeId;
            } else if (storeId) {
                where.storeId = Number(storeId);
            }

            if (status) {
                where.status = status;
            }

            const [invoices, total] = await Promise.all([
                prisma.externalStoreInvoice.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    include: {
                        store: {
                            select: {
                                id: true,
                                name: true,
                                ownerName: true,
                            },
                        },
                        lines: {
                            include: {
                                product: {
                                    select: {
                                        id: true,
                                        sku: true,
                                        name: true,
                                        unit: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.externalStoreInvoice.count({ where }),
            ]);

            return res.json({
                invoices,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        } catch (error: any) {
            console.error('Error fetching invoices:', error);
            return res.status(500).json({ error: 'Failed to fetch invoices', details: error.message });
        }
    }

    /**
     * الحصول على فاتورة واحدة
     */
    async getInvoiceById(req: Request | StoreAuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const isStoreUser = 'storeUser' in req && req.storeUser;

            const invoice = await prisma.externalStoreInvoice.findUnique({
                where: { id: Number(id) },
                include: {
                    store: {
                        select: {
                            id: true,
                            name: true,
                            ownerName: true,
                            phone1: true,
                            address: true,
                        },
                    },
                    lines: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    sku: true,
                                    name: true,
                                    unit: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!invoice) {
                return res.status(404).json({ error: 'Invoice not found' });
            }

            // التحقق من أن المستخدم يملك الفاتورة
            if (isStoreUser && invoice.storeId !== req.storeUser!.storeId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            return res.json(invoice);
        } catch (error: any) {
            console.error('Error fetching invoice:', error);
            return res.status(500).json({ error: 'Failed to fetch invoice', details: error.message });
        }
    }

    /**
     * إنشاء فاتورة جديدة (من بوابة المحل)
     */
    async createInvoice(req: StoreAuthRequest, res: Response) {
        try {
            if (!req.storeUser) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { lines, notes } = req.body;

            if (!Array.isArray(lines) || lines.length === 0) {
                return res.status(400).json({ error: 'Invoice lines are required' });
            }

            // التحقق من أن جميع المنتجات مربوطة بالمحل
            const productIds = lines.map((line: any) => line.productId);
            const assignedProducts = await prisma.externalStoreProduct.findMany({
                where: {
                    storeId: req.storeUser.storeId,
                    productId: { in: productIds },
                },
            });

            if (assignedProducts.length !== productIds.length) {
                return res.status(400).json({ error: 'Some products are not assigned to this store' });
            }

            // حساب الإجمالي
            // ملاحظة: للأصناف التي وحدتها "صندوق"، يتم إرسال subTotal محسوب من الـ frontend
            // (الكمية × عدد الأمتار × سعر المتر)
            let total = 0;
            const invoiceLines = lines.map((line: any) => {
                // استخدام subTotal المُرسل من الـ frontend إذا كان موجوداً
                // وإلا حساب الإجمالي بالطريقة العادية
                const subTotal = line.subTotal
                    ? Number(line.subTotal)
                    : Number(line.qty) * Number(line.unitPrice);
                total += subTotal;
                return {
                    productId: line.productId,
                    qty: line.qty,
                    unitPrice: line.unitPrice,
                    subTotal,
                };
            });

            // Generate Invoice Number
            // Format: S{StoreId}-{Year}{Month}{Day}-{Random}
            const date = new Date();
            const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
            const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            const invoiceNumber = `S${req.storeUser.storeId}-${dateStr}-${random}`;

            // إنشاء الفاتورة
            const invoice = await prisma.externalStoreInvoice.create({
                data: {
                    storeId: req.storeUser.storeId,
                    invoiceNumber,
                    total,
                    notes,
                    lines: {
                        create: invoiceLines,
                    },
                },
                include: {
                    lines: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

            return res.status(201).json(invoice);
        } catch (error: any) {
            console.error('Error creating invoice:', error);
            return res.status(500).json({ error: 'Failed to create invoice', details: error.message });
        }
    }

    /**
     * تحديث فاتورة معلقة
     */
    async updateInvoice(req: StoreAuthRequest, res: Response) {
        try {
            if (!req.storeUser) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { id } = req.params;
            const { lines, notes } = req.body;

            // التحقق من وجود الفاتورة وأنها معلقة
            const existingInvoice = await prisma.externalStoreInvoice.findUnique({
                where: { id: Number(id) },
            });

            if (!existingInvoice) {
                return res.status(404).json({ error: 'Invoice not found' });
            }

            if (existingInvoice.storeId !== req.storeUser.storeId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            if (existingInvoice.status !== 'PENDING') {
                return res.status(400).json({ error: 'Can only update pending invoices' });
            }

            // حساب الإجمالي الجديد
            // ملاحظة: للأصناف التي وحدتها "صندوق"، يتم إرسال subTotal محسوب من الـ frontend
            let total = 0;
            const invoiceLines = lines.map((line: any) => {
                // استخدام subTotal المُرسل من الـ frontend إذا كان موجوداً
                const subTotal = line.subTotal
                    ? Number(line.subTotal)
                    : Number(line.qty) * Number(line.unitPrice);
                total += subTotal;
                return {
                    productId: line.productId,
                    qty: line.qty,
                    unitPrice: line.unitPrice,
                    subTotal,
                };
            });

            // حذف الأسطر القديمة وإنشاء الجديدة
            await prisma.externalStoreInvoiceLine.deleteMany({
                where: { invoiceId: Number(id) },
            });

            const invoice = await prisma.externalStoreInvoice.update({
                where: { id: Number(id) },
                data: {
                    total,
                    notes,
                    lines: {
                        create: invoiceLines,
                    },
                },
                include: {
                    lines: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

            return res.json(invoice);
        } catch (error: any) {
            console.error('Error updating invoice:', error);
            return res.status(500).json({ error: 'Failed to update invoice', details: error.message });
        }
    }

    /**
     * حذف فاتورة معلقة
     */
    async deleteInvoice(req: StoreAuthRequest, res: Response) {
        try {
            if (!req.storeUser) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { id } = req.params;

            const invoice = await prisma.externalStoreInvoice.findUnique({
                where: { id: Number(id) },
            });

            if (!invoice) {
                return res.status(404).json({ error: 'Invoice not found' });
            }

            if (invoice.storeId !== req.storeUser.storeId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            if (invoice.status !== 'PENDING') {
                return res.status(400).json({ error: 'Can only delete pending invoices' });
            }

            await prisma.externalStoreInvoice.delete({
                where: { id: Number(id) },
            });

            return res.json({ message: 'Invoice deleted successfully' });
        } catch (error: any) {
            console.error('Error deleting invoice:', error);
            return res.status(500).json({ error: 'Failed to delete invoice', details: error.message });
        }
    }

    /**
     * الموافقة على فاتورة (للمسؤول فقط)
     */
    async approveInvoice(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.UserID;
            const userCompanyId = (req as any).user?.companyId;

            const invoice = await prisma.externalStoreInvoice.findUnique({
                where: { id: Number(id) },
                include: {
                    store: true,
                    lines: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

            if (!invoice) {
                return res.status(404).json({ error: 'Invoice not found' });
            }

            if (invoice.status !== 'PENDING') {
                return res.status(400).json({ error: 'Invoice is not pending' });
            }

            // استخدام transaction للتأكد من تنفيذ جميع العمليات
            const result = await prisma.$transaction(async (tx) => {
                // 1. تحديث حالة الفاتورة إلى معتمدة
                const updatedInvoice = await tx.externalStoreInvoice.update({
                    where: { id: Number(id) },
                    data: {
                        status: 'APPROVED',
                        reviewedAt: new Date(),
                        reviewedBy: userId,
                    },
                    include: {
                        store: true,
                        lines: {
                            include: {
                                product: true,
                            },
                        },
                    },
                });

                // 2. إنشاء فاتورة مبيعات آجلة للعميل المرتبط بالمحل
                const sale = await tx.sale.create({
                    data: {
                        companyId: userCompanyId || 1, // شركة التقازي الرئيسية
                        customerId: invoice.store.customerId, // العميل المرتبط بالمحل
                        invoiceNumber: `EXT-${invoice.store.id}-${invoice.id}`,
                        saleType: 'CREDIT', // آجلة
                        paymentMethod: null,
                        total: invoice.total,
                        status: 'APPROVED', // معتمدة تلقائياً
                        notes: `فاتورة محل خارجي: ${invoice.store.name} - رقم الفاتورة: ${invoice.invoiceNumber || invoice.id}`,
                        approvedBy: userId,
                        approvedAt: new Date(),
                    },
                });

                // 3. إنشاء بنود فاتورة المبيعات
                for (const line of invoice.lines) {
                    await tx.saleLine.create({
                        data: {
                            saleId: sale.id,
                            productId: line.productId,
                            qty: line.qty,
                            unitPrice: line.unitPrice,
                            subTotal: line.subTotal,
                        },
                    });
                }

                // 4. إنشاء أمر صرف مرتبط بالفاتورة
                const dispatchOrder = await tx.dispatchOrder.create({
                    data: {
                        saleId: sale.id,
                        companyId: userCompanyId || 1,
                        status: 'PENDING',
                        notes: `أمر صرف تلقائي - محل: ${invoice.store.name} - فاتورة: ${invoice.invoiceNumber || invoice.id}`,
                    },
                });

                return {
                    invoice: updatedInvoice,
                    sale,
                    dispatchOrder,
                };
            });

            return res.json({
                ...result.invoice,
                createdSaleId: result.sale.id,
                createdDispatchOrderId: result.dispatchOrder.id,
                message: 'تمت الموافقة على الفاتورة وإنشاء أمر الصرف بنجاح',
            });
        } catch (error: any) {
            console.error('Error approving invoice:', error);
            return res.status(500).json({ error: 'Failed to approve invoice', details: error.message });
        }
    }

    /**
     * رفض فاتورة (للمسؤول فقط)
     */
    async rejectInvoice(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = (req as any).user?.UserID;

            const invoice = await prisma.externalStoreInvoice.findUnique({
                where: { id: Number(id) },
            });

            if (!invoice) {
                return res.status(404).json({ error: 'Invoice not found' });
            }

            if (invoice.status !== 'PENDING') {
                return res.status(400).json({ error: 'Invoice is not pending' });
            }

            const updatedInvoice = await prisma.externalStoreInvoice.update({
                where: { id: Number(id) },
                data: {
                    status: 'REJECTED',
                    rejectionReason: reason,
                    reviewedAt: new Date(),
                    reviewedBy: userId,
                },
                include: {
                    store: true,
                    lines: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

            return res.json(updatedInvoice);
        } catch (error: any) {
            console.error('Error rejecting invoice:', error);
            return res.status(500).json({ error: 'Failed to reject invoice', details: error.message });
        }
    }

    /**
     * إحصائيات الفواتير
     */
    async getInvoiceStats(req: Request | StoreAuthRequest, res: Response) {
        try {
            const isStoreUser = 'storeUser' in req && req.storeUser;
            const where: any = {};

            if (isStoreUser) {
                where.storeId = req.storeUser!.storeId;
            }

            const [
                totalInvoices,
                pendingInvoices,
                approvedInvoices,
                rejectedInvoices,
                totalAmount,
            ] = await Promise.all([
                prisma.externalStoreInvoice.count({ where }),
                prisma.externalStoreInvoice.count({ where: { ...where, status: 'PENDING' } }),
                prisma.externalStoreInvoice.count({ where: { ...where, status: 'APPROVED' } }),
                prisma.externalStoreInvoice.count({ where: { ...where, status: 'REJECTED' } }),
                prisma.externalStoreInvoice.aggregate({
                    where: { ...where, status: 'APPROVED' },
                    _sum: { total: true },
                }),
            ]);

            // حساب الأصناف الأكثر مبيعاً
            const topSelling = await prisma.externalStoreInvoiceLine.groupBy({
                by: ['productId'],
                where: {
                    invoice: {
                        ...where,
                        status: 'APPROVED'
                    }
                },
                _sum: {
                    qty: true,
                    subTotal: true
                },
                orderBy: {
                    _sum: {
                        qty: 'desc'
                    }
                },
                take: 5
            });

            // جلب تفاصيل المنتجات
            const topSellingWithDetails = await Promise.all(
                topSelling.map(async (item) => {
                    const product = await prisma.product.findUnique({
                        where: { id: item.productId },
                        select: { name: true, sku: true }
                    });
                    return {
                        productId: item.productId,
                        name: product?.name || 'Unknown',
                        sku: product?.sku || '',
                        totalQty: item._sum.qty || 0,
                        totalAmount: item._sum.subTotal || 0
                    };
                })
            );

            return res.json({
                totalInvoices,
                pendingInvoices,
                approvedInvoices,
                rejectedInvoices,
                totalAmount: totalAmount._sum.total || 0,
                topSelling: topSellingWithDetails,
            });
        } catch (error: any) {
            console.error('Error fetching invoice stats:', error);
            return res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
        }
    }

    /**
     * الحصول على المنتجات المتاحة للمحل مع المخزون والأسعار المحدثة
     * يتم جلب البيانات مباشرة من الجداول الأساسية لضمان التحديث الفوري
     */
    async getAvailableProducts(req: StoreAuthRequest, res: Response) {
        try {
            if (!req.storeUser) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const storeId = req.storeUser.storeId;

            // الحصول على قائمة المنتجات المخصصة للمحل
            const storeProducts = await prisma.externalStoreProduct.findMany({
                where: { storeId: storeId },
                select: { productId: true }
            });

            const productIds = storeProducts.map(sp => sp.productId);

            if (productIds.length === 0) {
                return res.json([]);
            }

            // جلب المنتجات مع البيانات المحدثة من الجداول الأساسية
            // إرجاع جميع الأسعار والمخزون للفلترة في الـ Frontend
            const products = await prisma.product.findMany({
                where: {
                    id: { in: productIds }
                },
                include: {
                    stocks: {
                        include: {
                            company: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true
                                }
                            }
                        }
                    },
                    prices: {
                        include: {
                            company: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true
                                }
                            }
                        }
                    },
                },
            });

            // تنسيق البيانات بنفس الشكل المتوقع في الـ Frontend
            const formattedProducts = products.map(product => ({
                productId: product.id,
                storeId: req.storeUser!.storeId,
                product: {
                    id: product.id,
                    sku: product.sku,
                    name: product.name,
                    unit: product.unit,
                    unitsPerBox: product.unitsPerBox,
                    stocks: product.stocks,
                    prices: product.prices
                }
            }));

            return res.json(formattedProducts);
        } catch (error: any) {
            console.error('Error fetching available products:', error);
            return res.status(500).json({ error: 'Failed to fetch products', details: error.message });
        }
    }
}

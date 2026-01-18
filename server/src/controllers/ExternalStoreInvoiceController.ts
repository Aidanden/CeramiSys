import { Request, Response } from 'express';
import prisma from '../models/prismaClient';
import CustomerAccountService from '../services/CustomerAccountService';
import { TreasuryController } from './TreasuryController';

interface InvoiceLineInput {
    productId: number;
    qty: number;
    unitPrice: number;
    subTotal?: number;
}

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

            const { lines, notes } = req.body as { lines: InvoiceLineInput[]; notes?: string };

            if (!Array.isArray(lines) || lines.length === 0) {
                return res.status(400).json({ error: 'Invoice lines are required' });
            }

            // التحقق من أن جميع المنتجات مربوطة بالمحل
            const productIds = lines.map(line => line.productId);
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
            const invoiceLines = lines.map((line) => {
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
            const { lines, notes } = req.body as { lines: InvoiceLineInput[]; notes?: string };

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
            let total = 0;
            const invoiceLines = lines.map((line) => {
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
     * تحديث الفاتورة من قبل المسؤول (قبل الموافقة)
     */
    async adminUpdateInvoice(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { lines, notes } = req.body as { lines: InvoiceLineInput[]; notes?: string };

            // التحقق من وجود الفاتورة وأنها معلقة
            const existingInvoice = await prisma.externalStoreInvoice.findUnique({
                where: { id: Number(id) },
            });

            if (!existingInvoice) {
                return res.status(404).json({ error: 'Invoice not found' });
            }

            if (existingInvoice.status !== 'PENDING') {
                return res.status(400).json({ error: 'Can only update pending invoices' });
            }

            // حساب الإجمالي الجديد
            let total = 0;
            const invoiceLines = lines.map((line) => {
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
                    store: true,
                    lines: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

            return res.json(invoice);
        } catch (error: any) {
            console.error('Error admin updating invoice:', error);
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
            const result = await prisma.$transaction(async (tx: any) => {
                // 1. إنشاء فاتورة مبيعات آجلة للعميل المرتبط بالمحل
                const sale = await tx.sale.create({
                    data: {
                        companyId: userCompanyId || 1, // شركة التقازي الرئيسية
                        customerId: invoice.store.customerId, // العميل المرتبط بالمحل
                        invoiceNumber: `EXT-${invoice.store.id}-${invoice.id}`,
                        saleType: 'CREDIT', // آجلة
                        paymentMethod: null,
                        total: invoice.total,
                        paidAmount: 0,
                        remainingAmount: invoice.total,
                        isFullyPaid: false,
                        status: 'APPROVED', // معتمدة تلقائياً
                        notes: `فاتورة محل خارجي: ${invoice.store.name} - رقم الفاتورة: ${invoice.invoiceNumber || invoice.id}`,
                        approvedBy: userId,
                        approvedAt: new Date(),
                    },
                });

                // 2. إنشاء بنود فاتورة المبيعات وخصم المخزون
                for (const line of invoice.lines) {
                    // أ. إنشاء بند الفاتورة
                    await tx.saleLine.create({
                        data: {
                            saleId: sale.id,
                            productId: line.productId,
                            qty: line.qty,
                            unitPrice: line.unitPrice,
                            subTotal: line.subTotal,
                        },
                    });

                    // ب. خصم الكمية من المخزون
                    const stockCompanyId = userCompanyId || 1;
                    const qtyToDecrement = Number(line.qty);

                    await tx.stock.upsert({
                        where: {
                            companyId_productId: {
                                companyId: stockCompanyId,
                                productId: line.productId,
                            }
                        },
                        update: {
                            boxes: { decrement: qtyToDecrement }
                        },
                        create: {
                            companyId: stockCompanyId,
                            productId: line.productId,
                            boxes: -qtyToDecrement
                        }
                    });
                }

                // 3. إنشاء أمر صرف مرتبط بالفاتورة
                const dispatchOrder = await tx.dispatchOrder.create({
                    data: {
                        saleId: sale.id,
                        companyId: userCompanyId || 1,
                        status: 'PENDING',
                        notes: `أمر صرف تلقائي - محل: ${invoice.store.name} - فاتورة: ${invoice.invoiceNumber || invoice.id}`,
                    },
                });

                // 4. تحديث حالة فاتورة المحل وربطها بالبيانات المنشأة
                const updatedInvoice = await tx.externalStoreInvoice.update({
                    where: { id: Number(id) },
                    data: {
                        status: 'APPROVED',
                        reviewedAt: new Date(),
                        reviewedBy: userId,
                        saleId: sale.id,
                        dispatchOrderId: dispatchOrder.id
                    } as any, // Cast to any because Prisma types might not be updated yet
                    include: {
                        store: true,
                        lines: {
                            include: {
                                product: true,
                            },
                        },
                    },
                });

                return {
                    invoice: updatedInvoice,
                    sale,
                    dispatchOrder,
                };
            });

            // 5. تسجيل قيد محاسبي في حساب العميل (خارج الـ transaction لتجنب التعليق)
            if (result.invoice.store.customerId) {
                try {
                    await CustomerAccountService.createAccountEntry({
                        customerId: result.invoice.store.customerId,
                        transactionType: 'DEBIT', // عليه - زيادة في دين العميل
                        amount: Number(result.invoice.total),
                        referenceType: 'SALE',
                        referenceId: result.sale.id,
                        description: `فاتورة مبيعات آجلة (محل خارجي) رقم ${result.sale.invoiceNumber || result.sale.id}`,
                        transactionDate: new Date()
                    });
                } catch (accError) {
                    console.error('Error creating customer account entry for external invoice:', accError);
                }
            }

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
            const { reason } = req.body as { reason?: string };
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
                where.storeId = (req as StoreAuthRequest).storeUser!.storeId;
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
            console.log(`🔍 Fetching available products for store: ${storeId}`);

            // 1. Get the configured company ID for external stores from settings
            const externalStoreCompanyIdStr = await prisma.globalSettings.findUnique({
                where: { key: 'EXTERNAL_STORE_COMPANY_ID' }
            });

            // Default to company 1 (Al-Taqazi) if not set
            const targetCompanyId = externalStoreCompanyIdStr ? parseInt(externalStoreCompanyIdStr.value) : 1;
            console.log(`📍 Using company ID for filtering: ${targetCompanyId}`);

            // 2. Get the list of products assigned to this store
            const storeProducts = await prisma.externalStoreProduct.findMany({
                where: { storeId: storeId },
                select: { productId: true }
            });

            const productIds = storeProducts.map(sp => sp.productId);
            console.log(`📦 Assigned product IDs count: ${productIds.length}`);

            if (productIds.length === 0) {
                return res.json([]);
            }

            // 3. Fetch products with updated data, specifically for the target company
            const products = await prisma.product.findMany({
                where: {
                    id: { in: productIds }
                },
                include: {
                    stocks: {
                        where: { companyId: targetCompanyId },
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
                        where: { companyId: targetCompanyId },
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

            console.log(`✨ Successfully fetched ${products.length} products`);

            // 4. Format the data for the frontend
            const formattedProducts = products.map(product => {
                // Determine stock and price for the target company
                const stock = product.stocks[0];
                const price = product.prices[0];

                return {
                    productId: product.id,
                    storeId: storeId,
                    product: {
                        id: product.id,
                        sku: product.sku,
                        name: product.name,
                        unit: product.unit,
                        unitsPerBox: product.unitsPerBox,
                        // Provide current stock and price based on configured company
                        currentStock: stock ? Number(stock.boxes) : 0,
                        sellPrice: price ? Number(price.sellPrice) : 0,
                        // Keep original arrays for flexibility if needed
                        stocks: product.stocks,
                        prices: product.prices
                    }
                };
            });

            return res.json(formattedProducts);
        } catch (error: any) {
            console.error('❌ Error fetching available products:', error);
            return res.status(500).json({ error: 'Failed to fetch products', details: error.message });
        }
    }
}

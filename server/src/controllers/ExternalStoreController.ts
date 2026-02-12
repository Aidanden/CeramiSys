import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../models/prismaClient';

export class ExternalStoreController {
    /**
     * الحصول على قائمة المحلات الخارجية
     */
    async getStores(req: Request, res: Response) {
        try {
            const { page = 1, limit = 10, search = '', isActive } = req.query;

            const skip = (Number(page) - 1) * Number(limit);

            const where: any = {};

            if (search) {
                where.OR = [
                    { name: { contains: search as string, mode: 'insensitive' } },
                    { ownerName: { contains: search as string, mode: 'insensitive' } },
                    { phone1: { contains: search as string } },
                ];
            }

            if (isActive !== undefined) {
                where.isActive = isActive === 'true';
            }

            const [stores, total] = await Promise.all([
                prisma.externalStore.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    include: {
                        customer: {
                            select: {
                                id: true,
                                name: true,
                            }
                        },
                        _count: {
                            select: {
                                users: true,
                                productAssignments: true,
                                invoices: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.externalStore.count({ where }),
            ]);

            res.json({
                stores,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        } catch (error: any) {
            console.error('Error fetching stores:', error);
            res.status(500).json({ error: 'Failed to fetch stores', details: error.message });
        }
    }

    /**
     * تحديث بيانات مستخدم المحل
     */
    async updateStoreUser(req: Request, res: Response) {
        try {
            const { id, userId } = req.params;
            const { username, password, isActive } = req.body;

            const storeId = Number(id);

            // التأكد من أن المستخدم موجود ويتبع نفس المحل
            const user = await prisma.externalStoreUser.findUnique({
                where: { id: userId },
            });

            if (!user || user.storeId !== storeId) {
                return res.status(404).json({ error: 'Store user not found' });
            }

            const data: any = {};

            if (username && username !== user.username) {
                const existingUser = await prisma.externalStoreUser.findFirst({
                    where: {
                        username,
                        NOT: { id: userId },
                    },
                });

                if (existingUser) {
                    return res.status(400).json({ error: 'Username already exists' });
                }

                data.username = username;
            }

            if (typeof isActive === 'boolean') {
                data.isActive = isActive;
            }

            if (password) {
                data.password = await bcrypt.hash(password, 10);
            }

            if (Object.keys(data).length === 0) {
                return res.status(400).json({ error: 'No changes provided' });
            }

            const updatedUser = await prisma.externalStoreUser.update({
                where: { id: userId },
                data,
                select: {
                    id: true,
                    username: true,
                    isActive: true,
                    lastLogin: true,
                    createdAt: true,
                },
            });

            return res.json(updatedUser);
        } catch (error: any) {
            console.error('Error updating store user:', error);
            return res.status(500).json({ error: 'Failed to update store user', details: error.message });
        }
    }

    /**
     * الحصول على محل واحد
     */
    async getStoreById(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const store = await prisma.externalStore.findUnique({
                where: { id: Number(id) },
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            address: true,
                        }
                    },
                    users: {
                        select: {
                            id: true,
                            username: true,
                            isActive: true,
                            lastLogin: true,
                            createdAt: true,
                        },
                    },
                    productAssignments: {
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
                    _count: {
                        select: {
                            invoices: true,
                        },
                    },
                },
            });

            if (!store) {
                return res.status(404).json({ error: 'Store not found' });
            }

            return res.json(store);
        } catch (error: any) {
            console.error('Error fetching store:', error);
            return res.status(500).json({ error: 'Failed to fetch store', details: error.message });
        }
    }

    /**
     * إنشاء محل جديد
     */
    async createStore(req: Request, res: Response) {
        try {
            const { name, ownerName, phone1, phone2, address, googleMapsUrl, showPrices, customerId } = req.body;

            // التحقق من البيانات المطلوبة
            if (!name || !ownerName || !phone1) {
                return res.status(400).json({ error: 'Name, owner name, and phone1 are required' });
            }

            // استخدام transaction لضمان ربط / إنشاء العميل والمحل معاً
            const result = await prisma.$transaction(async (tx) => {
                console.log('🔄 Starting transaction for store:', name);

                let finalCustomerId = customerId;

                // إذا لم يتم توفير رقم عميل، نقوم بإنشاء عميل جديد تلقائياً (السلوك القديم)
                if (!finalCustomerId) {
                    const customer = await tx.customer.create({
                        data: {
                            name,
                            phone: phone1,
                            phone2: phone2 || undefined,
                            address: address || undefined,
                            notes: `عميل تابع لمحل خارجي: ${name}`,
                        },
                    });
                    finalCustomerId = customer.id;
                    console.log(`✅ New customer created: ${finalCustomerId}`);
                } else {
                    console.log(`✅ Using existing customer: ${finalCustomerId}`);
                }

                // 2. إنشاء المحل وربطه بالعميل
                const store = await tx.externalStore.create({
                    data: {
                        name,
                        ownerName,
                        phone1,
                        phone2,
                        address,
                        googleMapsUrl,
                        customerId: finalCustomerId,
                        showPrices: showPrices !== undefined ? showPrices : true,
                    },
                    include: {
                        customer: true
                    }
                });

                console.log(`✅ External store created: ${store.id}`);

                return store;
            });

            console.log('✨ Transaction completed successfully');

            return res.status(201).json(result);
        } catch (error: any) {
            console.error('❌ Error creating store:', error);
            return res.status(500).json({
                error: 'Failed to create store',
                message: error.message,
            });
        }
    }

    /**
     * تحديث محل
     */
    async updateStore(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, ownerName, phone1, phone2, address, googleMapsUrl, isActive, showPrices, customerId } = req.body;

            const store = await prisma.externalStore.update({
                where: { id: Number(id) },
                data: {
                    name,
                    ownerName,
                    phone1,
                    phone2,
                    address,
                    googleMapsUrl,
                    isActive,
                    showPrices,
                    customerId: customerId ? Number(customerId) : undefined,
                },
                include: {
                    customer: true
                }
            });

            return res.json(store);
        } catch (error: any) {
            console.error('Error updating store:', error);
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Store not found' });
            }
            return res.status(500).json({ error: 'Failed to update store', details: error.message });
        }
    }

    /**
     * حذف محل (soft delete)
     */
    async deleteStore(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const store = await prisma.externalStore.update({
                where: { id: Number(id) },
                data: { isActive: false },
            });

            return res.json({ message: 'Store deactivated successfully', store });
        } catch (error: any) {
            console.error('Error deleting store:', error);
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Store not found' });
            }
            return res.status(500).json({ error: 'Failed to delete store', details: error.message });
        }
    }

    /**
     * إنشاء مستخدم للمحل
     */
    async createStoreUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }

            // التحقق من وجود المحل
            const store = await prisma.externalStore.findUnique({
                where: { id: Number(id) },
            });

            if (!store) {
                return res.status(404).json({ error: 'Store not found' });
            }

            // التحقق من عدم وجود اسم المستخدم
            const existingUser = await prisma.externalStoreUser.findUnique({
                where: { username },
            });

            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            // تشفير كلمة المرور
            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await prisma.externalStoreUser.create({
                data: {
                    storeId: Number(id),
                    username,
                    password: hashedPassword,
                },
                select: {
                    id: true,
                    username: true,
                    isActive: true,
                    createdAt: true,
                },
            });

            return res.status(201).json(user);
        } catch (error: any) {
            console.error('Error creating store user:', error);
            return res.status(500).json({ error: 'Failed to create store user', details: error.message });
        }
    }

    /**
     * ربط منتجات بالمحل
     */
    async assignProducts(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const storeId = Number(id);
            const { productIds } = req.body;

            if (!Array.isArray(productIds)) {
                return res.status(400).json({ error: 'Product IDs array is required' });
            }

            // 1. Get the configured company ID (Warehouse)
            const externalStoreCompanyIdStr = await prisma.globalSettings.findUnique({
                where: { key: 'EXTERNAL_STORE_COMPANY_ID' }
            });
            const targetCompanyId = externalStoreCompanyIdStr ? parseInt(externalStoreCompanyIdStr.value) : 1;

            // 2. Wrap in transaction
            await prisma.$transaction(async (tx) => {
                // Get current assignments
                const currentAssignments = await tx.externalStoreProduct.findMany({
                    where: { storeId }
                });
                const currentProductIds = currentAssignments.map(a => a.productId);

                // IDs to add
                const toAdd = productIds.filter(pid => !currentProductIds.includes(pid));
                // IDs to remove
                const toRemove = currentProductIds.filter(pid => !productIds.includes(pid));

                // Process Additions
                for (const productId of toAdd) {
                    // Deduct 1 from warehouse stock
                    const stock = await tx.stock.findUnique({
                        where: { companyId_productId: { companyId: targetCompanyId, productId } }
                    });

                    if (stock) {
                        // Only decrement if we have something, else keep it non-negative
                        const currentBoxes = Number(stock.boxes);
                        await tx.stock.update({
                            where: { id: stock.id },
                            data: { boxes: Math.max(0, currentBoxes - 1) }
                        });
                    } else {
                        // If stock record doesn't exist, start at 0
                        await tx.stock.create({
                            data: {
                                companyId: targetCompanyId,
                                productId,
                                boxes: 0
                            }
                        });
                    }

                    // Create ExternalStoreProduct with qty 1
                    await tx.externalStoreProduct.create({
                        data: { storeId, productId, quantity: 1 }
                    });
                }

                // Process Removals
                for (const productId of toRemove) {
                    const assignment = currentAssignments.find(a => a.productId === productId);
                    if (assignment) {
                        // Return qty to warehouse stock
                        await tx.stock.updateMany({
                            where: { companyId: targetCompanyId, productId },
                            data: { boxes: { increment: assignment.quantity } }
                        });
                        // Delete assignment
                        await tx.externalStoreProduct.delete({
                            where: { id: assignment.id }
                        });
                    }
                }
            });

            return res.json({ message: 'تم ربط المتاحف بنجاح وتحديث المخزون' });
        } catch (error: any) {
            console.error('Error assigning products:', error);
            return res.status(500).json({ error: 'Failed to assign products', details: error.message });
        }
    }

    /**
     * الحصول على منتجات المحل
     */
    async getStoreProducts(req: Request, res: Response) {
        try {
            const { id } = req.params;

            // 1. Get the configured company ID for external stores from settings
            const externalStoreCompanyIdStr = await prisma.globalSettings.findUnique({
                where: { key: 'EXTERNAL_STORE_COMPANY_ID' }
            });

            // Default to company 1 (Al-Taqazi) if not set
            const targetCompanyId = externalStoreCompanyIdStr ? parseInt(externalStoreCompanyIdStr.value) : 1;
            console.log(`📍 Fetching store products using company ID: ${targetCompanyId}`);

            const products = await prisma.externalStoreProduct.findMany({
                where: { storeId: Number(id) },
                include: {
                    product: {
                        include: {
                            stocks: {
                                where: {
                                    companyId: targetCompanyId,
                                },
                            },
                            prices: {
                                where: {
                                    companyId: targetCompanyId,
                                },
                            },
                        },
                    },
                },
            });

            res.json(products);
        } catch (error: any) {
            console.error('Error fetching store products:', error);
            res.status(500).json({ error: 'Failed to fetch store products', details: error.message });
        }
    }

    /**
     * إزالة منتج من المحل
     */
    async removeProduct(req: Request, res: Response) {
        try {
            const { id, productId } = req.params;

            await prisma.externalStoreProduct.deleteMany({
                where: {
                    storeId: Number(id),
                    productId: Number(productId),
                },
            });

            res.json({ message: 'Product removed successfully' });
        } catch (error: any) {
            console.error('Error removing product:', error);
            res.status(500).json({ error: 'Failed to remove product', details: error.message });
        }
    }
}

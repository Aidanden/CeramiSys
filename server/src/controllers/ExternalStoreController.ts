import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
            const { name, ownerName, phone1, phone2, address, googleMapsUrl } = req.body;

            // التحقق من البيانات المطلوبة
            if (!name || !ownerName || !phone1) {
                return res.status(400).json({ error: 'Name, owner name, and phone1 are required' });
            }

            const store = await prisma.externalStore.create({
                data: {
                    name,
                    ownerName,
                    phone1,
                    phone2,
                    address,
                    googleMapsUrl,
                },
            });

            return res.status(201).json(store);
        } catch (error: any) {
            console.error('Error creating store:', error);
            return res.status(500).json({ error: 'Failed to create store', details: error.message });
        }
    }

    /**
     * تحديث محل
     */
    async updateStore(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, ownerName, phone1, phone2, address, googleMapsUrl, isActive } = req.body;

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
                },
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
            const { productIds } = req.body;

            if (!Array.isArray(productIds) || productIds.length === 0) {
                return res.status(400).json({ error: 'Product IDs array is required' });
            }

            // التحقق من وجود المحل
            const store = await prisma.externalStore.findUnique({
                where: { id: Number(id) },
            });

            if (!store) {
                return res.status(404).json({ error: 'Store not found' });
            }

            // حذف الربط القديم وإنشاء الجديد
            await prisma.externalStoreProduct.deleteMany({
                where: { storeId: Number(id) },
            });

            const assignments = await prisma.externalStoreProduct.createMany({
                data: productIds.map((productId: number) => ({
                    storeId: Number(id),
                    productId,
                })),
                skipDuplicates: true,
            });

            return res.json({ message: 'Products assigned successfully', count: assignments.count });
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

            const products = await prisma.externalStoreProduct.findMany({
                where: { storeId: Number(id) },
                include: {
                    product: {
                        include: {
                            stocks: {
                                where: {
                                    company: {
                                        code: 'TAQAZI', // شركة التقازي
                                    },
                                },
                            },
                            prices: {
                                where: {
                                    company: {
                                        code: 'TAQAZI',
                                    },
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

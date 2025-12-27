import prisma from '../models/prismaClient';

export class ProductGroupService {
    private prisma = prisma;

    async getProductGroups() {
        return await this.prisma.productGroup.findMany({
            include: {
                _count: {
                    select: { products: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    async getProductGroupById(id: number) {
        return await this.prisma.productGroup.findUnique({
            where: { id },
            include: {
                products: {
                    select: {
                        id: true,
                        name: true,
                        sku: true
                    }
                }
            }
        });
    }

    async createProductGroup(data: { name: string; maxDiscountPercentage: number }) {
        const existing = await this.prisma.productGroup.findUnique({
            where: { name: data.name }
        });

        if (existing) {
            throw new Error('مجموعة المنتجات موجودة بالفعل');
        }

        return await this.prisma.productGroup.create({
            data: {
                name: data.name,
                maxDiscountPercentage: data.maxDiscountPercentage
            }
        });
    }

    async updateProductGroup(id: number, data: { name?: string; maxDiscountPercentage?: number }) {
        if (data.name) {
            const existing = await this.prisma.productGroup.findFirst({
                where: {
                    name: data.name,
                    id: { not: id }
                }
            });

            if (existing) {
                throw new Error('اسم مجموعة المنتجات مستخدم بالفعل');
            }
        }

        return await this.prisma.productGroup.update({
            where: { id },
            data
        });
    }

    async deleteProductGroup(id: number) {
        const group = await this.prisma.productGroup.findUnique({
            where: { id },
            include: { products: true }
        });

        if (!group) {
            throw new Error('المجموعة غير موجودة');
        }

        if (group.products.length > 0) {
            throw new Error('لا يمكن حذف المجموعة لأنها تحتوي على منتجات مرتبطة');
        }

        return await this.prisma.productGroup.delete({
            where: { id }
        });
    }

    /**
     * تعيين أصناف متعددة لمجموعة
     */
    async assignProductsToGroup(groupId: number, productIds: number[]) {
        // التحقق من وجود المجموعة
        const group = await this.prisma.productGroup.findUnique({
            where: { id: groupId }
        });

        if (!group) {
            throw new Error('المجموعة غير موجودة');
        }

        // تحديث جميع الأصناف المحددة
        const result = await this.prisma.product.updateMany({
            where: {
                id: { in: productIds }
            },
            data: {
                groupId: groupId
            }
        });

        return {
            updatedCount: result.count,
            groupId: groupId,
            groupName: group.name
        };
    }

    /**
     * إزالة أصناف من المجموعة
     */
    async removeProductsFromGroup(productIds: number[]) {
        const result = await this.prisma.product.updateMany({
            where: {
                id: { in: productIds }
            },
            data: {
                groupId: null
            }
        });

        return {
            updatedCount: result.count
        };
    }

    /**
     * جلب جميع الأصناف مع حالة المجموعة
     */
    async getProductsWithGroupStatus(groupId?: number) {
        const products = await this.prisma.product.findMany({
            select: {
                id: true,
                sku: true,
                name: true,
                groupId: true,
                createdByCompany: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        return products.map(p => ({
            ...p,
            isInGroup: groupId ? p.groupId === groupId : false,
            companyName: p.createdByCompany.name
        }));
    }
}

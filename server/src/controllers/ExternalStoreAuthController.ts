import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../models/prismaClient';

// تعريف نوع المستخدم للـ Request
interface StoreAuthRequest extends Request {
    storeUser?: {
        id: string;
        storeId: number;
        username: string;
    };
}

export class ExternalStoreAuthController {
    /**
     * تسجيل دخول مستخدم المحل
     */
    async login(req: Request, res: Response) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }

            // البحث عن المستخدم
            const user = await prisma.externalStoreUser.findUnique({
                where: { username },
                include: {
                    store: true,
                },
            });

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // التحقق من أن المستخدم نشط
            if (!user.isActive) {
                return res.status(403).json({ 
                    error: 'ACCOUNT_DEACTIVATED',
                    message: 'الحساب غير نشط. يرجى التواصل مع شركة التقازي.' 
                });
            }

            // التحقق من أن المحل نشط
            if (!user.store.isActive) {
                return res.status(403).json({ 
                    error: 'STORE_DEACTIVATED',
                    message: 'المحل غير نشط. يرجى التواصل مع شركة التقازي للتفعيل.' 
                });
            }

            // التحقق من القفل
            if (user.lockedUntil && user.lockedUntil > new Date()) {
                return res.status(403).json({
                    error: 'Account is locked',
                    lockedUntil: user.lockedUntil,
                });
            }

            // التحقق من كلمة المرور
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                // زيادة عدد المحاولات الفاشلة
                const loginAttempts = user.loginAttempts + 1;
                const updateData: any = { loginAttempts };

                // قفل الحساب بعد 5 محاولات فاشلة
                if (loginAttempts >= 5) {
                    updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 دقيقة
                }

                await prisma.externalStoreUser.update({
                    where: { id: user.id },
                    data: updateData,
                });

                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // إنشاء التوكن
            const token = jwt.sign(
                {
                    id: user.id,
                    storeId: user.storeId,
                    username: user.username,
                    type: 'store',
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '7d' }
            );

            // إنشاء جلسة
            const session = await prisma.externalStoreSession.create({
                data: {
                    userId: user.id,
                    token,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 أيام
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                },
            });

            // تحديث آخر تسجيل دخول وإعادة تعيين المحاولات
            await prisma.externalStoreUser.update({
                where: { id: user.id },
                data: {
                    lastLogin: new Date(),
                    loginAttempts: 0,
                    lockedUntil: null,
                },
            });

            return res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    storeId: user.storeId,
                    storeName: user.store.name,
                },
            });
        } catch (error: any) {
            return res.status(500).json({ error: 'LOGIN_FAILED', message: 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.' });
        }
    }

    /**
     * تسجيل الخروج
     */
    async logout(req: StoreAuthRequest, res: Response) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');

            if (token) {
                await prisma.externalStoreSession.updateMany({
                    where: { token },
                    data: { isActive: false },
                });
            }

            res.json({ message: 'Logged out successfully' });
        } catch (error: any) {
            res.status(500).json({ error: 'LOGOUT_FAILED', message: 'فشل تسجيل الخروج' });
        }
    }

    /**
     * الحصول على معلومات المستخدم الحالي
     * يُرجع البيانات بنفس بنية login response لضمان التوافق
     */
    async getCurrentUser(req: StoreAuthRequest, res: Response) {
        try {
            if (!req.storeUser) {
                return res.status(401).json({ error: 'NOT_AUTHENTICATED', message: 'غير مصادق' });
            }

            const user = await prisma.externalStoreUser.findUnique({
                where: { id: req.storeUser.id },
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
                },
            });

            if (!user) {
                return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'المستخدم غير موجود' });
            }

            // إرجاع البيانات بنفس بنية login response
            return res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    storeId: user.storeId,
                    storeName: user.store.name,
                },
                store: {
                    id: user.store.id,
                    name: user.store.name,
                    ownerName: user.store.ownerName,
                    phone1: user.store.phone1,
                    address: user.store.address,
                },
            });
        } catch (error: any) {
            return res.status(500).json({ error: 'FETCH_USER_FAILED', message: 'فشل جلب بيانات المستخدم' });
        }
    }

    /**
     * تغيير كلمة المرور
     */
    async changePassword(req: StoreAuthRequest, res: Response) {
        try {
            if (!req.storeUser) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Current and new passwords are required' });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'New password must be at least 6 characters' });
            }

            // الحصول على المستخدم
            const user = await prisma.externalStoreUser.findUnique({
                where: { id: req.storeUser.id },
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // التحقق من كلمة المرور الحالية
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            // تشفير كلمة المرور الجديدة
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // تحديث كلمة المرور
            await prisma.externalStoreUser.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            });

            return res.json({ message: 'Password changed successfully' });
        } catch (error: any) {
            console.error('Error changing password:', error);
            return res.status(500).json({ error: 'Failed to change password', details: error.message });
        }
    }

    /**
     * نسيت كلمة المرور (placeholder)
     */
    async forgotPassword(req: Request, res: Response) {
        try {
            const { username } = req.body;

            if (!username) {
                return res.status(400).json({ error: 'Username is required' });
            }

            // التحقق من وجود المستخدم
            const user = await prisma.externalStoreUser.findUnique({
                where: { username },
            });

            if (!user) {
                // لا نكشف عن عدم وجود المستخدم لأسباب أمنية
                return res.json({ message: 'If the username exists, password reset instructions will be sent' });
            }

            // TODO: إرسال بريد إلكتروني أو رسالة نصية
            // في الوقت الحالي، نعيد رسالة عامة

            return res.json({
                message: 'Password reset feature is not yet implemented. Please contact the administrator.',
            });
        } catch (error: any) {
            console.error('Error in forgot password:', error);
            return res.status(500).json({ error: 'Failed to process request', details: error.message });
        }
    }
}

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import prisma from '../models/prismaClient';
import { AuthRequest } from '../middleware/auth';

// الحصول على جميع المستخدمين
const normalizePermissions = (permissions: any): string[] => {
  if (!permissions) return [];
  if (Array.isArray(permissions)) {
    return permissions.filter(p => typeof p === 'string' && p.trim().length > 0);
  }
  if (typeof permissions === 'object') {
    return Object.values(permissions).filter(p => typeof p === 'string' && p.trim().length > 0) as string[];
  }
  return [];
};

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      IsActive: true,
      // عرض المستخدمين النشطين فقط
    };

    if (search) {
      where.OR = [
        { UserName: { contains: search as string, mode: 'insensitive' } },
        { FullName: { contains: search as string, mode: 'insensitive' } },
        { Email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (role && role !== 'all') {
      where.RoleID = role;
    }

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        include: {
          Role: true,
          Company: true
        },
        skip,
        take: Number(limit),
        orderBy: { CreatedAt: 'desc' }
      }),
      prisma.users.count({ where })
    ]);

    const usersData = users.map(user => {
      const customPermissions = normalizePermissions((user as any).Permissions);
      const rolePermissions = normalizePermissions(user.Role?.Permissions);
      const permissions = customPermissions.length > 0 ? customPermissions : rolePermissions;

      return {
        id: user.UserID,
        username: user.UserName,
        fullName: user.FullName,
        email: user.Email,
        phone: user.Phone,
        role: user.Role?.RoleName || null,
        roleId: user.RoleID,
        roleName: user.Role?.DisplayName || null,
        permissions,
        hasCustomPermissions: customPermissions.length > 0,
        companyId: user.CompanyID,
        companyName: user.IsSystemUser ? 'مستخدم نظام' : (user.Company?.name || 'غير محدد'),
        isSystemUser: user.IsSystemUser,
        isActive: user.IsActive,
        lastLogin: user.LastLogin,
        createdAt: user.CreatedAt
      };
    });

    res.json({
      success: true,
      data: {
        users: usersData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على المستخدمين:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

// إضافة مستخدم جديد
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, fullName, email, phone, password, roleId, permissions, companyId, isSystemUser = false, isActive = true } = req.body;

    const userPermissions = normalizePermissions(permissions);

    if (!username || !fullName || !password) {
      res.status(400).json({
        success: false,
        message: 'اسم المستخدم والاسم الكامل وكلمة المرور مطلوبة'
      });
      return;
    }

    if (!roleId && userPermissions.length === 0) {
      res.status(400).json({
        success: false,
        message: 'يجب تحديد دور أو صلاحيات للشاشات'
      });
      return;
    }

    // التحقق من عدم وجود اسم المستخدم
    const existingUser = await prisma.users.findUnique({
      where: { UserName: username }
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'اسم المستخدم موجود بالفعل'
      });
      return;
    }

    // التحقق من عدم وجود البريد الإلكتروني (فقط إذا كان موجوداً وغير فارغ)
    if (email && email.trim() !== '') {
      const existingEmail = await prisma.users.findUnique({
        where: { Email: email }
      });

      if (existingEmail) {
        res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني موجود بالفعل'
        });
        return;
      }
    }

    // التحقق من وجود الدور
    let role = null;
    if (roleId) {
      role = await prisma.userRoles.findUnique({
        where: { RoleID: roleId }
      });

      if (!role) {
        res.status(400).json({
          success: false,
          message: 'الدور المحدد غير موجود'
        });
        return;
      }
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 12);

    // تحديد الشركة
    let finalCompanyId;

    if (isSystemUser) {
      // مستخدم نظام - يمكن أن يكون له أي شركة أو الشركة الافتراضية
      // إذا لم يتم تحديد companyId، نستخدم الشركة الافتراضية
      finalCompanyId = companyId || req.user?.companyId || 1;
    } else {
      // للمستخدمين العاديين، الشركة مطلوبة
      if (!companyId) {
        res.status(400).json({
          success: false,
          message: 'الشركة مطلوبة للمستخدمين العاديين'
        });
        return;
      }

      finalCompanyId = companyId;

      // التحقق من وجود الشركة للمستخدمين العاديين
      const company = await prisma.company.findUnique({
        where: { id: finalCompanyId }
      });

      if (!company) {
        res.status(400).json({
          success: false,
          message: 'الشركة المحددة غير موجودة'
        });
        return;
      }
    }

    // إنشاء المستخدم
    const newUser = await prisma.users.create({
      data: {
        UserName: username,
        FullName: fullName,
        Email: email && email.trim() !== '' ? email : null, // تعيين null إذا كان email فارغ
        Phone: phone,
        Password: hashedPassword,
        RoleID: roleId || null,
        CompanyID: finalCompanyId,
        IsSystemUser: isSystemUser,
        IsActive: isActive,
        Permissions: userPermissions.length > 0 ? userPermissions : Prisma.DbNull
      }
    });

    const effectivePermissions = userPermissions.length > 0
      ? userPermissions
      : normalizePermissions(role?.Permissions);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      data: {
        id: newUser.UserID,
        username: newUser.UserName,
        fullName: newUser.FullName,
        email: newUser.Email,
        phone: newUser.Phone,
        role: role?.RoleName || null,
        roleId: role?.RoleID || null,
        roleName: role?.DisplayName || null,
        permissions: effectivePermissions,
        isActive: newUser.IsActive,
        createdAt: newUser.CreatedAt
      }
    });

  } catch (error) {
    console.error('خطأ في إنشاء المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

// تحديث مستخدم
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { username, fullName, email, phone, roleId, permissions, isActive } = req.body;

    const userPermissions = permissions !== undefined ? normalizePermissions(permissions) : undefined;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب'
      });
      return;
    }

    // التحقق من وجود المستخدم
    const existingUser = await prisma.users.findUnique({
      where: { UserID: id }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
      return;
    }

    // التحقق من عدم وجود اسم المستخدم (إذا تم تغييره)
    if (username && username !== existingUser.UserName) {
      const duplicateUsername = await prisma.users.findUnique({
        where: { UserName: username }
      });

      if (duplicateUsername) {
        res.status(400).json({
          success: false,
          message: 'اسم المستخدم موجود بالفعل'
        });
        return;
      }
    }

    // التحقق من عدم وجود البريد الإلكتروني (إذا تم تغييره)
    if (email && email !== existingUser.Email) {
      const duplicateEmail = await prisma.users.findUnique({
        where: { Email: email }
      });

      if (duplicateEmail) {
        res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني موجود بالفعل'
        });
        return;
      }
    }

    // التحقق من وجود الدور (إذا تم تغييره)
    if (roleId) {
      const role = await prisma.userRoles.findUnique({
        where: { RoleID: roleId }
      });

      if (!role) {
        res.status(400).json({
          success: false,
          message: 'الدور المحدد غير موجود'
        });
        return;
      }
    }

    // تحديث المستخدم
    const updatedUser = await prisma.users.update({
      where: { UserID: id },
      data: {
        ...(username && { UserName: username }),
        ...(fullName && { FullName: fullName }),
        ...(email !== undefined && { Email: email }),
        ...(phone !== undefined && { Phone: phone }),
        ...(roleId && { RoleID: roleId }),
        ...(isActive !== undefined && { IsActive: isActive }),
        ...(userPermissions !== undefined && { Permissions: userPermissions.length > 0 ? userPermissions : Prisma.DbNull })
      },
      include: {
        Role: true
      }
    });

    const effectivePermissions = userPermissions !== undefined
      ? (userPermissions.length > 0 ? userPermissions : normalizePermissions(updatedUser.Role?.Permissions))
      : (normalizePermissions((updatedUser as any).Permissions) || normalizePermissions(updatedUser.Role?.Permissions));

    res.json({
      success: true,
      message: 'تم تحديث المستخدم بنجاح',
      data: {
        id: updatedUser.UserID,
        username: updatedUser.UserName,
        fullName: updatedUser.FullName,
        email: updatedUser.Email,
        phone: updatedUser.Phone,
        role: updatedUser.Role?.RoleName || null,
        roleId: updatedUser.RoleID,
        roleName: updatedUser.Role?.DisplayName || null,
        permissions: effectivePermissions,
        isActive: updatedUser.IsActive,
        createdAt: updatedUser.CreatedAt
      }
    });

  } catch (error) {
    console.error('خطأ في تحديث المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

// حذف مستخدم
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب'
      });
      return;
    }

    // التحقق من وجود المستخدم
    const existingUser = await prisma.users.findUnique({
      where: { UserID: id }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
      return;
    }

    // منع حذف المستخدم الحالي
    if (req.user?.id === id) {
      res.status(400).json({
        success: false,
        message: 'لا يمكنك حذف حسابك الخاص'
      });
      return;
    }

    // تعطيل جلسات المستخدم
    await prisma.userSessions.updateMany({
      where: { UserID: id },
      data: { IsActive: false }
    });

    // تعطيل المستخدم بدلاً من حذفه
    await prisma.users.update({
      where: { UserID: id },
      data: { IsActive: false }
    });

    res.json({
      success: true,
      message: 'تم تعطيل المستخدم بنجاح'
    });

  } catch (error) {
    console.error('خطأ في حذف المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

// الحصول على الأدوار
export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const roles = await prisma.userRoles.findMany({
      where: { IsActive: true },
      orderBy: { DisplayName: 'asc' }
    });

    const rolesData = roles.map(role => ({
      id: role.RoleID,
      roleName: role.RoleName,
      displayName: role.DisplayName,
      permissions: role.Permissions as string[],
      description: role.Description
    }));

    res.json({
      success: true,
      data: rolesData
    });

  } catch (error) {
    console.error('خطأ في الحصول على الأدوار:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

// إنشاء دور جديد
export const createRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roleName, displayName, description, permissions } = req.body;

    if (!roleName || !displayName || !permissions || permissions.length === 0) {
      res.status(400).json({
        success: false,
        message: 'الرجاء إدخال جميع البيانات المطلوبة'
      });
      return;
    }

    // التحقق من عدم وجود دور بنفس الاسم
    const existingRole = await prisma.userRoles.findUnique({
      where: { RoleName: roleName }
    });

    if (existingRole) {
      res.status(400).json({
        success: false,
        message: 'يوجد دور بنفس الاسم مسبقاً'
      });
      return;
    }

    const newRole = await prisma.userRoles.create({
      data: {
        RoleName: roleName,
        DisplayName: displayName,
        Description: description,
        Permissions: permissions,
        IsActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الدور بنجاح',
      data: {
        id: newRole.RoleID,
        roleName: newRole.RoleName,
        displayName: newRole.DisplayName,
        permissions: newRole.Permissions as string[],
        description: newRole.Description
      }
    });

  } catch (error) {
    console.error('خطأ في إنشاء الدور:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

// تحديث دور
export const updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { displayName, description, permissions } = req.body;

    // التحقق من وجود الدور
    const role = await prisma.userRoles.findUnique({
      where: { RoleID: id }
    });

    if (!role) {
      res.status(404).json({
        success: false,
        message: 'الدور غير موجود'
      });
      return;
    }

    // منع تعديل دور الـ admin
    if (role.RoleName === 'admin') {
      res.status(403).json({
        success: false,
        message: 'لا يمكن تعديل دور المدير'
      });
      return;
    }

    const updatedRole = await prisma.userRoles.update({
      where: { RoleID: id },
      data: {
        DisplayName: displayName || role.DisplayName,
        Description: description !== undefined ? description : role.Description,
        Permissions: permissions || role.Permissions
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث الدور بنجاح',
      data: {
        id: updatedRole.RoleID,
        roleName: updatedRole.RoleName,
        displayName: updatedRole.DisplayName,
        permissions: updatedRole.Permissions as string[],
        description: updatedRole.Description
      }
    });

  } catch (error) {
    console.error('خطأ في تحديث الدور:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

// حذف دور
export const deleteRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // التحقق من وجود الدور
    const role = await prisma.userRoles.findUnique({
      where: { RoleID: id }
    });

    if (!role) {
      res.status(404).json({
        success: false,
        message: 'الدور غير موجود'
      });
      return;
    }

    // منع حذف دور الـ admin
    if (role.RoleName === 'admin') {
      res.status(403).json({
        success: false,
        message: 'لا يمكن حذف دور المدير'
      });
      return;
    }

    // التحقق من عدم وجود مستخدمين مرتبطين بهذا الدور
    const usersCount = await prisma.users.count({
      where: { RoleID: id }
    });

    if (usersCount > 0) {
      res.status(400).json({
        success: false,
        message: `لا يمكن حذف هذا الدور لأنه مرتبط بـ ${usersCount} مستخدم`
      });
      return;
    }

    await prisma.userRoles.delete({
      where: { RoleID: id }
    });

    res.json({
      success: true,
      message: 'تم حذف الدور بنجاح'
    });

  } catch (error) {
    console.error('خطأ في حذف الدور:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

// إعادة تعيين كلمة مرور المستخدم
export const resetUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!id || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'معرف المستخدم وكلمة المرور الجديدة مطلوبان'
      });
      return;
    }

    // التحقق من وجود المستخدم
    const existingUser = await prisma.users.findUnique({
      where: { UserID: id }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
      return;
    }

    // تشفير كلمة المرور الجديدة
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // تحديث كلمة المرور
    await prisma.users.update({
      where: { UserID: id },
      data: {
        Password: hashedPassword,
        PasswordChangedAt: new Date(),
        LoginAttempts: 0,
        LockedUntil: null
      }
    });

    // إلغاء تفعيل جميع جلسات المستخدم
    await prisma.userSessions.updateMany({
      where: { UserID: id },
      data: { IsActive: false }
    });

    res.json({
      success: true,
      message: 'تم إعادة تعيين كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('خطأ في إعادة تعيين كلمة المرور:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

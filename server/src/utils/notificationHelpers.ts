import { NotificationService } from '../services/NotificationService';
import { CreateNotificationRequest } from '../dto/notificationDto';

const notificationService = new NotificationService();

/**
 * تنسيق العملة بالدينار الليبي
 */
const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} د.ل`;
};

/**
 * Helper functions لإنشاء إشعارات مختلفة
 */

// إشعارات المبيعات
export const createSaleNotifications = {
  // إشعار إنشاء فاتورة مبيعات جديدة
  saleCreated: async (
    userId: string,
    saleId: string,
    customerName: string,
    total: number,
    companyId?: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'فاتورة مبيعات جديدة',
        message: `تم إنشاء فاتورة مبيعات جديدة للعميل ${customerName} بقيمة ${formatCurrency(total)}`,
        type: 'SALE',
        userId,
        companyId,
        entityType: 'sale',
        entityId: saleId,
        actionUrl: `/sales/${saleId}`
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار المبيعات:', error);
    }
  },

  // إشعار تحديث فاتورة مبيعات
  saleUpdated: async (
    userId: string,
    saleId: string,
    customerName: string,
    companyId?: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'تحديث فاتورة مبيعات',
        message: `تم تحديث فاتورة مبيعات العميل ${customerName}`,
        type: 'SALE',
        userId,
        companyId,
        entityType: 'sale',
        entityId: saleId,
        actionUrl: `/sales/${saleId}`
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار تحديث المبيعات:', error);
    }
  },

  // إشعار حذف فاتورة مبيعات
  saleDeleted: async (
    userId: string,
    customerName: string,
    total: number,
    companyId?: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'حذف فاتورة مبيعات',
        message: `تم حذف فاتورة مبيعات العميل ${customerName} بقيمة ${formatCurrency(total)}`,
        type: 'WARNING',
        userId,
        companyId,
        entityType: 'sale'
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار حذف المبيعات:', error);
    }
  }
};

// إشعارات المخزون
export const createStockNotifications = {
  // إشعار نفاد المخزون
  stockOut: async (
    userId: string,
    productName: string,
    productId: string,
    companyId?: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'نفاد المخزون',
        message: `نفد مخزون الصنف: ${productName}`,
        type: 'ERROR',
        userId,
        companyId,
        entityType: 'product',
        entityId: productId,
        actionUrl: `/products`
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار نفاد المخزون:', error);
    }
  },

  // إشعار انخفاض المخزون
  lowStock: async (
    userId: string,
    productName: string,
    currentStock: number,
    productId: string,
    companyId?: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'انخفاض المخزون',
        message: `مخزون الصنف ${productName} منخفض: ${currentStock} صندوق متبقي`,
        type: 'WARNING',
        userId,
        companyId,
        entityType: 'product',
        entityId: productId,
        actionUrl: `/products`
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار انخفاض المخزون:', error);
    }
  },

  // إشعار تحديث المخزون
  stockUpdated: async (
    userId: string,
    productName: string,
    newStock: number,
    productId: string,
    companyId?: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'تحديث المخزون',
        message: `تم تحديث مخزون الصنف ${productName} إلى ${newStock} صندوق`,
        type: 'SUCCESS',
        userId,
        companyId,
        entityType: 'product',
        entityId: productId,
        actionUrl: `/products`
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار تحديث المخزون:', error);
    }
  }
};

// إشعارات المستخدمين
export const createUserNotifications = {
  // إشعار إنشاء مستخدم جديد
  userCreated: async (
    userId: string,
    newUserName: string,
    newUserId: string,
    companyId?: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'مستخدم جديد',
        message: `تم إنشاء مستخدم جديد: ${newUserName}`,
        type: 'USER',
        userId,
        companyId,
        entityType: 'user',
        entityId: newUserId,
        actionUrl: `/users`
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار المستخدم الجديد:', error);
    }
  },

  // إشعار تسجيل دخول جديد
  userLogin: async (
    userId: string,
    userName: string,
    companyId?: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'تسجيل دخول جديد',
        message: `قام المستخدم ${userName} بتسجيل الدخول`,
        type: 'INFO',
        userId,
        companyId,
        entityType: 'user',
        entityId: userId
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار تسجيل الدخول:', error);
    }
  },

  // إشعار تحديث صلاحيات المستخدم
  userPermissionsUpdated: async (
    userId: string,
    targetUserName: string,
    targetUserId: string,
    companyId?: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'تحديث الصلاحيات',
        message: `تم تحديث صلاحيات المستخدم: ${targetUserName}`,
        type: 'USER',
        userId,
        companyId,
        entityType: 'user',
        entityId: targetUserId,
        actionUrl: `/users`
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار تحديث الصلاحيات:', error);
    }
  }
};

// إشعارات النظام
export const createSystemNotifications = {
  // إشعار نسخ احتياطي
  backupCreated: async (
    userId: string,
    companyId?: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'نسخة احتياطية جديدة',
        message: 'تم إنشاء نسخة احتياطية من البيانات بنجاح',
        type: 'SYSTEM',
        userId,
        companyId,
        entityType: 'system'
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار النسخ الاحتياطي:', error);
    }
  },

  // إشعار تحديث النظام
  systemUpdate: async (
    userId: string,
    version: string,
    companyId?: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'تحديث النظام',
        message: `تم تحديث النظام إلى الإصدار ${version}`,
        type: 'SYSTEM',
        userId,
        companyId,
        entityType: 'system'
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار تحديث النظام:', error);
    }
  },

  // إشعار خطأ في النظام
  systemError: async (
    userId: string,
    errorMessage: string,
    companyId?: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'خطأ في النظام',
        message: `حدث خطأ في النظام: ${errorMessage}`,
        type: 'ERROR',
        userId,
        companyId,
        entityType: 'system'
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار خطأ النظام:', error);
    }
  }
};

// إشعارات الشركات
export const createCompanyNotifications = {
  // إشعار إنشاء شركة جديدة
  companyCreated: async (
    userId: string,
    companyName: string,
    companyId: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'شركة جديدة',
        message: `تم إنشاء شركة جديدة: ${companyName}`,
        type: 'SUCCESS',
        userId,
        companyId,
        entityType: 'company',
        entityId: companyId.toString(),
        actionUrl: `/companies`
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار الشركة الجديدة:', error);
    }
  },

  // إشعار تحديث بيانات الشركة
  companyUpdated: async (
    userId: string,
    companyName: string,
    companyId: number
  ) => {
    try {
      await notificationService.createNotification({
        title: 'تحديث بيانات الشركة',
        message: `تم تحديث بيانات الشركة: ${companyName}`,
        type: 'INFO',
        userId,
        companyId,
        entityType: 'company',
        entityId: companyId.toString(),
        actionUrl: `/companies`
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار تحديث الشركة:', error);
    }
  }
};

// دالة مساعدة لإرسال إشعارات متعددة
export const sendBulkNotifications = async (
  notifications: CreateNotificationRequest[]
) => {
  try {
    await notificationService.bulkCreateNotifications({ notifications });
  } catch (error) {
    console.error('خطأ في إرسال الإشعارات المتعددة:', error);
  }
};

// دالة مساعدة لإرسال إشعار لجميع مستخدمي الشركة
export const notifyAllCompanyUsers = async (
  companyId: number,
  title: string,
  message: string,
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SALE' | 'STOCK' | 'USER' | 'SYSTEM' = 'INFO',
  entityType?: string,
  entityId?: string,
  actionUrl?: string
) => {
  try {
    // هنا يمكن إضافة منطق لجلب جميع مستخدمي الشركة
    // وإرسال إشعار لكل واحد منهم
    // لكن هذا يتطلب الوصول لقاعدة البيانات
    console.log(`إرسال إشعار لجميع مستخدمي الشركة ${companyId}: ${title}`);
  } catch (error) {
    console.error('خطأ في إرسال الإشعار لجميع المستخدمين:', error);
  }
};

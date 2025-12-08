/**
 * Hook مخصص لإدارة الإشعارات مع رسائل معيارية
 * Custom hook for managing notifications with standardized messages
 */

import { useToast } from '@/components/ui/Toast';
import { NOTIFICATION_MESSAGES, createNotificationMessage } from '@/utils/notificationMessages';

export const useNotifications = () => {
  const toast = useToast();

  // إشعارات المنتجات
  const products = {
    createSuccess: (productName?: string) => {
      const message = productName 
        ? `تم إضافة المنتج "${productName}" بنجاح إلى قاعدة البيانات`
        : NOTIFICATION_MESSAGES.PRODUCTS.CREATE_SUCCESS.message;
      
      toast.success(
        NOTIFICATION_MESSAGES.PRODUCTS.CREATE_SUCCESS.title,
        message
      );
    },

    createError: (errorMessage?: string) => {
      toast.error(
        NOTIFICATION_MESSAGES.PRODUCTS.CREATE_ERROR.title,
        errorMessage || NOTIFICATION_MESSAGES.PRODUCTS.CREATE_ERROR.message
      );
    },

    updateSuccess: (productName?: string) => {
      const message = productName 
        ? `تم تحديث المنتج "${productName}" بنجاح`
        : NOTIFICATION_MESSAGES.PRODUCTS.UPDATE_SUCCESS.message;
      
      toast.success(
        NOTIFICATION_MESSAGES.PRODUCTS.UPDATE_SUCCESS.title,
        message
      );
    },

    updateError: (errorMessage?: string) => {
      toast.error(
        NOTIFICATION_MESSAGES.PRODUCTS.UPDATE_ERROR.title,
        errorMessage || NOTIFICATION_MESSAGES.PRODUCTS.UPDATE_ERROR.message
      );
    },

    deleteSuccess: (productName?: string) => {
      const message = productName 
        ? `تم حذف المنتج "${productName}" من النظام نهائياً`
        : NOTIFICATION_MESSAGES.PRODUCTS.DELETE_SUCCESS.message;
      
      toast.success(
        NOTIFICATION_MESSAGES.PRODUCTS.DELETE_SUCCESS.title,
        message
      );
    },

    deleteError: (errorMessage?: string) => {
      toast.error(
        NOTIFICATION_MESSAGES.PRODUCTS.DELETE_ERROR.title,
        errorMessage || NOTIFICATION_MESSAGES.PRODUCTS.DELETE_ERROR.message
      );
    },

    stockUpdateSuccess: (productName?: string, newQuantity?: number) => {
      let message = NOTIFICATION_MESSAGES.PRODUCTS.STOCK_UPDATE_SUCCESS.message;
      if (productName && newQuantity !== undefined) {
        message = `تم تحديث مخزون "${productName}" إلى ${newQuantity} وحدة`;
      }
      
      toast.success(
        NOTIFICATION_MESSAGES.PRODUCTS.STOCK_UPDATE_SUCCESS.title,
        message
      );
    },

    stockUpdateError: (errorMessage?: string) => {
      toast.error(
        NOTIFICATION_MESSAGES.PRODUCTS.STOCK_UPDATE_ERROR.title,
        errorMessage || NOTIFICATION_MESSAGES.PRODUCTS.STOCK_UPDATE_ERROR.message
      );
    },

    priceUpdateSuccess: (productName?: string, newPrice?: number) => {
      let message = NOTIFICATION_MESSAGES.PRODUCTS.PRICE_UPDATE_SUCCESS.message;
      if (productName && newPrice !== undefined) {
        message = `تم تحديث سعر "${productName}" إلى ${newPrice} د.ل`;
      }
      
      toast.success(
        NOTIFICATION_MESSAGES.PRODUCTS.PRICE_UPDATE_SUCCESS.title,
        message
      );
    },

    priceUpdateError: (errorMessage?: string) => {
      toast.error(
        NOTIFICATION_MESSAGES.PRODUCTS.PRICE_UPDATE_ERROR.title,
        errorMessage || NOTIFICATION_MESSAGES.PRODUCTS.PRICE_UPDATE_ERROR.message
      );
    }
  };

  // إشعارات المبيعات
  const sales = {
    createSuccess: (invoiceNumber?: string, totalAmount?: number) => {
      let message = NOTIFICATION_MESSAGES.SALES.CREATE_SUCCESS.message;
      if (invoiceNumber && totalAmount) {
        message = `تم إنشاء فاتورة رقم ${invoiceNumber} بمبلغ ${totalAmount} د.ل وتحديث المخزون`;
      }
      
      toast.success(
        NOTIFICATION_MESSAGES.SALES.CREATE_SUCCESS.title,
        message
      );
    },

    createError: (errorMessage?: string) => {
      toast.error(
        NOTIFICATION_MESSAGES.SALES.CREATE_ERROR.title,
        errorMessage || NOTIFICATION_MESSAGES.SALES.CREATE_ERROR.message
      );
    },

    updateSuccess: (invoiceNumber?: string) => {
      const message = invoiceNumber 
        ? `تم تحديث فاتورة رقم ${invoiceNumber} بنجاح`
        : NOTIFICATION_MESSAGES.SALES.UPDATE_SUCCESS.message;
      
      toast.success(
        NOTIFICATION_MESSAGES.SALES.UPDATE_SUCCESS.title,
        message
      );
    },

    deleteSuccess: (invoiceNumber?: string) => {
      const message = invoiceNumber 
        ? `تم إلغاء فاتورة رقم ${invoiceNumber} وإرجاع المخزون`
        : NOTIFICATION_MESSAGES.SALES.DELETE_SUCCESS.message;
      
      toast.success(
        NOTIFICATION_MESSAGES.SALES.DELETE_SUCCESS.title,
        message
      );
    }
  };

  // إشعارات المشتريات
  const purchases = {
    createSuccess: (invoiceNumber?: string, supplierName?: string) => {
      let message = NOTIFICATION_MESSAGES.PURCHASES.CREATE_SUCCESS.message;
      if (invoiceNumber && supplierName) {
        message = `تم إنشاء فاتورة مشتريات رقم ${invoiceNumber} من ${supplierName}`;
      }
      
      toast.success(
        NOTIFICATION_MESSAGES.PURCHASES.CREATE_SUCCESS.title,
        message
      );
    },

    createError: (errorMessage?: string) => {
      toast.error(
        NOTIFICATION_MESSAGES.PURCHASES.CREATE_ERROR.title,
        errorMessage || NOTIFICATION_MESSAGES.PURCHASES.CREATE_ERROR.message
      );
    }
  };

  // إشعارات المستخدمين
  const users = {
    createSuccess: (userName?: string) => {
      const message = userName 
        ? `تم إضافة المستخدم "${userName}" إلى النظام بنجاح`
        : NOTIFICATION_MESSAGES.USERS.CREATE_SUCCESS.message;
      
      toast.success(
        NOTIFICATION_MESSAGES.USERS.CREATE_SUCCESS.title,
        message
      );
    },

    createError: (errorMessage?: string) => {
      toast.error(
        NOTIFICATION_MESSAGES.USERS.CREATE_ERROR.title,
        errorMessage || NOTIFICATION_MESSAGES.USERS.CREATE_ERROR.message
      );
    },

    updateSuccess: (userName?: string) => {
      const message = userName 
        ? `تم تحديث بيانات المستخدم "${userName}" بنجاح`
        : NOTIFICATION_MESSAGES.USERS.UPDATE_SUCCESS.message;
      
      toast.success(
        NOTIFICATION_MESSAGES.USERS.UPDATE_SUCCESS.title,
        message
      );
    },

    deleteSuccess: (userName?: string) => {
      const message = userName 
        ? `تم حذف المستخدم "${userName}" من النظام`
        : NOTIFICATION_MESSAGES.USERS.DELETE_SUCCESS.message;
      
      toast.success(
        NOTIFICATION_MESSAGES.USERS.DELETE_SUCCESS.title,
        message
      );
    }
  };

  // إشعارات الشركات
  const companies = {
    createSuccess: (companyName?: string) => {
      const message = companyName 
        ? `تم إضافة شركة "${companyName}" إلى النظام بنجاح`
        : NOTIFICATION_MESSAGES.COMPANIES.CREATE_SUCCESS.message;
      
      toast.success(
        NOTIFICATION_MESSAGES.COMPANIES.CREATE_SUCCESS.title,
        message
      );
    },

    updateSuccess: (companyName?: string) => {
      const message = companyName 
        ? `تم تحديث بيانات شركة "${companyName}" بنجاح`
        : NOTIFICATION_MESSAGES.COMPANIES.UPDATE_SUCCESS.message;
      
      toast.success(
        NOTIFICATION_MESSAGES.COMPANIES.UPDATE_SUCCESS.title,
        message
      );
    }
  };

  // إشعارات عامة
  const general = {
    loading: () => {
      toast.info(
        NOTIFICATION_MESSAGES.GENERAL.LOADING.title,
        NOTIFICATION_MESSAGES.GENERAL.LOADING.message
      );
    },

    saveSuccess: () => {
      toast.success(
        NOTIFICATION_MESSAGES.GENERAL.SAVE_SUCCESS.title,
        NOTIFICATION_MESSAGES.GENERAL.SAVE_SUCCESS.message
      );
    },

    validationError: (fieldName?: string) => {
      const message = fieldName 
        ? `يرجى التحقق من صحة البيانات في حقل "${fieldName}"`
        : NOTIFICATION_MESSAGES.GENERAL.VALIDATION_ERROR.message;
      
      toast.warning(
        NOTIFICATION_MESSAGES.GENERAL.VALIDATION_ERROR.title,
        message
      );
    },

    networkError: () => {
      toast.error(
        NOTIFICATION_MESSAGES.GENERAL.NETWORK_ERROR.title,
        NOTIFICATION_MESSAGES.GENERAL.NETWORK_ERROR.message
      );
    },

    permissionDenied: (action?: string) => {
      const message = action 
        ? `ليس لديك الصلاحية لـ ${action}`
        : NOTIFICATION_MESSAGES.GENERAL.PERMISSION_DENIED.message;
      
      toast.warning(
        NOTIFICATION_MESSAGES.GENERAL.PERMISSION_DENIED.title,
        message
      );
    },

    sessionExpired: () => {
      toast.error(
        NOTIFICATION_MESSAGES.GENERAL.SESSION_EXPIRED.title,
        NOTIFICATION_MESSAGES.GENERAL.SESSION_EXPIRED.message
      );
    }
  };

  // إشعار مخصص
  const custom = {
    success: (title: string, message?: string) => toast.success(title, message),
    error: (title: string, message?: string) => toast.error(title, message),
    warning: (title: string, message?: string) => toast.warning(title, message),
    info: (title: string, message?: string) => toast.info(title, message)
  };

  return {
    products,
    sales,
    purchases,
    users,
    companies,
    general,
    custom
  };
};

export default useNotifications;

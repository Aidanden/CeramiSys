/**
 * رسائل الإشعارات المعيارية للنظام
 * Standardized notification messages for the system
 */

export const NOTIFICATION_MESSAGES = {
  // رسائل المنتجات - Products
  PRODUCTS: {
    CREATE_SUCCESS: {
      title: '✅ تم إنشاء المنتج بنجاح',
      message: 'تم إضافة المنتج الجديد إلى قاعدة البيانات وسيظهر في القائمة'
    },
    CREATE_ERROR: {
      title: '❌ فشل في إنشاء المنتج',
      message: 'حدث خطأ أثناء إضافة المنتج. يرجى المحاولة مرة أخرى'
    },
    UPDATE_SUCCESS: {
      title: '✅ تم تحديث المنتج بنجاح',
      message: 'تم حفظ التغييرات على المنتج بنجاح'
    },
    UPDATE_ERROR: {
      title: '❌ فشل في تحديث المنتج',
      message: 'لم يتم حفظ التغييرات. يرجى المحاولة مرة أخرى'
    },
    DELETE_SUCCESS: {
      title: '✅ تم حذف المنتج بنجاح',
      message: 'تم إزالة المنتج من النظام نهائياً'
    },
    DELETE_ERROR: {
      title: '❌ فشل في حذف المنتج',
      message: 'لا يمكن حذف هذا المنتج. قد يكون مرتبط بعمليات أخرى'
    },
    STOCK_UPDATE_SUCCESS: {
      title: '📦 تم تحديث المخزون بنجاح',
      message: 'تم تحديث كمية المخزون للمنتج'
    },
    STOCK_UPDATE_ERROR: {
      title: '❌ فشل في تحديث المخزون',
      message: 'حدث خطأ أثناء تحديث المخزون'
    },
    PRICE_UPDATE_SUCCESS: {
      title: '💰 تم تحديث السعر بنجاح',
      message: 'تم تحديث سعر المنتج في النظام'
    },
    PRICE_UPDATE_ERROR: {
      title: '❌ فشل في تحديث السعر',
      message: 'حدث خطأ أثناء تحديث السعر'
    }
  },

  // رسائل المبيعات - Sales
  SALES: {
    CREATE_SUCCESS: {
      title: '✅ تم إنشاء فاتورة المبيعات بنجاح',
      message: 'تم حفظ الفاتورة وتحديث المخزون تلقائياً'
    },
    CREATE_ERROR: {
      title: '❌ فشل في إنشاء فاتورة المبيعات',
      message: 'حدث خطأ أثناء إنشاء الفاتورة. تحقق من البيانات المدخلة'
    },
    UPDATE_SUCCESS: {
      title: '✅ تم تحديث فاتورة المبيعات',
      message: 'تم حفظ التغييرات على الفاتورة'
    },
    DELETE_SUCCESS: {
      title: '✅ تم إلغاء فاتورة المبيعات',
      message: 'تم إلغاء الفاتورة وإرجاع المخزون'
    }
  },

  // رسائل المشتريات - Purchases
  PURCHASES: {
    CREATE_SUCCESS: {
      title: '✅ تم إنشاء فاتورة المشتريات بنجاح',
      message: 'تم حفظ الفاتورة وتحديث المخزون تلقائياً'
    },
    CREATE_ERROR: {
      title: '❌ فشل في إنشاء فاتورة المشتريات',
      message: 'حدث خطأ أثناء إنشاء الفاتورة'
    }
  },

  // رسائل المستخدمين - Users
  USERS: {
    CREATE_SUCCESS: {
      title: '✅ تم إنشاء المستخدم بنجاح',
      message: 'تم إضافة المستخدم الجديد إلى النظام'
    },
    CREATE_ERROR: {
      title: '❌ فشل في إنشاء المستخدم',
      message: 'حدث خطأ أثناء إضافة المستخدم'
    },
    UPDATE_SUCCESS: {
      title: '✅ تم تحديث بيانات المستخدم',
      message: 'تم حفظ التغييرات بنجاح'
    },
    DELETE_SUCCESS: {
      title: '✅ تم حذف المستخدم',
      message: 'تم إزالة المستخدم من النظام'
    }
  },

  // رسائل الشركات - Companies
  COMPANIES: {
    CREATE_SUCCESS: {
      title: '✅ تم إنشاء الشركة بنجاح',
      message: 'تم إضافة الشركة الجديدة إلى النظام'
    },
    UPDATE_SUCCESS: {
      title: '✅ تم تحديث بيانات الشركة',
      message: 'تم حفظ التغييرات بنجاح'
    }
  },

  // رسائل عامة - General
  GENERAL: {
    LOADING: {
      title: '⏳ جاري التحميل...',
      message: 'يرجى الانتظار أثناء تحميل البيانات'
    },
    SAVE_SUCCESS: {
      title: '✅ تم الحفظ بنجاح',
      message: 'تم حفظ البيانات بنجاح'
    },
    VALIDATION_ERROR: {
      title: '⚠️ خطأ في البيانات المدخلة',
      message: 'يرجى التحقق من صحة البيانات المدخلة'
    },
    NETWORK_ERROR: {
      title: '🌐 خطأ في الاتصال',
      message: 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى'
    },
    PERMISSION_DENIED: {
      title: '🔒 ليس لديك صلاحية',
      message: 'ليس لديك الصلاحية للقيام بهذا الإجراء'
    },
    SESSION_EXPIRED: {
      title: '⏰ انتهت جلسة العمل',
      message: 'يرجى تسجيل الدخول مرة أخرى للمتابعة'
    }
  }
};

/**
 * دالة مساعدة لإنشاء رسائل إشعار مخصصة
 */
export const createNotificationMessage = (
  title: string, 
  message?: string, 
  type: 'success' | 'error' | 'warning' | 'info' = 'info'
) => ({
  title: getIconForType(type) + ' ' + title,
  message
});

/**
 * الحصول على الأيقونة المناسبة لنوع الإشعار
 */
const getIconForType = (type: string): string => {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    default: return 'ℹ️';
  }
};

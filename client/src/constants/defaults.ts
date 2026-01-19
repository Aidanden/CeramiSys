/**
 * ملف الثوابت والقيم الافتراضية للنظام
 * Default constants for the system
 */

/**
 * هامش الربح الافتراضي (%)
 * Default profit margin percentage
 * يمكن تعديل هذه القيمة من صفحة الإعدادات
 * This value can be modified from the settings page
 */
export const DEFAULT_PROFIT_MARGIN = 20;

/**
 * دالة مساعدة للحصول على هامش الربح من localStorage أو القيمة الافتراضية
 * Helper function to get profit margin from localStorage or default value
 */
export const getProfitMargin = (): number => {
    const savedMargin = localStorage.getItem('profitMargin');
    return savedMargin ? parseFloat(savedMargin) : DEFAULT_PROFIT_MARGIN;
};

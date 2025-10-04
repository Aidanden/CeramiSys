/**
 * تنسيق الأرقام بالطريقة الصحيحة
 * النقطة (.) للكسور العشرية مثل: 25.50
 * الفاصلة (,) للفصل بين الآلاف مثل: 100,000
 */

/**
 * تنسيق رقم مع فاصل آلاف ونقطة عشرية
 * @param value - الرقم المراد تنسيقه
 * @param options - خيارات التنسيق
 * @returns الرقم المنسق
 */
export function formatArabicNumber(
  value: number | string, 
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
  } = {}
): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    useGrouping = true
  } = options;

  // استخدام التنسيق الإنجليزي (en-US) للحصول على:
  // - النقطة (.) للكسور العشرية
  // - الفاصلة (,) للفصل بين الآلاف
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping
  });

  return formatted;
}

/**
 * تنسيق رقم عربي للعملة (دينار ليبي)
 * @param value - الرقم المراد تنسيقه
 * @returns الرقم المنسق مع رمز العملة
 */
export function formatArabicCurrency(value: number | string): string {
  return `${formatArabicNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} د.ل`;
}

/**
 * تنسيق رقم عربي للكميات (بدون كسور عشرية)
 * @param value - الرقم المراد تنسيقه
 * @returns الرقم المنسق بدون كسور عشرية
 */
export function formatArabicQuantity(value: number | string): string {
  return formatArabicNumber(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * تنسيق رقم عربي للمساحات (بكسور عشرية)
 * @param value - الرقم المراد تنسيقه
 * @returns الرقم المنسق مع كسور عشرية
 */
export function formatArabicArea(value: number | string): string {
  return formatArabicNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

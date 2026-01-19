import { Decimal } from "decimal.js";

/**
 * تنسيق الأرقام العشرية لعرض 3 أرقام بعد الفاصلة مع الفواصل
 * @param num - الرقم المراد تنسيقه
 * @returns الرقم منسق بـ 3 أرقام بعد الفاصلة مع الفواصل
 */
export const formatNumber = (num: string | number | Decimal | null | undefined): string => {
  if (!num || num === null || num === undefined) return "0.000";
  const numericValue = new Decimal(num).toNumber();
  return numericValue.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
};

/**
 * تنسيق رصيد العملة لعرض بالفواصل
 * @param balance - رصيد العملة
 * @returns الرصيد منسق بالفواصل
 */
export const formatBalance = (balance: string | number | Decimal | null | undefined): string => {
  if (!balance || balance === null || balance === undefined) return "0.00";
  const numericValue = new Decimal(balance).toNumber();
  return numericValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });
};

/**
 * تنسيق السعر لعرض 3 أرقام بعد الفاصلة
 * @param price - السعر المراد تنسيقه
 * @returns السعر منسق بـ 3 أرقام بعد الفاصلة
 */
export const formatPrice = (price: string | number | Decimal | null | undefined): string => {
  if (!price || price === null || price === undefined) return "0.000";
  return new Decimal(price).toFixed(3);
};

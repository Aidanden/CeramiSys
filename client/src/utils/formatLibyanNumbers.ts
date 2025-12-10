// تحويل الأرقام الهندية إلى الأرقام العربية
export const toArabicNumbers = (str: string): string => {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[0-9]/g, (digit) => arabicNumbers[parseInt(digit)]);
};

// تنسيق العملة بالدينار الليبي مع الأرقام العربية
export const formatLibyanCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat('ar-LY', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${toArabicNumbers(formatted)} د.ل`;
};

// تنسيق الأرقام بالأرقام العربية
export const formatArabicNumber = (num: number): string => {
  return toArabicNumbers(num.toString());
};

// تنسيق الأرقام مع فواصل الآلاف بالأرقام العربية
export const formatArabicNumberWithCommas = (num: number): string => {
  const formatted = new Intl.NumberFormat('ar-LY').format(num);
  return toArabicNumbers(formatted);
};

// تنسيق التاريخ بالأرقام العربية
export const formatArabicDate = (dateString: string, formatPattern: string = 'dd/MM/yyyy'): string => {
  const date = new Date(dateString);
  const formatted = new Intl.DateTimeFormat('ar-LY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
  return toArabicNumbers(formatted);
};

// تحويل الأرقام العربية إلى الأرقام الإنجليزية
export const toEnglishNumbers = (str: string): string => {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = str;
  arabicNumbers.forEach((arabicNum, index) => {
    result = result.replace(new RegExp(arabicNum, 'g'), englishNumbers[index]);
  });
  
  return result;
};

// تنسيق العملة بالدينار الليبي مع الأرقام الإنجليزية
export const formatLibyanCurrencyEnglish = (amount: number): string => {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} د.ل`;
};

// تنسيق الأرقام بالأرقام الإنجليزية
export const formatEnglishNumber = (num: number): string => {
  return num.toString();
};

// تنسيق التاريخ بالأرقام الإنجليزية
export const formatEnglishDate = (dateString: string): string => {
  const date = new Date(dateString);
  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
  return formatted;
};

// تنسيق العملة بالدينار الليبي مع الأرقام الإنجليزية ورمز د.ل
export const formatLibyanCurrencyArabic = (amount: number): string => {
  const formattedAmount = formatEnglishNumber(amount);
  return `${formattedAmount} د.ل`;
};

import type { Config } from "tailwindcss";
import { createThemes } from "tw-colors";
import colors from "tailwindcss/colors";

// نظام ألوان محسن للوضع الليلي
const lightTheme = {
  // الألوان الأساسية
  primary: {
    50: "#eff6ff",
    100: "#dbeafe", 
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
  
  // خلفيات وحدود
  background: {
    primary: "#ffffff",
    secondary: "#f8fafc",
    tertiary: "#f1f5f9",
    hover: "#f8fafc",
    active: "#e2e8f0",
  },
  
  surface: {
    primary: "#ffffff",
    secondary: "#f8fafc", 
    elevated: "#ffffff",
    overlay: "rgba(0, 0, 0, 0.1)",
  },
  
  border: {
    primary: "#e2e8f0",
    secondary: "#cbd5e1",
    focus: "#3b82f6",
    error: "#ef4444",
    success: "#10b981",
  },
  
  // النصوص
  text: {
    primary: "#0f172a",
    secondary: "#475569", 
    tertiary: "#64748b",
    inverse: "#ffffff",
    muted: "#94a3b8",
    disabled: "#cbd5e1",
  },
  
  // الحالات
  success: colors.emerald,
  warning: colors.amber,
  error: colors.red,
  info: colors.blue,
  
  // الألوان الإضافية
  gray: colors.slate,
  red: colors.red,
  yellow: colors.amber,
  green: colors.emerald,
  blue: colors.blue,
  indigo: colors.indigo,
  purple: colors.violet,
  pink: colors.pink,
};

const darkTheme = {
  // الألوان الأساسية - تدرج أزرق محسن للوضع المظلم
  primary: {
    50: "#0c1426",
    100: "#1e293b", 
    200: "#334155",
    300: "#475569",
    400: "#64748b",
    500: "#3b82f6",
    600: "#60a5fa",
    700: "#93c5fd",
    800: "#bfdbfe",
    900: "#dbeafe",
  },
  
  // خلفيات وحدود - تدرج أكثر نعومة
  background: {
    primary: "#0a0e1a",      // أغمق قليلاً
    secondary: "#111827",     // رمادي داكن دافئ
    tertiary: "#1f2937",     // رمادي متوسط
    hover: "#1f2937",        // hover لطيف
    active: "#374151",       // active واضح
  },
  
  surface: {
    primary: "#111827",      // سطح رئيسي
    secondary: "#1f2937",    // سطح ثانوي
    elevated: "#374151",     // سطح مرتفع
    overlay: "rgba(0, 0, 0, 0.7)",
  },
  
  border: {
    primary: "#374151",      // حدود رئيسية
    secondary: "#4b5563",    // حدود ثانوية
    focus: "#60a5fa",        // تركيز أزرق فاتح
    error: "#f87171",
    success: "#34d399",
  },
  
  // النصوص - تدرج محسن للقراءة
  text: {
    primary: "#f9fafb",      // أبيض دافئ
    secondary: "#d1d5db",    // رمادي فاتح
    tertiary: "#9ca3af",     // رمادي متوسط
    inverse: "#111827",      // للخلفيات الفاتحة
    muted: "#6b7280",        // مكتوم
    disabled: "#4b5563",     // معطل
  },
  
  // الحالات - ألوان محسنة للوضع المظلم
  success: {
    ...colors.emerald,
    50: "#064e3b",
    100: "#065f46", 
    200: "#047857",
    300: "#059669",
    400: "#10b981",
    500: "#34d399",
    600: "#6ee7b7",
    700: "#9df3c4",
    800: "#c6f6d5",
    900: "#d1fae5",
  },
  warning: {
    ...colors.amber,
    50: "#451a03",
    100: "#78350f",
    200: "#92400e", 
    300: "#b45309",
    400: "#d97706",
    500: "#f59e0b",
    600: "#fbbf24",
    700: "#fcd34d",
    800: "#fde68a",
    900: "#fef3c7",
  },
  error: {
    ...colors.red,
    50: "#450a0a",
    100: "#7f1d1d",
    200: "#991b1b",
    300: "#b91c1c", 
    400: "#dc2626",
    500: "#ef4444",
    600: "#f87171",
    700: "#fca5a5",
    800: "#fecaca",
    900: "#fee2e2",
  },
  info: {
    ...colors.blue,
    50: "#0c1426",
    100: "#1e293b",
    200: "#1e40af",
    300: "#1d4ed8",
    400: "#2563eb",
    500: "#3b82f6",
    600: "#60a5fa",
    700: "#93c5fd",
    800: "#bfdbfe",
    900: "#dbeafe",
  },
  
  // الألوان الإضافية - تدرج محسن
  gray: {
    50: "#0a0e1a",
    100: "#111827",
    200: "#1f2937",
    300: "#374151",
    400: "#4b5563",
    500: "#6b7280",
    600: "#9ca3af",
    700: "#d1d5db",
    800: "#e5e7eb",
    900: "#f9fafb",
  },
  red: {
    ...colors.red,
    500: "#ef4444",
    600: "#f87171",
  },
  yellow: {
    ...colors.amber,
    500: "#f59e0b", 
    600: "#fbbf24",
  },
  green: {
    ...colors.emerald,
    500: "#10b981",
    600: "#34d399",
  },
  blue: {
    ...colors.blue,
    500: "#3b82f6",
    600: "#60a5fa",
  },
  indigo: {
    ...colors.indigo,
    500: "#6366f1",
    600: "#818cf8",
  },
  purple: {
    ...colors.violet,
    500: "#8b5cf6",
    600: "#a78bfa",
  },
  pink: {
    ...colors.pink,
    500: "#ec4899",
    600: "#f472b6",
  },
};

const themes = {
  light: lightTheme,
  dark: darkTheme,
};

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    fontFamily: {
      sans: ["Tajawal", "sans-serif"],
    },
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [createThemes(themes)],
} satisfies Config;

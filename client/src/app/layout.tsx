import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google"; // استخدام خط Cairo من جوجل مباشرة لأداء أفضل وأجمل
import "./globals.css";
import "../styles/print.css";
import DashboardWrapper from "./dashboardWrapper";
import AuthProvider from "@/components/AuthProvider";
import StoreProvider from "./redux";
import { SessionTimeoutProvider } from "@/components/SessionTimeoutProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "نظام إدارة السيراميك - CeramiSys",
  description: "نظام إدارة شامل لشركات السيراميك والبورسلين",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} antialiased`} suppressHydrationWarning={true}>
        <StoreProvider>
          <ThemeProvider>
            <AuthProvider>
              <SessionTimeoutProvider>
                <ToastProvider>
                  <DashboardWrapper>{children}</DashboardWrapper>
                </ToastProvider>
              </SessionTimeoutProvider>
            </AuthProvider>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}

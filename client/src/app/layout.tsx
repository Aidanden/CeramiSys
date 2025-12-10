import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "../styles/print.css";
import DashboardWrapper from "./dashboardWrapper";
import AuthProvider from "@/components/AuthProvider";
import StoreProvider from "./redux";
import { SessionTimeoutProvider } from "@/components/SessionTimeoutProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const tajawal = localFont({
  src: "./fonts/Tajawal-Regular.ttf",
  variable: "--font-tajawal",
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
      <body className={`${tajawal.variable} antialiased`}>
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

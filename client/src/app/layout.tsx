import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import DashboardWrapper from "./dashboardWrapper";
import AuthProvider from "@/components/AuthProvider";
import StoreProvider from "./redux";
import { SessionTimeoutProvider } from "@/components/SessionTimeoutProvider";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

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
      <body className={`${inter.variable} antialiased`}>
        <StoreProvider>
          <AuthProvider>
            <SessionTimeoutProvider>
              <ToastProvider>
                <DashboardWrapper>{children}</DashboardWrapper>
              </ToastProvider>
            </SessionTimeoutProvider>
          </AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}

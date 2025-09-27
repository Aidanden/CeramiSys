import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import DashboardWrapper from "./dashboardWrapper";
import AuthProvider from "@/components/AuthProvider";
import StoreProvider from "./redux";
import { SessionTimeoutProvider } from "@/components/SessionTimeoutProvider";

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
              <DashboardWrapper>{children}</DashboardWrapper>
            </SessionTimeoutProvider>
          </AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}

'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { ToastProvider } from "@/components/common/Toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()
  
  const isAuthPage = pathname === '/signup' || pathname === '/login'

  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {isAuthPage ? (
            <main>{children}</main>
          ) : (
            <div className="layout">
              <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
              <div className="layout__content">
                <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="layout__main">
                  {children}
                </main>
                <BottomNav />
              </div>
            </div>
          )}
        </ToastProvider>
      </body>
    </html>
  );
}

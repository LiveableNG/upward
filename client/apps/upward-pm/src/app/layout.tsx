'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Providers } from "@/components/common/Providers";
import { cn } from '@/lib/utils'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const pathname = usePathname()
  
  const isAuthPage = pathname === '/signup' || pathname === '/login'

  return (
    <html lang="en">
      <body>
        <Providers>
          {isAuthPage ? (
            <main>{children}</main>
          ) : (
            <div className={cn("layout", isSidebarCollapsed && "layout--collapsed")}>
              <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />
              <div className="layout__content">
                <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
                <DesktopHeader />
                <main className="layout__main">
                  {children}
                </main>
                <BottomNav />
              </div>
            </div>
          )}
        </Providers>
      </body>
    </html>
  );
}

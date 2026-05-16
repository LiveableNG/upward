'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from "@/components/layout/Sidebar"
import { MobileHeader } from "@/components/layout/MobileHeader"
import { DesktopHeader } from "@/components/layout/DesktopHeader"
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(pathname === '/documents')

  // Automatically collapse sidebar when on documents page to maximize space
  useEffect(() => {
    if (pathname === '/documents') {
      setIsSidebarCollapsed(true)
    }
  }, [pathname])
  
  const isAuthPage = pathname === '/signup' || pathname === '/login'
  const isPublicPage = 
    pathname?.startsWith('/public') || 
    pathname?.startsWith('/invite') || 
    pathname?.startsWith('/invited') ||
    pathname?.startsWith('/reset-password')
  const isPortalPage = pathname?.startsWith('/portal')

  if (isAuthPage || isPublicPage || isPortalPage) {
    return <main>{children}</main>
  }

  return (
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
      </div>
    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from "@/components/layout/Sidebar"
import { MobileHeader } from "@/components/layout/MobileHeader"
import { DesktopHeader } from "@/components/layout/DesktopHeader"
import { NotificationPopup } from "@/components/common/NotificationPopup"
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('upward_sidebar_collapsed')
    if (saved !== null) {
      setIsSidebarCollapsed(saved === 'true')
    }
  }, [])

  const handleToggleCollapse = () => {
    const newState = !isSidebarCollapsed
    setIsSidebarCollapsed(newState)
    localStorage.setItem('upward_sidebar_collapsed', String(newState))
  }
  
  const isAuthPage = pathname === '/signup' || pathname === '/login' || pathname === '/pm-login' || pathname === '/pm-signup' || pathname === '/forgot-password'
  const isPublicPage = 
    pathname === '/' ||
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
        onToggleCollapse={handleToggleCollapse}
      />
      <div className="layout__content">
        <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <DesktopHeader />
        <NotificationPopup />
        <main className="layout__main">
          {children}
        </main>
      </div>
    </div>
  )
}

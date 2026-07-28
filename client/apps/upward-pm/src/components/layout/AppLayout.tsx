'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import { Sidebar } from "@/components/layout/Sidebar"
import { MobileHeader } from "@/components/layout/MobileHeader"
import { DesktopHeader } from "@/components/layout/DesktopHeader"
import { NotificationPopup } from "@/components/common/NotificationPopup"
import { PullToRefresh } from "@/components/common/PullToRefresh"
import { cn } from '@/lib/utils'
import { PricingModal } from '@/features/pm/components/subscription/PricingModal'
import { usePricingModal } from '@/features/pm/hooks/usePricingModal'
import { useSubscription } from '@/features/pm/hooks/useSubscription'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)

  const { isLoggedIn, loading } = useAuth()
  const router = useRouter()
  const { isOpen, closePricing } = usePricingModal()
  const { subscription } = useSubscription()

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
  
  const isAuthPage = pathname === '/signup' || pathname === '/login' || pathname === '/pm-login' || pathname === '/pm-signup' || pathname === '/forgot-password' || pathname === '/pm-forgot-password'
  const isPublicPage = 
    pathname === '/' ||
    pathname === '/welcome' ||
    pathname?.startsWith('/public') || 
    pathname?.startsWith('/invite') || 
    pathname?.startsWith('/invited') ||
    pathname?.startsWith('/reset-password')
  const isPortalPage = pathname?.startsWith('/portal')

  useEffect(() => {
    if (!loading && !isLoggedIn && !isAuthPage && !isPublicPage && !isPortalPage) {
      router.replace('/login')
    }
  }, [loading, isLoggedIn, isAuthPage, isPublicPage, isPortalPage, router])

  if (isAuthPage || isPublicPage || isPortalPage) {
    return <main>{children}</main>
  }

  if (loading || (!isLoggedIn && !isAuthPage && !isPublicPage && !isPortalPage)) {
    return null
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
        {subscription?.status === 'GRACE' && (
          <div className="grace-warning-banner" style={{
            background: 'linear-gradient(135deg, var(--warning) 0%, #d97706 100%)',
            color: 'white',
            padding: 'var(--space-3) var(--space-4)',
            textAlign: 'center',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            zIndex: 100
          }}>
            <span>⚠️ Your subscription renewal failed. Please top up your wallet balance to avoid losing access to premium features.</span>
          </div>
        )}
        <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <DesktopHeader />
        <NotificationPopup />
        <main className="layout__main">
          <PullToRefresh>
            {children}
          </PullToRefresh>
        </main>
        <PricingModal isOpen={isOpen} onClose={closePricing} />
      </div>
    </div>
  )
}

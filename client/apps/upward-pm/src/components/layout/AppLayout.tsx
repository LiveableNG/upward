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
  const isCheckoutPage = pathname === '/subscription/checkout'
  
  useEffect(() => {
    if (!loading && !isLoggedIn && !isAuthPage && !isPublicPage && !isPortalPage) {
      router.replace('/login')
    }
    if (process.env.NEXT_PUBLIC_DISABLE_SUBSCRIPTIONS === 'true' && pathname?.startsWith('/subscription')) {
      router.replace('/dashboard')
    }
  }, [loading, isLoggedIn, isAuthPage, isPublicPage, isPortalPage, pathname, router])

  if (isAuthPage || isPublicPage || isPortalPage || isCheckoutPage) {
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
        {process.env.NEXT_PUBLIC_DISABLE_SUBSCRIPTIONS !== 'true' && subscription?.status === 'GRACE' && (
          <div className="grace-warning-banner" style={{
            background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
            color: 'white',
            padding: '10px 16px',
            textAlign: 'center',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            zIndex: 100
          }}>
            <span>⚠️ Your subscription renewal failed. Please top up your wallet balance to avoid feature lockout.</span>
            <button
              onClick={() => router.push('/subscription/checkout')}
              style={{
                background: 'white',
                color: '#b45309',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '100px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Top Up Wallet →
            </button>
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

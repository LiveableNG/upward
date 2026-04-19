'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, Settings, Share2, LucideIcon } from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { UpwardLogo } from '@/components/PoweredByUpward'

import { NotificationPanel } from './NotificationPanel'

import { useAuth } from '@/features/auth/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface DashboardHeaderProps {
  // Now optional as we'll use hooks if not provided
  firstName?: string
  notifCount?: number
  profilePic?: string
}

export function DashboardHeader({ 
  firstName: propFirstName, 
  notifCount: propNotifCount, 
  profilePic: propProfilePic 
}: DashboardHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // Reactively track viewport width so DevTools toggling doesn't break the class
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    enabled: !!user,
  })

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-counts'],
    queryFn: () => api.getPendingPayments(),
    enabled: !!user,
  })

  // Prioritize props, then hooks
  const firstName = propFirstName || user?.firstName || 'User'
  const profilePic = propProfilePic || user?.profilePic
  const notifCount = propNotifCount ?? ((notifData?.unreadCount || 0) + (dashboardData?.length || 0))

  const isHome = pathname === '/dashboard'

  const handleNotifClick = () => {
    // Desktop: Open Slide Panel | Mobile: Direct route to page
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsNotifOpen(!isNotifOpen)
    } else {
      router.push('/dashboard/notifications')
    }
  }

  return (
    <>
      <header className={`dashboard__header ${isDesktop ? 'dashboard__header--desktop' : 'dashboard__header--mobile'}`}>
        <div className="dashboard__header-inner">
          {/* Mobile User Block (Hidden on desktop) */}
          <div className="dashboard__header-left">
            <div className="dashboard__avatar" onClick={() => router.push('/dashboard/me')}>
              <UserAvatar src={profilePic} size={40} />
            </div>
            <div className="dashboard__greeting-block">
              <div className="dashboard__greeting">
                Hey, <span className="dashboard__greeting-name">{firstName}</span>
              </div>
              <div className="dashboard__email" onClick={() => router.push('/dashboard/me')}>
                View Profile
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="dashboard__header-nav">
            <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>Home</Link>
            <Link href="/dashboard/pay-rent" className={pathname === '/dashboard/pay-rent' ? 'active' : ''}>Pay Rent</Link>
            <Link href="/dashboard/transactions" className={pathname === '/dashboard/transactions' ? 'active' : ''}>Transactions</Link>
            <Link href="/dashboard/me" className={pathname === '/dashboard/me' ? 'active' : ''}>Profile</Link>
          </nav>

          <div className="dashboard__header-right">
            <button className="dashboard__icon-btn" onClick={() => router.push('/dashboard/settings')} title="Settings">
              <Settings size={18} />
            </button>
            <button
              className="dashboard__icon-btn dashboard__icon-btn--notif"
              onClick={handleNotifClick}
              title="Notifications"
            >
              <Bell size={18} />
              {notifCount > 0 && <span className="dashboard__notif-badge">{notifCount}</span>}
            </button>
          </div>
        </div>
      </header>
      
      {/* Slide-over Notification Panel */}
      <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  )
}

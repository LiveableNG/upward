'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, LayoutGrid, Settings } from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { UpwardLogo } from '@/components/PoweredByUpward'

import { NotificationPanel } from './NotificationPanel'
import { useFeaturesMenu } from './FeaturesMenuContext'

import { useAuth } from '@/features/auth/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Suspense } from 'react'

interface DashboardHeaderProps {

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
  const { openFeaturesMenu } = useFeaturesMenu()
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

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

  const pendingCount = dashboardData?.length || 0
  const unreadNotifs = notifData?.unreadCount || 0
  
  const totalUnread = unreadNotifs
  
  const [hasSeenNotifs, setHasSeenNotifs] = useState(true)
  const [lastTotal, setLastTotal] = useState(0)

  useEffect(() => {
    if (!user) return
    const storedTotal = localStorage.getItem(`notif_last_total_${user.id}`)
    const storedSeen = localStorage.getItem(`notif_has_seen_${user.id}`)

    if (storedTotal) setLastTotal(parseInt(storedTotal, 10))
    if (storedSeen) setHasSeenNotifs(storedSeen === 'true')
    else setHasSeenNotifs(false) 
  }, [user])

  useEffect(() => {
    if (!user) return
    
    if (totalUnread > lastTotal) {
      setHasSeenNotifs(false)
      localStorage.setItem(`notif_has_seen_${user.id}`, 'false')
    }
    setLastTotal(totalUnread)
    localStorage.setItem(`notif_last_total_${user.id}`, totalUnread.toString())
  }, [totalUnread, lastTotal, user])

  const firstName = propFirstName || user?.firstName || 'User'
  const profilePic = propProfilePic || user?.profilePic

  const displayCount = hasSeenNotifs ? 0 : totalUnread

  const handleNotifClick = () => {
    setHasSeenNotifs(true)
    if (user) {
      localStorage.setItem(`notif_has_seen_${user.id}`, 'true')
    }
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
          <div className="dashboard__header-left dashboard__header-left--user">
            <div className="dashboard__avatar" onClick={() => router.push('/dashboard/me')}>
              <UserAvatar src={profilePic} alt={firstName} size={44} />
            </div>
            <div className="dashboard__greeting-block">
              <span className="dashboard__greeting-eyebrow">Hey,</span>
              <div className="dashboard__greeting">
                <span className="dashboard__greeting-name">{firstName}</span>
              </div>
              <div className="dashboard__email" onClick={() => router.push('/dashboard/me')}>
                View Profile
              </div>
            </div>
          </div>

          {isDesktop && (
            <div className="dashboard__header-brand">
              <UpwardLogo size={28} />
            </div>
          )}

          <nav className="dashboard__header-nav">
            {(() => {
              const isActive = (href: string) => {
                const normalizedPath = pathname?.endsWith('/') ? pathname : `${pathname}/`
                const normalizedHref = href.endsWith('/') ? href : `${href}/`
                return normalizedPath === normalizedHref
              }
              return (
                <>
                  <Link href="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>Home</Link>
                  <Link href="/dashboard/pay-rent" className={isActive('/dashboard/pay-rent') ? 'active' : ''}>Pay Rent</Link>
                  <button
                    type="button"
                    className="dashboard__header-features"
                    onClick={openFeaturesMenu}
                  >
                    <LayoutGrid size={15} />
                    <span>Features</span>
                  </button>
                  <Link href="/dashboard/transactions" className={isActive('/dashboard/transactions') ? 'active' : ''}>Transactions</Link>
                  <Link href="/dashboard/me" className={isActive('/dashboard/me') ? 'active' : ''}>Profile</Link>
                </>
              )
            })()}
          </nav>

          <div className="dashboard__header-right">
            {isDesktop && (
              <div
                className="dashboard__desktop-avatar"
                onClick={() => router.push('/dashboard/me')}
                title="Profile"
              >
                <UserAvatar src={profilePic} alt={firstName} size={40} />
              </div>
            )}
            <button className="dashboard__icon-btn" onClick={() => router.push('/dashboard/settings')} title="Settings">
              <Settings size={18} />
            </button>
            <button
              className={`dashboard__icon-btn dashboard__icon-btn--notif ${displayCount > 0 ? 'has-unread' : ''}`}
              onClick={handleNotifClick}
              title="Notifications"
            >
              <Bell size={18} />
              {displayCount > 0 && <span className="dashboard__notif-badge">{displayCount}</span>}
            </button>
          </div>
        </div>
      </header>
      
      <Suspense fallback={null}>
        <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      </Suspense>
    </>
  )
}

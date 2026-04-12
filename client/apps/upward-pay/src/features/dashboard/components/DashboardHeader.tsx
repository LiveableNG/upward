'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, Settings } from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'

import { NotificationPanel } from './NotificationPanel'

interface DashboardHeaderProps {
  firstName: string
  notifCount: number
  profilePic?: string
}

export function DashboardHeader({ firstName, notifCount, profilePic }: DashboardHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isNotifOpen, setIsNotifOpen] = useState(false)

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
      <header className="dashboard__header">


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
          <button className="dashboard__icon-btn" onClick={() => router.push('/dashboard/settings')}>
            <Settings size={18} />
          </button>
          <button
            className="dashboard__icon-btn dashboard__icon-btn--notif"
            onClick={handleNotifClick}
          >
            <Bell size={18} />
            {notifCount > 0 && <span className="dashboard__notif-badge">{notifCount}</span>}
          </button>


        </div>
      </header>
      
      {/* Slide-over Notification Panel */}
      <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  )
}

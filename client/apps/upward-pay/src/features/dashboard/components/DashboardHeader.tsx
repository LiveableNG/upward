'use client'

import { useRouter } from 'next/navigation'
import { Bell, Settings } from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'

interface DashboardHeaderProps {
  firstName: string
  notifCount: number
  profilePic?: string
}

export function DashboardHeader({ firstName, notifCount, profilePic }: DashboardHeaderProps) {
  const router = useRouter()

  return (
    <header className="dashboard__header dashboard__header--mobile">
      <div className="dashboard__header-left">
        <div className="dashboard__avatar" onClick={() => router.push('/dashboard/me')}>
          <UserAvatar src={profilePic} size={40} />
        </div>
        <div>
          <div className="dashboard__greeting">
            Hey, <span className="dashboard__greeting-name">{firstName}</span>
          </div>
          <div className="dashboard__email" onClick={() => router.push('/dashboard/me')}>
            View Profile
          </div>
        </div>
      </div>
      <div className="dashboard__header-right">
        <button className="dashboard__icon-btn" onClick={() => router.push('/dashboard/settings')}>
          <Settings size={18} />
        </button>
        <button
          className="dashboard__icon-btn dashboard__icon-btn--notif"
          onClick={() => router.push('/dashboard/notifications')}
        >
          <Bell size={18} />
          {notifCount > 0 && <span className="dashboard__notif-badge">{notifCount}</span>}
        </button>
      </div>
    </header>
  )
}

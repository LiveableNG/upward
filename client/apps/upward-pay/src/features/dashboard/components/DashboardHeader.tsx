'use client'

import { useRouter } from 'next/navigation'
import { FileText, HelpCircle, Bell } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'

interface DashboardHeaderProps {
  firstName: string
  notifCount: number
}

export function DashboardHeader({ firstName, notifCount }: DashboardHeaderProps) {
  const router = useRouter()

  return (
    <header className="dashboard__header dashboard__header--mobile">
      <div className="dashboard__header-left">
        <div className="dashboard__avatar" onClick={() => router.push('/dashboard/me')}>
          <UpwardLogo size={22} className="text-white" />
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
        <button className="dashboard__icon-btn" onClick={() => router.push('/dashboard/documents')}>
          <FileText size={18} color="white" />
        </button>
        <button className="dashboard__icon-btn" onClick={() => router.push('/dashboard/help')}>
          <HelpCircle size={18} />
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

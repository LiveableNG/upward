'use client'

import React, { useState } from 'react'
import { Bell, Settings, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import { NotificationPanel } from './NotificationPanel'
import { UserAvatar } from '@/components/common/UserAvatar'

interface DashboardHeaderProps {
  firstName?: string
  notifCount?: number
  profilePic?: string | null
}

export function DashboardHeader({ 
  firstName: propFirstName, 
  notifCount: propNotifCount, 
  profilePic: propProfilePic 
}: DashboardHeaderProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isNotifOpen, setIsNotifOpen] = useState(false)

  const firstName = propFirstName || user?.firstName || 'User'
  const profilePic = propProfilePic !== undefined ? propProfilePic : user?.profilePic
  const notifCount = propNotifCount || 0

  return (
    <>
      <header className="dashboard__header dashboard__header--mobile">
        <div className="dashboard__header-inner">
          <div className="dashboard__header-left">
            <div className="dashboard__avatar-wrap" onClick={() => router.push('/dashboard/me')}>
              <UserAvatar 
                src={profilePic} 
                alt={firstName} 
                size={40} 
                className="dashboard__avatar" 
              />
            </div>
            <div className="dashboard__greeting">
              Hi, <span className="dashboard__greeting-name">{firstName}</span>
            </div>
          </div>

          <div className="dashboard__header-right">
            <button 
              className="dashboard__icon-btn" 
              onClick={() => setIsNotifOpen(true)}
              style={{ position: 'relative' }}
              aria-label="Notifications"
            >
              <Bell size={20} />
              {notifCount > 0 && <span className="dashboard__notif-badge">{notifCount}</span>}
            </button>
            <button 
              className="dashboard__icon-btn" 
              onClick={() => router.push('/dashboard/settings')}
              aria-label="Settings"
            >
              <Settings size={20} />
            </button>
            <button 
              className="dashboard__logout" 
              onClick={() => logout()} 
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      
      <style jsx>{`
        .dashboard__avatar-wrap {
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .dashboard__avatar-wrap:hover {
          transform: scale(1.08);
        }
        .dashboard__notif-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: var(--error);
          color: white;
          font-size: 10px;
          font-weight: 800;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid var(--surface);
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </>
  )
}
'use client'

import React from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { LogOut, Bell } from 'lucide-react'
import Link from 'next/link'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useVerificationStatus } from '@/features/pm/hooks/useVerification'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePmNotifications, usePmNotificationActions } from '@/features/pm/hooks/usePmNotifications'
import { AlertCircle, Calendar, Sparkles, Check, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DesktopHeader() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { data: verification } = useVerificationStatus()

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: notifData } = usePmNotifications()
  const { notifications = [], unreadCount = 0 } = notifData || {}
  const { markRead, markAllRead } = usePmNotificationActions()

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isDropdownOpen])

  if (!user) return null

  const isPending = verification?.status === 'PENDING'

  const handleNotificationClick = (notif: any) => {
    markRead.mutate(notif.uuid)
    setIsDropdownOpen(false)
    if (notif.url) {
      router.push(notif.url)
    }
  }

  const cleanEmoji = (text: string): string => {
    if (!text) return ''
    return text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim()
  }

  const getRelativeTime = (dateStr: string) => {
    const now = new Date()
    const past = new Date(dateStr)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT_COMPLETED':
        return <CheckCircle2 size={16} className="notif-icon--success" />
      case 'PAYMENT_OVERDUE':
        return <AlertCircle size={16} className="notif-icon--error" />
      case 'PAYMENT_DUE':
      case 'PAYMENT_PROOF':
        return <Calendar size={16} className="notif-icon--warning" />
      default:
        return <Sparkles size={16} className="notif-icon--system" />
    }
  }

  return (
    <header className="desktop-header">
      <div className="desktop-header__search">
        {/* Optional Search Bar can go here later */}
      </div>

      <div className="desktop-header__actions">
        
        {/* Notification Bell */}
        <div className="pm-notifications" ref={dropdownRef}>
          <button 
            className={cn("pm-notifications__bell-btn", isDropdownOpen && "pm-notifications__bell-btn--active")}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="pm-notifications__badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isDropdownOpen && (
            <div className="pm-notifications__dropdown">
              <div className="pm-notifications__dropdown-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => markAllRead.mutate()}
                    className="pm-notifications__mark-all"
                  >
                    <Check size={12} style={{ marginRight: 4 }} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="pm-notifications__list">
                {notifications.length === 0 ? (
                  <div className="pm-notifications__empty">
                    <Sparkles size={24} style={{ strokeWidth: 1.5, color: 'var(--text-muted)' }} />
                    <p>All caught up!</p>
                  </div>
                ) : (
                  notifications.map((notif: any) => (
                    <div 
                      key={notif.uuid}
                      className={cn(
                        "pm-notifications__item",
                        !notif.isRead && "pm-notifications__item--unread"
                      )}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="pm-notifications__item-icon">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="pm-notifications__item-content">
                        <p className="pm-notifications__item-title">{cleanEmoji(notif.title)}</p>
                        <p className="pm-notifications__item-msg">{cleanEmoji(notif.message)}</p>
                        <span className="pm-notifications__item-time">{getRelativeTime(notif.createdAt)}</span>
                      </div>
                      {!notif.isRead && (
                        <div className="pm-notifications__item-dot" />
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pm-notifications__dropdown-footer">
                <Link href="/notifications" onClick={() => setIsDropdownOpen(false)}>
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="desktop-header__profile">
          {user.isVerified ? (
            <div 
              style={{ 
                padding: '4px 10px', 
                borderRadius: 20, 
                background: 'rgba(16, 185, 129, 0.1)', 
                color: '#10b981', 
                fontSize: 11, 
                fontWeight: 700,
                marginRight: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
                <div style={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    background: '#10b981' 
                }} />
                VERIFIED
            </div>
          ) : (
            <Link 
              href="/settings"
              className=""
              style={{ 
                padding: '4px 10px', 
                borderRadius: 20, 
                background: isPending ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                color: isPending ? '#3b82f6' : '#ef4444', 
                fontSize: 11, 
                fontWeight: 700,
                marginRight: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: `1px solid ${isPending ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                cursor: 'pointer'
              }}
            >
                <div style={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    background: isPending ? '#3b82f6' : '#ef4444' 
                }} />
                {isPending ? 'PENDING REVIEW' : 'UNVERIFIED'}
            </Link>
          )}
          <div className="desktop-header__user-info">
            <span className="desktop-header__name">{user.firstName} {user.lastName}</span>
            <span className="desktop-header__role">{user.businessName || 'Property Manager'}</span>
          </div>
          
          <Link href="/settings" className="desktop-header__avatar">
            <UserAvatar 
              src={user.profilePic} 
              alt="Avatar" 
              size={40} 
              initials={`${user.firstName[0] || 'P'}${user.lastName[0] || 'M'}`}
            />
          </Link>

          <button onClick={logout} className="desktop-header__logout" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .pm-notifications {
          position: relative;
          margin-right: 20px;
          display: flex;
          align-items: center;
        }
        .pm-notifications__bell-btn {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .pm-notifications__bell-btn:hover,
        .pm-notifications__bell-btn--active {
          background: var(--ivory-dim);
          border-color: var(--border-strong);
          color: var(--text);
          transform: scale(1.05);
        }
        .pm-notifications__badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 800;
          height: 18px;
          min-width: 18px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid var(--surface);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .pm-notifications__dropdown {
          position: absolute;
          top: 50px;
          right: 0;
          width: 360px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-strong);
          border-radius: 20px;
          box-shadow: var(--shadow-xl);
          z-index: 100;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideDown 0.2s ease-out forwards;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pm-notifications__dropdown-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .pm-notifications__dropdown-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: var(--text);
        }
        .pm-notifications__mark-all {
          background: none;
          border: none;
          color: var(--forest);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.2s;
        }
        .pm-notifications__mark-all:hover {
          background: var(--forest-faint);
        }
        .pm-notifications__list {
          max-height: 380px;
          overflow-y: auto;
        }
        .pm-notifications__empty {
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
        }
        .pm-notifications__empty p {
          margin: 0;
          font-size: 14px;
          color: var(--text-muted);
          font-weight: 500;
        }
        .pm-notifications__item {
          padding: 16px 20px;
          display: flex;
          gap: 14px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid var(--border-light);
          position: relative;
        }
        .pm-notifications__item:hover {
          background: var(--ivory-dim);
        }
        .pm-notifications__item--unread {
          background: rgba(22, 101, 52, 0.02);
        }
        .pm-notifications__item-icon {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          border: 1px solid var(--border);
        }
        :global(.notif-icon--success) { color: var(--forest); }
        :global(.notif-icon--error) { color: #ef4444; }
        :global(.notif-icon--warning) { color: #d97706; }
        :global(.notif-icon--system) { color: #6366f1; }
        
        .pm-notifications__item-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .pm-notifications__item-title {
          margin: 0;
          font-size: 13px;
          font-weight: 750;
          color: var(--text);
        }
        .pm-notifications__item-msg {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pm-notifications__item-time {
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 600;
          margin-top: 2px;
        }
        .pm-notifications__item-dot {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--forest);
        }
        .pm-notifications__dropdown-footer {
          padding: 12px;
          text-align: center;
          border-top: 1px solid var(--border);
          background: var(--ivory-dim);
        }
        .pm-notifications__dropdown-footer :global(a) {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.2s;
        }
        .pm-notifications__dropdown-footer :global(a):hover {
          color: var(--text);
        }
      `}</style>
    </header>
  )
}

'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, AlertCircle, Calendar, Sparkles, CheckCircle2 } from 'lucide-react'
import { usePmNotifications, usePmNotificationActions } from '@/features/pm/hooks/usePmNotifications'
import { cn } from '@/lib/utils'

export default function NotificationsPage() {
  const router = useRouter()
  const { data, isLoading } = usePmNotifications()
  const { notifications = [], unreadCount = 0 } = data || {}
  const { markRead, markAllRead } = usePmNotificationActions()

  const cleanEmoji = (text: string): string => {
    if (!text) return ''
    return text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim()
  }

  const getRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT_COMPLETED':
        return <CheckCircle2 size={20} className="notif-hub-icon--success" />
      case 'PAYMENT_OVERDUE':
        return <AlertCircle size={20} className="notif-hub-icon--error" />
      case 'PAYMENT_DUE':
        return <Calendar size={20} className="notif-hub-icon--warning" />
      default:
        return <Sparkles size={20} className="notif-hub-icon--system" />
    }
  }

  return (
    <div className="notifications-hub animate-fade-in">
      <header className="notifications-hub__header">
        <button 
          onClick={() => router.push('/dashboard')}
          className="notifications-hub__back-btn"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
        
        <div className="notifications-hub__title-wrap">
          <div>
            <h1 className="notifications-hub__title">Notifications Hub</h1>
            <p className="notifications-hub__desc">Stay informed about your properties, tenants, and payment activities.</p>
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={() => markAllRead.mutate()}
              className="btn btn--primary notifications-hub__mark-all-btn"
            >
              <Check size={16} />
              Mark all as read
            </button>
          )}
        </div>
      </header>

      <main className="notifications-hub__content">
        {isLoading ? (
          <div className="notifications-hub__loading">
            <div className="spinner" />
            <p>Loading your notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-hub__empty">
            <div className="notifications-hub__empty-icon">
              <Sparkles size={32} />
            </div>
            <h2>All Caught Up!</h2>
            <p>You have no notifications at the moment. We'll let you know when important payment events occur.</p>
          </div>
        ) : (
          <div className="notifications-hub__list">
            {notifications.map((notif: any) => (
              <div 
                key={notif.uuid}
                className={cn(
                  "notifications-hub__item",
                  !notif.isRead && "notifications-hub__item--unread"
                )}
                onClick={() => {
                  if (!notif.isRead) markRead.mutate(notif.uuid)
                  if (notif.url) router.push(notif.url)
                }}
              >
                <div className={cn(
                  "notifications-hub__item-icon-wrap",
                  `notifications-hub__item-icon-wrap--${notif.type.toLowerCase()}`
                )}>
                  {getNotificationIcon(notif.type)}
                </div>
                
                <div className="notifications-hub__item-details">
                  <div className="notifications-hub__item-meta">
                    <h3 className="notifications-hub__item-title">{cleanEmoji(notif.title)}</h3>
                    <span className="notifications-hub__item-time">{getRelativeTime(notif.createdAt)}</span>
                  </div>
                  <p className="notifications-hub__item-msg">{cleanEmoji(notif.message)}</p>
                </div>

                {!notif.isRead && (
                  <div className="notifications-hub__unread-indicator">
                    <div className="notifications-hub__unread-dot" />
                    <button 
                      className="notifications-hub__mark-read-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        markRead.mutate(notif.uuid)
                      }}
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        .notifications-hub {
          padding: 40px;
          max-width: var(--max-width);
          margin: 0 auto;
          min-height: 100vh;
        }

        .notifications-hub__header {
          margin-bottom: 40px;
        }

        .notifications-hub__back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 24px;
        }

        .notifications-hub__back-btn:hover {
          background: var(--ivory-dim);
          border-color: var(--border-strong);
          color: var(--text);
          transform: translateX(-2px);
        }

        .notifications-hub__title-wrap {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
        }

        .notifications-hub__title {
          font-size: 32px;
          font-weight: 850;
          color: var(--text);
          margin: 0 0 8px 0;
          letter-spacing: -0.03em;
        }

        .notifications-hub__desc {
          font-size: 15px;
          color: var(--text-muted);
          margin: 0;
          font-weight: 500;
        }

        .notifications-hub__mark-all-btn {
          background: var(--forest) !important;
          border-color: var(--forest) !important;
          color: white !important;
          box-shadow: 0 4px 12px var(--forest-glow);
        }

        .notifications-hub__mark-all-btn:hover {
          background: var(--forest-hover) !important;
          transform: translateY(-2px);
        }

        .notifications-hub__content {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          min-height: 400px;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .notifications-hub__loading {
          padding: 80px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: var(--text-secondary);
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--forest);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .notifications-hub__empty {
          padding: 100px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 440px;
          margin: 0 auto;
        }

        .notifications-hub__empty-icon {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: var(--ivory-dim);
          border: 2px dashed var(--border-strong);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          margin-bottom: 24px;
        }

        .notifications-hub__empty h2 {
          font-size: 22px;
          font-weight: 800;
          color: var(--text);
          margin: 0 0 8px 0;
        }

        .notifications-hub__empty p {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
          margin: 0;
          font-weight: 500;
        }

        .notifications-hub__list {
          display: flex;
          flex-direction: column;
        }

        .notifications-hub__item {
          padding: 24px 32px;
          display: flex;
          align-items: center;
          gap: 20px;
          border-bottom: 1px solid var(--border-light);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .notifications-hub__item:last-child {
          border-bottom: none;
        }

        .notifications-hub__item:hover {
          background: var(--ivory-dim);
        }

        .notifications-hub__item--unread {
          background: rgba(22, 101, 52, 0.015);
        }

        .notifications-hub__item-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--surface);
          border: 1px solid var(--border);
        }

        .notifications-hub__item-icon-wrap--payment_completed {
          background: #f0fdf4;
          border-color: #dcfce7;
        }
        .notifications-hub__item-icon-wrap--payment_overdue {
          background: #fef2f2;
          border-color: #fee2e2;
        }
        .notifications-hub__item-icon-wrap--payment_due {
          background: #fffbeb;
          border-color: #fef3c7;
        }

        .notif-hub-icon--success { color: var(--forest); }
        .notif-hub-icon--error { color: #ef4444; }
        .notif-hub-icon--warning { color: #d97706; }
        .notif-hub-icon--system { color: #6366f1; }

        .notifications-hub__item-details {
          flex: 1;
          min-width: 0;
        }

        .notifications-hub__item-meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 4px;
        }

        .notifications-hub__item-title {
          font-size: 15px;
          font-weight: 800;
          color: var(--text);
          margin: 0;
        }

        .notifications-hub__item-time {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          flex-shrink: 0;
        }

        .notifications-hub__item-msg {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
          font-weight: 500;
        }

        .notifications-hub__unread-indicator {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }

        .notifications-hub__unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--forest);
        }

        .notifications-hub__mark-read-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s;
        }

        .notifications-hub__item:hover .notifications-hub__mark-read-btn {
          opacity: 1;
        }

        .notifications-hub__mark-read-btn:hover {
          background: var(--forest-faint);
          border-color: var(--forest);
          color: var(--forest);
        }

        @media (max-width: 768px) {
          .notifications-hub { padding: 20px; }
          .notifications-hub__title-wrap { flex-direction: column; align-items: flex-start; }
          .notifications-hub__mark-all-btn { width: 100%; justify-content: center; }
          .notifications-hub__item { padding: 16px 20px; }
        }
      `}</style>
    </div>
  )
}

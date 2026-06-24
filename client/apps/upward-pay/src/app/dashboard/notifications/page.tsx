'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Bell, Calendar, Megaphone, Info, ArrowRight, UserCircle, Clock, Landmark } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import FallbackSuspense from '@/components/FallbackSuspense'
import { formatCurrency } from '@/lib/utils'

const ICON_MAP: Record<string, React.ReactNode> = {
  SYSTEM: <Info size={18} />,
  SUPPORT: <Megaphone size={18} />,
  PAYMENT: <Landmark size={18} />,
  RENT_REMINDER: <Clock size={18} />,
}

type TabType = 'Transactions' | 'Services' | 'Activities'

export default function NotificationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryTab = searchParams.get('tab')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('Transactions')

  useEffect(() => {
    if (queryTab === 'Activities' || queryTab === 'Services' || queryTab === 'Transactions') {
      setActiveTab(queryTab as TabType)
    }
  }, [queryTab])

  const { data: notifData, isLoading: isNotifLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  })

  const { data: pendingPayments } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: () => api.getPendingPayments(),
  })

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api.getProfile(),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-counts'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: (category: TabType) => api.post('/user/notifications/mark-category-read', { category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-counts'] })
    },
  })

  // Auto-mark category as read when switching tabs
  useEffect(() => {
    if (isNotifLoading) return
    
    const timer = setTimeout(() => {
      if (activeTab === 'Services') {
        markAllReadMutation.mutate(activeTab)
      }
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [activeTab, isNotifLoading])

  const notifications = useMemo(() => {
    const raw = [...(notifData?.notifications || [])]
    const dynamicActivities: any[] = []

    if (pendingPayments) {
      pendingPayments.forEach((p: any) => {
        dynamicActivities.push({
          id: `pending-pay-${p.uuid}`,
          type: 'RENT_REMINDER',
          title: 'Unpaid Invoice',
          message: `${p.company_name || 'Service'} requested ${formatCurrency(p.total_amount, p.currency)}.`,
          createdAt: p.createdAt || new Date().toISOString(),
          isRead: false,
          isDynamic: true,
          url: `/pay/${p.uuid}`,
        })
      })
    }

    const hasProperties = userProfile?.properties && userProfile.properties.length > 0
    if (!hasProperties) {
      dynamicActivities.push({
        id: 'activity-kyc',
        type: 'SYSTEM',
        title: 'Action Required',
        message: 'Complete your property details to start building your credibility score.',
        createdAt: new Date().toISOString(),
        isRead: false,
        isDynamic: true,
        url: '/dashboard/setup',
        icon: <UserCircle size={18} />
      })
    }

    return [...raw, ...dynamicActivities]
  }, [notifData, pendingPayments, userProfile])

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeTab === 'Transactions') return n.type === 'PAYMENT'
      if (activeTab === 'Services') return n.type === 'SUPPORT' || n.type === 'SYSTEM'
      if (activeTab === 'Activities') return n.type === 'RENT_REMINDER'
      return true
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [notifications, activeTab])

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, any[]> = { Today: [], Yesterday: [], Earlier: [] }
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    filteredNotifications.forEach((notif) => {
      const d = new Date(notif.createdAt)
      if (d.toDateString() === today.toDateString()) groups['Today'].push(notif)
      else if (d.toDateString() === yesterday.toDateString()) groups['Yesterday'].push(notif)
      else groups['Earlier'].push(notif)
    })
    return groups
  }, [filteredNotifications])

  if (isNotifLoading) return <FallbackSuspense message="Loading notifications..." />

  const handleMarkRead = (notif: any) => {
    if (!notif.isRead && !notif.isDynamic) {
      markReadMutation.mutate(notif.id)
    }
    if (notif.url) {
      router.push(notif.url)
    }
  }

  return (
    <div className="dashboard notifications-page dashboard--nav-offset">
      <header className="page-header fixed-top-mobile">
        <div className="header-content">
          <div className="header-left">
            <button className="back-btn" onClick={() => router.back()}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="header-title">Notifications</h1>
          </div>
          
          <nav className="tab-switcher">
            {(['Transactions', 'Services', 'Activities'] as TabType[]).map(tab => (
              <button 
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="content-area">
        {filteredNotifications.length === 0 ? (
          <div className="dashboard__empty" style={{ paddingTop: '100px' }}>
            <div className="dashboard__empty-icon">
              <Bell size={48} color="var(--text-muted)" />
            </div>
            <p>No {activeTab.toLowerCase()} to show right now.</p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([group, list]) => (
            list.length > 0 && (
              <div key={group} className="notification-group">
                <h3 className="notification-group__title">{group}</h3>
                {list.map((notif) => (
                  <div
                    key={notif.id}
                    className={`notification-card ${!notif.isRead ? 'unread' : ''}`}
                    onClick={() => handleMarkRead(notif)}
                  >
                    <div className="card-icon-wrap">
                      {notif.icon || ICON_MAP[notif.type] || <Info size={18} />}
                    </div>
                    <div className="card-content">
                      <div className="card-top">
                        <span className="card-title">{notif.title}</span>
                        {!notif.isRead && <div className="unread-dot" />}
                      </div>
                      <div 
                      className="card-msg card-msg--truncate" 
                      dangerouslySetInnerHTML={{ __html: notif.message }} 
                    />
                      <div className="card-footer">
                        <span className="card-time">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {notif.url && (
                          <span className="card-view-all">
                            View <ArrowRight size={12} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ))
        )}
      </div>

      <style jsx>{`
        .notifications-page {
          min-height: calc(100vh - var(--header-height, 72px));
          background: var(--shell-page-bg, #faf8f5);
          padding: 0;
        }

        .page-header.fixed-top-mobile {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: var(--shell-page-bg, #faf8f5);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--shell-border, #f0e9df);
          padding: 12px 20px 8px;
        }

        .header-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .back-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid #ece4d9;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #5c544b;
          cursor: pointer;
        }

        .header-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #1a1714;
          letter-spacing: -0.01em;
        }

        .tab-switcher {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
          padding: 4px;
          background: #f0e9df;
          border-radius: 12px;
        }

        .tab-btn {
          flex: 1;
          padding: 9px 8px;
          border: none;
          background: transparent;
          color: #8a8178;
          font-size: 12px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn.active {
          background: #fff;
          color: var(--skin-primary, #c2501f);
          box-shadow: 0 1px 2px rgba(60, 40, 20, 0.08);
        }

        .content-area {
          max-width: 720px;
          margin: 0 auto;
          padding: 122px 16px 28px;
        }

        .notification-group {
          margin-bottom: 32px;
        }

        .notification-group__title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--shell-muted, #a9a096);
          letter-spacing: 0.12em;
          margin: 0 4px 10px;
        }

        .notification-card {
          display: flex;
          gap: 14px;
          padding: 16px;
          background: #fff;
          border: 1px solid var(--shell-border, #f0e9df);
          border-radius: 16px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
          box-shadow: 0 1px 2px rgba(60, 40, 20, 0.04);
        }

        .notification-card.unread {
          background: #fbede5;
          border-color: rgba(194, 80, 31, 0.22);
        }

        .card-icon-wrap {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid #ece4d9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--skin-primary, #c2501f);
        }

        .card-content {
          flex: 1;
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .card-title {
          font-size: 14px;
          font-weight: 700;
          color: #1a1714;
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          background: var(--skin-primary, #c2501f);
          border-radius: 50%;
        }

        .card-msg {
          font-size: 12.5px;
          color: #7a7268;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .card-msg--truncate {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-msg :global(strong) {
          color: #1a1714;
          font-weight: 700;
        }

        .card-msg :global(p) {
          margin-bottom: 8px;
        }

        .card-msg :global(ul) {
          margin-left: 16px;
          margin-bottom: 8px;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-time {
          font-size: 11.5px;
          color: #a9a096;
          font-weight: 500;
        }

        .card-view-all {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--skin-primary, #c2501f);
        }
      `}</style>
    </div>
  )
}

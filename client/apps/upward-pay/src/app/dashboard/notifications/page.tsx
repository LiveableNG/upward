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
        url: '/dashboard/me?view=personal',
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
    <div className="dashboard notifications-page">
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
          min-height: 100vh;
          background: var(--bg);
          padding: 0; /* Remove default dashboard padding to make header flush */
        }

        .page-header.fixed-top-mobile {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: var(--bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-solid);
          padding: 16px 20px 8px;
        }

        .header-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .back-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--border-solid);
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text);
        }

        .header-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text);
        }

        .tab-switcher {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          padding: 4px;
          background: var(--surface2);
          border-radius: 12px;
        }

        .tab-btn {
          flex: 1;
          padding: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn.active {
          background: var(--surface);
          color: var(--clay);
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        .content-area {
          max-width: 800px;
          margin: 0 auto;
          padding: 125px 20px 40px; /* Account for fixed header height */
        }

        .notification-group {
          margin-bottom: 32px;
        }

        .notification-group__title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }

        .notification-card {
          display: flex;
          gap: 16px;
          padding: 16px;
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-radius: 16px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .notification-card.unread {
          background: var(--clay-faint);
          border-color: rgba(217, 119, 87, 0.1);
        }

        .card-icon-wrap {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 12px;
          background: var(--bg);
          border: 1px solid var(--border-solid);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--clay);
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
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text);
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          background: var(--error);
          border-radius: 50%;
        }

        .card-msg {
          font-size: 0.85rem;
          color: var(--text-muted);
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
          color: var(--text);
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
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .card-view-all {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--clay);
        }
      `}</style>
    </div>
  )
}

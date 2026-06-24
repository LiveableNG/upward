'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bell, Calendar, Megaphone, Info, X, Zap, Clock, Landmark, ArrowRight, UserCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

const ICON_MAP: Record<string, React.ReactNode> = {
  SYSTEM: <Info size={16} />,
  SUPPORT: <Megaphone size={16} />,
  PAYMENT: <Landmark size={16} style={{ color: 'var(--clay)' }} />,
  RENT_REMINDER: <Clock size={16} style={{ color: 'var(--clay)' }} />,
}

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'Transactions' | 'Services' | 'Activities'

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const { data: notifData, isLoading: isNotifLoading, isFetching: isNotifFetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    enabled: isOpen,
  })

  const { data: pendingPayments } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: () => api.getPendingPayments(),
    enabled: isOpen,
  })

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api.getProfile(),
    enabled: isOpen,
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

  const updateAnnouncementMutation = useMutation({
    mutationFn: (announcementId: number) => api.patch('/user/notifications/announcements/state', {
      announcementId,
      interactedBanner: true,
      interactedPopup: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const triggeredPanelIdRef = React.useRef<number | null>(null)

  // Auto-mark category as read when switching tabs
  useEffect(() => {
    if (!isOpen || isNotifLoading || isNotifFetching) return
    
    const timer = setTimeout(() => {
      // Only auto-mark 'Services' as read. 
      // Transactions and Activities (Rent/Payments) stay unread until clicked or paid.
      if (activeTab === 'Services') {
        markAllReadMutation.mutate(activeTab)
        
        // Also mark announcement as read if it exists
        if (
          notifData?.activeAnnouncement && 
          !notifData.activeAnnouncement.state.interactedBanner &&
          triggeredPanelIdRef.current !== notifData.activeAnnouncement.id
        ) {
          triggeredPanelIdRef.current = notifData.activeAnnouncement.id
          updateAnnouncementMutation.mutate(notifData.activeAnnouncement.id)
        }
      }
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [activeTab, isOpen, isNotifLoading, isNotifFetching, notifData])

  const notifications = useMemo(() => {
    const raw = [...(notifData?.notifications || [])]
    
    // Inject dynamic activities
    const dynamicActivities: any[] = []

    // 1. Pending Payments (Invoices)
    if (pendingPayments) {
      pendingPayments.forEach((p: any) => {
        dynamicActivities.push({
          id: `pending-pay-${p.uuid}`,
          type: 'RENT_REMINDER', // Mapping to activity
          title: 'Unpaid Invoice',
          message: `${p.company_name || 'Service'} requested ${formatCurrency(p.total_amount, p.currency)}.`,
          createdAt: p.createdAt || new Date().toISOString(),
          isRead: false,
          isDynamic: true,
          url: `/pay/${p.uuid}`,
        })
      })
    }

    // 2. Profile Completion Activity
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
        icon: <UserCircle size={16} />
      })
    }

    return [...raw, ...dynamicActivities]
  }, [notifData, pendingPayments, userProfile])

  const tabCounts = useMemo(() => {
    const counts: Record<TabType, number> = { Transactions: 0, Services: 0, Activities: 0 }
    notifications.forEach((n) => {
      if (!n.isRead) {
        if (n.type === 'PAYMENT') counts.Transactions++
        else if (n.type === 'SUPPORT' || n.type === 'SYSTEM') counts.Services++
        else if (n.type === 'RENT_REMINDER') counts.Activities++
      }
    })
    return counts
  }, [notifications])

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

  if (!isOpen) return null

  const handleMarkRead = (notif: any) => {
    if (notif.id.toString().startsWith('announcement-')) {
      const annId = parseInt(notif.id.replace('announcement-', ''))
      updateAnnouncementMutation.mutate(annId)
    } else if (!notif.isRead && !notif.isDynamic) {
      markReadMutation.mutate(notif.id)
    }
    if (notif.url) {
      onClose()
      router.push(notif.url)
    }
  }

  return (
    <>
      <div className="notification-panel-overlay" onClick={onClose} />
      <div className="notification-panel">
        <header className="notification-panel__header">
          <div className="notification-panel__header-top">
            <button className="notification-panel__close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          
          <nav className="notification-panel__tabs">
            {(['Transactions', 'Services', 'Activities'] as TabType[]).map(tab => (
              <button 
                key={tab}
                className={`notification-panel__tab ${activeTab === tab ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveTab(tab)
                }}
              >
                {tab}
                {tabCounts[tab] > 0 && <span className="tab-badge">{tabCounts[tab]}</span>}
              </button>
            ))}
          </nav>
        </header>

        <div className="notification-panel__content">
          {isNotifLoading ? (
            <div className="notification-panel__loading">
              <div className="loading-spinner--clay" />
              <p>Scanning updates...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="dashboard__empty" style={{ paddingTop: '60px' }}>
              <div className="dashboard__empty-icon">
                <Bell size={40} color="var(--text-muted)" />
              </div>
              <p>No {activeTab.toLowerCase()} to show right now.</p>
            </div>
          ) : (
            <div className="notification-list">
              {Object.entries(groupedNotifications).map(([group, list]) => (
                list.length > 0 && (
                  <div key={group} className="notification-group">
                    <h3 className="notification-group__title">{group}</h3>
                    {list.map((notif) => (
                      <div
                        key={notif.id}
                        className={`notification-card ${!notif.isRead ? 'unread' : ''}`}
                        onClick={() => handleMarkRead(notif)}
                      >
                        <div className="notification-card__body">
                          <div className={`notification-card__icon-wrap type-${notif.type.toLowerCase()}`}>
                            {notif.icon || ICON_MAP[notif.type] || <Info size={16} />}
                          </div>
                          
                          <div className="notification-card__info">
                            <div className="notification-card__top">
                              <span className="notification-card__title">{notif.title}</span>
                              <span className="notification-card__dot-anchor">
                                {!notif.isRead && <div className="unread-dot" />}
                              </span>
                            </div>
                            <div 
                              className="notification-card__msg notification-card__msg--truncate" 
                              dangerouslySetInnerHTML={{ __html: notif.message }} 
                            />
                            <div className="notification-card__footer">
                               <span className="notification-card__time">
                                 {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                               {notif.url && (
                                 <span className="notification-card__view">
                                   View <ArrowRight size={12} />
                                 </span>
                               )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .notification-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 100%;
          max-width: 420px;
          height: 100vh;
          background: var(--bg);
          z-index: 10001; /* Higher than sticky headers */
          display: flex;
          flex-direction: column;
          box-shadow: -16px 0 34px rgba(60, 40, 20, 0.18);
          animation: slideIn 0.3s ease-out;
          overflow: hidden; /* Ensure content doesn't bleed out of rounded corners */
        }

        @media (min-width: 1024px) {
          .notification-panel {
            top: 0;
            right: 0;
            height: 100vh;
            border-radius: 0; /* Full height looks better when header is present */
            border-left: 1px solid var(--border-solid);
          }
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .notification-panel-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          z-index: 1000;
        }

        .notification-panel__header {
          padding: 24px 20px 0;
          border-bottom: 1px solid var(--border-solid);
          background: var(--shell-page-bg, #faf8f5);
        }

        .notification-panel__header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .notification-panel__title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text);
        }

        .notification-panel__close {
          background: #fff;
          border: none;
          color: #7a7268;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .notification-panel__tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          padding: 4px;
          background: #f0e9df;
          border-radius: 14px;
          border: 1px solid #e9dfd3;
        }
        
        .notification-panel__tab {
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: #8a8178;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          flex: 1;
          text-align: center;
          white-space: nowrap;
        }

        .notification-panel__tab:hover {
          background: #fff;
          border-color: #eadfd4;
          color: #5c544b;
        }

        .notification-panel__tab.active {
          background: var(--skin-primary, #c2501f);
          border-color: var(--skin-primary, #c2501f);
          color: #fff;
          box-shadow: 0 4px 10px rgba(194, 80, 31, 0.28);
          transform: translateY(-1px);
        }

        .tab-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          background: var(--error);
          color: #fff;
          border-radius: 9px;
          font-size: 0.65rem;
          margin-left: 6px;
          vertical-align: middle;
        }

        .notification-panel__tab.active .tab-badge {
          background: #fff;
          color: var(--error);
        }

        .notification-panel__content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 20px;
          background: var(--shell-page-bg, #faf8f5);
          position: relative;
          min-height: 0; /* Critical for flex scroll */
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
          margin-bottom: 16px;
        }

        .notification-card {
          background: #fff;
          border: 1px solid var(--shell-border, #f0e9df);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .notification-card:hover {
          border-color: var(--clay);
          transform: translateY(-1px);
        }

        .notification-card.unread {
          background: #fbede5;
          border-color: rgba(194, 80, 31, 0.22);
        }

        .notification-card__body {
          display: flex;
          gap: 16px;
        }

        .notification-card__icon-wrap {
          width: 36px;
          height: 36px;
          min-width: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fbede5;
          color: var(--skin-primary, #c2501f);
        }

        .notification-card__icon-wrap.type-payment { color: var(--skin-primary, #c2501f); background: #fbede5; }
        .notification-card__icon-wrap.type-support { color: var(--skin-primary, #c2501f); background: #fbede5; }
        .notification-card__icon-wrap.type-rent_reminder { color: var(--skin-primary, #c2501f); background: #fbede5; }

        .notification-card__info {
          flex: 1;
        }

        .notification-card__top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4px;
        }

        .notification-card__title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          background: var(--skin-primary, #c2501f);
          border-radius: 50%;
          box-shadow: 0 0 0 2px #fff;
        }

        .notification-card__msg {
          font-size: 12.5px;
          color: #7a7268;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .notification-card__msg--truncate {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .notification-card__msg :global(strong) {
          color: var(--text);
          font-weight: 700;
        }

        .notification-card__msg :global(p) {
          margin-bottom: 8px;
        }

        .notification-card__msg :global(ul) {
          margin-left: 16px;
          margin-bottom: 8px;
        }

        .notification-card__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notification-card__time {
          font-size: 11.5px;
          color: #a9a096;
          font-weight: 500;
        }

        .notification-card__view {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--skin-primary, #c2501f);
        }

        .notification-panel__loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding-top: 100px;
          gap: 16px;
          color: var(--text-muted);
        }

        .loading-spinner--clay {
          width: 32px;
          height: 32px;
          border: 3px solid var(--surface2);
          border-top-color: var(--clay);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

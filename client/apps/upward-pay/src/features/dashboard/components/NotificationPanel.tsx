'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Calendar, Megaphone, Info, Check, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const ICON_MAP: Record<string, React.ReactNode> = {
  SYSTEM: <Info size={18} />,
  SUPPORT: <Megaphone size={18} />,
  PAYMENT: <Calendar size={18} />,
}

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Prevent background scrolling when panel is open
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

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    enabled: isOpen,
  })

  const { data: pendingData } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: () => api.getPendingPayments(),
    enabled: isOpen,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  if (!isOpen) return null

  const notifications = [...(data?.notifications || [])]

  // Add pending payments as notifications
  if (pendingData) {
    pendingData.forEach((p: any) => {
      notifications.unshift({
        id: `payment-${p.uuid}`,
        type: 'PAYMENT',
        title: 'Payment Request',
        message: `${p.company_name || 'Your manager'} has requested a payment of ${p.currency}${p.amount || p.total_amount} for ${p.property_address || 'your property'}.`,
        createdAt: new Date().toISOString(),
        read: false,
        url: `/pay/${p.uuid}`,
      })
    })
  }

  const groupedNotifications: Record<string, any[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  }

  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  notifications.forEach((notif: any) => {
    const notifDate = new Date(notif.createdAt)
    if (notifDate.toDateString() === today.toDateString()) {
      groupedNotifications['Today'].push(notif)
    } else if (notifDate.toDateString() === yesterday.toDateString()) {
      groupedNotifications['Yesterday'].push(notif)
    } else {
      groupedNotifications['Earlier'].push(notif)
    }
  })

  const handleMarkRead = (id: string, read: boolean, url?: string) => {
    if (!read) {
      markReadMutation.mutate(id)
    }
    if (url) {
      onClose()
      router.push(url)
    }
  }

  return (
    <>
      <div className="notification-panel-overlay" onClick={onClose} />
      <div className="notification-panel">
        <header className="notification-panel__header">
          <h2 className="notification-panel__title">Notifications</h2>
          <button className="notification-panel__close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="notification-panel__content">
          {isLoading ? (
            <div className="notification-panel__loading">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="dashboard__empty" style={{ paddingTop: '40px' }}>
              <div className="dashboard__empty-icon">
                <Bell size={48} color="var(--text-muted)" />
              </div>
              <p>No notifications yet. We'll let you know when something happens.</p>
            </div>
          ) : (
            <>
              {Object.entries(groupedNotifications).map(
                ([group, list]) =>
                  list.length > 0 && (
                    <div key={group} className="notification-group">
                      <h3 className="notification-group__title">{group}</h3>
                      {list.map((notif) => (
                        <div
                          key={notif.id}
                          className={`notification-card ${!notif.read ? 'notification-card--unread' : ''}`}
                          onClick={() => handleMarkRead(notif.id, notif.read, notif.url)}
                        >
                          <div className="notification-card__icon">
                            {ICON_MAP[notif.type] || <Info size={18} />}
                          </div>
                          <div className="notification-card__content">
                            <div className="notification-card__title">{notif.title}</div>
                            <div className="notification-card__message">{notif.message}</div>
                            <div className="notification-card__time">
                              {new Date(notif.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                          {!notif.read && (
                            <div style={{ color: 'var(--clay)', display: 'flex', alignItems: 'center' }}>
                              <Check size={16} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

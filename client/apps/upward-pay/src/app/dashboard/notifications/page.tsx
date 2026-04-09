'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Calendar, Megaphone, Info, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import FallbackSuspense from '@/components/FallbackSuspense'

const ICON_MAP: Record<string, React.ReactNode> = {
  SYSTEM: <Info size={18} />,
  SUPPORT: <Megaphone size={18} />,
  PAYMENT: <Calendar size={18} />,
}

export default function NotificationsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  if (isLoading) return <FallbackSuspense message="Loading notifications..." />

  const notifications = data?.notifications || []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupedNotifications: Record<string, any[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  }

  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      router.push(url)
    }
  }

  return (
    <div className="dashboard notifications-page">
      <header
        className="dashboard__header"
        style={{ border: 'none', position: 'relative', marginBottom: '24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="dashboard__back" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="dashboard__title">Notifications</h1>
        </div>
      </header>

      {notifications.length === 0 ? (
        <div className="dashboard__empty">
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
                        <div
                          style={{ color: 'var(--clay)', display: 'flex', alignItems: 'center' }}
                        >
                          <Check size={16} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ),
          )}
        </>
      )}
    </div>
  )
}

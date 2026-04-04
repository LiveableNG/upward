'use client'

import { X } from 'lucide-react'
import { Sparkles, Clock, Target } from 'lucide-react'
import { type Notification } from '../types'

const ICON_MAP = {
  sparkles: <Sparkles size={14} color="var(--clay)" />,
  clock: <Clock size={14} color="var(--clay)" />,
  target: <Target size={14} color="var(--clay)" />,
}

interface AnnouncementBannerProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
}

export function AnnouncementBanner({ notifications, onDismiss }: AnnouncementBannerProps) {
  return (
    <>
      {notifications.map((notif) => (
        <div key={notif.id} className="dashboard__announcement-row">
          <div className="dashboard__announcement-content">
            {ICON_MAP[notif.iconType]}
            <p>{notif.text}</p>
          </div>
          <button className="dashboard__announcement-close" onClick={() => onDismiss(notif.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </>
  )
}

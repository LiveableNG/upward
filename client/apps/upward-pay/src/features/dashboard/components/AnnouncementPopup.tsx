'use client'

import React from 'react'
import { X, Sparkles, Megaphone, Target, Clock, Info } from 'lucide-react'

export type IconType = 'sparkles' | 'megaphone' | 'target' | 'clock' | 'info'

interface AnnouncementPopupProps {
  title: string
  message: string
  iconType: string
  url?: string
  onClose: () => void
}

const ICON_MAP: Record<string, React.ReactNode> = {
  sparkles: <Sparkles size={28} />,
  megaphone: <Megaphone size={28} />,
  target: <Target size={28} />,
  clock: <Clock size={28} />,
  info: <Info size={28} />,
}

export function AnnouncementPopup({ title, message, iconType, url, onClose }: AnnouncementPopupProps) {
  const handleAction = () => {
    onClose()
    if (url) {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="announcement-popup">
      <div className="announcement-popup__content">
        <button className="announcement-popup__close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="announcement-popup__icon">
          {ICON_MAP[iconType] || <Sparkles size={28} />}
        </div>

        <h3 className="announcement-popup__title">{title}</h3>
        <p className="announcement-popup__message">{message}</p>

        <button className="announcement-popup__action" onClick={handleAction}>
          {url ? 'Learn More' : 'Got it'}
        </button>
      </div>
    </div>
  )
}

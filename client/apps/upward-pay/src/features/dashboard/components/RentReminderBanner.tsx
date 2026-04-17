'use client'

import React from 'react'
import { X, Clock, AlertTriangle, Calendar } from 'lucide-react'
import { type RentReminderAlert } from './RentReminderManager'

interface RentReminderBannerProps {
  alert: RentReminderAlert
  onDismiss: () => void
  onPayNow: () => void
}

function getBannerConfig(alert: RentReminderAlert) {
  const isOverdue = alert.urgency === 'overdue'
  const daysLeft = Math.abs(alert.daysLeft)

  if (isOverdue) {
    return {
      icon: <AlertTriangle size={14} />,
      bg: 'var(--error)',
      color: '#ffffff',
      borderColor: 'rgba(239, 68, 68, 0.4)',
      label: `OVERDUE — Rent for ${alert.address} was due ${daysLeft} day${daysLeft !== 1 ? 's' : ''} ago`,
      ctaLabel: 'Settle Now',
      ctaStyle: {
        background: 'white',
        color: 'var(--error)',
      },
      closeColor: 'rgba(255,255,255,0.7)',
    }
  }

  if (alert.urgency === 'critical') {
    return {
      icon: <AlertTriangle size={14} />,
      bg: 'linear-gradient(135deg, #d97757 0%, #c86848 100%)',
      color: '#ffffff',
      borderColor: 'rgba(217, 119, 87, 0.3)',
      label: `URGENT — Rent due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} for ${alert.address}`,
      ctaLabel: 'Pay Now',
      ctaStyle: {
        background: 'white',
        color: 'var(--clay)',
      },
      closeColor: 'rgba(255,255,255,0.7)',
    }
  }

  if (alert.urgency === 'warning') {
    return {
      icon: <Clock size={14} />,
      bg: 'rgba(245, 158, 11, 0.08)',
      color: 'var(--text)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      label: `Reminder — Rent due in 7 days for ${alert.address}`,
      ctaLabel: 'Pay Early',
      ctaStyle: {
        background: 'var(--warning)',
        color: 'white',
      },
      closeColor: 'var(--text-muted)',
    }
  }

  // notice (14 days)
  return {
    icon: <Calendar size={14} />,
    bg: 'var(--clay-faint)',
    color: 'var(--text)',
    borderColor: 'rgba(217, 119, 87, 0.2)',
    label: `Check-in — Your rent is due in 14 days for ${alert.address}`,
    ctaLabel: 'View',
    ctaStyle: {
      background: 'var(--clay)',
      color: 'white',
    },
    closeColor: 'var(--text-muted)',
  }
}

export function RentReminderBanner({ alert, onDismiss, onPayNow }: RentReminderBannerProps) {
  const config = getBannerConfig(alert)

  return (
    <div
      className="rent-reminder-banner"
      style={{
        background: config.bg,
        borderColor: config.borderColor,
        color: config.color,
      }}
    >
      <div className="rent-reminder-banner__content">
        <span className="rent-reminder-banner__icon">{config.icon}</span>
        <p className="rent-reminder-banner__label">{config.label}</p>
      </div>

      <div className="rent-reminder-banner__actions">
        <button
          className="rent-reminder-banner__cta"
          style={config.ctaStyle}
          onClick={onPayNow}
        >
          {config.ctaLabel}
        </button>
        <button
          className="rent-reminder-banner__close"
          style={{ color: config.closeColor }}
          onClick={onDismiss}
          aria-label="Dismiss reminder"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

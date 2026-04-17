'use client'

import React, { useEffect } from 'react'
import {
  X,
  AlertTriangle,
  Clock,
  Calendar,
  ArrowRight,
  TrendingDown,
  ShieldAlert,
  Flame,
} from 'lucide-react'
import { type RentReminderAlert } from './RentReminderManager'

interface RentReminderPopupProps {
  alert: RentReminderAlert
  onClose: () => void
  onPayNow: () => void
}

function getPopupConfig(alert: RentReminderAlert) {
  const isOverdue = alert.urgency === 'overdue'
  const daysLeft = Math.abs(alert.daysLeft)

  if (isOverdue) {
    return {
      theme: 'critical' as const,
      iconBg: '#fee2e2',
      iconColor: 'var(--error)',
      icon: <ShieldAlert size={32} />,
      badge: 'ACTION REQUIRED',
      badgeBg: 'var(--error)',
      title: 'Rent is Overdue',
      subtitle: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} past due`,
      subtitleColor: 'var(--error)',
      body: `Your rent for <strong>${alert.address}</strong> is significantly past due. This delay is currently impacting your <strong>Upward Credibility Score</strong>.`,
      sideNote: 'Protect your score. Paying now stops further impact.',
      sideNoteIcon: <TrendingDown size={13} />,
      sideNoteBg: '#fee2e2',
      sideNoteColor: 'var(--error)',
      ctaLabel: 'Settle Overdue Rent',
      ctaBg: 'var(--error)',
      ctaColor: 'white',
      overlayBg: 'rgba(0,0,0,0.55)',
      contentBorder: 'rgba(239, 68, 68, 0.2)',
      pulseColor: 'rgba(239, 68, 68, 0.15)',
    }
  }

  if (alert.urgency === 'critical') {
    return {
      theme: 'urgent' as const,
      iconBg: 'rgba(217, 119, 87, 0.1)',
      iconColor: 'var(--clay)',
      icon: <Flame size={32} />,
      badge: 'DUE VERY SOON',
      badgeBg: 'var(--clay)',
      title: 'Rent Due in',
      subtitle: `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      subtitleColor: 'var(--clay)',
      body: `Your rent for <strong>${alert.address}</strong> is due in 3 days. Pay now to maintain your payment streak and boost your <strong>Upward Score</strong>.`,
      sideNote: 'On-time payments are the #1 way to build credit.',
      sideNoteIcon: <Flame size={13} />,
      sideNoteBg: 'rgba(217, 119, 87, 0.08)',
      sideNoteColor: 'var(--clay)',
      ctaLabel: 'Pay Rent Now',
      ctaBg: 'var(--clay)',
      ctaColor: 'white',
      overlayBg: 'rgba(0,0,0,0.45)',
      contentBorder: 'rgba(217, 119, 87, 0.2)',
      pulseColor: 'rgba(217, 119, 87, 0.12)',
    }
  }

  if (alert.urgency === 'warning') {
    return {
      theme: 'warning' as const,
      iconBg: 'rgba(245, 158, 11, 0.1)',
      iconColor: 'var(--warning)',
      icon: <Clock size={32} />,
      badge: 'RENT REMINDER',
      badgeBg: 'var(--warning)',
      title: 'Rent Due in',
      subtitle: `${daysLeft} days`,
      subtitleColor: 'var(--warning)',
      body: `Just a friendly reminder: Rent for <strong>${alert.address}</strong> is due in a week. Start preparing your payment to keep your standing at its best.`,
      sideNote: 'Steady payments build a reliable financial profile.',
      sideNoteIcon: <AlertTriangle size={13} />,
      sideNoteBg: 'rgba(245, 158, 11, 0.08)',
      sideNoteColor: 'var(--warning)',
      ctaLabel: 'Pay Early',
      ctaBg: 'var(--warning)',
      ctaColor: 'white',
      overlayBg: 'rgba(0,0,0,0.4)',
      contentBorder: 'rgba(245, 158, 11, 0.2)',
      pulseColor: 'rgba(245, 158, 11, 0.1)',
    }
  }

  // notice — 14 days
  return {
    theme: 'notice' as const,
    iconBg: 'var(--clay-faint)',
    iconColor: 'var(--clay)',
    icon: <Calendar size={32} />,
    badge: 'UPCOMING RENT',
    badgeBg: 'var(--clay)',
    title: 'Rent Due in',
    subtitle: `${daysLeft} days`,
    subtitleColor: 'var(--clay)',
    body: `Time for a check-in! Rent for <strong>${alert.address}</strong> is due in two weeks. No rush, just a heads-up for your monthly planning.`,
    sideNote: 'Planning ahead is characteristic of Top Tenants.',
    sideNoteIcon: <Calendar size={13} />,
    sideNoteBg: 'var(--clay-faint)',
    sideNoteColor: 'var(--clay)',
    ctaLabel: 'View Payment Details',
    ctaBg: 'var(--clay)',
    ctaColor: 'white',
    overlayBg: 'rgba(0,0,0,0.35)',
    contentBorder: 'rgba(217, 119, 87, 0.15)',
    pulseColor: 'rgba(217, 119, 87, 0.06)',
  }
}

export function RentReminderPopup({ alert, onClose, onPayNow }: RentReminderPopupProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const config = getPopupConfig(alert)

  return (
    <div
      className="rent-reminder-popup"
      style={{ background: config.overlayBg }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`rent-reminder-popup__card ${config.theme === 'critical' ? 'animate-beam-red' : (config.theme === 'urgent' ? 'animate-beam-clay' : '')}`}
        style={{ borderColor: config.contentBorder }}
      >
        {/* Ambient glow blob */}
        <div
          className="rent-reminder-popup__glow"
          style={{ background: config.pulseColor }}
        />

        {/* Close */}
        <button className="rent-reminder-popup__close" onClick={onClose}>
          <X size={16} />
        </button>

        {/* Badge */}
        <div
          className="rent-reminder-popup__badge"
          style={{ background: config.badgeBg }}
        >
          {config.badge}
        </div>

        {/* Icon */}
        <div
          className="rent-reminder-popup__icon"
          style={{ background: config.iconBg, color: config.iconColor }}
        >
          {config.icon}
        </div>

        {/* Headline */}
        <div className="rent-reminder-popup__headline">
          <h2 className="rent-reminder-popup__title">{config.title}</h2>
          <span
            className="rent-reminder-popup__countdown"
            style={{ color: config.subtitleColor }}
          >
            {config.subtitle}
          </span>
        </div>

        {/* Body */}
        <p
          className="rent-reminder-popup__body"
          dangerouslySetInnerHTML={{ __html: config.body }}
        />

        {/* Side note */}
        <div
          className="rent-reminder-popup__note"
          style={{ background: config.sideNoteBg, color: config.sideNoteColor }}
        >
          <span className="rent-reminder-popup__note-icon">{config.sideNoteIcon}</span>
          {config.sideNote}
        </div>

        {/* CTA */}
        <button
          className="rent-reminder-popup__cta"
          style={{ background: config.ctaBg, color: config.ctaColor }}
          onClick={onPayNow}
        >
          {config.ctaLabel}
          <ArrowRight size={16} />
        </button>

        {/* Secondary dismiss */}
        <button className="rent-reminder-popup__skip" onClick={onClose}>
          Remind me later
        </button>
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import { Award, ShieldCheck, ShieldAlert } from 'lucide-react'
import { AlliancePmProfile } from '../types/alliance.types'

interface AllianceStatusBannerProps {
  profile?: AlliancePmProfile | null
  isLoading?: boolean
}

export function AllianceStatusBanner({ profile, isLoading }: AllianceStatusBannerProps) {
  if (isLoading) {
    return (
      <div className="card animate-pulse" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ height: '18px', width: '220px', background: 'var(--border)', borderRadius: '4px' }} />
      </div>
    )
  }

  if (!profile) return null

  if (!profile.isEnabled) {
    return (
      <div className="alliance-gate-card">
        <div className="alliance-gate-card__icon-wrap">
          <ShieldAlert size={28} />
        </div>
        <h2 className="alliance-gate-card__title">
          Upward Alliance Access Required
        </h2>
        <p className="alliance-gate-card__desc">
          Alliance network discovery and distribution is exclusively available to verified Property Managers. Contact platform administration to enable Upward Alliance capabilities for your account.
        </p>
      </div>
    )
  }

  return (
    <div className="alliance-credential-bar">
      <div className="alliance-credential-bar__left">
        <div className="alliance-credential-bar__badge-icon">
          <ShieldCheck size={18} />
        </div>
        <div>
          <div className="alliance-credential-bar__title">
            Upward Alliance Active
            {profile.pmTitle && (
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
                • {profile.pmTitle}
              </span>
            )}
          </div>
          <div className="alliance-credential-bar__subtitle">
            Authorized for verified co-brokerage and listing distribution
          </div>
        </div>
      </div>

      {profile.qualifications && profile.qualifications.length > 0 && (
        <div className="alliance-credential-bar__tags">
          {profile.qualifications.map((q) => (
            <span key={q.id} className="alliance-chip">
              <Award size={12} />
              {q.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

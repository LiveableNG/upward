'use client'

import React from 'react'
import { useAllianceProfile } from '@/features/alliance/hooks/useAlliance'
import { Award, ShieldAlert } from 'lucide-react'

export default function AllianceLayout({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading } = useAllianceProfile()
  const isEnabled = profile?.isEnabled === true || (profile as any)?.data?.isEnabled === true

  if (isLoading) {
    return (
      <div className="alliance-page-shell">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginTop: 24 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse" style={{ height: '260px', borderRadius: '16px' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!isEnabled) {
    return (
      <div className="alliance-page-shell">
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
      </div>
    )
  }

  const activeQualifications =
    profile?.qualifications
      ?.map((q: any) => q.qualification || q)
      ?.filter((q: any) => q.name) || []

  return (
    <div className="alliance-page-shell">
      {/* Top Header */}
      <div className="alliance-header" style={{ marginBottom: '24px' }}>
        <div className="alliance-header__top" style={{ alignItems: 'center' }}>
          <div className="alliance-header__title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 className="alliance-header__title">
                Upward Alliance Network
              </h1>
              {profile?.pmTitle && (
                <span className="alliance-chip" style={{ color: 'var(--text-secondary)', background: 'var(--ivory-dim)' }}>
                  {profile.pmTitle}
                </span>
              )}
              {activeQualifications.map((q: any) => (
                <span key={q.id || q.name} className="alliance-chip" title={q.name}>
                  <Award size={12} />
                  {q.name}
                </span>
              ))}
            </div>
            <p className="alliance-header__subtitle" style={{ marginTop: '4px' }}>
              Exclusive verified co-brokerage and listing distribution network.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div>{children}</div>
    </div>
  )
}

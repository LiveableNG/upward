'use client'

import React from 'react'
import { Award, AlertTriangle, ShieldCheck } from 'lucide-react'
import { AlliancePmProfile } from '../types/alliance.types'

interface AllianceStatusBannerProps {
  profile?: AlliancePmProfile | null
  isLoading?: boolean
}

export function AllianceStatusBanner({ profile, isLoading }: AllianceStatusBannerProps) {
  if (isLoading) {
    return (
      <div className="card animate-pulse" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ height: '20px', width: '200px', background: 'var(--border)', borderRadius: '4px' }} />
      </div>
    )
  }

  if (!profile) return null

  if (!profile.isEnabled) {
    return (
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          background: 'rgba(239, 68, 68, 0.05)',
          borderColor: 'rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <AlertTriangle size={20} color="var(--danger)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--danger)' }}>
            Upward Alliance Access Disabled
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Your account is currently not enabled for Upward Alliance distribution. Contact an administrator to enable listing network capabilities.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="card"
      style={{
        padding: '16px 20px',
        marginBottom: '20px',
        background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.04) 0%, rgba(22, 101, 52, 0.08) 100%)',
        borderColor: 'rgba(22, 101, 52, 0.2)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(22, 101, 52, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--forest)',
          }}
        >
          <ShieldCheck size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--forest)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Upward Alliance Active
            {profile.pmTitle && (
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
                • {profile.pmTitle}
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Authorized to create and distribute verified network marketing listings.
          </div>
        </div>
      </div>

      {profile.qualifications && profile.qualifications.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {profile.qualifications.map((q) => (
            <span
              key={q.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '12px',
                background: 'rgba(22, 101, 52, 0.1)',
                color: 'var(--forest)',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid rgba(22, 101, 52, 0.25)',
              }}
            >
              <Award size={12} />
              {q.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

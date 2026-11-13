'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  Target,
  Compass,
  Wallet,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

export default function DashboardGoalsPage() {
  const router = useRouter()

  return (
    <div className="profile-page dashboard--nav-offset">
      <div className="profile-page__container">
        <header className="profile-page__header">
          <div className="profile-page__header-text">
            <h1 className="profile-page__title">My Goals</h1>
            <p className="profile-page__subtitle">
              Define, track and achieve your personal ambitions.
            </p>
          </div>
        </header>

        <div className="profile-page__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Main workspace intro card */}
          <div
            style={{
              background: 'var(--surface, #ffffff)',
              border: '1px solid var(--shell-border, #f0e9df)',
              borderRadius: '20px',
              padding: '24px 20px',
              boxShadow: '0 1px 3px rgba(60, 40, 20, 0.04)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'var(--shell-tint, #fbede5)',
                color: 'var(--clay, #c2501f)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Target size={26} strokeWidth={2.2} />
            </div>

            <h2
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--dark, #1a1714)',
                margin: '0 0 6px',
                letterSpacing: '-0.01em',
              }}
            >
              Your Goals Workspace
            </h2>
            <p
              style={{
                fontSize: '13.5px',
                lineHeight: 1.55,
                color: 'var(--text-muted, #7a7268)',
                margin: '0 0 20px',
              }}
            >
              Upward helps you set personal targets, track milestones, and connect financial tools or marketplace offerings on your own terms.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid var(--shell-border, #f4eee5)',
                marginBottom: '22px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span
                  style={{
                    color: 'var(--clay, #c2501f)',
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={16} />
                </span>
                <span style={{ fontSize: '13px', lineHeight: 1.45, color: 'var(--dark, #1a1714)' }}>
                  <strong>Milestones & Targets</strong> — Break ambitious lifestyle plans into achievable steps.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span
                  style={{
                    color: 'var(--clay, #c2501f)',
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                >
                  <Wallet size={16} />
                </span>
                <span style={{ fontSize: '13px', lineHeight: 1.45, color: 'var(--dark, #1a1714)' }}>
                  <strong>Financial Alignment</strong> — Link Rent Vault and savings goals without forced commitments.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span
                  style={{
                    color: 'var(--clay, #c2501f)',
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                >
                  <Compass size={16} />
                </span>
                <span style={{ fontSize: '13px', lineHeight: 1.45, color: 'var(--dark, #1a1714)' }}>
                  <strong>Curated Marketplace</strong> — Discover verified offerings and vendor credibility.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => router.push('/dashboard/explore')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '13px 18px',
                  background: 'var(--clay, #c2501f)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s ease',
                }}
              >
                <span>Explore Goals & Marketplace</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => router.push('/dashboard/finance')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 18px',
                  background: 'transparent',
                  color: 'var(--clay, #c2501f)',
                  border: '1px solid var(--shell-border, #e5ded4)',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <span>View Financial Tools</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

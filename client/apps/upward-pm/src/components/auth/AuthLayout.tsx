'use client'

import React from 'react'
import { ChevronLeft } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import Link from 'next/link'
import { UpwardLogo } from '@/components/common/UpwardLogo'

interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  eyebrow?: string
  visualTitle?: React.ReactNode
  visualDesc?: string
  hideMobileLogo?: boolean
  hideBackToWebsite?: boolean
  cardWidth?: 'normal' | 'wide'
  stepRecap?: {
    currentStep: number
    steps: string[]
  }
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title,
  subtitle,
  eyebrow = 'For property managers & teams',
  visualTitle,
  visualDesc,
  hideBackToWebsite = false,
  cardWidth = 'normal',
  stepRecap
}) => {
  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()

  const heroHeadline = visualTitle || title || 'Every rent payment, a step toward your next chapter.'
  const heroDescription = visualDesc || subtitle || 'Manage properties, tenants and collections from one place — built for how Nigerian landlords and teams actually work.'

  return (
    <div className="auth-layout">
      {/* ── Left Brand & Editorial Showcase Panel ── */}
      <aside className="brand-panel">
        <div className="marks" aria-hidden="true">
          <svg viewBox="0 0 420 420" fill="none">
            <circle cx="300" cy="300" r="200" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" />
            <circle cx="300" cy="300" r="140" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" />
            <path d="M180 260 L300 170 L420 260 V400 H180 Z" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1.2" fill="none" />
          </svg>
        </div>

        <div className="brand-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="brand-mark">
              <UpwardLogo size={28} color="#faf6ec" />
            </span>
            <span className="brand-name">Upward</span>
          </div>
        </div>

        <div className="brand-mid">
          <p className="eyebrow serif" style={{ fontStyle: 'italic' }}>
            {eyebrow}
          </p>
          <h1>
            {heroHeadline}
          </h1>
          <p>
            {heroDescription}
          </p>

          {stepRecap && (
            <div className="step-recap">
              {stepRecap.steps.map((stepName, idx) => {
                const stepNum = idx + 1
                const isDone = stepNum < stepRecap.currentStep
                const isCurrent = stepNum === stepRecap.currentStep
                return (
                  <div
                    key={stepName}
                    className={`step-recap-item ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                  >
                    <span className="step-dot">
                      {isDone ? '✓' : stepNum}
                    </span>
                    <span>{stepName}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="brand-bottom">
          <div className="avatar-stack">
            <span />
            <span />
            <span />
          </div>
          <span>Trusted by 12,000+ landlords and property teams</span>
        </div>
      </aside>

      {/* ── Right Form Canvas ── */}
      <main className="form-panel">
        <div className="form-topbar">
          {!hideBackToWebsite ? (
            isNative ? (
              <Link href="/welcome" className="back-link">
                <ChevronLeft size={16} />
                <span>Back</span>
              </Link>
            ) : (
              <a
                href={`${process.env.NEXT_PUBLIC_WEB_URL || "https://upward.goodtenants.io"}/for-pm`}
                className="back-link"
              >
                <ChevronLeft size={16} />
                <span>Back to website</span>
              </a>
            )
          ) : <div />}
        </div>

        <div className="form-wrap">
          <div className={`auth-card ${cardWidth === 'wide' ? 'auth-card--wide' : ''}`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

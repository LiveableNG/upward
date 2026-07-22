'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { Sparkles, Building, User, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import '@/styles/auth.css'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'
import { AuthLayout } from '@/components/auth/AuthLayout'

function LandlordLoginForm() {
  return (
    <AuthLayout 
      title="Landlord Portal"
      subtitle="Direct access to your property portfolio"
      visualTitle={
        <>
          Your properties, <br />
          <span className="text-gradient">all in one place</span>.
        </>
      }
      visualDesc="Access your property portfolio, view unit performance, and stay connected with your property managers."
    >
      <div className="animate-fade-in">
        <div className="auth-role-toggle">
          <a 
            href="/pm-login"
            className="auth-role-toggle__btn"
          >
            <Building size={16} />
            <span>Property Manager</span>
          </a>
          <button 
            type="button"
            className="auth-role-toggle__btn auth-role-toggle__btn--active"
          >
            <User size={16} />
            <span>Landlord Portal</span>
          </button>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '36px 28px',
          textAlign: 'center',
          border: '1px solid var(--ivory-dark)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
          marginTop: '12px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'var(--forest-faint)',
            color: 'var(--forest)',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '20px'
          }}>
            <Sparkles size={14} /> Coming Soon
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '12px' }}>
            Landlord Portal Access
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>
            Direct landlord portal sign-in is currently invite-only. You will receive an email invitation directly from your Property Manager with your personal access link.
          </p>

          <a 
            href="/pm-login" 
            className="auth-btn auth-btn--primary auth-btn--large"
            style={{ width: '100%', textDecoration: 'none' }}
          >
            <span>Go to Property Manager Login</span>
            <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </AuthLayout>
  )
}

import { LoginFormMobile } from '@/features/auth/components/LoginFormMobile'

export default function LandlordLoginPage() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (isMobile === null) {
    return <AuthSkeleton />
  }

  if (isMobile) {
    return (
      <Suspense fallback={<AuthSkeleton />}>
        <LoginFormMobile initialRole="landlord" />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<AuthSkeleton />}>
      <LandlordLoginForm />
    </Suspense>
  )
}

'use client'

import React from 'react'
import Link from 'next/link'
import { 
  ArrowRight, 
  Mail, 
  Lock, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { useToast } from '@/components/common/Toast'
import '@/styles/auth.css'

export default function LoginPage() {
  const { success } = useToast()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    success("Logged in successfully!")
    setTimeout(() => window.location.href = '/', 1000)
  }

  return (
    <div className="auth-page">
      <div className="auth-page__ornament" />
      
      <div className="auth-sidebar">
        <div className="auth-sidebar__logo">
          <UpwardLogo size={40} color="#ffffff" />
        </div>
        <div className="auth-sidebar__content">
          <h1>Welcome <br/> back to <br/> Upward.</h1>
          <p>Your property portfolio is just a few clicks away. Sign in to manage your units and track revenue.</p>
        </div>
        <div className="auth-sidebar__footer">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <ShieldCheck size={20} className="text-clay" />
            <span style={{ fontSize: 13, color: '#888' }}>End-to-End Encrypted Access</span>
          </div>
        </div>
      </div>

      <div className="auth-main animate-fade-in">
        <div className="auth-card">
          <div className="auth-card__header">
            <div className="auth-card__logo mobile-only">
              <UpwardLogo size={32} />
            </div>
            <h2 className="auth-card__title">Sign in</h2>
            <p className="auth-card__subtitle">Enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#aaa' }} />
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="segun@company.com" 
                  style={{ paddingLeft: 42 }}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--clay)', fontWeight: 600 }}>Forgot password?</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#aaa' }} />
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••" 
                  style={{ paddingLeft: 42 }}
                  required
                />
              </div>
            </div>
            
            <button type="submit" className="auth-btn auth-btn--primary">
              Sign In <ChevronRight size={18} />
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link href="/signup">Sign up for free</Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mobile-only { display: none; }
        @media (max-width: 1024px) {
          .mobile-only { display: block; }
        }
      `}</style>
    </div>
  )
}

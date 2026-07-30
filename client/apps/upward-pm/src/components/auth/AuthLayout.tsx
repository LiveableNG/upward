'use client';

import React from 'react';
import { UpwardLogo } from '../common/UpwardLogo';
import { ChevronLeft, ShieldCheck, CheckCircle2, Building, TrendingUp } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  visualTitle?: React.ReactNode;
  visualDesc?: string;
  hideMobileLogo?: boolean;
  hideBackToWebsite?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title, 
  subtitle,
  visualTitle,
  visualDesc,
  hideMobileLogo = false,
  hideBackToWebsite = false
}) => {
  return (
    <div className="auth-layout">
      {/* Visual Panel (Desktop) */}
      <div className="auth-layout__visual">
        <div className="auth-layout__visual-content">
          <header className="auth-layout__visual-header">
            <a href={`${process.env.NEXT_PUBLIC_WEB_URL || "https://upward.goodtenants.io"}/for-pm`} className="auth-shell__brand">
              <UpwardLogo color="white" size={42} />
            </a>
          </header>

          <main className="auth-layout__visual-body">

            <h1 className="auth-layout__visual-title">
              {visualTitle || (
                <>
                  Manage your <br />
                  <span className="text-gradient">portfolio</span> like a pro.
                </>
              )}
            </h1>
            <p className="auth-layout__visual-desc">
              {visualDesc || "Onboard tenants, manage payment requests, and track property performance in one premium dashboard designed for modern property managers."}
            </p>
            
            {/* Rich Feature Showcase */}
            <div className="auth-layout__visual-showcase">
              <div className="showcase-preview-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(22, 101, 52, 0.4)', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'white' }}>Performance Overview</h4>
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' }}>Real-time rent & tenant tracking</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    Active
                  </span>
                </div>

                <div className="showcase-stats-grid">
                  <div className="showcase-stat-box">
                    <div className="showcase-stat-val">99.4%</div>
                    <div className="showcase-stat-lbl">On-Time Collection</div>
                  </div>
                  <div className="showcase-stat-box">
                    <div className="showcase-stat-val">5,000+</div>
                    <div className="showcase-stat-lbl">Units Managed</div>
                  </div>
                </div>
              </div>

              <div className="auth-hero-features">
                <div className="auth-hero-pill">
                  <CheckCircle2 size={15} style={{ color: '#4ade80' }} /> Instant Direct Rent Receipts
                </div>
                <div className="auth-hero-pill">
                  <ShieldCheck size={15} style={{ color: '#b49a69' }} /> Automated Reminders
                </div>
              </div>
            </div>
          </main>

        </div>

        <div className="auth-layout__ambient-blob blob--1"></div>
        <div className="auth-layout__ambient-blob blob--2"></div>
      </div>

      {/* Form Panel */}
      <div className="auth-layout__form">
        {!hideMobileLogo && (
          <header className="mobile-header">
            <UpwardLogo size={32} />
          </header>
        )}

        <main className="auth-shell">
          {!hideBackToWebsite && (
            Capacitor.isNativePlatform() ? (
              <Link
                href="/welcome"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  textDecoration: 'none',
                  fontWeight: 500,
                  marginBottom: '24px',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = 'var(--text)'}
                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <ChevronLeft size={16} /> Back
              </Link>
            ) : (
              <a
                href={`${process.env.NEXT_PUBLIC_WEB_URL || "https://upward.goodtenants.io"}/for-pm`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  textDecoration: 'none',
                  fontWeight: 500,
                  marginBottom: '24px',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = 'var(--text)'}
                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <ChevronLeft size={16} /> Back to Website
              </a>
            )
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

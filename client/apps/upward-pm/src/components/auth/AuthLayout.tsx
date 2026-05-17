'use client';

import React from 'react';
import { UpwardLogo } from '../common/UpwardLogo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  visualTitle?: React.ReactNode;
  visualDesc?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title, 
  subtitle,
  visualTitle,
  visualDesc 
}) => {
  return (
    <div className="auth-layout">
      {/* Visual Panel (Desktop) */}
      <div className="auth-layout__visual">
        <div className="auth-layout__visual-content">
          <header className="auth-layout__visual-header">
            <UpwardLogo color="white" size={42} />
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
            
            <div className="auth-layout__visual-showcase" style={{ position: 'relative', width: '100%', height: '220px', marginTop: '40px' }}>
              <div className="auth-layout__ambient-circle" style={{
                position: 'absolute',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                top: '-50px',
                left: '-50px',
                filter: 'blur(40px)',
              }}></div>
              
              <div className="auth-layout__card-mock" style={{
                position: 'absolute',
                width: '320px',
                height: '200px',
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-6deg)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                overflow: 'hidden',
              }}>
                <img 
                  src="/attachments/pm-dashboard.png" 
                  alt="Upward PM Dashboard Preview" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 'inherit',
                    opacity: 0.85,
                    transition: 'transform 0.5s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                />
              </div>
            </div>
          </main>

        </div>

        <div className="auth-layout__ambient-blob blob--1"></div>
        <div className="auth-layout__ambient-blob blob--2"></div>
      </div>

      {/* Form Panel */}
      <div className="auth-layout__form">
        <header className="mobile-header">
          <UpwardLogo size={32} />
        </header>

        <main className="auth-shell">
          {children}
        </main>
      </div>
    </div>
  );
};
